import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readDataset, eligiblePaths, eligibleCountries, choose, countriesIn, searchPaths } from '../js/picker.js';
import { setStatus, summarize } from '../js/tracker.js';
import { createStorage, parseSave, exportSave, STORAGE_KEY } from '../js/storage.js';

const fullData = JSON.parse(readFileSync(new URL('../data/paths.json', import.meta.url)));
const data = { ...fullData, countries: fullData.countries.slice(0, 3).map(c => ({ ...c, paths: c.paths.filter(p => ['ARG_CARLES','ARG_GOU','GXC_FEDERALIST_SOCDEM','CAN_LIBERALS','CAN_CONSERVATIVES'].includes(p.id)) })) };
test('expanded collection has map anchors, goals and local heraldry for every route', () => {
  const { records, skipped } = readDataset(fullData);
  assert.equal(skipped, 0);
  assert.equal(fullData.countries.length, 203);
  assert.equal(records.length, 3294);
  for (const path of records) {
    assert.ok(path.objectives.length && path.challenge && path.sourceKey);
    assert.ok(path.location.length === 2 && path.location.every(Number.isFinite));
    assert.ok(path.location[0] >= -180 && path.location[0] <= 180);
    assert.ok(path.location[1] >= -90 && path.location[1] <= 90);
    assert.ok(readFileSync(new URL('../' + path.flag.slice(2), import.meta.url)).length > 0);
    if (path.ideology !== 'Varies by branch') assert.ok(readFileSync(new URL('../' + fullData.ideologies[path.ideology].icon.slice(2), import.meta.url)).length > 0);
  }
});
const { records } = readDataset(data);

test('every included political rule option is selectable once under its source country', () => {
  const manifest = JSON.parse(readFileSync(new URL('../data/political-rule-coverage.json', import.meta.url)));
  const { records: all } = readDataset(fullData);
  assert.equal(manifest.upstreamCommit, fullData.metadata.upstreamCommit);
  assert.equal(manifest.groups.length, 170);
  for (const group of manifest.groups) {
    for (const key of group.sourceKeys) {
      const matches = all.filter(path => path.sourceKey === key);
      assert.equal(matches.length, 1, key);
      assert.equal(matches[0].tag, group.country, key);
      assert.equal(matches[0].ruleGroup, group.group, key);
      assert.ok(!/[§£]|\$\w+\$/.test(matches[0].notes), key);
      assert.ok(eligiblePaths(all, {}, {country:group.country}).includes(matches[0]));
    }
  }
  assert.equal(all.filter(path => path.tag === 'GXC' && path.routeKind === 'game-rule').length, 27);
  assert.equal(all.filter(path => path.tag === 'RUS' && path.routeKind === 'game-rule').length, 32);
  assert.ok(all.find(path => path.sourceKey === 'RULE_OPTION_CAN_PATH_SOCDEM').notes.includes('Requires:'));
});

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

const manifest = JSON.parse(readFileSync(new URL('../data/starting-roster.json', import.meta.url)));
test('every audited starting owner appears exactly once, with source and heraldry', () => {
 assert.equal(manifest.countries.length, 109);
 assert.deepEqual(fullData.countries.filter(c => c.startingCountry).map(c => c.tag).sort(), manifest.countries.map(c => c.tag).sort());
 assert.equal(new Set(manifest.countries.map(c => c.sourceTag)).size, 109);
 assert.equal(manifest.countries.find(c => c.tag === 'CAN').sourceTag, 'IMP');
 for (const country of fullData.countries.filter(c => c.startingCountry)) {
  assert.ok(country.startingCountry && country.source && country.location);
  assert.ok(readFileSync(new URL('../' + country.flag.slice(2), import.meta.url)).length > 0);
  assert.equal(country.pathCoverage, country.paths.length ? 'partial' : 'pending');
 }
});
test('unreviewed countries are discoverable but never become placeholder routes', () => {
 const { records, countries } = readDataset(fullData);
 assert.equal(eligibleCountries(countries, records).length, 203);
 assert.ok(eligibleCountries(countries, records, {}, { country: 'AZR' }).some(c => c.tag === 'AZR'));
 assert.equal(records.filter(p => p.tag === 'AZR').length, 0);
 for (const filters of [{ideology:'Social Democrat'}, {status:'unplayed'}, {excludeCompleted:true}, {excludePlayed:true}]) {
  assert.ok(!eligibleCountries(countries, records, {}, filters).some(c => c.tag === 'AZR'));
 }
 assert.equal(summarize(records, {}).total, 3294);
 assert.equal(countries.filter(c => c.pathCoverage === 'pending').length, 42);
});


test('source branches preserve ownership and compose with country availability filters', () => {
 const { records, countries } = readDataset(fullData);
 const audit = JSON.parse(readFileSync(new URL('../data/source-branch-audit.json', import.meta.url)));
 assert.equal(new Set(records.map(p => p.id)).size, records.length);
 for (const item of audit.imported) {
  const matches = records.filter(p => p.id === item.id);
  assert.equal(matches.length, 1, item.id);
  assert.equal(matches[0].tag, item.country);
  assert.equal(matches[0].sourceKey, item.sourceKey);
 }
 assert.equal(eligibleCountries(countries, records, {}, {availability:'starting'}).length, 109);
 assert.equal(eligibleCountries(countries, records, {}, {availability:'later'}).length, 94);
 for (const routeKind of ['game-rule','event-choice','focus-branch','decision-branch']) {
  const pool = eligiblePaths(records, {}, {availability:'later',routeKind});
  assert.ok(pool.length, routeKind);
  assert.ok(pool.every(p => !p.startingCountry && p.routeKind === routeKind));
 }
 assert.ok(!records.some(p => p.tag === 'NEE' && p.source.includes('APG')));
 assert.ok(!records.some(p => p.tag === 'GER' && p.name.includes('Germany Demands Regime Change')));
});
