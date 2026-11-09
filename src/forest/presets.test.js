/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALITY_PRESETS,
  DEFAULT_PRESET_KEY,
  getQualityPreset,
  calculateEffectivePixelRatio,
} from './presets.js';

test('QUALITY_PRESETS defines all four required levels: low, medium, high, ultra', () => {
  const keys = Object.keys(QUALITY_PRESETS);
  assert.ok(keys.includes('low'));
  assert.ok(keys.includes('medium'));
  assert.ok(keys.includes('high'));
  assert.ok(keys.includes('ultra'));
  assert.equal(keys.length, 4);
});

test('getQualityPreset returns correct preset and falls back safely on invalid key', () => {
  assert.equal(getQualityPreset('ultra').id, 'ultra');
  assert.equal(getQualityPreset('LOW').id, 'low');
  assert.equal(getQualityPreset('invalid_preset').id, DEFAULT_PRESET_KEY);
  assert.equal(getQualityPreset(null).id, DEFAULT_PRESET_KEY);
});

test('calculateEffectivePixelRatio respects presets and software WebGL cap', () => {
  // Ultra with devicePixelRatio 3.0 -> capped at 2.0
  const ultraRatio = calculateEffectivePixelRatio('ultra', 3.0, false);
  assert.equal(ultraRatio, 2.0);

  // Low with devicePixelRatio 2.0 -> resolutionScale 0.75 * 1.0 = 0.75
  const lowRatio = calculateEffectivePixelRatio('low', 2.0, false);
  assert.equal(lowRatio, 0.75);

  // Software WebGL cap -> strictly capped at 1.0 * scale
  const softUltra = calculateEffectivePixelRatio('ultra', 2.0, true);
  assert.equal(softUltra, 1.0);

  const softLow = calculateEffectivePixelRatio('low', 2.0, true);
  assert.equal(softLow, 0.75);
});

test('presets specify progressive shadow and anisotropy parameters', () => {
  assert.ok(QUALITY_PRESETS.low.anisotropy <= QUALITY_PRESETS.medium.anisotropy);
  assert.ok(QUALITY_PRESETS.medium.anisotropy <= QUALITY_PRESETS.high.anisotropy);
  assert.ok(QUALITY_PRESETS.high.anisotropy <= QUALITY_PRESETS.ultra.anisotropy);

  assert.equal(QUALITY_PRESETS.low.shadows, false);
  assert.equal(QUALITY_PRESETS.high.shadows, true);
  assert.ok(QUALITY_PRESETS.ultra.shadowMapSize >= QUALITY_PRESETS.high.shadowMapSize);
});
