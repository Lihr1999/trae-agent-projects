import { useRef, useEffect } from 'react';

export default function PulseWarning({ active }) {
  const pulseRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const el = pulseRef.current;
    if (!el) return;

    let phase = 0;
    const animate = () => {
      phase += 0.1;
      const opacity = 0.3 + Math.sin(phase) * 0.2;
      el.style.opacity = opacity;

      if (active) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    return () => {};
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={pulseRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: '4px solid #ff006e',
        borderRadius: '8px',
        pointerEvents: 'none',
        zIndex: 100,
        boxShadow: '0 0 30px rgba(255, 0, 110, 0.5) inset',
        opacity: 0.5
      }}
    />
  );
}
