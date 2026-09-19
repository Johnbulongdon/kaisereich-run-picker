import test from 'node:test';
import assert from 'node:assert/strict';
import { landingRotation } from '../js/wheel.js';

test('wheel lands the chosen segment center exactly beneath the fixed pointer', () => {
  for (const count of [1, 2, 3, 5, 17, 284]) {
    for (let index = 0; index < count; index++) {
      for (const previous of [0, 1523, 10000]) {
        const rotation = landingRotation(index, count, previous);
        const center = (index + 0.5) * 360 / count;
        const finalAngle = (rotation + center) % 360;
        assert.ok(Math.min(finalAngle, 360 - finalAngle) < 1e-8);
        assert.ok(rotation >= previous + 1440);
      }
    }
  }
});

test('empty pools and invalid segment indices cannot produce a wheel result', () => {
  for (const [index, count] of [[0, 0], [-1, 3], [3, 3], [0.5, 2]]) {
    assert.throws(() => landingRotation(index, count), /Invalid wheel segment/);
  }
});
