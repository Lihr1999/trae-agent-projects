import React, { useState, useEffect } from 'react';
import { Sparkles, Infinity, SunDim, CircleDashed } from 'lucide-react';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { loadPreset, getPresets } from '../utils/api';
import { Preset } from '../types';

const presetIcons: Record<string, React.ReactNode> = {
  'classic-flower': <Sparkles size={20} />,
  'hyperbolic-tiling': <Infinity size={20} />,
  'caustic-focus': <SunDim size={20} />,
  'infinite-abyss': <CircleDashed size={20} />,
};

const presetColors: Record<string, string> = {
  'classic-flower': 'from-red-500 to-yellow-500',
  'hyperbolic-tiling': 'from-cyan-500 to-blue-500',
  'caustic-focus': 'from-emerald-400 to-teal-500',
  'infinite-abyss': 'from-purple-600 to-indigo-600',
};

const PresetButtons: React.FC = () => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const { loadProject, setIsAnimating, setAnimationProgress } = useKaleidoscopeStore();

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const data = await getPresets();
        setPresets(data);
      } catch (error) {
        console.error('加载预设失败:', error);
        setPresets([
          { id: 'classic-flower', name: '经典三面镜六重对称花朵', description: '传统万花筒配置' },
          { id: 'hyperbolic-tiling', name: '双曲几何非欧几里得无限镶嵌', description: '庞加莱圆盘镶嵌' },
          { id: 'caustic-focus', name: '高透光率多重折射焦散光斑', description: '复杂焦散效果' },
          { id: 'infinite-abyss', name: '极小夹角镜面无限反射深渊', description: '无限深度反射' },
        ]);
      }
    };
    fetchPresets();
  }, []);

  const handlePresetClick = async (presetId: string) => {
    setLoading(presetId);
    try {
      const project = await loadPreset(presetId);
      loadProject(project);
      setAnimationProgress(0);
      setIsAnimating(true);
    } catch (error) {
      console.error('加载预设失败:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="glass-panel p-4">
      <h3 className="font-display text-lg text-accent mb-4 text-center">
        预设场景
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {presets.slice(0, 4).map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.id)}
            disabled={loading === preset.id}
            className={`preset-button relative overflow-hidden rounded-lg p-4 text-left transition-all duration-300 hover:scale-105 hover:shadow-lg bg-gradient-to-br ${presetColors[preset.id] || 'from-gray-600 to-gray-700'} ${
              loading === preset.id ? 'opacity-50' : ''
            }`}
          >
            <div className="relative z-10">
              <div className="text-white/90 mb-2">
                {presetIcons[preset.id] || <Sparkles size={20} />}
              </div>
              <h4 className="text-white font-medium text-sm leading-tight mb-1">
                {preset.name}
              </h4>
              <p className="text-white/60 text-xs line-clamp-2">
                {preset.description}
              </p>
            </div>
            {loading === preset.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetButtons;
