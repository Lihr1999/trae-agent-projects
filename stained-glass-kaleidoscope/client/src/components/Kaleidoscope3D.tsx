import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { hexToRgb, kelvinToRGB } from '../utils/api';
import { applyTransformation } from '../utils/symmetry';
import { Vertex } from '../types';

interface GlassFragmentProps {
  vertices: THREE.Vector3[];
  color: string;
  transparency: number;
  refractiveIndex: number;
  lightColor: THREE.Color;
  animationProgress: number;
  transform: number[][];
}

const GlassFragment: React.FC<GlassFragmentProps> = ({
  vertices,
  color,
  transparency,
  refractiveIndex,
  lightColor,
  animationProgress,
  transform,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    if (vertices.length >= 3) {
      const center = new THREE.Vector3(0, 0, 0);
      vertices.forEach((v) => center.add(v));
      center.divideScalar(vertices.length);

      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];

        positions.push(center.x, center.y, 0);
        positions.push(v1.x, v1.y, 0);
        positions.push(v2.x, v2.y, 0);

        normals.push(0, 0, 1);
        normals.push(0, 0, 1);
        normals.push(0, 0, 1);

        uvs.push(0.5, 0.5);
        uvs.push((v1.x + 1) / 2, (v1.y + 1) / 2);
        uvs.push((v2.x + 1) / 2, (v2.y + 1) / 2);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();

    return geo;
  }, [vertices]);

  const material = useMemo(() => {
    const rgb = hexToRgb(color);
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(rgb.r, rgb.g, rgb.b),
      transparent: true,
      opacity: 1 - transparency * 0.7,
      roughness: 0.05,
      metalness: 0.1,
      transmission: transparency * 0.8,
      thickness: 0.5,
      ior: refractiveIndex,
      emissive: lightColor,
      emissiveIntensity: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    return mat;
  }, [color, transparency, refractiveIndex, lightColor]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const scale = 0.5 + animationProgress * 0.5;
      meshRef.current.scale.setScalar(scale);
      meshRef.current.rotation.z += delta * 0.1;
    }
  });

  const position = useMemo(() => {
    if (transform.length === 0) return [0, 0, 0];
    const transformed = applyTransformation({ x: 0, y: 0 }, transform);
    return [transformed.x, transformed.y, 0];
  }, [transform]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} position={position as [number, number, number]} />
  );
};

interface SymmetricCopiesProps {
  baseVertices: Vertex[];
  fragments: any[];
  matrices: number[][][];
  lightColor: THREE.Color;
  animationProgress: number;
}

const SymmetricCopies: React.FC<SymmetricCopiesProps> = ({
  baseVertices,
  fragments,
  matrices,
  lightColor,
  animationProgress,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = clock.getElapsedTime() * 0.2;
    }
  });

  const fragmentGeometries = useMemo(() => {
    return fragments.map((fragment) => {
      const fragVertices = fragment.vertices
        .map((id: string) => baseVertices.find((v) => v.id === id))
        .filter(Boolean) as Vertex[];

      if (fragVertices.length < 3) return null;

      return {
        ...fragment,
        threeVertices: fragVertices.map(
          (v) => new THREE.Vector3(v.x, v.y, 0)
        ),
      };
    }).filter(Boolean);
  }, [fragments, baseVertices]);

  const displayMatrices = useMemo(() => {
    const maxMatrices = Math.min(matrices.length, 24);
    return matrices.slice(0, maxMatrices);
  }, [matrices]);

  return (
    <group ref={groupRef}>
      {displayMatrices.map((matrix, matrixIndex) => (
        <group key={matrixIndex}>
          {fragmentGeometries.map((frag, fragIndex) => {
            if (!frag) return null;
            const transformedVertices = frag.threeVertices.map((v: THREE.Vector3) => {
              const transformed = applyTransformation(
                { x: v.x, y: v.y },
                matrix
              );
              return new THREE.Vector3(transformed.x, transformed.y, 0);
            });

            return (
              <GlassFragment
                key={`${matrixIndex}-${fragIndex}`}
                vertices={transformedVertices}
                color={frag.color}
                transparency={frag.transparency}
                refractiveIndex={frag.refractiveIndex}
                lightColor={lightColor}
                animationProgress={animationProgress}
                transform={matrix}
              />
            );
          })}
        </group>
      ))}
    </group>
  );
};

interface KaleidoscopeSceneProps {
  animationProgress: number;
}

const KaleidoscopeScene: React.FC<KaleidoscopeSceneProps> = ({ animationProgress }) => {
  const { vertices, fragments, lightSource, symmetryResult } = useKaleidoscopeStore();

  const lightColor = useMemo(() => {
    const rgb = kelvinToRGB(lightSource.colorTemperature);
    return new THREE.Color(rgb.r, rgb.g, rgb.b);
  }, [lightSource.colorTemperature]);

  const lightPosition = useMemo(() => {
    const angleRad = (lightSource.angle * Math.PI) / 180;
    return new THREE.Vector3(
      lightSource.position.x + Math.cos(angleRad) * 5,
      lightSource.position.y + Math.sin(angleRad) * 5,
      lightSource.position.z
    );
  }, [lightSource]);

  const matrices = useMemo(() => {
    return symmetryResult?.matrices || [
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    ];
  }, [symmetryResult]);

  return (
    <>
      <ambientLight intensity={0.2 * lightSource.intensity} />
      <pointLight
        position={lightPosition}
        color={lightColor}
        intensity={lightSource.intensity * 2}
        distance={20}
        decay={2}
      />
      <pointLight
        position={[-lightPosition.x, -lightPosition.y, lightPosition.z]}
        color={lightColor}
        intensity={lightSource.intensity}
        distance={20}
        decay={2}
      />

      <SymmetricCopies
        baseVertices={vertices}
        fragments={fragments}
        matrices={matrices}
        lightColor={lightColor}
        animationProgress={animationProgress}
      />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} radialModulation={false} modulationOffset={0} />
      </EffectComposer>
    </>
  );
};

interface Kaleidoscope3DProps {
  className?: string;
}

const Kaleidoscope3D: React.FC<Kaleidoscope3DProps> = ({ className }) => {
  const { animationProgress, setStatus, isAnimating, setAnimationProgress } = useKaleidoscopeStore();

  useEffect(() => {
    if (!isAnimating) return;

    let animationId: number;
    let startTime = Date.now();
    const duration = 2000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(eased);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isAnimating, setAnimationProgress]);

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a15');
        }}
      >
        <KaleidoscopeScene animationProgress={animationProgress} />
        <OrbitControls
          enablePan={false}
          minDistance={1.5}
          maxDistance={10}
          autoRotate={false}
        />
      </Canvas>
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 rounded-full border-4 border-accent/30 m-4" />
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, transparent 60%, rgba(10, 10, 21, 0.8) 100%)',
          }}
        />
      </div>
    </div>
  );
};

export default Kaleidoscope3D;
