import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { easeOutCubic, easeInOutQuad, easeOutElastic } from '../utils/nodeGeometry';
import type { LayoutNode } from '../../../../packages/shared/src';

interface NodeAnimState {
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  originPosition: THREE.Vector3;
  scale: number;
  opacity: number;
}

const AnimationController: React.FC = () => {
  const animationState = useStore((s) => s.animationState);
  const setAnimationState = useStore((s) => s.setAnimationState);
  const layoutResult = useStore((s) => s.layoutResult);
  const collapsedNodeIds = useStore((s) => s.collapsedNodeIds);

  const animStatesRef = useRef<Map<string, NodeAnimState>>(new Map());

  useEffect(() => {
    if (!layoutResult) return;
    const map = new Map<string, NodeAnimState>();
    for (const node of layoutResult.nodes) {
      map.set(node.id, {
        currentPosition: new THREE.Vector3(node.x, node.y, node.z),
        targetPosition: new THREE.Vector3(node.x, node.y, node.z),
        originPosition: new THREE.Vector3(node.x, node.y, node.z),
        scale: 1,
        opacity: 1,
      });
    }
    animStatesRef.current = map;
  }, [layoutResult]);

  useEffect(() => {
    if (animationState.type !== 'explode' || !layoutResult) return;
    const bounds = layoutResult.bounds;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const center = new THREE.Vector3(centerX, centerY, centerZ);
    for (const [id, state] of animStatesRef.current) {
      if (animationState.affectedNodes.includes(id)) {
        state.originPosition.copy(center);
        state.currentPosition.copy(center);
      }
    }
  }, [animationState.type, animationState.startTime, layoutResult]);

  useEffect(() => {
    if (animationState.type !== 'collapse' || !layoutResult) return;
    const nodeMap = new Map<string, LayoutNode>();
    for (const n of layoutResult.nodes) {
      nodeMap.set(n.id, n);
    }
    for (const [id, state] of animStatesRef.current) {
      if (!animationState.affectedNodes.includes(id)) continue;
      const node = nodeMap.get(id);
      if (!node?.parentId) continue;
      const parent = nodeMap.get(node.parentId);
      if (!parent) continue;
      state.targetPosition.set(parent.x, parent.y, parent.z);
      state.scale = 0;
      state.opacity = 0;
    }
  }, [animationState.type, animationState.startTime, collapsedNodeIds, layoutResult]);

  useFrame(() => {
    if (animationState.type === 'none') {
      animStatesRef.current.forEach((state) => {
        state.scale = 1;
        state.opacity = 1;
      });
      return;
    }

    const elapsed = Date.now() - animationState.startTime;
    const rawProgress = Math.min(1, elapsed / animationState.duration);

    switch (animationState.type) {
      case 'explode': {
        const eased = easeOutCubic(rawProgress);
        for (const [id, state] of animStatesRef.current) {
          if (animationState.affectedNodes.includes(id)) {
            state.currentPosition.lerpVectors(state.originPosition, state.targetPosition, eased);
            state.scale = eased;
            state.opacity = eased;
          }
        }
        break;
      }

      case 'pulse': {
        const pulse = Math.sin(rawProgress * Math.PI * 2) * 0.3 + 1;
        for (const [id, state] of animStatesRef.current) {
          if (animationState.affectedNodes.includes(id)) {
            state.scale = pulse;
          }
        }
        break;
      }

      case 'collapse': {
        const eased = easeInOutQuad(rawProgress);
        for (const [id, state] of animStatesRef.current) {
          if (animationState.affectedNodes.includes(id)) {
            state.currentPosition.lerpVectors(state.originPosition, state.targetPosition, eased);
            state.scale = 1 - eased;
            state.opacity = 1 - eased;
          }
        }
        break;
      }

      case 'morph': {
        const eased = easeOutElastic(rawProgress);
        for (const [id, state] of animStatesRef.current) {
          if (animationState.affectedNodes.includes(id)) {
            state.scale = eased;
            state.opacity = Math.min(1, rawProgress * 2);
          }
        }
        break;
      }
    }

    if (rawProgress >= 1 && animationState.type !== 'pulse') {
      setAnimationState({
        type: 'none',
        progress: 1,
        duration: 0,
        startTime: 0,
        affectedNodes: [],
      });
    }
  });

  return null;
};

export default AnimationController;
