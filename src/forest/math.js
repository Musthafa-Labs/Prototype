/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure mathematical utilities and calculations for The Hidden Forest environment.
 * Decoupled from DOM and WebGL contexts for deterministic testing.
 */

/**
 * Standard human standing eye height in meters.
 */
export const DEFAULT_EYE_HEIGHT = 1.7;

/**
 * Calculates a 3D sun direction vector based on azimuth and elevation (in degrees).
 * @param {number} azimuthDeg - Horizontal angle in degrees (0 = North, 90 = East, 180 = South, 270 = West).
 * @param {number} elevationDeg - Elevation angle above the horizon in degrees (0 to 90).
 * @param {number} [distance=400] - Distance of the sun representation.
 * @returns {{ x: number, y: number, z: number, normalized: { x: number, y: number, z: number } }}
 */
export function calculateSunPosition(azimuthDeg, elevationDeg, distance = 400) {
  const phi = (90 - elevationDeg) * (Math.PI / 180);
  const theta = azimuthDeg * (Math.PI / 180);

  const x = Math.sin(phi) * Math.sin(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.cos(theta);

  return {
    x: x * distance,
    y: y * distance,
    z: z * distance,
    normalized: { x, y, z },
  };
}

/**
 * Calculates camera frustum and perspective properties for human eye view.
 * @param {Object} options
 * @param {number} [options.eyeHeight=1.7] - Camera height above ground plane (meters).
 * @param {number} [options.fov=60] - Field of view in degrees.
 * @param {number} [options.aspect=16/9] - Viewport aspect ratio.
 * @param {number} [options.near=0.1] - Near clip plane in meters.
 * @param {number} [options.far=1500] - Far clip plane in meters.
 * @returns {Object} Validated camera configuration.
 */
export function calculateCameraParameters({
  eyeHeight = DEFAULT_EYE_HEIGHT,
  fov = 60,
  aspect = 16 / 9,
  near = 0.1,
  far = 1500,
} = {}) {
  if (eyeHeight <= 0) {
    throw new Error('Camera eye height must be greater than zero');
  }
  if (fov <= 10 || fov >= 120) {
    throw new Error('Field of view must be between 10 and 120 degrees');
  }
  if (near <= 0 || far <= near) {
    throw new Error('Invalid clipping plane configuration');
  }

  // Calculate target look point: looking out at the horizon landscape
  // At height 1.7m, slightly tilted towards the gentle distance (-50m ahead, 1.6m high)
  const position = { x: 0, y: eyeHeight, z: 0 };
  const target = { x: 0, y: eyeHeight - 0.1, z: -50 };

  return {
    eyeHeight,
    fov,
    aspect,
    near,
    far,
    position,
    target,
  };
}

/**
 * Computes linear fog parameters based on desired landscape visibility.
 * @param {number} nearDistance - Distance where fog starts affecting visibility (meters).
 * @param {number} farDistance - Distance where objects are completely veiled in fog (meters).
 * @returns {{ near: number, far: number }}
 */
export function calculateAtmosphericFog(nearDistance = 25, farDistance = 450) {
  if (nearDistance >= farDistance) {
    throw new Error('Fog near distance must be less than far distance');
  }
  return {
    near: nearDistance,
    far: farDistance,
  };
}

/**
 * Validates ground surface dimensions and grid specifications.
 * @param {number} width - Ground width in meters.
 * @param {number} depth - Ground depth in meters.
 * @param {number} segments - Subdivision segment count.
 * @returns {{ width: number, depth: number, segments: number, area: number }}
 */
export function validateGroundParameters(width = 1000, depth = 1000, segments = 64) {
  if (width <= 0 || depth <= 0) {
    throw new Error('Ground dimensions must be positive');
  }
  if (segments < 1) {
    throw new Error('Ground segments must be at least 1');
  }
  return {
    width,
    depth,
    segments,
    area: width * depth,
  };
}

/**
 * Validates radial ground surface specifications.
 * @param {number} radius - Ground radius in meters.
 * @param {number} segments - Radial segment count.
 * @returns {{ radius: number, diameter: number, segments: number, area: number }}
 */
export function validateRadialGroundParameters(radius = 3500, segments = 96) {
  if (radius <= 0) {
    throw new Error('Ground radius must be positive');
  }
  if (segments < 3) {
    throw new Error('Ground segments must be at least 3');
  }
  return {
    radius,
    diameter: radius * 2,
    segments,
    area: Math.PI * radius * radius,
  };
}

