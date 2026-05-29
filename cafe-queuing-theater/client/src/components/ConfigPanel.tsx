import React, { useState } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { getWSClient } from '@/websocket/WSClient';
import { Settings, Users, Coffee, Wind, Heart, UsersRound, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { SimulationConfig } from '@/types';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig } = useSimulationStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    queuing: true,
    arrival: false,
    socialForce: false,
    lbm: false,
    sir: false,
    employee: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleConfigChange = (path: string, value: number) => {
    const keys = path.split('.');
    const newConfig: any = { ...config };
    let current = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    updateConfig(newConfig);
  };

  const applyConfig = () => {
    getWSClient().updateConfig(config);
  };

  const resetConfig = () => {
    fetch('/api/presets/scenario-1')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          updateConfig(data.config);
        }
      });
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-slate-900/98 backdrop-blur-sm border-l border-slate-700 z-30 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-amber-400" />
          <h2 className="text-lg font-semibold text-white">参数配置</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ConfigSection
          title="排队拓扑"
          icon={<Users size={16} />}
          expanded={expandedSections.queuing}
          onToggle={() => toggleSection('queuing')}
        >
          <NumberInput
            label="点单队列服务台"
            value={config.queuingTopology.orderQueue.servers}
            onChange={(v) => handleConfigChange('queuingTopology.orderQueue.servers', v)}
            min={1}
            max={10}
            step={1}
          />
          <NumberInput
            label="点单队列容量"
            value={config.queuingTopology.orderQueue.capacity}
            onChange={(v) => handleConfigChange('queuingTopology.orderQueue.capacity', v)}
            min={5}
            max={50}
            step={1}
          />
          <NumberInput
            label="取餐队列服务台"
            value={config.queuingTopology.pickupQueue.servers}
            onChange={(v) => handleConfigChange('queuingTopology.pickupQueue.servers', v)}
            min={1}
            max={10}
            step={1}
          />
          <NumberInput
            label="取餐队列容量"
            value={config.queuingTopology.pickupQueue.capacity}
            onChange={(v) => handleConfigChange('queuingTopology.pickupQueue.capacity', v)}
            min={5}
            max={50}
            step={1}
          />
          <NumberInput
            label="寻座队列容量"
            value={config.queuingTopology.roamingQueue.capacity}
            onChange={(v) => handleConfigChange('queuingTopology.roamingQueue.capacity', v)}
            min={10}
            max={100}
            step={1}
          />
        </ConfigSection>

        <ConfigSection
          title="顾客到达模型"
          icon={<Coffee size={16} />}
          expanded={expandedSections.arrival}
          onToggle={() => toggleSection('arrival')}
        >
          <NumberInput
            label="到达率 λ (人/秒)"
            value={config.arrivalModel.lambda}
            onChange={(v) => handleConfigChange('arrivalModel.lambda', v)}
            min={0.1}
            max={5}
            step={0.1}
          />
          <div className="text-xs text-slate-400 mt-2">群组大小分布:</div>
          {['1人', '2人', '3人', '4人'].map((label, idx) => (
            <NumberInput
              key={idx}
              label={label}
              value={config.arrivalModel.groupSizeDistribution[idx]}
              onChange={(v) => {
                const newDist = [...config.arrivalModel.groupSizeDistribution];
                newDist[idx] = v;
                updateConfig({
                  ...config,
                  arrivalModel: { ...config.arrivalModel, groupSizeDistribution: newDist },
                });
              }}
              min={0}
              max={1}
              step={0.05}
            />
          ))}
        </ConfigSection>

        <ConfigSection
          title="社会力模型"
          icon={<Wind size={16} />}
          expanded={expandedSections.socialForce}
          onToggle={() => toggleSection('socialForce')}
        >
          <NumberInput
            label="排斥强度 A"
            value={config.socialForce.A}
            onChange={(v) => handleConfigChange('socialForce.A', v)}
            min={500}
            max={5000}
            step={100}
          />
          <NumberInput
            label="作用范围 B"
            value={config.socialForce.B}
            onChange={(v) => handleConfigChange('socialForce.B', v)}
            min={0.02}
            max={0.2}
            step={0.01}
          />
          <NumberInput
            label="物理接触刚度 k"
            value={config.socialForce.k}
            onChange={(v) => handleConfigChange('socialForce.k', v)}
            min={1e4}
            max={5e5}
            step={1e4}
            format="scientific"
          />
          <NumberInput
            label="切向摩擦系数 κ"
            value={config.socialForce.kappa}
            onChange={(v) => handleConfigChange('socialForce.kappa', v)}
            min={1e4}
            max={5e5}
            step={1e4}
            format="scientific"
          />
          <NumberInput
            label="特征时间 τ"
            value={config.socialForce.tau}
            onChange={(v) => handleConfigChange('socialForce.tau', v)}
            min={0.1}
            max={2}
            step={0.1}
          />
          <NumberInput
            label="最大速度 (m/s)"
            value={config.socialForce.maxSpeed}
            onChange={(v) => handleConfigChange('socialForce.maxSpeed', v)}
            min={0.5}
            max={3}
            step={0.1}
          />
        </ConfigSection>

        <ConfigSection
          title="LBM流体"
          icon={<Wind size={16} />}
          expanded={expandedSections.lbm}
          onToggle={() => toggleSection('lbm')}
        >
          <NumberInput
            label="松弛时间 τ"
            value={config.lbmParams.relaxationTime}
            onChange={(v) => handleConfigChange('lbmParams.relaxationTime', v)}
            min={0.5}
            max={2}
            step={0.1}
          />
          <NumberInput
            label="初始密度 ρ₀"
            value={config.lbmParams.initialDensity}
            onChange={(v) => handleConfigChange('lbmParams.initialDensity', v)}
            min={0.5}
            max={2}
            step={0.1}
          />
          <NumberInput
            label="网格大小"
            value={config.lbmParams.gridSize}
            onChange={(v) => handleConfigChange('lbmParams.gridSize', v)}
            min={10}
            max={50}
            step={5}
          />
          <NumberInput
            label="粘度 ν"
            value={config.lbmParams.viscosity}
            onChange={(v) => handleConfigChange('lbmParams.viscosity', v)}
            min={0.01}
            max={0.5}
            step={0.01}
          />
        </ConfigSection>

        <ConfigSection
          title="SIR情绪传染"
          icon={<Heart size={16} />}
          expanded={expandedSections.sir}
          onToggle={() => toggleSection('sir')}
        >
          <NumberInput
            label="传染率 β"
            value={config.sirParams.beta}
            onChange={(v) => handleConfigChange('sirParams.beta', v)}
            min={0}
            max={1}
            step={0.05}
          />
          <NumberInput
            label="恢复率 γ"
            value={config.sirParams.gamma}
            onChange={(v) => handleConfigChange('sirParams.gamma', v)}
            min={0}
            max={1}
            step={0.05}
          />
          <NumberInput
            label="传染半径"
            value={config.sirParams.infectionRadius}
            onChange={(v) => handleConfigChange('sirParams.infectionRadius', v)}
            min={20}
            max={200}
            step={10}
          />
          <NumberInput
            label="挫败阈值"
            value={config.sirParams.frustrationThreshold}
            onChange={(v) => handleConfigChange('sirParams.frustrationThreshold', v)}
            min={0}
            max={1}
            step={0.05}
          />
        </ConfigSection>

        <ConfigSection
          title="员工系统"
          icon={<UsersRound size={16} />}
          expanded={expandedSections.employee}
          onToggle={() => toggleSection('employee')}
        >
          <NumberInput
            label="员工数量"
            value={config.employeeConfig.count}
            onChange={(v) => handleConfigChange('employeeConfig.count', v)}
            min={1}
            max={10}
            step={1}
          />
          <NumberInput
            label="基础疲劳率"
            value={config.employeeConfig.baseFatigueRate}
            onChange={(v) => handleConfigChange('employeeConfig.baseFatigueRate', v)}
            min={0}
            max={0.01}
            step={0.0005}
            format="decimal"
          />
          <NumberInput
            label="恢复率"
            value={config.employeeConfig.recoveryRate}
            onChange={(v) => handleConfigChange('employeeConfig.recoveryRate', v)}
            min={0}
            max={0.01}
            step={0.0005}
            format="decimal"
          />
          <NumberInput
            label="疲劳阈值"
            value={config.employeeConfig.fatigueThreshold}
            onChange={(v) => handleConfigChange('employeeConfig.fatigueThreshold', v)}
            min={0}
            max={1}
            step={0.05}
          />
        </ConfigSection>
      </div>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={applyConfig}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
        >
          应用配置
        </button>
        <button
          onClick={resetConfig}
          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
        >
          重置为默认
        </button>
      </div>
    </div>
  );
};

interface ConfigSectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ title, icon, expanded, onToggle, children }) => (
  <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors"
    >
      <div className="flex items-center gap-2 text-slate-200">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {expanded && <div className="p-3 pt-0 space-y-3">{children}</div>}
  </div>
);

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format?: 'default' | 'scientific' | 'decimal';
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, min, max, step, format = 'default' }) => {
  const formatValue = (v: number): string => {
    if (format === 'scientific') {
      return v.toExponential(1);
    } else if (format === 'decimal') {
      return v.toFixed(4);
    }
    return step < 1 ? v.toFixed(2) : v.toString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs font-mono text-amber-400">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
};

export default ConfigPanel;
