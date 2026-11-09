/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRenderer } from './renderer.js';
import { createCamera } from './camera.js';
import { createForestScene } from './scene.js';
import { DEFAULT_PRESET_KEY } from './presets.js';
import { DEFAULT_TIME_OF_DAY } from './timeOfDay.js';

/**
 * Coordinates and manages the complete lifecycle of The Hidden Forest 3D environment.
 * Supports WebGPURenderer with automatic WebGL2 fallback, dynamic quality presets,
 * and real-time Time of Day atmospheric lighting control.
 *
 * @param {HTMLCanvasElement} canvas - Target WebGL canvas element.
 * @param {Object} [options]
 * @param {string} [options.presetKey='high'] - Initial visual quality preset.
 * @param {string} [options.timeOfDay='morning'] - Initial time of day.
 * @param {boolean} [options.forceWebGL=false] - Explicitly force WebGL2 backend.
 * @returns {Promise<{
 *   start: () => void,
 *   stop: () => void,
 *   resize: (w: number, h: number) => void,
 *   setQualityPreset: (key: string) => Object,
 *   setTimeOfDay: (key: string) => Object,
 *   getInfo: () => Object,
 *   dispose: () => void
 * }>}
 */
export async function initForestEngine(canvas, options = {}) {
  if (!canvas) {
    throw new Error('Canvas element is required to initialize Forest Engine');
  }

  const presetKey = options.presetKey || DEFAULT_PRESET_KEY;
  const initialTimeOfDay = options.timeOfDay || DEFAULT_TIME_OF_DAY;

  // 1. Initialize WebGPURenderer with automatic WebGL2 fallback
  const {
    renderer,
    activeBackend,
    isWebGPU,
    isFallback,
    fallbackReason,
    isSoftwareGl,
    currentPreset: initialPreset,
    applyPreset,
    setExposure,
    resize: resizeRenderer,
    dispose: disposeRenderer,
  } = await createRenderer(canvas, {
    presetKey,
    forceWebGL: options.forceWebGL,
  });

  let activePreset = initialPreset;

  // 2. Initialize Camera (1.7m eye-level)
  const initialWidth = canvas.clientWidth || window.innerWidth || 800;
  const initialHeight = canvas.clientHeight || window.innerHeight || 600;
  const initialAspect = initialWidth / initialHeight;
  const { camera, resize: resizeCamera } = createCamera(initialAspect, 1.7);

  // 3. Initialize Scene (FogNode, SkyMesh, Sunlight & Ambient, Ground)
  const forestScene = createForestScene({
    isSoftwareGl,
    preset: activePreset,
    timeOfDay: initialTimeOfDay,
  });

  // Set initial exposure matching the time of day
  setExposure(forestScene.currentTimeConfig.toneMappingExposure);

  // Size renderer to initial container dimensions
  resizeRenderer(initialWidth, initialHeight);

  let isRunning = false;
  let frameId = 0;
  let frameCount = 0;
  let lastTime = performance.now();
  let currentFps = 60;

  /**
   * Software WebGL frame pacing mechanism: waits for GPU fence sync before scheduling next frame.
   * Prevents CPU lockup and Playwright screenshot starvation in headless environments.
   * @param {() => void} cb
   */
  function afterDraw(cb) {
    const gl = renderer.getContext ? renderer.getContext() : null;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 32);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 60);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  /**
   * Main render loop.
   */
  function tick() {
    if (!isRunning) return;

    renderer.render(forestScene.scene, camera);

    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      currentFps = Math.round((frameCount * 1000) / (now - lastTime));
      frameCount = 0;
      lastTime = now;
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  const start = () => {
    if (!isRunning) {
      isRunning = true;
      lastTime = performance.now();
      tick();
    }
  };

  const stop = () => {
    isRunning = false;
    if (frameId) {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      frameId = 0;
    }
  };

  const resize = (width, height) => {
    if (width <= 0 || height <= 0) return;
    resizeRenderer(width, height);
    resizeCamera(width / height);
    if (!isRunning) {
      renderer.render(forestScene.scene, camera);
    }
  };

  /**
   * Dynamically switches the active visual quality preset.
   * @param {string} newPresetKey - 'low', 'medium', 'high', 'ultra'
   * @returns {Object} Updated preset configuration
   */
  const setQualityPreset = (newPresetKey) => {
    activePreset = applyPreset(newPresetKey);
    forestScene.updateQuality(activePreset);
    if (!isRunning) {
      renderer.render(forestScene.scene, camera);
    }
    return activePreset;
  };

  /**
   * Dynamically switches the time of day and atmospheric lighting.
   * @param {string} timeKey - 'morning', 'noon', 'afternoon', 'goldenHour'
   * @returns {Object} Updated time of day configuration
   */
  const setTimeOfDay = (timeKey) => {
    const updatedTimeConfig = forestScene.setTimeOfDay(timeKey);
    setExposure(updatedTimeConfig.toneMappingExposure);
    if (!isRunning) {
      renderer.render(forestScene.scene, camera);
    }
    return updatedTimeConfig;
  };

  const getInfo = () => {
    const timeConf = forestScene.currentTimeConfig;
    return {
      activeBackend,
      isWebGPU,
      isFallback,
      fallbackReason,
      qualityPreset: activePreset.name,
      qualityPresetId: activePreset.id,
      timeOfDay: timeConf.name,
      timeOfDayId: timeConf.id,
      sunElevation: `${timeConf.sunElevation}°`,
      sunAzimuth: `${timeConf.sunAzimuth}°`,
      sunIntensity: timeConf.sunIntensity,
      resolutionScale: activePreset.resolutionScale,
      pixelRatio: Number((window.devicePixelRatio ? Math.min(window.devicePixelRatio, activePreset.maxPixelRatio) * activePreset.resolutionScale : 1).toFixed(2)),
      shadowsEnabled: activePreset.shadows && !isSoftwareGl,
      anisotropy: activePreset.anisotropy,
      cameraHeight: 1.7,
      fov: camera.fov,
      aspect: Number(camera.aspect.toFixed(2)),
      isSoftwareGl,
      fps: currentFps,
      toneMapping: 'ACES Filmic',
      exposure: timeConf.toneMappingExposure,
      totalTrees: forestScene.vegetation ? forestScene.vegetation.getInfo().totalTrees : 0,
      totalUnderstory: forestScene.vegetation ? forestScene.vegetation.getInfo().totalUnderstory : 0,
      totalFloorItems: forestScene.forestFloor ? forestScene.forestFloor.getInfo().totalFloorItems : 0,
      floorBreakdown: forestScene.forestFloor ? forestScene.forestFloor.getInfo() : null,
      activeSpecies: forestScene.vegetation ? forestScene.vegetation.getInfo().activeSpecies : 0,
      terrainExpanse: '2,200m Rolling Terrain (3,800m Horizon Skirt)',
      roadLength: `${forestScene.road ? forestScene.road.totalLength : 880}m Winding Dirt/Gravel Road`,
      groundSize: '2,200m Rolling Terrain & 880m Forest Road',
      fogType: `TSL Height-Distance (${timeConf.fog.near}m - ${timeConf.fog.far}m)`,
      tslSupported: true,
    };
  };

  const dispose = () => {
    stop();
    forestScene.dispose();
    disposeRenderer();
  };

  return {
    start,
    stop,
    resize,
    setQualityPreset,
    setTimeOfDay,
    getInfo,
    dispose,
  };
}
