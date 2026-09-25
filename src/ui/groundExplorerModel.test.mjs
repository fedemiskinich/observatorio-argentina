import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampGroundExplorerPitch,
  clampGroundExplorerSpeed,
  groundExplorerMotion,
  isGroundExplorerControl,
} from './groundExplorerModel.js';

test('ground explorer speed remains within walking and vehicle bounds', () => {
  assert.equal(clampGroundExplorerSpeed(-5), 1);
  assert.equal(clampGroundExplorerSpeed(12), 12);
  assert.equal(clampGroundExplorerSpeed(100), 60);
  assert.equal(clampGroundExplorerSpeed('invalid'), 5);
});

test('ground explorer combines opposing controls deterministically', () => {
  assert.deepEqual(
    groundExplorerMotion(new Set(['KeyW', 'KeyD', 'ArrowLeft', 'ShiftLeft'])),
    {
      forward: 1,
      right: 1,
      up: 0,
      heading: -1,
      pitch: 0,
      fast: true,
    },
  );
  assert.equal(groundExplorerMotion(new Set(['KeyW', 'KeyS'])).forward, 0);
});

test('ground explorer recognizes only its navigation keys and bounds pitch', () => {
  assert.equal(isGroundExplorerControl('KeyW'), true);
  assert.equal(isGroundExplorerControl('KeyQ'), false);
  assert.ok(clampGroundExplorerPitch(Math.PI) < Math.PI / 2);
  assert.ok(clampGroundExplorerPitch(-Math.PI) > -Math.PI / 2);
});
