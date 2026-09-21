import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveFlag } from '../js/flags.js';

const data = JSON.parse(readFileSync(new URL('../data/paths.json', import.meta.url)));
const variants = JSON.parse(readFileSync(new URL('../data/flag-variants.json', import.meta.url)));

test('flag selection prioritizes path overrides, ideology variants, then country reference', () => {
  const country = {tag:'TEST',flag:'base.png'};
  const manifest = {countries:{TEST:{Socialist:'ideology.png'}}, paths:{ROUTE:{flag:'path.png'}}};
  assert.deepEqual(resolveFlag(country,'Socialist','ROUTE',manifest), {flag:'path.png',kind:'path'});
  assert.deepEqual(resolveFlag(country,'Socialist',null,manifest), {flag:'ideology.png',kind:'ideology'});
  assert.deepEqual(resolveFlag(country,'Varies by branch',null,manifest), {flag:'base.png',kind:'country'});
  assert.deepEqual(resolveFlag(country,undefined,undefined,manifest), {flag:'base.png',kind:'country'});
  assert.equal(resolveFlag(null,null,null,manifest).flag, '');
});

test('every mapped flag is a local PNG with pinned provenance and an existing country or route', () => {
  assert.equal(variants.upstreamCommit, data.metadata.upstreamCommit);
  const routes = new Map(data.countries.flatMap(c => c.paths.map(p => [p.id,p])));
  for (const [tag, mapping] of Object.entries(variants.countries)) {
    const country = data.countries.find(c => c.tag === tag);
    assert.ok(country,tag);
    for (const [ideology, flag] of Object.entries(mapping)) {
      assert.ok(country.paths.some(p => p.ideology === ideology));
      assert.ok(variants.assets[flag]);
    }
  }
  for (const [id, override] of Object.entries(variants.paths)) {
    assert.equal(override.effectSource, routes.get(id)?.source);
    assert.ok(variants.assets[override.flag]);
  }
  for (const [flag, asset] of Object.entries(variants.assets)) {
    assert.match(asset.sha,/^[a-f0-9]{40}$/);
    assert.match(asset.source,/^gfx\/flags\/[^/]+\.tga$/);
    const bytes = readFileSync(new URL('../'+flag.slice(2),import.meta.url));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
  }
});
