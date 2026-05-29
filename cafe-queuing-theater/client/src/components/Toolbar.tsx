import React, { useState } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { getWSClient } from '@/websocket/WSClient';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Edit3,
  Eye,
  Wind,
  Thermometer,
  GitBranch,
  Zap,
  FastForward,
} from 'lucide-react';

interface ToolbarProps {
  onOpenConfig: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onOpenConfig }) => {
  const {
    state,
    isEditing,
    setEditing,
    viewMode,
    setViewMode,
    isConnected,
  } = useSimulationStore();

  const [speed, setSpeed] = useState(1);

  const ws = getWSClient();

  const handleStart = () => {
    if (isConnected) {
      ws.start();
    }
  };

  const handlePause = () => {
    if (isConnected) {
      ws.pause();
    }
  };

  const handleReset = () => {
    if (isConnected) {
      ws.reset();
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isConnected) {
      ws.setSpeed(newSpeed);
    }
  };

  const viewModes = [
    { id: 'simulation', icon: <Eye size={16} />, label: '仿真' },
    { id: 'flow', icon: <Wind size={16} />, label: '流场' },
    { id: 'heat', icon: <Thermometer size={16} />, label: '热力' },
    { id: 'quadtree', icon: <GitBranch size={16} />, label: '四叉树' },
  ];

  const speedOptions = [0.5, 1, 2, 4];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-2xl border border-slate-700 flex items-center gap-2">
        <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
          <button
            onClick={() => setEditing(!isEditing)}
            className={`p-2.5 rounded-lg transition-all ${
              isEditing
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
            title={isEditing ? '退出编辑' : '编辑地图'}
          >
            <Edit3 size={18} />
          </button>

          {!isEditing && (
            <>
              {!state.running ? (
                <button
                  onClick={handleStart}
                  disabled={!isConnected}
                  className="p-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="开始仿真"
                >
                  <Play size={18} />
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  disabled={!isConnected}
                  className="p-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="暂停仿真"
                >
                  <Pause size={18} />
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={!isConnected}
                className="p-2.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="重置仿真"
              >
                <RotateCcw size={18} />
              </button>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 px-2 border-r border-slate-700">
            <FastForward size={14} className="text-slate-400" />
            <div className="flex items-center gap-0.5">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-1 text-xs font-mono rounded transition-all ${
                    speed === s
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1 px-2 border-r border-slate-700">
            {viewModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === mode.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title={mode.label}
              >
                {mode.icon}
                <span className="text-xs hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onOpenConfig}
          className="p-2.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all"
          title="参数配置"
        >
          <Settings size={18} />
        </button>

        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              state.running
                ? 'bg-green-500 animate-pulse'
                : isEditing
                ? 'bg-amber-500'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-xs text-slate-400">
            {state.running
              ? `运行中 (${speed}x)`
              : isEditing
              ? '编辑模式'
              : '已暂停'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
