import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import type { MapElement, MapElementType, Point, Seat } from '@/types';
import { Square, Circle, DoorOpen, Trash2, Hand, Coffee, Sofa } from 'lucide-react';

interface MapEditorProps {
  width: number;
  height: number;
}

const MapEditor: React.FC<MapEditorProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [tempSeatPos, setTempSeatPos] = useState<Point | null>(null);

  const {
    isEditing,
    selectedTool,
    setSelectedTool,
    selectedElementId,
    setSelectedElementId,
    addMapElement,
    removeMapElement,
    updateMapElement,
    addSeat,
    removeSeat,
    clearMap,
    state: { mapElements, seats },
  } = useSimulationStore();

  const tools: { id: MapElementType | 'select' | 'seat'; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <Hand size={18} />, label: '选择' },
    { id: 'bar', icon: <Coffee size={18} />, label: '吧台' },
    { id: 'seat', icon: <Sofa size={18} />, label: '座位' },
    { id: 'entrance', icon: <DoorOpen size={18} />, label: '出入口' },
    { id: 'obstacle', icon: <Square size={18} />, label: '障碍物' },
  ];

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const colors: Record<string, string> = {
      bar: '#8b4513',
      seat: '#4a90d9',
      entrance: '#50c878',
      obstacle: '#444444',
    };

    for (const element of mapElements) {
      ctx.fillStyle = colors[element.type] || '#666666';
      ctx.strokeStyle = element.id === selectedElementId ? '#ffffff' : '#888888';
      ctx.lineWidth = element.id === selectedElementId ? 3 : 2;

      ctx.beginPath();
      if (element.polygon.length > 0) {
        ctx.moveTo(element.polygon[0].x, element.polygon[0].y);
        for (let i = 1; i < element.polygon.length; i++) {
          ctx.lineTo(element.polygon[i].x, element.polygon[i].y);
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    }

    for (const seat of seats) {
      ctx.fillStyle = seat.occupied > 0 ? '#ff6b6b' : '#6bcb77';
      ctx.strokeStyle = seat.reserved ? '#ffffff' : '#888888';
      ctx.lineWidth = seat.reserved ? 3 : 2;

      ctx.beginPath();
      ctx.arc(seat.position.x, seat.position.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${seat.occupied}/${seat.capacity}`, seat.position.x, seat.position.y);
    }

    if (currentPoints.length > 0) {
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      if (isDrawing && tempSeatPos) {
        ctx.lineTo(tempSeatPos.x, tempSeatPos.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const point of currentPoints) {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (selectedTool === 'seat' && tempSeatPos) {
      ctx.fillStyle = 'rgba(74, 144, 217, 0.5)';
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tempSeatPos.x, tempSeatPos.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [width, height, mapElements, seats, currentPoints, isDrawing, tempSeatPos, selectedTool, selectedElementId]);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing) return;

    const point = getCanvasCoords(e);

    if (selectedTool === 'select') {
      let clickedElement: MapElement | null = null;

      for (const element of mapElements) {
        if (pointInPolygon(point, element.polygon)) {
          clickedElement = element;
          break;
        }
      }

      for (const seat of seats) {
        const dx = point.x - seat.position.x;
        const dy = point.y - seat.position.y;
        if (dx * dx + dy * dy < 225) {
          if (e.detail === 2) {
            removeSeat(seat.id);
          }
          return;
        }
      }

      if (clickedElement) {
        if (e.detail === 2) {
          removeMapElement(clickedElement.id);
        } else {
          setSelectedElementId(clickedElement.id);
        }
      } else {
        setSelectedElementId(null);
      }
    } else if (selectedTool === 'seat') {
      const newSeat: Seat = {
        id: `seat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position: point,
        capacity: 2,
        occupied: 0,
        reserved: false,
      };
      addSeat(newSeat);
    } else if (selectedTool && selectedTool !== 'select') {
      setIsDrawing(true);
      setCurrentPoints([point]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing) return;

    const point = getCanvasCoords(e);
    setTempSeatPos(point);

    if (isDrawing && currentPoints.length > 0) {
      const lastPoint = currentPoints[currentPoints.length - 1];
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;

      if (Math.sqrt(dx * dx + dy * dy) > 20) {
        setCurrentPoints([...currentPoints, point]);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isEditing) return;

    if (isDrawing && currentPoints.length >= 3 && selectedTool && selectedTool !== 'select' && selectedTool !== 'seat') {
      const newElement: MapElement = {
        id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: selectedTool as MapElementType,
        polygon: currentPoints,
        properties: {},
      };
      addMapElement(newElement);
    }

    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isEditing) return;

    if (currentPoints.length > 0) {
      setIsDrawing(false);
      setCurrentPoints([]);
    } else if (selectedElementId) {
      setSelectedElementId(null);
    }
  };

  const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  if (!isEditing) return null;

  return (
    <div className="absolute inset-0 z-20">
      <div className="absolute top-4 left-4 bg-slate-800/95 backdrop-blur-sm rounded-lg p-2 flex gap-1 shadow-xl border border-slate-700">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
            className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 min-w-[60px] ${
              selectedTool === tool.id
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={tool.label}
          >
            {tool.icon}
            <span className="text-[10px]">{tool.label}</span>
          </button>
        ))}

        <div className="w-px bg-slate-600 mx-1" />

        <button
          onClick={clearMap}
          className="p-3 rounded-lg bg-red-900/50 text-red-300 hover:bg-red-800 transition-all duration-200 flex flex-col items-center gap-1 min-w-[60px]"
          title="清空地图"
        >
          <Trash2 size={18} />
          <span className="text-[10px]">清空</span>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-800/95 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-slate-300 border border-slate-700">
        {selectedTool === 'select' && '点击选择元素，双击删除'}
        {selectedTool === 'seat' && '点击放置座位'}
        {selectedTool && selectedTool !== 'select' && selectedTool !== 'seat' && '点击拖动绘制多边形，右键取消'}
        {!selectedTool && '请选择一个工具'}
      </div>

      <div className="absolute bottom-4 right-4 bg-slate-800/95 backdrop-blur-sm rounded-lg px-4 py-2 text-sm border border-slate-700">
        <div className="text-slate-400">元素: <span className="text-amber-400 font-mono">{mapElements.length}</span></div>
        <div className="text-slate-400">座位: <span className="text-green-400 font-mono">{seats.length}</span></div>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleRightClick}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default MapEditor;
