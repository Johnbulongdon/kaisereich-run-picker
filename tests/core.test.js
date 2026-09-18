import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readDataset, eligiblePaths, choose, countriesIn, searchPaths } from '../js/picker.js';
import { setStatus, summarize } from '../js/tracker.js';
import { createStorage, parseSave, exportSave, STORAGE_KEY } from '../js/storage.js';

const data = JSON.parse(readFileSync(new URL('../data/paths.json', import.meta.url)));
const { records } = readDataset(data);

test('sample data has stable unique IDs, sourced paths and representative countries', () => {
  assert.equal(records.length, 5);
  assert.equal(new Set(records.map(path => path.id)).size, records.length);
  assert.ok(records.every(path => path.source.startsWith('https://github.com/Kaiserreich/') && path.sourceKey));
  assert.ok(records.some(path => path.tag === 'ARG'));
  assert.ok(records.some(path => path.tag === 'GXC'));
  assert.ok(data.countries.some(country => country.paths.length === 1));
  assert.ok(data.countries.some(country => country.paths.length > 1));
});

test('disabled and invalid records cannot be selected; duplicate IDs reject the database', () => {
  const dirty = structuredClone(data);
  dirty.countries[0].paths.push({ id: 'BAD', name: 'Bad' });
  dirty.countries[0].paths[0].enabled = false;
  const valid = readDataset(dirty);
  assert.equal(valid.skipped, 2);
  assert.equal(valid.records.length, records.length - 1);
  dirty.countries[0].paths.push(data.countries[0].paths[1]);
  assert.throws(() => readDataset(dirty), /Duplicate/);
  assert.throws(() => readDataset({ countries: [] }), /Unsupported/);
  const invalidCountry = structuredClone(data);
  invalidCountry.countries[0].region = { invalid: true };
  assert.equal(readDataset(invalidCountry).records.length, 3);
});

test('country/path relationship and combined filters are respected before selection', () => {
  const argentina = eligiblePaths(records, {}, { country: 'ARG' });
  assert.equal(argentina.length, 2);
  for (const value of [0, 0.2, 0.5, 0.999999]) assert.equal(choose(argentina, () => value).tag, 'ARG');
  const filtered = eligiblePaths(records, {}, { region: 'East Asia', ideology: 'Social Democrat' });
  assert.deepEqual(filtered.map(path => path.id), ['GXC_FEDERALIST_SOCDEM']);
  assert.equal(eligiblePaths(records, {}, { region: 'East Asia', ideology: 'Market Liberal' }).length, 0);
  assert.equal(choose([]), null);
});

test('each path has an equal interval in a fully random draw, regardless of country path count', () => {
  const draws = Array.from({ length: records.length * 100 }, (_, index) => choose(records, () => (index + 0.5) / (records.length * 100)));
  for (const path of records) assert.equal(draws.filter(draw => draw.id === path.id).length, 100);
});

test('status filters and exclusions compose, including impossible combinations', () => {
  const progress = { ARG_CARLES: 'completed', ARG_GOU: 'played' };
  assert.equal(eligiblePaths(records, progress, { excludeCompleted: true }).length, 4);
  assert.equal(eligiblePaths(records, progress, { excludeCompleted: true, excludePlayed: true }).length, 3);
  assert.deepEqual(eligiblePaths(records, progress, { status: 'played' }).map(path => path.id), ['ARG_GOU']);
  assert.equal(eligiblePaths(records, progress, { status: 'completed', excludeCompleted: true }).length, 0);
  assert.ok(!countriesIn(eligiblePaths(records, progress, { excludeCompleted: true, excludePlayed: true })).some(country => country.tag === 'ARG'));
});

test('checklist search covers countries, accented names, categories and ideology', () => {
  for (const query of ['Argentina', 'Carles', 'Carlés', 'Federalist', 'National Populist', 'GXC']) assert.ok(searchPaths(records, query).length > 0, query);
  assert.equal(searchPaths(records, '').length, records.length);
  assert.equal(searchPaths(records, 'not a country').length, 0);
});

test('tracking is immutable and dashboard ignores saved IDs outside the database', () => {
  const original = {};
  const started = setStatus(original, 'ARG_CARLES', 'played');
  assert.deepEqual(original, {});
  assert.equal(started.ARG_CARLES, 'played');
  const progress = setStatus({ ...started, OLD_PATH: 'completed' }, 'ARG_GOU', 'completed');
  assert.deepEqual(summarize(records, progress), { unplayed: 3, played: 1, completed: 1, total: 5, percent: 20 });
  assert.equal(summarize([], {}).percent, 0);
  assert.throws(() => setStatus({}, 'ARG_GOU', 'won'));
});

test('save export/import round trip preserves unknown IDs and accepts the v1 legacy envelope', () => {
  const progress = { ARG_CARLES: 'completed', FUTURE_PATH: 'played' };
  assert.deepEqual(parseSave(exportSave(progress)), progress);
  assert.deepEqual(parseSave(JSON.stringify({ version: 1, progress })), progress);
});

test('malformed, unsupported and unsafe imports are rejected', () => {
  for (const text of ['{', 'null', '[]', '{}', '{"schemaVersion":2,"progress":{}}',
    '{"schemaVersion":1,"progress":[]}', '{"schemaVersion":1,"progress":{"ARG_GOU":"won"}}',
    '{"schemaVersion":1,"progress":{"__proto__":"played"}}',
    '{"schemaVersion":1,"version":2,"progress":{}}', ' '.repeat(1_000_001)]) assert.throws(() => parseSave(text));
});

test('persistent storage survives a new instance, updates statuses and resets', () => {
  const map = new Map();
  const provider = () => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) });
  const first = createStorage(provider);
  assert.equal(first.save({ ARG_CARLES: 'played' }), true);
  const second = createStorage(provider);
  assert.equal(second.load().progress.ARG_CARLES, 'played');
  second.save({ ARG_CARLES: 'completed' });
  assert.equal(first.load().progress.ARG_CARLES, 'completed');
  assert.equal(first.reset(), true);
  assert.deepEqual(second.load().progress, {});
  assert.equal(map.has(STORAGE_KEY), false);
});

test('storage denial, quota failure and corrupt saves are recoverable', () => {
  const denied = createStorage(() => { throw new Error('Access denied'); });
  assert.ok(denied.load().error);
  assert.equal(denied.load().corrupt, false);
  assert.equal(denied.save({}), false);
  assert.equal(denied.reset(), false);
  const corrupt = createStorage(() => ({ getItem: () => '{broken' }));
  assert.equal(corrupt.load().corrupt, true);
  assert.deepEqual(corrupt.load().progress, {});
});
