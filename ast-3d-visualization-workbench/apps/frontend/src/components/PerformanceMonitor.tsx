import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';

const PerformanceMonitor: React.FC = () => {
  const layoutResult = useStore((s) => s.layoutResult);
  const frameTimesRef = useRef<number[]>([]);
  const [fps, setFps] = useState(0);
  const [nodeCount, setNodeCount] = useState(0);

  useFrame(() => {
    const now = performance.now();
    frameTimesRef.current.push(now);
    frameTimesRef.current = frameTimesRef.current.filter((t) => now - t < 1000);
    setFps(frameTimesRef.current.length);
    setNodeCount(layoutResult?.nodeCount ?? 0);
  });

  const fpsColor = fps > 30 ? '#4caf50' : fps >= 15 ? '#ff9800' : '#ff1744';
  const borderColor = fps > 30 ? '#333' : fps >= 15 ? '#ff9800' : '#ff1744';

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        backgroundColor: 'rgba(13, 13, 26, 0.85)',
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        padding: '4px 8px',
        color: '#e0e0e0',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '10px',
        lineHeight: '1.5',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <span style={{ color: fpsColor }}>{fps}</span> fps | {nodeCount} nodes
    </div>
  );
};

export default PerformanceMonitor;
