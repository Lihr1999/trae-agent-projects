import React, { useEffect, useState } from 'react';
import { AlertTriangle, Cpu, RefreshCw, Layers } from 'lucide-react';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';

const StatusBar: React.FC = () => {
  const { symmetry, warnings, symmetryResult } = useKaleidoscopeStore();
  const [fps, setFps] = useState(60);
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastTime = now;
      }
      setFrameCount(frames);
      requestAnimationFrame(measureFPS);
    };

    const id = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(id);
  }, []);

  const symmetryLabels: Record<string, string> = {
    dihedral: '二面体群',
    cyclic: '循环群',
    spherical: '球面几何',
    hyperbolic: '双曲几何',
  };

  const hasSeamIssue = 360 % symmetry.mirrorAngle !== 0;
  const transformCount = symmetryResult?.matrices.length || 0;

  return (
    <div className="glass-panel h-12 flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-accent" />
          <span className="text-sm font-mono text-white/70">
            FPS: <span className={fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}>{fps}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-accent" />
          <span className="text-sm text-white/70">
            {symmetryLabels[symmetry.type]} ({symmetry.order}重)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Layers size={14} className="text-accent" />
          <span className="text-sm text-white/70">
            变换数: {transformCount}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {hasSeamIssue && (
          <div className="flex items-center gap-1 text-yellow-400 text-xs">
            <AlertTriangle size={12} />
            <span>接缝警告: {(360 % symmetry.mirrorAngle).toFixed(1)}° 间隙</span>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="flex items-center gap-2">
            {warnings.slice(0, 2).map((warning, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 text-orange-400 text-xs"
              >
                <AlertTriangle size={12} />
                <span className="max-w-xs truncate">{warning}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-white/40">
          镜面夹角: {symmetry.mirrorAngle}°
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
