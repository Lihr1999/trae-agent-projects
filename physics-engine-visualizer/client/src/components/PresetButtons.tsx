import React from 'react';
import { Preset } from '../types';

interface PresetButtonsProps {
  presets: Preset[];
  onLoadPreset: (id: string) => void;
}

const PresetButtons: React.FC<PresetButtonsProps> = ({ presets, onLoadPreset }) => {
  const presetInfo: Record<string, { icon: string; color: string }> = {
    'ragdoll': { icon: '🤸', color: 'from-pink-600 to-red-600' },
    'spring-bridge': { icon: '🌉', color: 'from-yellow-600 to-orange-600' },
    'sleeping-tower': { icon: '🏰', color: 'from-green-600 to-teal-600' },
    'constraint-tearing': { icon: '💔', color: 'from-purple-600 to-indigo-600' }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-white font-bold text-lg mb-3 border-b border-gray-700 pb-2">预设场景</h2>
      <div className="grid grid-cols-2 gap-2">
        {presets.map(preset => {
          const info = presetInfo[preset.id] || { icon: '📦', color: 'from-gray-600 to-gray-700' };
          return (
            <button
              key={preset.id}
              onClick={() => onLoadPreset(preset.id)}
              className={`p-3 rounded-lg bg-gradient-to-r ${info.color} text-white text-sm font-medium hover:opacity-90 transition-opacity text-left`}
            >
              <span className="text-2xl block mb-1">{info.icon}</span>
              <span className="text-xs leading-tight">{preset.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-gray-700 rounded-lg">
        <h3 className="text-yellow-400 font-bold text-sm mb-2">⚠️ 物理现象观测</h3>
        <ul className="text-gray-300 text-xs space-y-1">
          <li>• <span className="text-red-400">Gauss-Seidel 收敛问题</span>: 堆叠物体高频抖动</li>
          <li>• <span className="text-orange-400">数值发散</span>: 刚性弹簧爆炸飞出</li>
          <li>• <span className="text-yellow-400">隧道效应</span>: 高速物体穿墙</li>
          <li>• <span className="text-green-400">冗余约束矛盾</span>: 连杆结构扭曲</li>
        </ul>
      </div>
    </div>
  );
};

export default PresetButtons;
