/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { getQualityPreset, calculateEffectivePixelRatio, DEFAULT_PRESET_KEY } from './presets.js';

/**
 * Detects whether the current browser session is running on software WebGL (SwiftShader, llvmpipe, WARP).
 * @returns {boolean}
 */
export function detectSoftwareGl() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Creates and initializes WebGPURenderer with automatic WebGL2 fallback.
 * Configures consistent color management, ACES filmic tone mapping, and quality presets.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas element.
 * @param {Object} [options]
 * @param {string} [options.presetKey='high'] - Initial quality preset ('low', 'medium', 'high', 'ultra').
 * @param {boolean} [options.forceWebGL=false] - Explicitly force WebGL2 fallback.
 * @returns {Promise<{
 *   renderer: WebGPURenderer,
 *   activeBackend: string,
 *   isWebGPU: boolean,
 *   isFallback: boolean,
 *   fallbackReason: string | null,
 *   isSoftwareGl: boolean,
 *   currentPreset: Object,
 *   applyPreset: (presetKey: string) => Object,
 *   resize: (w: number, h: number) => void,
 *   dispose: () => void
 * }>}
 */
export async function createRenderer(canvas, options = {}) {
  const initialPresetKey = options.presetKey || DEFAULT_PRESET_KEY;
  const isSoftwareGl = detectSoftwareGl();
  let currentPreset = getQualityPreset(initialPresetKey);

  let activeBackend = 'Initializing...';
  let isWebGPU = false;
  let isFallback = false;
  let fallbackReason = null;
  let renderer = null;

  const antialias = currentPreset.antialias && !isSoftwareGl;

  // Check if WebGPU is supported by the browser
  const hasWebGpuSupport = typeof navigator !== 'undefined' && Boolean(navigator.gpu);

  if (hasWebGpuSupport && !options.forceWebGL) {
    try {
      renderer = new WebGPURenderer({
        canvas,
        antialias,
        powerPreference: 'high-performance',
        alpha: false,
      });

      await renderer.init();

      if (renderer.backend && renderer.backend.isWebGPUBackend) {
        activeBackend = 'WebGPU';
        isWebGPU = true;
        isFallback = false;
        fallbackReason = null;
      } else if (renderer.backend && renderer.backend.isWebGLBackend) {
        activeBackend = 'WebGL2 (Fallback)';
        isWebGPU = false;
        isFallback = true;
        fallbackReason = 'WebGPU adapter unavailable; runtime automatically selected WebGL2';
      }
    } catch (webGpuError) {
      console.warn('WebGPURenderer: WebGPU initialization failed, initiating automatic WebGL2 fallback:', webGpuError);
      fallbackReason = webGpuError.message || 'WebGPU init rejected';
      if (renderer) {
        try { renderer.dispose(); } catch {}
        renderer = null;
      }
    }
  } else {
    fallbackReason = hasWebGpuSupport
      ? 'WebGL2 forced by configuration'
      : 'WebGPU is not supported by this browser/runtime (navigator.gpu is unavailable)';
  }

  // Automatic WebGL2 fallback if WebGPU could not be initialized
  if (!renderer) {
    try {
      renderer = new WebGPURenderer({
        canvas,
        antialias,
        powerPreference: 'high-performance',
        alpha: false,
        forceWebGL: true,
      });
      await renderer.init();
      activeBackend = 'WebGL2 (Fallback)';
      isWebGPU = false;
      isFallback = true;
    } catch (fallbackError) {
      console.error('Fatal: Both WebGPU and WebGL2 renderer initialization failed:', fallbackError);
      throw fallbackError;
    }
  }

  // Physically based color pipeline and tone mapping (consistent across both backends)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /**
   * Applies quality preset parameters to renderer and shadows.
   * @param {string} presetKey
   * @returns {Object} Updated preset object
   */
  const applyPreset = (presetKey) => {
    currentPreset = getQualityPreset(presetKey);
    const pixelRatio = calculateEffectivePixelRatio(currentPreset.id, window.devicePixelRatio || 1, isSoftwareGl);
    renderer.setPixelRatio(pixelRatio);

    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = currentPreset.shadows && !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    return currentPreset;
  };

  applyPreset(initialPresetKey);

  const setExposure = (val) => {
    if (typeof val === 'number' && val > 0) {
      renderer.toneMappingExposure = val;
    }
  };

  const resize = (width, height) => {
    renderer.setSize(width, height, false);
  };

  const dispose = () => {
    try {
      renderer.dispose();
    } catch (e) {
      console.warn('Error during renderer disposal:', e);
    }
  };

  return {
    renderer,
    activeBackend,
    isWebGPU,
    isFallback,
    fallbackReason,
    isSoftwareGl,
    currentPreset,
    applyPreset,
    setExposure,
    resize,
    dispose,
  };
}
