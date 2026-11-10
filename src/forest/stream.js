/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { STREAM_WAYPOINTS, createStreamSpline, WATERFALL_CONFIG } from './streamPath.js';
import { createWaterMaterials } from './waterMaterial.js';
import { createWaterSurface } from './waterSurface.js';
import { createStreamBed } from './streamBed.js';
import { createWaterfall } from './waterfall.js';

/**
 * Creates and coordinates the complete woodland stream and waterfall system:
 * - Natural stream path following the low-lying terrain valley
 * - Modular water surface with realistic ripples and natural width variation
 * - Visible submerged stream bed and river stones
 * - Small natural rocky waterfall and tranquil plunge pool
 * - Subtle downstream flow animation
 * - Full WebGPU and WebGL2 fallback compatibility
 *
 * @param {Object} [options]
 * @param {boolean} [options.isSoftwareGl=false]
 * @param {Object} [options.preset]
 * @param {number} [options.maxAnisotropy=8]
 * @returns {{
 *   group: THREE.Group,
 *   update: (delta: number) => void,
 *   updateQuality: (preset: Object) => void,
 *   setTimeOfDay: (timeConfig: Object) => void,
 *   getInfo: () => Object,
 *   dispose: () => void
 * }}
 */
export function createForestStreamSystem(options = {}) {
  const { isSoftwareGl = false, preset = null, maxAnisotropy = 8 } = options;

  const group = new THREE.Group();
  group.name = 'WoodlandStreamSystem';

  // 1. Shared Catmull-Rom Spline
  const spline = createStreamSpline(STREAM_WAYPOINTS);
  const totalLength = Math.round(spline.getLength());

  // 2. Physically Based Water Materials
  const waterMaterials = createWaterMaterials({
    isSoftwareGl,
    maxAnisotropy: preset ? preset.anisotropy : maxAnisotropy,
  });

  // 3. Submerged Stream Bed & Wet Bank Verges
  const streamBed = createStreamBed({
    spline,
    materials: waterMaterials.materials,
    isSoftwareGl,
  });
  group.add(streamBed.group);

  // 4. Modular Water Surface Ribbon
  const waterSurface = createWaterSurface({
    spline,
    material: waterMaterials.materials.waterSurface,
    subdivisions: isSoftwareGl ? 120 : 180,
  });
  group.add(waterSurface.mesh);

  // 5. Small Woodland Waterfall & Plunge Pool
  const waterfall = createWaterfall({
    materials: waterMaterials,
    isSoftwareGl,
  });
  group.add(waterfall.group);

  // Flow animation state
  let flowTime = 0;
  const flowSpeed = 0.14; // Subtle natural woodland water velocity (m/s)

  /**
   * Updates stream water flow, waterfall cascade, and plunge pool mist.
   * @param {number} delta - Frame time in seconds.
   */
  const update = (delta) => {
    flowTime += delta;

    // 1. Subtle directional downstream flow on the water surface normal map
    if (waterMaterials.textures.waterNormalMap) {
      waterMaterials.textures.waterNormalMap.offset.y -= delta * flowSpeed;
      // Very gentle lateral wave shimmer
      waterMaterials.textures.waterNormalMap.offset.x = Math.sin(flowTime * 0.4) * 0.02;
    }

    // 2. Update waterfall cascade and splash pool
    waterfall.update(delta);
  };

  /**
   * Applies visual quality preset to water textures and anisotropy.
   * @param {Object} newPreset
   */
  const updateQuality = (newPreset) => {
    waterMaterials.updateQuality(newPreset);
  };

  /**
   * Adapts water surface highlights and reflections to the active time of day.
   * @param {Object} timeConfig
   */
  const setTimeOfDay = (timeConfig) => {
    if (!timeConfig) return;

    // Golden hour: warm amber low-sun reflections without artificial orange cast
    if (timeConfig.id === 'goldenHour') {
      waterMaterials.materials.waterSurface.color.setHex(0x384c42);
      waterMaterials.materials.waterSurface.roughness = isSoftwareGl ? 0.20 : 0.14;
    } else if (timeConfig.id === 'noon') {
      waterMaterials.materials.waterSurface.color.setHex(0x31483f);
      waterMaterials.materials.waterSurface.roughness = isSoftwareGl ? 0.22 : 0.16;
    } else if (timeConfig.id === 'afternoon') {
      waterMaterials.materials.waterSurface.color.setHex(0x334b41);
      waterMaterials.materials.waterSurface.roughness = isSoftwareGl ? 0.21 : 0.15;
    } else {
      // Morning
      waterMaterials.materials.waterSurface.color.setHex(0x344b42);
      waterMaterials.materials.waterSurface.roughness = isSoftwareGl ? 0.22 : 0.16;
    }
  };

  const getInfo = () => ({
    streamLength: `${totalLength}m`,
    streamWidthRange: '2.4m - 6.8m',
    waterfallDrop: `${WATERFALL_CONFIG.cascadeHeightDrop}m`,
    activePools: 'Waterfall Plunge Pool (6.8m) & Woodland Glade Pool (6.2m)',
    flowSpeed: `${flowSpeed} m/s downstream`,
    flowBackend: isSoftwareGl ? 'Software Safe WebGL2' : 'Hardware Accelerated',
  });

  const dispose = () => {
    waterMaterials.dispose();
    waterSurface.dispose();
    streamBed.dispose();
    waterfall.dispose();
  };

  return {
    group,
    update,
    updateQuality,
    setTimeOfDay,
    getInfo,
    dispose,
  };
}
