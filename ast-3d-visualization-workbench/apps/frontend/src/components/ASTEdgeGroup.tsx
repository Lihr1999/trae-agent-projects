import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { getEdgePoints, getNodeSize } from '../utils/nodeGeometry';
import type { LayoutNode, LayoutEdge } from '../../../../packages/shared/src';

interface EdgeData {
  sourceId: string;
  targetId: string;
  start: [number, number, number];
  end: [number, number, number];
  isHighlighted: boolean;
}

function buildEdges(
  layoutNodes: LayoutNode[],
  edges: LayoutEdge[],
  collapsedNodeIds: Set<string>,
  selectedNodeIds: string[],
  highlightedNodeIds: string[],
): EdgeData[] {
  const nodeMap = new Map<string, LayoutNode>();
  for (const n of layoutNodes) {
    nodeMap.set(n.id, n);
  }

  const highlightedSet = new Set<string>();
  for (const id of [...selectedNodeIds, ...highlightedNodeIds]) {
    highlightedSet.add(id);
  }

  const result: EdgeData[] = [];

  for (const edge of edges) {
    if (collapsedNodeIds.has(edge.source)) continue;

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourcePos: [number, number, number] = [sourceNode.x, sourceNode.y, sourceNode.z];
    const targetPos: [number, number, number] = [targetNode.x, targetNode.y, targetNode.z];
    const sourceSize = getNodeSize(sourceNode.childCount);
    const targetSize = getNodeSize(targetNode.childCount);

    const [startPoint, endPoint] = getEdgePoints(sourcePos, targetPos, sourceSize, targetSize);

    const isHighlighted =
      highlightedSet.has(edge.source) && highlightedSet.has(edge.target);

    result.push({
      sourceId: edge.source,
      targetId: edge.target,
      start: startPoint,
      end: endPoint,
      isHighlighted,
    });
  }

  return result;
}

interface IndividualEdgeProps {
  edge: EdgeData;
}

const IndividualEdge: React.FC<IndividualEdgeProps> = React.memo(({ edge }) => {
  const midPoint: [number, number, number] = [
    (edge.start[0] + edge.end[0]) / 2,
    (edge.start[1] + edge.end[1]) / 2,
    (edge.start[2] + edge.end[2]) / 2,
  ];

  const color = edge.isHighlighted ? '#88ccff' : '#444444';
  const lineWidth = edge.isHighlighted ? 2 : 1;

  return (
    <Line
      points={[edge.start, midPoint, edge.end]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={edge.isHighlighted ? 0.9 : 0.4}
    />
  );
});

IndividualEdge.displayName = 'IndividualEdge';

interface BatchedEdgesProps {
  edges: EdgeData[];
}

const BatchedEdges: React.FC<BatchedEdgesProps> = ({ edges }) => {
  const lineRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    for (const edge of edges) {
      positions.push(
        edge.start[0], edge.start[1], edge.start[2],
        edge.end[0], edge.end[1], edge.end[2],
      );

      const brightness = edge.isHighlighted ? 0.6 : 0.2;
      const c = new THREE.Color(brightness, brightness, brightness + (edge.isHighlighted ? 0.3 : 0));
      colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [edges]);

  return (
    <lineSegments ref={lineRef} geometry={geometry} frustumCulled>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.5}
        linewidth={1}
      />
    </lineSegments>
  );
};

const ASTEdgeGroup: React.FC = () => {
  const layoutResult = useStore((s) => s.layoutResult);
  const collapsedNodeIds = useStore((s) => s.collapsedNodeIds);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const highlightedNodeIds = useStore((s) => s.highlightedNodeIds);

  const edges = useMemo(() => {
    if (!layoutResult) return [];
    return buildEdges(
      layoutResult.nodes,
      layoutResult.edges,
      collapsedNodeIds,
      selectedNodeIds,
      highlightedNodeIds,
    );
  }, [layoutResult, collapsedNodeIds, selectedNodeIds, highlightedNodeIds]);

  if (edges.length === 0) return null;

  if (edges.length >= 500) {
    return <BatchedEdges edges={edges} />;
  }

  return (
    <group>
      {edges.map((edge) => (
        <IndividualEdge key={`${edge.sourceId}-${edge.targetId}`} edge={edge} />
      ))}
    </group>
  );
};

export default ASTEdgeGroup;
