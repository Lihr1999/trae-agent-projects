import { useRef, useEffect, useCallback } from 'react';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { Point, BezierCurve } from '../types';

export default function FragmentCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    config, tool, currentCurve, setCurrentCurve, addFragment, selectedFragmentId, selectFragment, updateFragment
  } = useKaleidoscopeStore();

  const drawingPoints = useRef<Point[]>([]);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    config.fragments.forEach((fragment) => {
      if (fragment.vertices.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(fragment.vertices[0].x * 200 + 200, fragment.vertices[0].y * 200 + 200);
        
        for (let i = 1; i < fragment.vertices.length; i++) {
          ctx.lineTo(fragment.vertices[i].x * 200 + 200, fragment.vertices[i].y * 200 + 200);
        }
        ctx.closePath();
        
        const material = config.materials.find(m => m.id === fragment.materialId);
        if (material) {
          ctx.fillStyle = `rgba(${Math.round(material.color.r * 255)}, ${Math.round(material.color.g * 255)}, ${Math.round(material.color.b * 255)}, 0.6)`;
          ctx.fill();
        }
        
        ctx.strokeStyle = selectedFragmentId === fragment.id ? '#667eea' : '#ffffff';
        ctx.lineWidth = selectedFragmentId === fragment.id ? 2 : 1;
        ctx.stroke();
      }
    });

    if (tool === 'bezier' && currentCurve) {
      ctx.beginPath();
      ctx.moveTo(
        currentCurve.startPoint.x * 200 + 200,
        currentCurve.startPoint.y * 200 + 200
      );
      ctx.bezierCurveTo(
        currentCurve.controlPoint1.x * 200 + 200,
        currentCurve.controlPoint1.y * 200 + 200,
        currentCurve.controlPoint2.x * 200 + 200,
        currentCurve.controlPoint2.y * 200 + 200,
        currentCurve.endPoint.x * 200 + 200,
        currentCurve.endPoint.y * 200 + 200
      );
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (drawingPoints.current.length > 0) {
      ctx.beginPath();
      ctx.moveTo(
        drawingPoints.current[0].x, drawingPoints.current[0].y);
      for (let i = 1; i < drawingPoints.current.length; i++) {
        ctx.lineTo(drawingPoints.current[i].x, drawingPoints.current[i].y);
      }
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [config.fragments, config.materials, currentCurve, tool, selectedFragmentId]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - 200) / 200,
      y: (e.clientY - rect.top - 200) / 200
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'bezier') {
      isDrawing.current = true;
      const point = getCanvasCoords(e);
      drawingPoints.current = [point];
    }
  }, [tool, getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing.current && tool === 'bezier') {
      const point = getCanvasCoords(e);
      drawingPoints.current = [...drawingPoints.current, point];
    }
  }, [tool, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
      
    if (tool === 'bezier' && drawingPoints.current.length >= 3) {
      const points = drawingPoints.current;
      const newFragment = {
        id: `frag_${Date.now()}`,
        name: `Fragment ${config.fragments.length + 1}`,
        curves: [],
        vertices: points,
        materialId: config.materials[0]?.id || ''
      };
      addFragment(newFragment);
      selectFragment(newFragment.id);
    }
    
    drawingPoints.current = [];
  }, [tool, config.fragments.length, config.materials, addFragment, selectFragment]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>🔷 Glass Fragments</span>
      </div>
      
      <div className="panel-content flex-1 flex flex-col">
        <div className="flex-1 relative mb-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full border border-white/10 rounded-lg cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
        
        <div className="text-xs text-white/50 mb-2">
          {tool === 'bezier' ? 'Click and drag to draw glass fragment' : 'Select a tool to edit'}
        </div>

        <div className="space-y-2 max-h-32 overflow-y-auto">
          {config.fragments.map((fragment) => (
            <div
              key={fragment.id}
              className={`p-2 rounded cursor-pointer transition-all text-sm ${
                selectedFragmentId === fragment.id ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'
              }`}
              onClick={() => selectFragment(fragment.id)}
            >
              <div className="flex items-center justify-between">
                <span>{fragment.name}</span>
                <span className="text-xs text-white/50">
                  {fragment.vertices.length} vertices
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
