/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import { vec4, uniform } from 'three/tsl';

/**
 * Creates an atmospheric sky using Three.js WebGPU / TSL SkyMesh.
 * Implements physical Rayleigh and Mie scattering models with TSL node architecture.
 * Calibrates sky radiance via TSL color nodes to prevent overexposure under ACES Filmic tone mapping.
 *
 * @param {Object} [options]
 * @param {number} [options.elevation=22] - Sun elevation angle above horizon (degrees).
 * @param {number} [options.azimuth=115] - Sun horizontal azimuth angle (degrees).
 * @param {number} [options.turbidity=2.2] - Atmospheric turbidity / haziness.
 * @param {number} [options.rayleigh=3.2] - Atmospheric blue light Rayleigh scattering coefficient.
 * @param {number} [options.mieCoefficient=0.002] - Mie scattering coefficient.
 * @param {number} [options.mieDirectionalG=0.82] - Solar forward scattering halo factor.
 * @param {number} [options.cloudCoverage=0.0] - Procedural cloud coverage.
 * @param {number} [options.luminance=0.16] - Calibrated sky luminance scale factor.
 * @returns {{
 *   mesh: SkyMesh,
 *   sunDirection: THREE.Vector3,
 *   setSunPosition: (elevation: number, azimuth: number) => THREE.Vector3,
 *   updateAtmosphere: (params: Object) => void,
 *   dispose: () => void
 * }}
 */
export function createAtmosphericSky(options = {}) {
  const {
    elevation = 22,
    azimuth = 115,
    turbidity = 2.2,
    rayleigh = 3.2,
    mieCoefficient = 0.002,
    mieDirectionalG = 0.82,
    cloudCoverage = 0.0,
    luminance = 0.16,
  } = options;

  const sky = new SkyMesh();
  sky.name = 'AtmosphericSky';
  sky.scale.setScalar(450000);

  if (sky.turbidity) sky.turbidity.value = turbidity;
  if (sky.rayleigh) sky.rayleigh.value = rayleigh;
  if (sky.mieCoefficient) sky.mieCoefficient.value = mieCoefficient;
  if (sky.mieDirectionalG) sky.mieDirectionalG.value = mieDirectionalG;
  if (sky.cloudCoverage) sky.cloudCoverage.value = cloudCoverage;

  // Calibrate sky radiance with TSL color node to ensure rich azure/blue skies
  const skyLuminanceUniform = uniform(luminance);
  if (sky.material && sky.material.colorNode) {
    sky.material.colorNode = vec4(sky.material.colorNode.rgb.mul(skyLuminanceUniform), 1.0);
  }

  const sunDirection = new THREE.Vector3();

  const setSunPosition = (elev, azim) => {
    const phi = THREE.MathUtils.degToRad(90 - elev);
    const theta = THREE.MathUtils.degToRad(azim);
    sunDirection.setFromSphericalCoords(1, phi, theta);
    if (sky.sunPosition) {
      sky.sunPosition.value.copy(sunDirection);
    }
    return sunDirection;
  };

  const updateAtmosphere = ({
    turbidity: turb,
    rayleigh: ray,
    mieCoefficient: mieC,
    mieDirectionalG: mieG,
    luminance: lum,
  }) => {
    if (turb !== undefined && sky.turbidity) sky.turbidity.value = turb;
    if (ray !== undefined && sky.rayleigh) sky.rayleigh.value = ray;
    if (mieC !== undefined && sky.mieCoefficient) sky.mieCoefficient.value = mieC;
    if (mieG !== undefined && sky.mieDirectionalG) sky.mieDirectionalG.value = mieG;
    if (lum !== undefined) skyLuminanceUniform.value = lum;
  };

  setSunPosition(elevation, azimuth);

  const dispose = () => {
    sky.geometry.dispose();
    if (sky.material) {
      sky.material.dispose();
    }
  };

  return {
    mesh: sky,
    sunDirection,
    setSunPosition,
    updateAtmosphere,
    dispose,
  };
}
