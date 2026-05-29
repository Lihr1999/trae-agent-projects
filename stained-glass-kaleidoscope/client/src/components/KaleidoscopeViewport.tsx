import { useEffect, useRef } from 'react';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { KaleidoscopeRenderer } from '../utils/KaleidoscopeRenderer';

export default function KaleidoscopeViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<KaleidoscopeRenderer | null>(null);
  
  const { 
    config, 
    photons, 
    causticPattern,
    tessellatedCells,
    isPlaying 
  } = useKaleidoscopeStore();

  useEffect(() => {
    if (containerRef.current) {
      rendererRef.current = new KaleidoscopeRenderer(containerRef.current, config);
      rendererRef.current.startAnimation();

      return () => {
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      };
    }
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateConfig(config);
    }
  }, [config]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateFragments(config.fragments, config.materials);
    }
  }, [config.fragments, config.materials]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updatePhotons(photons, causticPattern);
    }
  }, [photons, causticPattern]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateTessellation(tessellatedCells);
    }
  }, [tessellatedCells]);

  useEffect(() => {
    if (rendererRef.current) {
      if (isPlaying) {
        rendererRef.current.startAnimation();
      } else {
        rendererRef.current.stopAnimation();
      }
    }
  }, [isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ position: 'relative' }} />
  );
}
