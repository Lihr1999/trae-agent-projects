import React, { useCallback, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import ASTNodeGroup from './ASTNodeGroup';
import ASTEdgeGroup from './ASTEdgeGroup';
import AnimationController from './AnimationController';
import ErrorBoundary from './ErrorBoundary';

function Scene({ onNodeClick }: { onNodeClick?: (nodeId: string) => void }) {
  const autoRotate = useStore((s) => s.animationState.type === 'none');
  const isLoading = useStore((s) => s.isLoading);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} color="#4488ff" />
      <pointLight position={[0, 20, 0]} intensity={0.2} color="#ffffff" />

      <ASTNodeGroup onNodeClick={onNodeClick} />
      <ASTEdgeGroup />
      <AnimationController />

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        autoRotate={autoRotate && !isLoading}
        autoRotateSpeed={0.5}
        minDistance={5}
        maxDistance={500}
        maxPolarAngle={Math.PI}
      />

      <gridHelper args={[200, 40, '#333333', '#1a1a2e']} rotation={[0, 0, 0]} />

      <Stars
        radius={300}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
    </>
  );
}

function RaycasterHandler({
  onNodeClick,
}: {
  onNodeClick?: (nodeId: string) => void;
}) {
  const { raycaster, camera, scene } = useThree();
  const selectNodes = useStore((s) => s.selectNodes);
  const astNodes = useStore((s) => s.astNodes);
  const toggleCollapse = useStore((s) => s.toggleCollapse);
  const setAnimationState = useStore((s) => s.setAnimationState);

  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      const rect = (event.target as HTMLElement)?.getBoundingClientRect?.();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const mesh = hit.object;

        if (mesh.userData?.nodeId) {
          selectNodes([mesh.userData.nodeId]);
          onNodeClick?.(mesh.userData.nodeId);
        }
      }
    },
    [raycaster, camera, scene, selectNodes, onNodeClick],
  );

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      const rect = (event.target as HTMLElement)?.getBoundingClientRect?.();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const mesh = hit.object;

        if (mesh.userData?.nodeId) {
          const nodeId = mesh.userData.nodeId;
          const node = astNodes.find((n) => n.id === nodeId);
          if (node && node.children.length > 0) {
            toggleCollapse(nodeId);

            const descendantIds: string[] = [];
            const collectDescendants = (n: typeof node) => {
              for (const child of n.children) {
                descendantIds.push(child.id);
                collectDescendants(child);
              }
            };
            collectDescendants(node);

            setAnimationState({
              type: 'collapse',
              progress: 0,
              duration: 500,
              startTime: Date.now(),
              affectedNodes: descendantIds,
            });
          }
        }
      }
    },
    [raycaster, camera, scene, astNodes, toggleCollapse, setAnimationState],
  );

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('dblclick', handleDoubleClick);

    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [handleCanvasClick, handleDoubleClick]);

  return null;
}

const Viewport3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectNodes = useStore((s) => s.selectNodes);
  const isLoading = useStore((s) => s.isLoading);
  const layoutResult = useStore((s) => s.layoutResult);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      selectNodes([nodeId]);
    },
    [selectNodes],
  );

  const handlePointerMissed = useCallback(() => {
    selectNodes([]);
  }, [selectNodes]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ErrorBoundary>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#0a0a1a',
        }}
      >
        <Canvas
          camera={{
            position: [0, 50, 100],
            fov: 60,
            near: 0.1,
            far: 10000,
          }}
          onPointerMissed={handlePointerMissed}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]}
          style={{ backgroundColor: '#0a0a1a' }}
        >
          <Scene onNodeClick={handleNodeClick} />
          <RaycasterHandler onNodeClick={handleNodeClick} />
        </Canvas>

        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(10, 10, 26, 0.6)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: '#e0e0e0',
                fontFamily: "'Consolas', monospace",
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #333',
                  borderTop: '3px solid #42a5f5',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Processing...
            </div>
          </div>
        )}

        {!layoutResult && !isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#555',
              fontFamily: "'Consolas', monospace",
              fontSize: '14px',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌐</div>
            <div>Paste code and click Parse to visualize</div>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#444' }}>
              Double-click nodes to collapse · Scroll to zoom · Drag to orbit
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default Viewport3D;
