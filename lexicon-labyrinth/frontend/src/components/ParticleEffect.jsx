import { useRef, useEffect, useState } from 'react';

export default function ParticleEffect({ active, x, y, color, onComplete }) {
  const [particles, setParticles] = useState([]);
  const animRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const newParticles = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: i,
        x: x || 0,
        y: y || 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 4 + Math.random() * 4,
        color: color || '#00d9ff'
      });
    }

    setParticles(newParticles);

    const animate = () => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1,
          life: p.life - 0.03
        })).filter(p => p.life > 0);

        if (updated.length === 0) {
          if (onComplete) onComplete();
          return [];
        }
        return updated;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [active, x, y, color, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: p.color,
            opacity: p.life,
            transform: `scale(${p.life})`,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`
          }}
        />
      ))}
    </div>
  );
}
