/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIME_OF_DAY,
  DEFAULT_TIME_OF_DAY,
  getTimeOfDayConfig,
} from './timeOfDay.js';

test('TIME_OF_DAY defines all four required lighting phases', () => {
  const keys = Object.keys(TIME_OF_DAY);
  assert.ok(keys.includes('morning'));
  assert.ok(keys.includes('noon'));
  assert.ok(keys.includes('afternoon'));
  assert.ok(keys.includes('goldenHour'));
  assert.equal(keys.length, 4);
});

test('getTimeOfDayConfig handles aliases and safe fallbacks', () => {
  assert.equal(getTimeOfDayConfig('noon').id, 'noon');
  assert.equal(getTimeOfDayConfig('goldenHour').id, 'goldenHour');
  assert.equal(getTimeOfDayConfig('golden-hour').id, 'goldenHour');
  assert.equal(getTimeOfDayConfig('GOLDEN_HOUR').id, 'goldenHour');
  assert.equal(getTimeOfDayConfig('invalid').id, DEFAULT_TIME_OF_DAY);
  assert.equal(getTimeOfDayConfig(null).id, DEFAULT_TIME_OF_DAY);
});

test('golden hour lighting has distinct low sun elevation and warm amber hue', () => {
  const golden = TIME_OF_DAY.goldenHour;
  const noon = TIME_OF_DAY.noon;

  assert.ok(golden.sunElevation < 15, 'Golden hour sun elevation must be low');
  assert.ok(noon.sunElevation > 60, 'Noon sun elevation must be high');
  assert.ok(golden.sunColor === 0xff9940, 'Golden hour should have warm amber color');
  assert.ok(golden.fog.color === 0xcca070, 'Golden hour fog should be warm glowing haze');
});

test('each phase specifies valid sky scattering, hemisphere, and fog parameters', () => {
  for (const key of Object.keys(TIME_OF_DAY)) {
    const config = TIME_OF_DAY[key];
    assert.ok(config.sky.rayleigh > 0);
    assert.ok(config.sky.turbidity > 0);
    assert.ok(config.sky.luminance > 0 && config.sky.luminance <= 1.0, 'Sky luminance must be within (0, 1]');
    assert.ok(config.fog.near < config.fog.far);
    assert.ok(config.hemisphere.intensity > 0);
    assert.ok(config.sunIntensity > 0);
  }
});
