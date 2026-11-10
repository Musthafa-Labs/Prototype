/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  fog,
  uniform,
  float,
  positionView,
  positionWorld,
  smoothstep,
  mix,
  Fn
} from 'three/tsl';
import { createAtmosphericSky } from './sky.js';
import { createLighting } from './lighting.js';
import { createNaturalTerrain } from './terrain.js';
import { createForestRoad } from './road.js';
import { createVegetationSystem } from './vegetation.js';
import { createForestFloorSystem } from './forestFloor.js';
import { createForestStreamSystem } from './stream.js';
import { getTimeOfDayConfig, DEFAULT_TIME_OF_DAY } from './timeOfDay.js';

/**
 * Creates and initializes the complete 3D scene for The Hidden Forest.
 * Configures physical sky, dynamic sunlight, hemisphere ambient lighting,
 * height-varied atmospheric distance fog, rolling natural terrain, and winding forest road.
 *
 * @param {Object} [options]
 * @param {boolean} [options.isSoftwareGl=false] - Whether running under software WebGL.
 * @param {Object} [options.preset] - Initial quality preset.
 * @param {string} [options.timeOfDay='morning'] - Initial time of day.
 * @returns {{
 *   scene: THREE.Scene,
 *   sky: ReturnType<typeof createAtmosphericSky>,
 *   lighting: ReturnType<typeof createLighting>,
 *   terrain: ReturnType<typeof createNaturalTerrain>,
 *   road: ReturnType<typeof createForestRoad>,
 *   ground: ReturnType<typeof createNaturalTerrain>,
 *   currentTimeConfig: Object,
 *   setTimeOfDay: (timeKey: string) => Object,
 *   updateQuality: (preset: Object) => void,
 *   dispose: () => void
 * }}
 */
export function createForestScene(options = {}) {
  const { isSoftwareGl = false, preset = null, timeOfDay = DEFAULT_TIME_OF_DAY } = options;
  const maxAnisotropy = preset ? preset.anisotropy : 8;
  let currentTimeConfig = getTimeOfDayConfig(timeOfDay);

  const scene = new THREE.Scene();
  scene.name = 'TheHiddenForestScene';

  // 1. Natural Atmospheric Sky (TSL SkyMesh)
  const sky = createAtmosphericSky({
    elevation: currentTimeConfig.sunElevation,
    azimuth: currentTimeConfig.sunAzimuth,
    turbidity: currentTimeConfig.sky.turbidity,
    rayleigh: currentTimeConfig.sky.rayleigh,
    mieCoefficient: currentTimeConfig.sky.mieCoefficient,
    mieDirectionalG: currentTimeConfig.sky.mieDirectionalG,
    luminance: currentTimeConfig.sky.luminance || 0.16,
    cloudCoverage: 0.0,
  });
  scene.add(sky.mesh);

  // 2. TSL Atmospheric Height-and-Distance Fog
  // Combines distance-based range fog with height-based valley density
  const fogColorUniform = uniform(new THREE.Color(currentTimeConfig.fog.color));
  const fogNearUniform = uniform(currentTimeConfig.fog.near);
  const fogFarUniform = uniform(currentTimeConfig.fog.far);
  const fogMaxHeightUniform = uniform(currentTimeConfig.fog.maxHeight);

  const heightDistanceFogNode = Fn(() => {
    // Distance factor (increases into the distance in view space)
    const viewZ = positionView.z.negate();
    const distFactor = smoothstep(fogNearUniform, fogFarUniform, viewZ);

    // Height factor: fog is thickest in valleys / ground level (y <= 0) and softens upwards
    const heightRatio = smoothstep(fogMaxHeightUniform, float(0.0), positionWorld.y);
    const heightFactor = mix(float(0.4), float(1.0), heightRatio);

    return distFactor.mul(heightFactor).clamp(0.0, 1.0);
  });

  // Assign TSL fogNode (used by WebGPURenderer across WebGPU and WebGL2)
  scene.fogNode = fog(fogColorUniform, heightDistanceFogNode());

  // Also maintain standard THREE.Fog and background for standard fallback passes
  const standardFog = new THREE.Fog(
    currentTimeConfig.fog.color,
    currentTimeConfig.fog.near,
    currentTimeConfig.fog.far
  );
  scene.fog = standardFog;
  scene.background = new THREE.Color(currentTimeConfig.fog.color);

  // 3. Directional Sunlight & Ambient Lighting Rig
  const lighting = createLighting(sky.sunDirection, isSoftwareGl, currentTimeConfig);
  if (preset) lighting.updateQuality(preset);
  scene.add(lighting.group);

  // 4. Natural Rolling Terrain (2200m expanse + 3800m radial horizon skirt)
  const terrain = createNaturalTerrain({
    terrainSize: 2200,
    segments: 160,
    maxAnisotropy,
  });
  scene.add(terrain.group);

  // 5. Winding Forest Access Road (curves through terrain contours and valleys)
  const road = createForestRoad({
    roadWidth: 5.2,
    subdivisions: 320,
    crossSegments: 4,
    maxAnisotropy,
  });
  scene.add(road.mesh);

  // 6. Forest Trees & Dense Understory Vegetation System
  const vegetation = createVegetationSystem({
    isSoftwareGl,
    preset,
    maxAnisotropy,
  });
  scene.add(vegetation.group);

  // 7. Forest Floor Detail System (Grass, Ferns, Rocks, Deadwood, Fallen Logs)
  const forestFloor = createForestFloorSystem({
    isSoftwareGl,
    preset,
    maxAnisotropy,
  });
  scene.add(forestFloor.group);

  // 8. Woodland Stream & Natural Waterfall System
  const stream = createForestStreamSystem({
    isSoftwareGl,
    preset,
    maxAnisotropy,
  });
  scene.add(stream.group);

  /**
   * Dynamically applies a new Time of Day configuration to sky, lighting, and fog.
   * @param {string} timeKey - 'morning', 'noon', 'afternoon', 'goldenHour'
   * @returns {Object} Updated time config
   */
  const setTimeOfDay = (timeKey) => {
    currentTimeConfig = getTimeOfDayConfig(timeKey);

    // Update Sky
    const newSunDir = sky.setSunPosition(currentTimeConfig.sunElevation, currentTimeConfig.sunAzimuth);
    sky.updateAtmosphere(currentTimeConfig.sky);

    // Update Lighting
    lighting.updateSunPosition(newSunDir);
    lighting.setTimeOfDay(currentTimeConfig);

    // Update TSL Fog Uniforms
    fogColorUniform.value.set(currentTimeConfig.fog.color);
    fogNearUniform.value = currentTimeConfig.fog.near;
    fogFarUniform.value = currentTimeConfig.fog.far;
    fogMaxHeightUniform.value = currentTimeConfig.fog.maxHeight;

    // Update standard fog & background
    scene.fog.color.set(currentTimeConfig.fog.color);
    scene.fog.near = currentTimeConfig.fog.near;
    scene.fog.far = currentTimeConfig.fog.far;
    scene.background.set(currentTimeConfig.fog.color);

    // Update Stream
    stream.setTimeOfDay(currentTimeConfig);

    return currentTimeConfig;
  };

  const updateQuality = (newPreset) => {
    lighting.updateQuality(newPreset);
    terrain.updateQuality(newPreset);
    road.updateQuality(newPreset);
    vegetation.updateQuality(newPreset);
    forestFloor.updateQuality(newPreset);
    stream.updateQuality(newPreset);
  };

  const dispose = () => {
    sky.dispose();
    lighting.dispose();
    terrain.dispose();
    road.dispose();
    vegetation.dispose();
    forestFloor.dispose();
    stream.dispose();
  };

  return {
    scene,
    sky,
    lighting,
    terrain,
    road,
    vegetation,
    forestFloor,
    stream,
    ground: terrain, // preserve backward compatibility
    get currentTimeConfig() {
      return currentTimeConfig;
    },
    setTimeOfDay,
    updateQuality,
    dispose,
  };
}
