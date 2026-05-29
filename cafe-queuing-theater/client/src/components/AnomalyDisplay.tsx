import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  Activity,
  Database,
  Cpu,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AnomalyInfo, DeadlockInfo } from '@/types';

const AnomalyDisplay: React.FC = () => {
  const {
    state: { anomalies, deadlockInfo, statistics, agents },
  } = useSimulationStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());

  const activeAnomalies = anomalies.filter(
    (a) => !dismissedAnomalies.has(`${a.type}-${a.timestamp}`)
  );

  const performanceWarnings = detectPerformanceIssues(statistics, agents.length);

  const dismissAnomaly = (type: string, timestamp: number) => {
    setDismissedAnomalies((prev) => new Set(prev).add(`${type}-${timestamp}`));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDismissedAnomalies((prev) => {
        const now = Date.now();
        const next = new Set(prev);
        prev.forEach((key) => {
          const timestamp = parseInt(key.split('-').pop() || '0');
          if (now - timestamp > 30000) {
            next.delete(key);
          }
        });
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Activity size={14} />;
      case 'medium':
        return <AlertCircle size={14} />;
      case 'high':
        return <AlertTriangle size={14} />;
      case 'critical':
        return <XCircle size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  const getAnomalyIcon = (type: string) => {
    if (type.includes('quadtree') || type.includes('performance')) return <Cpu size={14} />;
    if (type.includes('memory') || type.includes('webworker')) return <Database size={14} />;
    if (type.includes('emotion') || type.includes('avalanche')) return <Zap size={14} />;
    return <AlertTriangle size={14} />;
  };

  return (
    <div className="absolute bottom-4 left-4 z-20 w-96">
      {deadlockInfo.detected && (
        <DeadlockAlert deadlockInfo={deadlockInfo} />
      )}

      {performanceWarnings.length > 0 && (
        <div className="mb-2 space-y-1">
          {performanceWarnings.map((warning, idx) => (
            <PerformanceWarning key={idx} {...warning} />
          ))}
        </div>
      )}

      {activeAnomalies.length > 0 && (
        <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-red-900/50 to-orange-900/50 hover:from-red-900/70 hover:to-orange-900/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              <span className="text-white font-medium">
                异常检测 ({activeAnomalies.length})
              </span>
            </div>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          {isExpanded && (
            <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
              {activeAnomalies.slice(0, 5).map((anomaly) => (
                <AnomalyCard
                  key={`${anomaly.type}-${anomaly.timestamp}`}
                  anomaly={anomaly}
                  onDismiss={() => dismissAnomaly(anomaly.type, anomaly.timestamp)}
                  getSeverityColor={getSeverityColor}
                  getSeverityIcon={getSeverityIcon}
                  getAnomalyIcon={getAnomalyIcon}
                />
              ))}
              {activeAnomalies.length > 5 && (
                <div className="text-center text-xs text-slate-500 py-1">
                  还有 {activeAnomalies.length - 5} 条异常...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface AnomalyCardProps {
  anomaly: AnomalyInfo;
  onDismiss: () => void;
  getSeverityColor: (severity: string) => string;
  getSeverityIcon: (severity: string) => React.ReactNode;
  getAnomalyIcon: (type: string) => React.ReactNode;
}

const AnomalyCard: React.FC<AnomalyCardProps> = ({
  anomaly,
  onDismiss,
  getSeverityColor,
  getSeverityIcon,
  getAnomalyIcon,
}) => (
  <div
    className={`relative p-3 rounded-lg border ${getSeverityColor(anomaly.severity)} transition-all hover:scale-[1.01]`}
  >
    <button
      onClick={onDismiss}
      className="absolute top-2 right-2 p-0.5 rounded hover:bg-white/10 transition-colors"
    >
      <X size={12} />
    </button>

    <div className="flex items-start gap-2 pr-4">
      <div className="p-1 rounded bg-black/20">
        {getAnomalyIcon(anomaly.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {getSeverityIcon(anomaly.severity)}
          <span className="font-medium text-sm truncate">{anomaly.description}</span>
        </div>
        <div className="text-xs opacity-70 mt-1">
          {new Date(anomaly.timestamp).toLocaleTimeString()}
        </div>
        {anomaly.data && Object.keys(anomaly.data).length > 0 && (
          <div className="mt-2 text-xs font-mono bg-black/30 rounded p-1.5 overflow-x-auto">
            {JSON.stringify(anomaly.data, null, 0).substring(0, 60)}...
          </div>
        )}
      </div>
    </div>
  </div>
);

const DeadlockAlert: React.FC<{ deadlockInfo: DeadlockInfo }> = ({ deadlockInfo }) => (
  <div className="mb-2 bg-gradient-to-r from-red-600 to-purple-600 rounded-xl p-4 text-white shadow-2xl animate-pulse">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-white/20 rounded-lg">
        <XCircle size={24} />
      </div>
      <div className="flex-1">
        <div className="font-bold text-lg">⚠️ 死锁检测</div>
        <div className="text-sm opacity-90 mt-1">
          检测到拼桌死锁！涉及 {deadlockInfo.involvedAgents.length} 名顾客和{' '}
          {deadlockInfo.involvedSeats.length} 个座位
        </div>
        <div className="mt-2 text-xs font-mono bg-black/30 rounded p-2">
          <div>座位利用率: {(deadlockInfo.seatUtilization * 100).toFixed(1)}%</div>
          <div>涉及Agent: {deadlockInfo.involvedAgents.join(', ')}</div>
        </div>
      </div>
    </div>
  </div>
);

interface PerformanceWarning {
  type: string;
  message: string;
  severity: string;
}

const PerformanceWarning: React.FC<PerformanceWarning> = ({ type, message, severity }) => {
  const bgColor = severity === 'high' ? 'bg-red-900/80' : 'bg-yellow-900/80';
  const textColor = severity === 'high' ? 'text-red-300' : 'text-yellow-300';

  return (
    <div className={`${bgColor} ${textColor} rounded-lg px-3 py-2 text-sm flex items-center gap-2`}>
      <Cpu size={14} className="animate-pulse" />
      <span>{message}</span>
    </div>
  );
};

function detectPerformanceIssues(
  statistics: any,
  agentCount: number
): PerformanceWarning[] {
  const warnings: PerformanceWarning[] = [];

  if (statistics.fps && statistics.fps < 30) {
    warnings.push({
      type: 'fps',
      message: `FPS 降至 ${statistics.fps.toFixed(0)}，可能存在性能瓶颈`,
      severity: statistics.fps < 15 ? 'high' : 'medium',
    });
  }

  if (statistics.quadtreeDepth && statistics.quadtreeDepth > 8) {
    warnings.push({
      type: 'quadtree',
      message: `四叉树深度 ${statistics.quadtreeDepth}，空间索引可能退化为链表`,
      severity: statistics.quadtreeDepth > 12 ? 'high' : 'medium',
    });
  }

  if (agentCount > 500) {
    warnings.push({
      type: 'agent_count',
      message: `Agent 数量 ${agentCount}，WebWorker 内存压力增大`,
      severity: agentCount > 800 ? 'high' : 'medium',
    });
  }

  return warnings;
}

export default AnomalyDisplay;
