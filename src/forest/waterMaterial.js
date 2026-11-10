/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Procedurally generates an organic water ripple normal map on an HTML5 canvas.
 * Creates overlapping multi-frequency waves and gentle directional capillary ripples.
 *
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture | null}
 */
export function createWaterRippleNormalMap(size = 256) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Generate height perturbation map
  const heightData = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 4;
      const v = (y / size) * Math.PI * 6; // slightly elongated along stream flow (Y)

      // Multi-frequency undulating wave harmonics
      const wave1 = Math.sin(u * 1.5 + v * 2.0);
      const wave2 = Math.cos(u * 2.8 - v * 1.2) * 0.55;
      const wave3 = Math.sin(u * 4.2 + v * 3.8 + Math.cos(u * 2.0)) * 0.35;
      const wave4 = Math.cos(u * 8.0 - v * 7.0) * 0.18;

      heightData[y * size + x] = (wave1 + wave2 + wave3 + wave4);
    }
  }

  // 2. Convert height gradient to tangent-space normal map (RGB)
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const strength = 1.6;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = heightData[y * size + ((x - 1 + size) % size)];
      const right = heightData[y * size + ((x + 1) % size)];
      const up = heightData[((y - 1 + size) % size) * size + x];
      const down = heightData[((y + 1) % size) * size + x];

      const dx = (right - left) * strength;
      const dy = (down - up) * strength;

      // Normal vector [ -dx, -dy, 1.0 ] normalized
      const nz = 1.0;
      const len = Math.hypot(dx, dy, nz);

      const nx = -dx / len;
      const ny = -dy / len;
      const normalZ = nz / len;

      const idx = (y * size + x) * 4;
      // Map [-1, 1] to [0, 255]
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);     // R: X-tilt
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255); // G: Y-tilt
      data[idx + 2] = Math.round((normalZ * 0.5 + 0.5) * 255); // B: Z-up
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 8); // Tiling along stream ribbon
  texture.generateMipmaps = true;

  return texture;
}

/**
 * Procedurally generates a waterfall cascade foam and white-water streak texture.
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture | null}
 */
export function createWaterfallFoamTexture(size = 256) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base translucent water
  ctx.fillStyle = '#2e423a';
  ctx.fillRect(0, 0, size, size);

  // Vertical foam streaks in natural muted froth tones
  for (let i = 0; i < 75; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 1.2 + Math.random() * 3.5;
    const h = 20 + Math.random() * 60;

    const alpha = 0.15 + Math.random() * 0.35;
    ctx.fillStyle = `rgba(185, 208, 198, ${alpha})`;
    ctx.fillRect(x - w / 2, y, w, h);
  }

  // Soft aerated foam bubbles at base
  for (let j = 0; j < 45; j++) {
    const bx = Math.random() * size;
    const by = (0.6 + Math.random() * 0.4) * size;
    const br = 1.8 + Math.random() * 4.0;

    ctx.fillStyle = 'rgba(195, 215, 206, 0.45)';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;

  return texture;
}

/**
 * Procedurally generates a wet stream bed gravel and sediment texture.
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture | null}
 */
export function createStreamBedTexture(size = 256) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Dark wet river sediment loam
  ctx.fillStyle = '#2d2720';
  ctx.fillRect(0, 0, size, size);

  // 2. Fine submerged sand/gravel particles
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 36;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain * 0.95));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain * 0.85));
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Rounded river pebbles embedded in the silt
  for (let p = 0; p < 75; p++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const rx = 3 + Math.random() * 8;
    const ry = 2 + Math.random() * 6;
    const angle = Math.random() * Math.PI;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    const stoneLuma = 65 + Math.random() * 55;
    ctx.fillStyle = `rgb(${stoneLuma}, ${stoneLuma * 0.94}, ${stoneLuma * 0.88})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 16);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;

  return texture;
}

/**
 * Creates physically based water materials for stream surface, waterfall, stream bed, and wet rocks.
 *
 * @param {Object} [options]
 * @param {boolean} [options.isSoftwareGl=false]
 * @param {number} [options.maxAnisotropy=8]
 * @returns {Object}
 */
export function createWaterMaterials(options = {}) {
  const { isSoftwareGl = false, maxAnisotropy = 8 } = options;

  const waterNormalMap = createWaterRippleNormalMap(256);
  const waterfallFoamMap = createWaterfallFoamTexture(256);
  const streamBedMap = createStreamBedTexture(256);

  const aniso = isSoftwareGl ? 1 : Math.min(maxAnisotropy, 8);
  if (waterNormalMap) waterNormalMap.anisotropy = aniso;
  if (waterfallFoamMap) waterfallFoamMap.anisotropy = aniso;
  if (streamBedMap) streamBedMap.anisotropy = aniso;

  // 1. Woodland Stream Water Surface Material
  // Natural muted forest tones (slate-moss blue-green), controlled transparency, high specularity
  const waterSurfaceMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c433b, // Natural forest brook green-grey
    roughness: isSoftwareGl ? 0.22 : 0.16,
    metalness: 0.08,
    transparent: true,
    opacity: 0.88,
    normalMap: waterNormalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -2.0,
    depthWrite: false, // Prevents z-fighting and allows underwater bed to show through
  });

  // 2. Waterfall Tumbling Cascade Material
  // White-water streaks, aerated froth, rapid downstream flow
  const waterfallMaterial = new THREE.MeshStandardMaterial({
    color: 0x486258, // Natural muted woodland cascade green-grey
    map: waterfallFoamMap,
    roughness: 0.22,
    metalness: 0.06,
    transparent: true,
    opacity: 0.88,
    normalMap: waterNormalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2.0,
    polygonOffsetUnits: -4.0,
  });

  // 3. Submerged Stream Bed & Wet Bank Material
  // Dark wet silt, embedded gravel, darker damp verges
  const streamBedMaterial = new THREE.MeshStandardMaterial({
    color: 0x483e33,
    roughness: 0.84,
    metalness: 0.02,
    map: streamBedMap,
    polygonOffset: true,
    polygonOffsetFactor: -1.5,
    polygonOffsetUnits: -3.0,
  });

  // 4. Wet Splash Rock Material
  // Rocks directly on banks, waterfall crest, and plunge pool rim
  // Darker albedo, lower roughness (glistening wet sheen)
  const wetRockMaterial = new THREE.MeshStandardMaterial({
    color: 0x4d463d, // Darker wet granite stone
    roughness: 0.34, // Smooth glistening surface
    metalness: 0.04,
  });

  return {
    materials: {
      waterSurface: waterSurfaceMaterial,
      waterfall: waterfallMaterial,
      streamBed: streamBedMaterial,
      wetRock: wetRockMaterial,
    },
    textures: {
      waterNormalMap,
      waterfallFoamMap,
      streamBedMap,
    },
    updateQuality: (preset) => {
      if (!preset) return;
      const newAniso = isSoftwareGl ? 1 : Math.min(preset.anisotropy || 8, 8);
      if (waterNormalMap) waterNormalMap.anisotropy = newAniso;
      if (waterfallFoamMap) waterfallFoamMap.anisotropy = newAniso;
      if (streamBedMap) streamBedMap.anisotropy = newAniso;
    },
    dispose: () => {
      waterSurfaceMaterial.dispose();
      waterfallMaterial.dispose();
      streamBedMaterial.dispose();
      wetRockMaterial.dispose();
      if (waterNormalMap) waterNormalMap.dispose();
      if (waterfallFoamMap) waterfallFoamMap.dispose();
      if (streamBedMap) streamBedMap.dispose();
    },
  };
}
