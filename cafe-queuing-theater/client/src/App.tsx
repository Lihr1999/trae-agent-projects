import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Comlink from 'comlink';
import { useSimulationStore } from '@/store/useSimulationStore';
import { getWSClient } from '@/websocket/WSClient';
import HeatMapRenderer from '@/components/HeatMapRenderer';
import MapEditor from '@/components/MapEditor';
import ConfigPanel from '@/components/ConfigPanel';
import PresetScenarios from '@/components/PresetScenarios';
import AnomalyDisplay from '@/components/AnomalyDisplay';
import StatsPanel from '@/components/StatsPanel';
import Toolbar from '@/components/Toolbar';
import type { LBMWorkerInterface, KDEWorkerInterface } from '@/types';
import { Coffee, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;

function App() {
  const [configOpen, setConfigOpen] = useState(false);
  const [showFlowParticles, setShowFlowParticles] = useState(true);
  const [workerStatus, setWorkerStatus] = useState({ lbm: false, kde: false });
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const {
    state,
    config,
    isConnected,
    isEditing,
    viewMode,
    setFlowField,
    setHeatMap,
    setQuadTreeSnapshot,
    setConnected,
    setLBMWorker,
    setKDEWorker,
  } = useSimulationStore();

  const lbmWorkerRef = useRef<Comlink.Remote<LBMWorkerInterface> | null>(null);
  const kdeWorkerRef = useRef<Comlink.Remote<KDEWorkerInterface> | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastKDEUpdateRef = useRef<number>(0);
  const previousAgentsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const initWorkers = async () => {
      try {
        const LBMWorkerClass = Comlink.wrap<{ new (): LBMWorkerInterface }>(
          new Worker(new URL('@/workers/LBMWorker.ts', import.meta.url), { type: 'module' })
        );
        lbmWorkerRef.current = await new LBMWorkerClass();
        await lbmWorkerRef.current.init({
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          gridSize: config.lbmParams.gridSize,
          params: config.lbmParams,
        });
        setLBMWorker(lbmWorkerRef.current);
        setWorkerStatus((s) => ({ ...s, lbm: true }));
      } catch (error) {
        console.error('Failed to initialize LBM worker:', error);
      }

      try {
        const KDEWorkerClass = Comlink.wrap<{ new (): KDEWorkerInterface }>(
          new Worker(new URL('@/workers/KDEWorker.ts', import.meta.url), { type: 'module' })
        );
        kdeWorkerRef.current = await new KDEWorkerClass();
        await kdeWorkerRef.current.init({
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          resolution: 10,
          bandwidth: config.sirParams.infectionRadius / 2,
        });
        setKDEWorker(kdeWorkerRef.current);
        setWorkerStatus((s) => ({ ...s, kde: true }));
      } catch (error) {
        console.error('Failed to initialize KDE worker:', error);
      }
    };

    initWorkers();

    return () => {
      if (lbmWorkerRef.current) {
        lbmWorkerRef.current[Comlink.releaseProxy]();
        setLBMWorker(null);
      }
      if (kdeWorkerRef.current) {
        kdeWorkerRef.current[Comlink.releaseProxy]();
        setKDEWorker(null);
      }
    };
  }, []);

  useEffect(() => {
    const connect = async () => {
      try {
        const ws = getWSClient();
        await ws.connect();
        setConnectionError(null);

        ws.on('full_state', (data: any) => {
          if (data.state?.quadtreeSnapshot) {
            setQuadTreeSnapshot(data.state.quadtreeSnapshot);
          }
        });

        ws.on('delta_state', (data: any) => {
          if (data.delta?.quadtreeSnapshot) {
            setQuadTreeSnapshot(data.delta.quadtreeSnapshot);
          }
        });

        ws.on('error', (data: any) => {
          setConnectionError(data.message);
          setTimeout(() => setConnectionError(null), 5000);
        });
      } catch (error) {
        console.error('Failed to connect:', error);
        setConnectionError('连接服务器失败，请确保后端服务已启动');
      }
    };

    connect();

    return () => {
      getWSClient().disconnect();
      setConnected(false);
    };
  }, []);

  const updateWorkers = useCallback(async () => {
    if (!state.running || isEditing) return;

    if (lbmWorkerRef.current && workerStatus.lbm) {
      try {
        const obstaclePolygons = state.mapElements
          .filter((e) => e.type === 'obstacle' || e.type === 'bar')
          .map((e) => e.polygon);

        await lbmWorkerRef.current.setObstacles(obstaclePolygons);
        await lbmWorkerRef.current.applyAgentForces(state.agents);
        await lbmWorkerRef.current.step();

        const gridData = await lbmWorkerRef.current.getGridData();
        if (gridData) {
          setFlowField(gridData);
        }
      } catch (error) {
        console.error('LBM worker error:', error);
      }
    }

    const now = Date.now();
    if (kdeWorkerRef.current && workerStatus.kde && now - lastKDEUpdateRef.current > 100) {
      lastKDEUpdateRef.current = now;

      try {
        const heatmapPoints = state.agents
          .filter((a) => a.emotion === 'I' || a.frustration > 0.5)
          .map((a) => ({
            position: a.position,
            intensity: a.frustration,
          }));

        const currentAgentIds = new Set(state.agents.map((a) => a.id));
        const newAgents = state.agents.filter((a) => !previousAgentsRef.current.has(a.id));
        const oldAgents = Array.from(previousAgentsRef.current)
          .filter((id) => !currentAgentIds.has(id))
          .map((id) => {
            const agent = state.agents.find((a) => a.id === id);
            return agent ? { position: agent.position, intensity: 0 } : null;
          })
          .filter(Boolean) as { position: any; intensity: number }[];

        previousAgentsRef.current = currentAgentIds;

        let heatMap;
        if (newAgents.length > 0 || oldAgents.length > 0) {
          heatMap = await kdeWorkerRef.current.streamingUpdate(
            newAgents.map((a) => ({ position: a.position, intensity: a.frustration })),
            oldAgents
          );
        } else {
          heatMap = await kdeWorkerRef.current.computeHeatmap(heatmapPoints);
        }

        if (heatMap) {
          setHeatMap(heatMap);
        }
      } catch (error) {
        console.error('KDE worker error:', error);
      }
    }

    animationFrameRef.current = requestAnimationFrame(updateWorkers);
  }, [state.running, state.agents, state.mapElements, isEditing, workerStatus, setFlowField, setHeatMap, setQuadTreeSnapshot, setLBMWorker, setKDEWorker]);

  useEffect(() => {
    if (state.running && !isEditing) {
      animationFrameRef.current = requestAnimationFrame(updateWorkers);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state.running, isEditing, updateWorkers]);

  return (
    <div className="w-screen h-screen bg-slate-950 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-slate-900 to-transparent pb-8">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
              <Coffee size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                咖啡馆排队热力剧场
              </h1>
              <p className="text-xs text-slate-400">
                Cafe Queuing & Thermodynamics Theater
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi size={16} className="text-green-400" />
              ) : (
                <WifiOff size={16} className="text-red-400" />
              )}
              <span className="text-xs text-slate-400">
                {isConnected ? 'WebSocket 已连接' : '连接断开'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  workerStatus.lbm ? 'bg-green-500' : 'bg-red-500'
                }`}
                title="LBM Worker"
              />
              <div
                className={`w-2 h-2 rounded-full ${
                  workerStatus.kde ? 'bg-green-500' : 'bg-red-500'
                }`}
                title="KDE Worker"
              />
              <span className="text-xs text-slate-400">Workers</span>
            </div>
          </div>
        </div>
      </div>

      {connectionError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-red-600/95 backdrop-blur-sm text-white px-6 py-3 rounded-xl flex items-center gap-3 shadow-2xl border border-red-500">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">{connectionError}</span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-700"
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
        >
          <HeatMapRenderer
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            heatMap={state.heatMap}
            flowField={state.flowField}
            agents={state.agents}
            mapElements={state.mapElements}
            seats={state.seats}
            employees={state.employees}
            quadtreeSnapshot={state.quadtreeSnapshot}
            viewMode={viewMode}
            showFlowParticles={showFlowParticles}
          />

          <MapEditor width={MAP_WIDTH} height={MAP_HEIGHT} />
        </div>
      </div>

      <PresetScenarios />

      <StatsPanel />

      <AnomalyDisplay />

      <Toolbar onOpenConfig={() => setConfigOpen(true)} />

      <ConfigPanel isOpen={configOpen} onClose={() => setConfigOpen(false)} />

      <div className="absolute bottom-4 right-4 z-20 text-xs text-slate-500">
        <div>LBM: {workerStatus.lbm ? '✓' : '✗'} | KDE: {workerStatus.kde ? '✓' : '✗'}</div>
        <div className="mt-1">FPS: {state.statistics.fps > 0 ? state.statistics.fps.toFixed(0) : '--'}</div>
      </div>
    </div>
  );
}

export default App;
