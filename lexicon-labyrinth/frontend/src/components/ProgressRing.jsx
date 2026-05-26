import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Ring, Arc, Text } from 'react-konva';

export default function ProgressRing({ progress, size = 120 }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    const node = animRef.current;
    if (node) {
      node.to({
        innerRadius: 40,
        outerRadius: 55,
        duration: 0.5
      });
    }

    const startVal = animatedProgress;
    const endVal = progress;
    const startTime = Date.now();
    const duration = 800;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startVal + (endVal - startVal) * eased;
      setAnimatedProgress(current);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);

    return () => {};
  }, [progress]);

  const innerRadius = 40;
  const outerRadius = 55;
  const angleDeg = (animatedProgress / 100) * 360;

  const getColor = (p) => {
    if (p >= 100) return '#00ff88';
    if (p >= 50) return '#00d9ff';
    if (p >= 25) return '#ffbe0b';
    return '#ff006e';
  };

  return (
    <div className="ring-progress-container" style={{ width: size, height: size }}>
      <Stage width={size} height={size}>
        <Layer>
          <Ring
            x={size / 2}
            y={size / 2}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />

          <Ring
            ref={animRef}
            x={size / 2}
            y={size / 2}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            angleDeg={angleDeg}
            rotation={-90}
            fillLinearGradientStartPoint={{ x: -outerRadius, y: 0 }}
            fillLinearGradientEndPoint={{ x: outerRadius, y: 0 }}
            fillLinearGradientColorStops={[0, getColor(animatedProgress), 1, '#8338ec']}
            cornerRadius={4}
            listening={false}
          />

          <Ring
            x={size / 2}
            y={size / 2}
            innerRadius={innerRadius + 5}
            outerRadius={outerRadius - 5}
            angleDeg={angleDeg}
            rotation={-90}
            fill={getColor(animatedProgress)}
            opacity={0.3}
            listening={false}
          />
        </Layer>
      </Stage>
      <div className="ring-progress-text">
        {Math.round(animatedProgress)}%
      </div>
    </div>
  );
}
