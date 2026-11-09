/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { calculateCameraParameters, DEFAULT_EYE_HEIGHT } from './math.js';
import { getTerrainHeight } from './terrainElevation.js';

/**
 * Creates and configures the first-person human-eye perspective camera.
 * Positioned at approximately 1.7 meters above the terrain, looking out across the landscape and winding road.
 *
 * @param {number} aspect - Initial viewport aspect ratio (width / height).
 * @param {number} [eyeHeight=1.7] - Camera height in meters above local terrain.
 * @returns {{ camera: THREE.PerspectiveCamera, resize: (aspect: number) => void }}
 */
export function createCamera(aspect = window.innerWidth / window.innerHeight, eyeHeight = DEFAULT_EYE_HEIGHT) {
  const config = calculateCameraParameters({
    eyeHeight,
    fov: 60,
    aspect,
    near: 0.1,
    far: 2500,
  });

  const camera = new THREE.PerspectiveCamera(
    config.fov,
    config.aspect,
    config.near,
    config.far
  );

  // Position at human eye level (1.7m) above the local terrain elevation at starting point
  const startX = 0;
  const startZ = 0;
  const groundY = getTerrainHeight(startX, startZ);
  camera.position.set(startX, groundY + eyeHeight, startZ);

  // Direct the gaze down the winding forest road and across the scenic landscape
  const targetX = 4.0;
  const targetZ = -55.0;
  const targetGroundY = getTerrainHeight(targetX, targetZ);
  camera.lookAt(targetX, targetGroundY + 0.9, targetZ);
  camera.updateMatrixWorld();

  const resize = (newAspect) => {
    camera.aspect = newAspect;
    camera.updateProjectionMatrix();
  };

  return {
    camera,
    resize,
  };
}
