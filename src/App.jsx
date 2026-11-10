/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { initForestEngine } from './forest/engine.js';
import { QUALITY_PRESETS } from './forest/presets.js';
import { TIME_OF_DAY } from './forest/timeOfDay.js';
import {
  Eye,
  Sun,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sliders,
  Sparkles,
  CloudSun,
  AlertCircle,
  CheckCircle2,
  Droplets,
} from 'lucide-react';

export default function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [isDockOpen, setIsDockOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

  const [engineInfo, setEngineInfo] = useState({
    activeBackend: 'Initializing...',
    isWebGPU: false,
    isFallback: false,
    fallbackReason: null,
    qualityPreset: 'High',
    qualityPresetId: 'high',
    timeOfDay: 'Morning',
    timeOfDayId: 'morning',
    sunElevation: '22°',
    sunAzimuth: '115°',
    sunIntensity: 2.2,
    resolutionScale: 1.0,
    pixelRatio: 1.0,
    shadowsEnabled: false,
    anisotropy: 8,
    cameraHeight: 1.7,
    fov: 60,
    aspect: 1.78,
    toneMapping: 'ACES Filmic',
    exposure: 0.92,
    colorSpace: 'sRGB',
    groundSize: '3,500m Radial Disk (7,000m Diameter)',
    fogType: 'TSL Height-Distance (35m - 850m)',
    tslSupported: true,
  });

  useEffect(() => {
    let isMounted = true;
    if (!canvasRef.current) return;

    async function launchEngine() {
      try {
        setIsInitializing(true);
        const engine = await initForestEngine(canvasRef.current, {
          presetKey: 'high',
          timeOfDay: 'morning',
        });

        if (!isMounted) {
          engine.dispose();
          return;
        }

        engineRef.current = engine;
        window.__engine = engine;
        engine.start();
        setEngineInfo(engine.getInfo());
        setIsInitializing(false);
      } catch (err) {
        console.error('Failed to initialize The Hidden Forest 3D engine:', err);
        if (isMounted) {
          setInitError(err.message || 'Renderer initialization failed');
          setIsInitializing(false);
        }
      }
    }

    launchEngine();

    const onResize = () => {
      if (engineRef.current) {
        engineRef.current.resize(window.innerWidth, window.innerHeight);
        setEngineInfo(engineRef.current.getInfo());
      }
    };
    window.addEventListener('resize', onResize);

    const onKeyDown = (e) => {
      if (e.key === 'h' || e.key === 'H') {
        setIsDockOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  const handleSelectPreset = (presetKey) => {
    if (!engineRef.current) return;
    engineRef.current.setQualityPreset(presetKey);
    setEngineInfo(engineRef.current.getInfo());
  };

  const handleSelectTimeOfDay = (timeKey) => {
    if (!engineRef.current) return;
    engineRef.current.setTimeOfDay(timeKey);
    setEngineInfo(engineRef.current.getInfo());
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#111814] select-none text-slate-100 font-sans">
      {/* 3D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        data-testid="forest-canvas"
        className="absolute inset-0 w-full h-full block cursor-default"
      />

      {/* Loading Overlay */}
      {isInitializing && (
        <div className="absolute inset-0 bg-[#0d1410] flex flex-col items-center justify-center z-30 pointer-events-none">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-emerald-200">
            Initializing WebGPURenderer &amp; Atmospheric Scene...
          </p>
        </div>
      )}

      {/* Error Fallback */}
      {initError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rose-950/90 border border-rose-800 rounded-xl p-5 z-40 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h2 className="text-base font-semibold text-rose-100 mb-1">Renderer Initialization Error</h2>
          <p className="text-xs text-rose-300 mb-3">{initError}</p>
          <p className="text-[11px] text-rose-400">Please verify WebGL2 or WebGPU support in your browser.</p>
        </div>
      )}

      {/* Top Header Badge */}
      <header className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-[#101712]/92 border border-emerald-900/40 rounded-lg px-3.5 py-2 shadow-lg flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              engineInfo.isWebGPU ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-emerald-100 uppercase">
                The Hidden Forest
              </h1>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  engineInfo.isWebGPU
                    ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-700/60 text-amber-300'
                }`}
              >
                {engineInfo.activeBackend}
              </span>
            </div>
            <p className="text-[11px] text-emerald-400/80 font-mono">
              Dense Forest, Winding Road &amp; Woodland Stream • {engineInfo.totalTrees ? `${engineInfo.totalTrees.toLocaleString()} Trees` : 'Procedural Forest'}
            </p>
          </div>
        </div>
      </header>

      {/* Top-Right Quick Status Pill */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none hidden sm:flex items-center gap-2">
        <div className="bg-[#101712]/92 border border-emerald-900/40 rounded-md px-3 py-1.5 text-[11px] font-mono text-emerald-300/90 shadow-md flex items-center gap-2">
          <span>{engineInfo.timeOfDay} ({engineInfo.sunElevation})</span>
          <span className="text-emerald-700">•</span>
          <span className="flex items-center gap-1 text-teal-300">
            <Droplets className="w-3 h-3 text-teal-400" />
            <span>Stream: 142m</span>
          </span>
          <span className="text-emerald-700">•</span>
          <span>Preset: {engineInfo.qualityPreset}</span>
          <span className="text-emerald-700">•</span>
          <span>{engineInfo.totalTrees ? `${engineInfo.totalTrees.toLocaleString()} Trees` : 'Forest'}</span>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <aside
        aria-label="Atmospheric Scene Controls and Information"
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-3xl transition-transform duration-300 ease-in-out ${
          isDockOpen ? 'translate-y-0' : 'translate-y-[calc(100%-38px)]'
        }`}
      >
        {/* Toggle Bar */}
        <div className="flex justify-center mb-1">
          <button
            type="button"
            onClick={() => setIsDockOpen(!isDockOpen)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#121a14] hover:bg-[#19241c] text-emerald-300 border border-emerald-800/50 rounded-full text-xs font-medium shadow-md transition-colors cursor-pointer"
            aria-expanded={isDockOpen}
            aria-controls="foundation-dock-content"
          >
            {isDockOpen ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Atmospheric Controls (H)</span>
              </>
            )}
          </button>
        </div>

        {/* Content Container */}
        <div
          id="foundation-dock-content"
          className="bg-[#101712]/95 border border-emerald-900/50 rounded-xl p-4 shadow-2xl"
        >
          {/* Controls Header: Time of Day & Quality Presets */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-emerald-900/40">
            {/* Time of Day Controller */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 text-[11px] text-amber-300/90 font-mono mr-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Lighting:</span>
              </div>
              {Object.keys(TIME_OF_DAY).map((key) => {
                const conf = TIME_OF_DAY[key];
                const isActive = engineInfo.timeOfDayId === conf.id;
                return (
                  <button
                    key={conf.id}
                    type="button"
                    onClick={() => handleSelectTimeOfDay(conf.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-600/90 text-white shadow-sm font-semibold border border-amber-500/50'
                        : 'text-slate-300 hover:text-white hover:bg-emerald-900/40 border border-transparent'
                    }`}
                    aria-pressed={isActive}
                  >
                    {conf.name}
                  </button>
                );
              })}
            </div>

            {/* Quality Preset Buttons */}
            <div className="flex items-center gap-1 bg-[#162019] p-1 rounded-lg border border-emerald-900/40">
              <div className="flex items-center gap-1 px-1.5 text-[11px] text-emerald-400/80 font-mono">
                <Sliders className="w-3 h-3" />
                <span className="hidden md:inline">Quality:</span>
              </div>
              {Object.keys(QUALITY_PRESETS).map((key) => {
                const preset = QUALITY_PRESETS[key];
                const isActive = engineInfo.qualityPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-emerald-900/40'
                    }`}
                    aria-pressed={isActive}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid of Verified Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            {/* Card 1: Time of Day & Sun */}
            <div className="bg-[#162019] border border-emerald-900/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] mb-1">
                <CloudSun className="w-3.5 h-3.5" />
                <span>Atmospheric Sun</span>
              </div>
              <div className="font-semibold text-slate-100">{engineInfo.timeOfDay}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Elevation: {engineInfo.sunElevation} • Azimuth: {engineInfo.sunAzimuth}
              </div>
            </div>

            {/* Card 2: Height & Distance Fog */}
            <div className="bg-[#162019] border border-emerald-900/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Atmospheric Fog</span>
              </div>
              <div className="font-semibold text-slate-100">TSL Height &amp; Distance</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Denser in valleys • Soft horizon fade
              </div>
            </div>

            {/* Card 3: Camera & View */}
            <div className="bg-[#162019] border border-emerald-900/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] mb-1">
                <Eye className="w-3.5 h-3.5" />
                <span>Camera View</span>
              </div>
              <div className="font-semibold text-slate-100">1.7m Human Eye</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                FOV: {engineInfo.fov}° • Exposure: {engineInfo.exposure}
              </div>
            </div>

            {/* Card 4: Quality & Backend */}
            <div className="bg-[#162019] border border-emerald-900/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] mb-1">
                <Cpu className="w-3.5 h-3.5" />
                <span>Backend &amp; Quality</span>
              </div>
              <div className="font-semibold text-slate-100">{engineInfo.activeBackend}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {engineInfo.qualityPreset} • {engineInfo.totalTrees ? `${engineInfo.totalTrees.toLocaleString()} Trees, ${engineInfo.totalFloorItems?.toLocaleString()} Floor Assets` : `Aniso: ${engineInfo.anisotropy}x`}
              </div>
            </div>
          </div>

          {/* Footer Status Line */}
          <div className="mt-3 pt-2.5 border-t border-emerald-900/30 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {engineInfo.isWebGPU
                  ? 'Hardware WebGPU active. Directional sunlight, hemisphere ambient, and TSL height fog running natively.'
                  : `WebGL2 fallback active (${engineInfo.fallbackReason || 'WebGPU unavailable'}). Software-rendering guard active to preserve preview responsiveness.`}
              </span>
            </div>
            <span className="text-emerald-400/90 font-mono">
              Press H to Toggle HUD
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
