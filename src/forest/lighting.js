/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Creates physically based natural outdoor lighting for the forest environment:
 * - Directional sunlight with warm natural daylight and golden-hour capabilities
 * - Hemisphere light simulating sky dome light and rich forest floor bounce
 * - Ambient fill ensuring realistic shadow depths
 *
 * @param {THREE.Vector3} [sunDirection] - Normalized vector towards the sun in the sky.
 * @param {boolean} [isSoftwareGl=false] - Whether running under software WebGL.
 * @param {Object} [initialTimeConfig] - Initial Time of Day configuration.
 * @returns {{
 *   group: THREE.Group,
 *   sunLight: THREE.DirectionalLight,
 *   hemiLight: THREE.HemisphereLight,
 *   ambientLight: THREE.AmbientLight,
 *   updateSunPosition: (dir: THREE.Vector3) => void,
 *   setTimeOfDay: (timeConfig: Object) => void,
 *   updateQuality: (preset: Object) => void,
 *   dispose: () => void
 * }}
 */
export function createLighting(sunDirection, isSoftwareGl = false, initialTimeConfig = null) {
  const group = new THREE.Group();
  group.name = 'LightingRig';

  const defaultSunColor = initialTimeConfig ? initialTimeConfig.sunColor : 0xffeed4;
  const defaultSunIntensity = initialTimeConfig ? initialTimeConfig.sunIntensity : 2.2;
  const defaultHemiSky = initialTimeConfig ? initialTimeConfig.hemisphere.skyColor : 0x6ca0d8;
  const defaultHemiGround = initialTimeConfig ? initialTimeConfig.hemisphere.groundColor : 0x2b3820;
  const defaultHemiIntensity = initialTimeConfig ? initialTimeConfig.hemisphere.intensity : 0.85;
  const defaultAmbientColor = initialTimeConfig ? initialTimeConfig.ambient.color : 0x253528;
  const defaultAmbientIntensity = initialTimeConfig ? initialTimeConfig.ambient.intensity : 0.35;

  // 1. Directional Sunlight
  const sunLight = new THREE.DirectionalLight(defaultSunColor, defaultSunIntensity);
  sunLight.name = 'SunLight';
  sunLight.castShadow = !isSoftwareGl;

  if (sunLight.castShadow) {
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 800;

    const d = 260;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0002;
    sunLight.shadow.normalBias = 0.02;
  }

  // Ensure sunLight target is in the scene hierarchy so transform updates apply
  group.add(sunLight);
  group.add(sunLight.target);

  // 2. Hemisphere Light: simulates sky dome radiation and ground bounce
  const hemiLight = new THREE.HemisphereLight(defaultHemiSky, defaultHemiGround, defaultHemiIntensity);
  hemiLight.name = 'HemisphereLight';
  hemiLight.position.set(0, 100, 0);
  group.add(hemiLight);

  // 3. Ambient Light: subtle base fill
  const ambientLight = new THREE.AmbientLight(defaultAmbientColor, defaultAmbientIntensity);
  ambientLight.name = 'AmbientLight';
  group.add(ambientLight);

  // Helper to align directional light with the sun's spherical position
  const updateSunPosition = (dir) => {
    const distance = 500;
    const centerZ = -150;
    sunLight.position.set(dir.x * distance, dir.y * distance, centerZ + dir.z * distance);
    sunLight.target.position.set(0, 0, centerZ);
    sunLight.target.updateMatrixWorld();
  };

  if (sunDirection) {
    updateSunPosition(sunDirection);
  } else {
    updateSunPosition(new THREE.Vector3(0.35, 0.58, -0.73).normalize());
  }

  /**
   * Applies Time of Day parameters to the lighting rig.
   * @param {Object} timeConfig - Configuration from TIME_OF_DAY.
   */
  const setTimeOfDay = (timeConfig) => {
    if (!timeConfig) return;
    sunLight.color.setHex(timeConfig.sunColor);
    sunLight.intensity = timeConfig.sunIntensity;

    hemiLight.color.setHex(timeConfig.hemisphere.skyColor);
    hemiLight.groundColor.setHex(timeConfig.hemisphere.groundColor);
    hemiLight.intensity = timeConfig.hemisphere.intensity;

    ambientLight.color.setHex(timeConfig.ambient.color);
    ambientLight.intensity = timeConfig.ambient.intensity;
  };

  /**
   * Adapts shadow maps and resolution based on quality preset.
   * @param {Object} preset
   */
  const updateQuality = (preset) => {
    if (!preset) return;
    sunLight.castShadow = preset.shadows && !isSoftwareGl;
    if (sunLight.shadow) {
      sunLight.shadow.mapSize.width = preset.shadowMapSize || 2048;
      sunLight.shadow.mapSize.height = preset.shadowMapSize || 2048;
      if (sunLight.shadow.map) {
        sunLight.shadow.map.dispose();
        sunLight.shadow.map = null;
      }
    }
  };

  const dispose = () => {
    if (sunLight.shadow && sunLight.shadow.map) {
      sunLight.shadow.map.dispose();
    }
  };

  return {
    group,
    sunLight,
    hemiLight,
    ambientLight,
    updateSunPosition,
    setTimeOfDay,
    updateQuality,
    dispose,
  };
}
