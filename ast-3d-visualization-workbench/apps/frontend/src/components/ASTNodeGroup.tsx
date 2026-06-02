import React, { useRef, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { getNodeColor } from '../utils/nodeColors';
import { getNodeSize } from '../utils/nodeGeometry';
import { isVisible } from '../utils/astHelpers';
import NodeTooltip from './NodeTooltip';
import type { LayoutNode, ASTNode } from '../../../../packages/shared/src';

interface IndividualNodeProps {
  node: LayoutNode;
  isSelected: boolean;
  isHighlighted: boolean;
  isCollapsed: boolean;
  onSelect: (nodeId: string) => void;
  onHover: (nodeId: string | null) => void;
}

const IndividualNode: React.FC<IndividualNodeProps> = React.memo(
  ({ node, isSelected, isHighlighted, isCollapsed, onSelect, onHover }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [pulsePhase, setPulsePhase] = useState(0);

    const color = useMemo(
      () => getNodeColor(node.type, node.hasError),
      [node.type, node.hasError],
    );

    const size = useMemo(() => getNodeSize(node.childCount), [node.childCount]);

    useFrame((_state, delta) => {
      if (isHighlighted && meshRef.current) {
        const newPhase = pulsePhase + delta * 4;
        setPulsePhase(newPhase);
        const pulse = Math.sin(newPhase) * 0.15 + 1;
        meshRef.current.scale.setScalar(size * pulse);
      } else if (meshRef.current) {
        meshRef.current.scale.setScalar(size);
      }
    });

    const handleClick = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(node.id);
      },
      [node.id, onSelect],
    );

    const handlePointerOver = useCallback(
      (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(node.id);
      },
      [node.id, onHover],
    );

    const handlePointerOut = useCallback(() => {
      onHover(null);
    }, [onHover]);

    const emissiveIntensity = isSelected ? 0.8 : isHighlighted ? 0.5 : 0.1;
    const opacity = isCollapsed ? 0.4 : 1;

    return (
      <mesh
        ref={meshRef}
        position={[node.x, node.y, node.z]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {isCollapsed ? (
          <octahedronGeometry args={[1, 0]} />
        ) : (
          <sphereGeometry args={[1, 16, 16]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? '#ffff00' : color}
          emissiveIntensity={emissiveIntensity}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    );
  },
);

IndividualNode.displayName = 'IndividualNode';

interface InstancedNodeGroupProps {
  nodes: LayoutNode[];
  selectedNodeIds: string[];
  highlightedNodeIds: string[];
  collapsedNodeIds: Set<string>;
  onSelect: (nodeId: string) => void;
}

const InstancedNodeGroup: React.FC<InstancedNodeGroupProps> = ({
  nodes,
  selectedNodeIds,
  highlightedNodeIds,
  collapsedNodeIds,
  onSelect,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const colorArray = useMemo(() => {
    const colors = new Float32Array(nodes.length * 3);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isSelected = selectedNodeIds.includes(node.id);
      const c = new THREE.Color(
        isSelected ? '#ffff00' : getNodeColor(node.type, node.hasError),
      );
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return colors;
  }, [nodes, selectedNodeIds]);

  useMemo(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isCollapsed = collapsedNodeIds.has(node.id);
      const isHighlighted = highlightedNodeIds.includes(node.id);
      const baseSize = getNodeSize(node.childCount);
      const pulseScale = isHighlighted ? 1.15 : 1;
      const size = baseSize * pulseScale;

      dummy.position.set(node.x, node.y, node.z);
      dummy.scale.setScalar(isCollapsed ? size * 1.3 : size);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [nodes, collapsedNodeIds, highlightedNodeIds, dummy]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (meshRef.current && e.instanceId !== undefined) {
        const node = nodes[e.instanceId];
        if (node) {
          onSelect(node.id);
        }
      }
    },
    [nodes, onSelect],
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, nodes.length]}
      onClick={handleClick}
      frustumCulled
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        vertexColors
        emissive="#ffffff"
        emissiveIntensity={0.1}
        transparent
        opacity={0.9}
      >
        <instancedBufferAttribute
          attach="geometry-attributes-color"
          args={[colorArray, 3]}
        />
      </meshStandardMaterial>
    </instancedMesh>
  );
};

interface ASTNodeGroupProps {
  onNodeClick?: (nodeId: string) => void;
}

const ASTNodeGroup: React.FC<ASTNodeGroupProps> = ({ onNodeClick }) => {
  const layoutResult = useStore((s) => s.layoutResult);
  const astNodes = useStore((s) => s.astNodes);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const highlightedNodeIds = useStore((s) => s.highlightedNodeIds);
  const collapsedNodeIds = useStore((s) => s.collapsedNodeIds);
  const selectNodes = useStore((s) => s.selectNodes);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    if (layoutResult) {
      for (const node of layoutResult.nodes) {
        map.set(node.id, node);
      }
    }
    return map;
  }, [layoutResult]);

  const astNodeMap = useMemo(() => {
    const map = new Map<string, ASTNode>();
    for (const node of astNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [astNodes]);

  const visibleNodes = useMemo(() => {
    if (!layoutResult) return [];
    return layoutResult.nodes.filter((n) =>
      isVisible(n.id, collapsedNodeIds, nodeMap),
    );
  }, [layoutResult, collapsedNodeIds, nodeMap]);

  const useInstanced = visibleNodes.length >= 1000;

  const handleSelect = useCallback(
    (nodeId: string) => {
      selectNodes([nodeId]);
      onNodeClick?.(nodeId);
    },
    [selectNodes, onNodeClick],
  );

  const handleHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  const hoveredLayoutNode = hoveredNodeId ? nodeMap.get(hoveredNodeId) : null;
  const hoveredAstNode = hoveredNodeId ? astNodeMap.get(hoveredNodeId) : null;

  if (!layoutResult) return null;

  const tooltipPosition: [number, number, number] | null =
    hoveredLayoutNode && hoveredAstNode
      ? [
          hoveredLayoutNode.x,
          hoveredLayoutNode.y + getNodeSize(hoveredLayoutNode.childCount) + 1,
          hoveredLayoutNode.z,
        ]
      : null;

  if (useInstanced) {
    return (
      <group>
        <InstancedNodeGroup
          nodes={visibleNodes}
          selectedNodeIds={selectedNodeIds}
          highlightedNodeIds={highlightedNodeIds}
          collapsedNodeIds={collapsedNodeIds}
          onSelect={handleSelect}
        />
        {hoveredAstNode && tooltipPosition && (
          <NodeTooltip node={hoveredAstNode} position={tooltipPosition} />
        )}
      </group>
    );
  }

  return (
    <group>
      {visibleNodes.map((node) => {
        const isSelected = selectedNodeIds.includes(node.id);
        const isHighlighted = highlightedNodeIds.includes(node.id);
        const isCollapsed = collapsedNodeIds.has(node.id);

        return (
          <IndividualNode
            key={node.id}
            node={node}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isCollapsed={isCollapsed}
            onSelect={handleSelect}
            onHover={handleHover}
          />
        );
      })}
      {hoveredAstNode && tooltipPosition && (
        <NodeTooltip node={hoveredAstNode} position={tooltipPosition} />
      )}
    </group>
  );
};

export default ASTNodeGroup;
