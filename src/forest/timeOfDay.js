/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Time of Day configurations and atmospheric lighting models for The Hidden Forest.
 * Defines sun positions, physical sky scattering, hemisphere ambient bounce,
 * distance & height fog parameters, and tone mapping exposure for Morning, Noon, Afternoon, and Golden Hour.
 */

export const TIME_OF_DAY = {
  morning: {
    id: 'morning',
    name: 'Morning',
    description: 'Crisp early daylight with soft blue atmospheric scatter',
    sunElevation: 24,
    sunAzimuth: 65, // Slanted morning sun shining across landscape from east
    sunColor: 0xffeed4,
    sunIntensity: 2.8,
    sky: {
      turbidity: 2.2,
      rayleigh: 3.2,
      mieCoefficient: 0.002,
      mieDirectionalG: 0.82,
      luminance: 0.16,
    },
    hemisphere: {
      skyColor: 0x82b4ea,
      groundColor: 0x485c38,
      intensity: 1.45,
    },
    ambient: {
      color: 0x3d5038,
      intensity: 0.70,
    },
    fog: {
      color: 0x88b0d4,
      near: 45,
      far: 950,
      heightDensity: 0.003,
      maxHeight: 35,
    },
    toneMappingExposure: 0.95,
  },
  noon: {
    id: 'noon',
    name: 'Noon',
    description: 'High-sun clear daylight with rich azure sky',
    sunElevation: 70,
    sunAzimuth: 175, // Overhead-south sun shining directly across the terrain
    sunColor: 0xfffaf2,
    sunIntensity: 3.0,
    sky: {
      turbidity: 1.8,
      rayleigh: 2.8,
      mieCoefficient: 0.0015,
      mieDirectionalG: 0.8,
      luminance: 0.13,
    },
    hemisphere: {
      skyColor: 0x76aae5,
      groundColor: 0x526840,
      intensity: 1.55,
    },
    ambient: {
      color: 0x40553c,
      intensity: 0.75,
    },
    fog: {
      color: 0x80a8d2,
      near: 55,
      far: 1050,
      heightDensity: 0.002,
      maxHeight: 30,
    },
    toneMappingExposure: 0.92,
  },
  afternoon: {
    id: 'afternoon',
    name: 'Afternoon',
    description: 'Warm slanted daylight with balanced atmospheric depth',
    sunElevation: 38,
    sunAzimuth: 235, // Slanted afternoon sun casting lateral hill shadows
    sunColor: 0xfff0d6,
    sunIntensity: 2.8,
    sky: {
      turbidity: 2.4,
      rayleigh: 3.0,
      mieCoefficient: 0.0025,
      mieDirectionalG: 0.82,
      luminance: 0.15,
    },
    hemisphere: {
      skyColor: 0x7caee0,
      groundColor: 0x4e623c,
      intensity: 1.45,
    },
    ambient: {
      color: 0x3e523a,
      intensity: 0.70,
    },
    fog: {
      color: 0x88b0d2,
      near: 50,
      far: 980,
      heightDensity: 0.0025,
      maxHeight: 35,
    },
    toneMappingExposure: 0.95,
  },
  goldenHour: {
    id: 'goldenHour',
    name: 'Golden Hour',
    description: 'Low amber sunlight casting long dramatic shadows and glowing valley haze',
    sunElevation: 10.5,
    sunAzimuth: 255, // Low western sun raking across rolling hills
    sunColor: 0xff9940,
    sunIntensity: 3.8,
    sky: {
      turbidity: 3.5,
      rayleigh: 3.8,
      mieCoefficient: 0.004,
      mieDirectionalG: 0.85,
      luminance: 0.24,
    },
    hemisphere: {
      skyColor: 0x7890c0,
      groundColor: 0x5a4228,
      intensity: 1.35,
    },
    ambient: {
      color: 0x503a26,
      intensity: 0.75,
    },
    fog: {
      color: 0xcca070,
      near: 30,
      far: 850,
      heightDensity: 0.004,
      maxHeight: 45,
    },
    toneMappingExposure: 1.0,
  },
};

export const DEFAULT_TIME_OF_DAY = 'morning';

/**
 * Validates and retrieves a Time of Day configuration.
 * @param {string} key - 'morning', 'noon', 'afternoon', 'goldenHour'
 * @returns {typeof TIME_OF_DAY[keyof typeof TIME_OF_DAY]}
 */
export function getTimeOfDayConfig(key) {
  const normalized = String(key || '').toLowerCase().trim();
  if (normalized === 'goldenhour' || normalized === 'golden-hour' || normalized === 'golden_hour') {
    return TIME_OF_DAY.goldenHour;
  }
  if (TIME_OF_DAY[normalized]) {
    return TIME_OF_DAY[normalized];
  }
  return TIME_OF_DAY[DEFAULT_TIME_OF_DAY];
}
