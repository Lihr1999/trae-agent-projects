import React, { useState } from 'react';
import { getWSClient } from '@/websocket/WSClient';
import { useSimulationStore } from '@/store/useSimulationStore';
import { Coffee, Users, Zap, Wind, AlertTriangle, CheckCircle } from 'lucide-react';

const scenarios = [
  {
    id: 'scenario-1',
    name: '早高峰多吧台',
    description: '动态调度与流场涡旋',
    icon: <Coffee size={20} />,
    color: 'from-amber-500 to-orange-600',
    anomaly: 'flow_vortex',
  },
  {
    id: 'scenario-2',
    name: '群组拼桌死锁',
    description: '2-4人群组高频拼桌',
    icon: <Users size={20} />,
    color: 'from-purple-500 to-pink-600',
    anomaly: 'deadlock',
  },
  {
    id: 'scenario-3',
    name: '情绪退单雪崩',
    description: '焦躁情绪正反馈传染',
    icon: <Zap size={20} />,
    color: 'from-red-500 to-rose-600',
    anomaly: 'emotional_avalanche',
  },
  {
    id: 'scenario-4',
    name: '人流湍流',
    description: '狭窄通道雷诺数激增',
    icon: <Wind size={20} />,
    color: 'from-cyan-500 to-blue-600',
    anomaly: 'turbulence',
  },
];

const PresetScenarios: React.FC = () => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>('scenario-1');
  const { isEditing, setEditing } = useSimulationStore();

  const loadScenario = async (id: string) => {
    setLoadingId(id);
    try {
      const ws = getWSClient();
      if (!ws.isConnected()) {
        await ws.connect();
      }
      ws.loadPreset(id);
      setActiveId(id);
      setEditing(false);
    } catch (error) {
      console.error('Failed to load scenario:', error);
    } finally {
      setTimeout(() => setLoadingId(null), 500);
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl p-2 shadow-2xl border border-slate-700">
        <div className="flex gap-2">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => loadScenario(scenario.id)}
              disabled={loadingId !== null || isEditing}
              className={`group relative px-4 py-3 rounded-lg transition-all duration-300 min-w-[140px] ${
                activeId === scenario.id
                  ? `bg-gradient-to-r ${scenario.color} text-white shadow-lg`
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              } ${loadingId === scenario.id ? 'animate-pulse' : ''} ${
                isEditing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`p-1.5 rounded-lg ${
                    activeId === scenario.id
                      ? 'bg-white/20'
                      : 'bg-slate-600/50 group-hover:bg-slate-600'
                  }`}
                >
                  {loadingId === scenario.id ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    scenario.icon
                  )}
                </div>
                <div className="text-sm font-medium">{scenario.name}</div>
                <div
                  className={`text-[10px] ${
                    activeId === scenario.id ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  {scenario.description}
                </div>
              </div>

              {activeId === scenario.id && (
                <div className="absolute -top-1 -right-1">
                  <CheckCircle size={14} className="text-green-400" />
                </div>
              )}

              <AnomalyIndicator anomalyType={scenario.anomaly} active={activeId === scenario.id} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface AnomalyIndicatorProps {
  anomalyType: string;
  active: boolean;
}

const AnomalyIndicator: React.FC<AnomalyIndicatorProps> = ({ anomalyType, active }) => {
  const anomalyNames: Record<string, string> = {
    flow_vortex: '流场涡旋',
    deadlock: '拼桌死锁',
    emotional_avalanche: '情绪雪崩',
    turbulence: '人流湍流',
  };

  return (
    <div
      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5 whitespace-nowrap transition-all duration-300 ${
        active
          ? 'bg-red-500 text-white opacity-100'
          : 'bg-slate-900/80 text-red-400 opacity-0 group-hover:opacity-100'
      }`}
    >
      <AlertTriangle size={8} />
      {anomalyNames[anomalyType]}
    </div>
  );
};

export default PresetScenarios;
