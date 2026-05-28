import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { Vertex, Fragment } from '../types';

interface Canvas2DEditorProps {
  width: number;
  height: number;
}

const Canvas2DEditor: React.FC<Canvas2DEditorProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    vertices,
    fragments,
    selectedFragment,
    addVertex,
    updateVertex,
    removeVertex,
    selectFragment,
  } = useKaleidoscopeStore();

  const [draggingVertex, setDraggingVertex] = useState<string | null>(null);
  const [hoveredVertex, setHoveredVertex] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((clientY - rect.top) / rect.height - 0.5) * 2,
      };
    },
    []
  );

  const fromCanvasCoords = useCallback(
    (x: number, y: number) => {
      return {
        x: (x / 2 + 0.5) * width,
        y: (y / 2 + 0.5) * height,
      };
    },
    [width, height]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const coords = toCanvasCoords(e.clientX, e.clientY);
      
      const clickedVertex = vertices.find((v) => {
        const dx = v.x - coords.x;
        const dy = v.y - coords.y;
        return Math.sqrt(dx * dx + dy * dy) < 0.05;
      });

      if (clickedVertex) {
        if (e.button === 2) {
          removeVertex(clickedVertex.id);
        } else {
          setDraggingVertex(clickedVertex.id);
        }
        return;
      }

      const clickedFragment = fragments.find((f) => {
        const fragVertices = f.vertices
          .map((id) => vertices.find((v) => v.id === id))
          .filter(Boolean) as Vertex[];
        return isPointInPolygon(coords, fragVertices);
      });

      if (clickedFragment) {
        selectFragment(clickedFragment.id);
      } else if (e.button === 0) {
        const newId = `v${Date.now()}`;
        addVertex({ id: newId, x: coords.x, y: coords.y });
        setDraggingVertex(newId);
      }
    },
    [vertices, fragments, toCanvasCoords, addVertex, removeVertex, selectFragment]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = toCanvasCoords(e.clientX, e.clientY);
      setMousePos(coords);

      if (draggingVertex) {
        updateVertex(draggingVertex, coords.x, coords.y);
      } else {
        const hovered = vertices.find((v) => {
          const dx = v.x - coords.x;
          const dy = v.y - coords.y;
          return Math.sqrt(dx * dx + dy * dy) < 0.05;
        });
        setHoveredVertex(hovered?.id || null);
      }
    },
    [draggingVertex, vertices, toCanvasCoords, updateVertex]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingVertex(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i <= height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    fragments.forEach((fragment) => {
      const fragVertices = fragment.vertices
        .map((id) => vertices.find((v) => v.id === id))
        .filter(Boolean) as Vertex[];

      if (fragVertices.length < 3) return;

      ctx.beginPath();
      const first = fromCanvasCoords(fragVertices[0].x, fragVertices[0].y);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < fragVertices.length; i++) {
        const p = fromCanvasCoords(fragVertices[i].x, fragVertices[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      ctx.fillStyle = fragment.color + '80';
      ctx.fill();

      ctx.strokeStyle = fragment.id === selectedFragment ? '#d4af37' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = fragment.id === selectedFragment ? 3 : 1.5;
      ctx.stroke();
    });

    vertices.forEach((vertex) => {
      const p = fromCanvasCoords(vertex.x, vertex.y);
      const isHovered = hoveredVertex === vertex.id;
      const isDragging = draggingVertex === vertex.id;

      ctx.beginPath();
      ctx.arc(p.x, p.y, isHovered || isDragging ? 10 : 7, 0, Math.PI * 2);
      
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, isHovered ? 15 : 10);
      gradient.addColorStop(0, '#d4af37');
      gradient.addColorStop(0.5, '#d4af3780');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.fillStyle = isDragging ? '#fff' : '#d4af37';
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHovered || isDragging ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }, [vertices, fragments, selectedFragment, hoveredVertex, draggingVertex, width, height, fromCanvasCoords]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="cursor-crosshair rounded-lg glow-border"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      <div className="absolute bottom-2 left-2 text-xs text-white/50">
        左键: 添加/拖动顶点 | 右键顶点: 删除 | 点击碎片: 选中
      </div>
      <div className="absolute top-2 right-2 text-xs text-white/50 font-mono">
        ({mousePos.x.toFixed(3)}, {mousePos.y.toFixed(3)})
      </div>
    </div>
  );
};

function isPointInPolygon(point: { x: number; y: number }, vertices: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default Canvas2DEditor;
