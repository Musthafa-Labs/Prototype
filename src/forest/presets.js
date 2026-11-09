/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Visual Quality Presets for The Hidden Forest.
 * Configures resolution scaling, shadow maps, anisotropic filtering, and antialiasing
 * across both WebGPU and WebGL2 rendering backends.
 */

export const QUALITY_PRESETS = {
  low: {
    id: 'low',
    name: 'Low',
    resolutionScale: 0.75,
    maxPixelRatio: 1.0,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    anisotropy: 1,
    description: 'Prioritizes maximum frame rate on low-power devices.',
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    resolutionScale: 1.0,
    maxPixelRatio: 1.25,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    anisotropy: 4,
    description: 'Balanced fidelity and performance.',
  },
  high: {
    id: 'high',
    name: 'High',
    resolutionScale: 1.0,
    maxPixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    anisotropy: 8,
    description: 'High physical fidelity and sharp distance grazing angles.',
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    resolutionScale: 1.0,
    maxPixelRatio: 2.0,
    antialias: true,
    shadows: true,
    shadowMapSize: 4096,
    anisotropy: 16,
    description: 'Maximum resolution, full anisotropy, and uncompromised soft shadows.',
  },
};

export const DEFAULT_PRESET_KEY = 'high';

/**
 * Calculates effective pixel ratio based on device pixel ratio and quality preset.
 * @param {string} presetKey - One of 'low', 'medium', 'high', 'ultra'.
 * @param {number} [devicePixelRatio=1] - Current window.devicePixelRatio.
 * @param {boolean} [isSoftwareGl=false] - Whether running under software WebGL.
 * @returns {number}
 */
export function calculateEffectivePixelRatio(presetKey, devicePixelRatio = 1, isSoftwareGl = false) {
  const preset = QUALITY_PRESETS[presetKey] || QUALITY_PRESETS[DEFAULT_PRESET_KEY];
  if (isSoftwareGl) {
    // Under software WebGL (SwiftShader/headless), cap strictly at 1.0
    return Math.min(preset.maxPixelRatio, 1.0) * preset.resolutionScale;
  }
  const baseRatio = Math.min(devicePixelRatio || 1, preset.maxPixelRatio);
  return Math.max(0.5, baseRatio * preset.resolutionScale);
}

/**
 * Validates and retrieves a preset configuration by key.
 * @param {string} key
 * @returns {typeof QUALITY_PRESETS[keyof typeof QUALITY_PRESETS]}
 */
export function getQualityPreset(key) {
  const normalized = String(key || '').toLowerCase().trim();
  if (QUALITY_PRESETS[normalized]) {
    return QUALITY_PRESETS[normalized];
  }
  return QUALITY_PRESETS[DEFAULT_PRESET_KEY];
}
