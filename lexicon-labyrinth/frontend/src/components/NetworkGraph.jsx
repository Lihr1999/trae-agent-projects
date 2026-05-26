import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Circle, Text, Line, Arrow, Group } from 'react-konva';

export default function NetworkGraph({ graph, solvedWords }) {
  const [animating, setAnimating] = useState(false);
  const [edgePositions, setEdgePositions] = useState([]);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!graph || !graph.nodes || graph.nodes.length === 0) return;

    const positions = graph.edges?.map(edge => {
      const fromNode = graph.nodes.find(n => n.id === edge.from);
      const toNode = graph.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      const solved = solvedWords.some(w =>
        fromNode.word?.toLowerCase().includes(w) || toNode.word?.toLowerCase().includes(w)
      );

      return {
        ...edge,
        fromX: fromNode.x,
        fromY: fromNode.y,
        toX: toNode.x,
        toY: toNode.y,
        solved,
        progress: 0
      };
    }).filter(Boolean) || [];

    setEdgePositions(positions);
    setAnimating(true);

    const startTime = Date.now();
    const duration = 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      setEdgePositions(prev =>
        prev.map(e => ({ ...e, progress: eased }))
      );

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [graph, solvedWords]);

  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#555', padding: '20px' }}>
        无数据
      </div>
    );
  }

  const canvasWidth = 280;
  const canvasHeight = 200;
  const scaleX = canvasWidth / (graph.nodes.reduce((max, n) => Math.max(max, n.x), 0) + 150);
  const scaleY = canvasHeight / (graph.nodes.reduce((max, n) => Math.max(max, n.y), 0) + 100);
  const scale = Math.min(scaleX, scaleY, 0.8);

  return (
    <Stage width={canvasWidth} height={canvasHeight}>
      <Layer>
        {edgePositions.map((edge, i) => {
          const currentX = edge.fromX + (edge.toX - edge.fromX) * edge.progress;
          const currentY = edge.fromY + (edge.toY - edge.fromY) * edge.progress;

          return (
            <Group key={i}>
              <Line
                points={[
                  edge.fromX * scale + 10,
                  edge.fromY * scale + 10,
                  currentX * scale + 10,
                  currentY * scale + 10
                ]}
                stroke={edge.solved ? '#00ff88' : edge.isCycle ? '#ff006e' : '#00d9ff'}
                strokeWidth={edge.solved ? 3 : 2}
                tension={0.3}
                dash={edge.isCycle ? [5, 5] : []}
                opacity={0.6}
              />

              {edge.progress > 0.8 && (
                <Arrow
                  points={[
                    edge.fromX * scale + 10,
                    edge.fromY * scale + 10,
                    currentX * scale + 10,
                    currentY * scale + 10
                  ]}
                  stroke={edge.solved ? '#00ff88' : '#00d9ff'}
                  strokeWidth={1}
                  pointerLength={6}
                  pointerWidth={6}
                  fill={edge.solved ? '#00ff88' : '#00d9ff'}
                />
              )}
            </Group>
          );
        })}

        {graph.nodes.map((node, i) => {
          const solved = solvedWords.includes(node.word?.toLowerCase());
          return (
            <Group key={node.id} x={node.x * scale + 10} y={node.y * scale + 10}>
              <Circle
                radius={12}
                fill={solved ? '#00ff88' : '#16213e'}
                stroke={solved ? '#00ff88' : '#00d9ff'}
                strokeWidth={2}
                opacity={solved ? 1 : 0.8}
              />
              <Text
                text={node.word ? node.word[0].toUpperCase() : '?'}
                fontSize={12}
                fontStyle="bold"
                fill={solved ? '#fff' : '#00d9ff'}
                x={-4}
                y={-6}
                width={8}
                align="center"
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
