/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EYE_HEIGHT,
  calculateSunPosition,
  calculateCameraParameters,
  calculateAtmosphericFog,
  validateGroundParameters,
  validateRadialGroundParameters,
} from './math.js';

test('DEFAULT_EYE_HEIGHT is 1.7 meters', () => {
  assert.equal(DEFAULT_EYE_HEIGHT, 1.7);
});

test('calculateSunPosition generates valid 3D coordinates and unit vector', () => {
  const sun = calculateSunPosition(180, 45, 400);
  assert.ok(sun.x !== undefined);
  assert.ok(sun.y > 0, 'Sun elevation 45 degrees should yield positive y');
  assert.ok(sun.z < 0, 'Azimuth 180 degrees should project towards negative z');

  // Verify normalized vector length is approximately 1
  const normLen = Math.sqrt(
    sun.normalized.x ** 2 + sun.normalized.y ** 2 + sun.normalized.z ** 2
  );
  assert.ok(Math.abs(normLen - 1) < 1e-4, 'Normalized vector must have unit length');
});

test('calculateCameraParameters provides correct eye height and lookAt orientation', () => {
  const params = calculateCameraParameters({ eyeHeight: 1.7, fov: 60 });
  assert.equal(params.eyeHeight, 1.7);
  assert.equal(params.position.y, 1.7);
  assert.equal(params.position.x, 0);
  assert.equal(params.position.z, 0);
  assert.ok(params.target.z < 0, 'Camera should point forward into the landscape');
  assert.equal(params.fov, 60);
});

test('calculateCameraParameters throws on invalid values', () => {
  assert.throws(() => calculateCameraParameters({ eyeHeight: -1 }));
  assert.throws(() => calculateCameraParameters({ fov: 5 }));
  assert.throws(() => calculateCameraParameters({ near: 10, far: 5 }));
});

test('calculateAtmosphericFog produces valid bounds', () => {
  const fog = calculateAtmosphericFog(30, 500);
  assert.equal(fog.near, 30);
  assert.equal(fog.far, 500);
  assert.throws(() => calculateAtmosphericFog(600, 300));
});

test('validateGroundParameters returns expected area and subdivisions', () => {
  const ground = validateGroundParameters(1000, 1000, 64);
  assert.equal(ground.width, 1000);
  assert.equal(ground.depth, 1000);
  assert.equal(ground.area, 1000000);
  assert.equal(ground.segments, 64);
  assert.throws(() => validateGroundParameters(-100, 500));
});

test('validateRadialGroundParameters calculates correct diameter and area', () => {
  const radial = validateRadialGroundParameters(3500, 96);
  assert.equal(radial.radius, 3500);
  assert.equal(radial.diameter, 7000);
  assert.equal(radial.segments, 96);
  assert.ok(Math.abs(radial.area - Math.PI * 3500 * 3500) < 1e-4);
  assert.throws(() => validateRadialGroundParameters(-10));
  assert.throws(() => validateRadialGroundParameters(100, 2));
});

