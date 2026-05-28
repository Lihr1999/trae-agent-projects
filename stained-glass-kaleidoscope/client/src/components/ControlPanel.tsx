import React, { useCallback } from 'react';
import {
  Hexagon,
  Sun,
  Layers,
  Palette,
  Droplets,
  CircleDot,
  RotateCcw,
} from 'lucide-react';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { SymmetryType } from '../types';

const symmetryTypes: { value: SymmetryType; label: string }[] = [
  { value: 'dihedral', label: '二面体群 (反射+旋转)' },
  { value: 'cyclic', label: '循环群 (仅旋转)' },
  { value: 'spherical', label: '球面几何' },
  { value: 'hyperbolic', label: '双曲几何' },
];

const ControlPanel: React.FC = () => {
  const {
    symmetry,
    lightSource,
    selectedFragment,
    fragments,
    setSymmetry,
    setLightSource,
    updateFragment,
    setIsAnimating,
    setAnimationProgress,
  } = useKaleidoscopeStore();

  const selectedFragmentData = fragments.find((f) => f.id === selectedFragment);

  const handleSymmetryChange = useCallback(
    (key: keyof typeof symmetry, value: any) => {
      setSymmetry({ ...symmetry, [key]: value });
      setAnimationProgress(0);
      setIsAnimating(true);
    },
    [symmetry, setSymmetry, setAnimationProgress, setIsAnimating]
  );

  const handleLightChange = useCallback(
    (key: keyof typeof lightSource, value: any) => {
      setLightSource({ ...lightSource, [key]: value });
    },
    [lightSource, setLightSource]
  );

  const handleFragmentChange = useCallback(
    (key: string, value: any) => {
      if (selectedFragment) {
        updateFragment(selectedFragment, { [key]: value });
      }
    },
    [selectedFragment, updateFragment]
  );

  return (
    <div className="w-72 h-full glass-panel overflow-y-auto p-4 space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-display text-xl text-accent mb-1">参数控制</h2>
        <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Hexagon size={18} />
          <h3 className="font-medium">对称群配置</h3>
        </div>

        <div className="space-y-3 pl-2">
          <div>
            <label className="text-sm text-white/70 mb-1 block">对称类型</label>
            <select
              value={symmetry.type}
              onChange={(e) => handleSymmetryChange('type', e.target.value)}
              className="w-full"
            >
              {symmetryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-white/70 mb-1 block">
              重数: {symmetry.order}
            </label>
            <input
              type="range"
              min="2"
              max="30"
              value={symmetry.order}
              onChange={(e) =>
                handleSymmetryChange('order', parseInt(e.target.value))
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-1 block">
              镜面夹角: {symmetry.mirrorAngle}°
            </label>
            <input
              type="range"
              min="5"
              max="180"
              step="1"
              value={symmetry.mirrorAngle}
              onChange={(e) =>
                handleSymmetryChange('mirrorAngle', parseInt(e.target.value))
              }
              className="w-full"
            />
            {(360 % symmetry.mirrorAngle !== 0) && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <RotateCcw size={12} />
                非约数夹角，将产生接缝效果
              </p>
            )}
          </div>

          {symmetry.type === 'spherical' || symmetry.type === 'hyperbolic' ? (
            <div>
              <label className="text-sm text-white/70 mb-1 block">
                Schläfli 符号
              </label>
              <input
                type="text"
                value={symmetry.schlafli || ''}
                placeholder='{4,5}'
                onChange={(e) => handleSymmetryChange('schlafli', e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-sm"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Sun size={18} />
          <h3 className="font-medium">光源设置</h3>
        </div>

        <div className="space-y-3 pl-2">
          <div>
            <label className="text-sm text-white/70 mb-1 block">
              角度: {lightSource.angle}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={lightSource.angle}
              onChange={(e) =>
                handleLightChange('angle', parseInt(e.target.value))
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-1 block">
              色温: {lightSource.colorTemperature}K
            </label>
            <input
              type="range"
              min="2000"
              max="10000"
              step="100"
              value={lightSource.colorTemperature}
              onChange={(e) =>
                handleLightChange('colorTemperature', parseInt(e.target.value))
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-1 block">
              强度: {lightSource.intensity.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={lightSource.intensity}
              onChange={(e) =>
                handleLightChange('intensity', parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Layers size={18} />
          <h3 className="font-medium">碎片管理</h3>
        </div>

        {selectedFragmentData ? (
          <div className="space-y-3 pl-2">
            <p className="text-sm text-white/50">已选中碎片: {selectedFragment}</p>

            <div className="flex items-center gap-3">
              <Palette size={16} className="text-white/50" />
              <input
                type="color"
                value={selectedFragmentData.color}
                onChange={(e) => handleFragmentChange('color', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-white/70 mb-1 block">
                透光率: {(selectedFragmentData.transparency * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedFragmentData.transparency}
                onChange={(e) =>
                  handleFragmentChange('transparency', parseFloat(e.target.value))
                }
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm text-white/70 mb-1 block flex items-center gap-2">
                <Droplets size={14} />
                折射率: {selectedFragmentData.refractiveIndex.toFixed(2)}
              </label>
              <input
                type="range"
                min="1"
                max="2"
                step="0.05"
                value={selectedFragmentData.refractiveIndex}
                onChange={(e) =>
                  handleFragmentChange('refractiveIndex', parseFloat(e.target.value))
                }
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/50 pl-2">
            点击画布中的碎片进行编辑
          </p>
        )}
      </div>

      <div className="h-px bg-white/10" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <CircleDot size={18} />
          <h3 className="font-medium">顶点数量</h3>
        </div>
        <p className="text-2xl font-display text-center text-white/80">
          {fragments.reduce((acc, f) => acc + f.vertices.length, 0)}
        </p>
        <p className="text-xs text-white/40 text-center">
          碎片数: {fragments.length}
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;
