import React from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import {
  Users,
  Coffee,
  Clock,
  TrendingUp,
  AlertTriangle,
  Cpu,
  Activity,
  Heart,
} from 'lucide-react';

const StatsPanel: React.FC = () => {
  const { state, config, isConnected } = useSimulationStore();
  const { statistics, agents, employees, queues, seats } = state;

  const sirColors = {
    S: 'bg-blue-500',
    I: 'bg-red-500',
    R: 'bg-gray-500',
  };

  const sirTotal = statistics.sirCounts.S + statistics.sirCounts.I + statistics.sirCounts.R;
  const sirPercentages = {
    S: sirTotal > 0 ? (statistics.sirCounts.S / sirTotal) * 100 : 0,
    I: sirTotal > 0 ? (statistics.sirCounts.I / sirTotal) * 100 : 0,
    R: sirTotal > 0 ? (statistics.sirCounts.R / sirTotal) * 100 : 0,
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-72">
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="px-4 py-3 bg-gradient-to-r from-amber-900/50 to-orange-900/50 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-amber-400" />
              <span className="font-semibold text-white">实时统计</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-slate-400">
                {isConnected ? '已连接' : '断开'}
              </span>
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            仿真时间: <span className="text-amber-400 font-mono">{statistics.fps > 0 ? state.time.toFixed(1) : '--'}s</span>
            <span className="mx-2">|</span>
            速度: <span className="text-amber-400 font-mono">x{state.speed}</span>
          </div>
        </div>

        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<Users size={14} />}
              label="顾客总数"
              value={agents.length.toString()}
              color="text-blue-400"
            />
            <StatCard
              icon={<Coffee size={14} />}
              label="员工"
              value={employees.length.toString()}
              color="text-amber-400"
            />
            <StatCard
              icon={<TrendingUp size={14} />}
              label="座位利用率"
              value={`${(statistics.seatUtilization * 100).toFixed(0)}%`}
              color="text-green-400"
            />
            <StatCard
              icon={<Clock size={14} />}
              label="平均等待"
              value={`${statistics.avgWaitTime.toFixed(1)}s`}
              color="text-purple-400"
            />
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={14} className="text-red-400" />
              <span className="text-sm font-medium text-slate-200">情绪分布 (SIR)</span>
            </div>
            <div className="flex h-4 rounded-full overflow-hidden bg-slate-700">
              <div
                className={`${sirColors.S} transition-all duration-300`}
                style={{ width: `${sirPercentages.S}%` }}
                title={`易感: ${statistics.sirCounts.S}`}
              />
              <div
                className={`${sirColors.I} transition-all duration-300`}
                style={{ width: `${sirPercentages.I}%` }}
                title={`感染: ${statistics.sirCounts.I}`}
              />
              <div
                className={`${sirColors.R} transition-all duration-300`}
                style={{ width: `${sirPercentages.R}%` }}
                title={`恢复: ${statistics.sirCounts.R}`}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px]">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${sirColors.S}`} />
                <span className="text-slate-400">S {statistics.sirCounts.S}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${sirColors.I}`} />
                <span className="text-slate-400">I {statistics.sirCounts.I}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${sirColors.R}`} />
                <span className="text-slate-400">R {statistics.sirCounts.R}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-cyan-400" />
              <span className="text-sm font-medium text-slate-200">队列状态</span>
            </div>
            <div className="space-y-1.5">
              {queues.map((queue) => (
                <div key={queue.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {queue.type === 'order' ? '点单' : queue.type === 'pickup' ? '取餐' : '寻座'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          queue.agents.length / queue.capacity > 0.8
                            ? 'bg-red-500'
                            : queue.agents.length / queue.capacity > 0.5
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(queue.agents.length / queue.capacity) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-slate-300 w-10 text-right">
                      {queue.agents.length}/{queue.capacity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={14} className="text-orange-400" />
              <span className="text-sm font-medium text-slate-200">系统性能</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-slate-500">FPS</div>
                <div className={`font-mono ${
                  statistics.fps < 15 ? 'text-red-400' : statistics.fps < 30 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {statistics.fps > 0 ? statistics.fps.toFixed(0) : '--'}
                </div>
              </div>
              <div>
                <div className="text-slate-500">四叉树深度</div>
                <div className={`font-mono ${
                  statistics.quadtreeDepth > 10 ? 'text-red-400' : statistics.quadtreeDepth > 6 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {statistics.quadtreeDepth}
                </div>
              </div>
              <div>
                <div className="text-slate-500">已到达</div>
                <div className="font-mono text-cyan-400">{statistics.totalArrivals}</div>
              </div>
              <div>
                <div className="text-slate-500">已离开</div>
                <div className="font-mono text-gray-400">{statistics.totalDepartures}</div>
              </div>
            </div>
          </div>

          {employees.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Coffee size={14} className="text-amber-400" />
                <span className="text-sm font-medium text-slate-200">员工状态</span>
              </div>
              <div className="space-y-1.5">
                {employees.map((emp, idx) => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <div className="text-xs text-slate-400 w-10">#{idx + 1}</div>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          emp.fatigue > config.employeeConfig.fatigueThreshold
                            ? 'bg-red-500'
                            : emp.fatigue > 0.4
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${emp.fatigue * 100}%` }}
                      />
                    </div>
                    <div className="text-xs font-mono text-slate-400 w-10 text-right">
                      {(emp.fatigue * 100).toFixed(0)}%
                    </div>
                    {emp.currentOrder && (
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="处理中" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-slate-800/50 rounded-lg p-2.5">
    <div className="flex items-center gap-1.5 mb-1">
      <div className={color}>{icon}</div>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
    <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
  </div>
);

export default StatsPanel;
