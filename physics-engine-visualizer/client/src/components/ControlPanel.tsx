import React from 'react';
import { ToolMode, Vector2, RigidBody } from '../types';

interface ControlPanelProps {
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  gravity: Vector2;
  setGravity: (gravity: Vector2) => void;
  iterations: number;
  setIterations: (iterations: number) => void;
  showTrails: boolean;
  setShowTrails: (show: boolean) => void;
  showForces: boolean;
  setShowForces: (show: boolean) => void;
  showContacts: boolean;
  setShowContacts: (show: boolean) => void;
  selectedBody: RigidBody | null;
  onDeleteBody: () => void;
  onClearScene: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  toolMode,
  setToolMode,
  isPaused,
  setIsPaused,
  gravity = { x: 0, y: 500 },
  setGravity,
  iterations = 10,
  setIterations,
  showTrails,
  setShowTrails,
  showForces,
  setShowForces,
  showContacts,
  setShowContacts,
  selectedBody,
  onDeleteBody,
  onClearScene
}) => {
  const tools: { id: ToolMode; label: string; icon: string }[] = [
    { id: 'select', label: '选择', icon: '👆' },
    { id: 'create-circle', label: '圆形', icon: '⭕' },
    { id: 'create-box', label: '方块', icon: '⬜' },
    { id: 'create-joint', label: '关节', icon: '🔗' },
    { id: 'apply-impulse', label: '冲量', icon: '💥' }
  ];

  return (
    <div className="bg-gray-800 p-4 rounded-lg w-64 space-y-4">
      <h2 className="text-white font-bold text-lg border-b border-gray-700 pb-2">控制面板</h2>

      <div className="space-y-2">
        <h3 className="text-gray-400 text-sm">工具</h3>
        <div className="grid grid-cols-2 gap-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setToolMode(tool.id)}
              className={`p-2 rounded text-sm transition-all ${
                toolMode === tool.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-lg">{tool.icon}</span>
              <div>{tool.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-gray-400 text-sm">模拟控制</h3>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`w-full p-2 rounded font-bold ${
            isPaused
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } text-white`}
        >
          {isPaused ? '▶ 继续' : '⏸ 暂停'}
        </button>
        <button
          onClick={onClearScene}
          className="w-full p-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
        >
          🗑️ 清空场景
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-gray-400 text-sm">物理参数</h3>
        <div className="space-y-2">
          <div>
            <label className="text-gray-300 text-xs">重力 Y</label>
            <input
              type="range"
              min="-2000"
              max="2000"
              value={gravity.y}
              onChange={(e) => setGravity({ x: gravity.x, y: Number(e.target.value) })}
              className="w-full"
            />
            <span className="text-gray-400 text-xs">{gravity.y}</span>
          </div>
          <div>
            <label className="text-gray-300 text-xs">迭代次数: {iterations}</label>
            <input
              type="range"
              min="1"
              max="50"
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-gray-400 text-sm">可视化选项</h3>
        <div className="space-y-1">
          <label className="flex items-center text-gray-300 text-sm">
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
              className="mr-2"
            />
            轨迹拖尾
          </label>
          <label className="flex items-center text-gray-300 text-sm">
            <input
              type="checkbox"
              checked={showForces}
              onChange={(e) => setShowForces(e.target.checked)}
              className="mr-2"
            />
            关节约束力
          </label>
          <label className="flex items-center text-gray-300 text-sm">
            <input
              type="checkbox"
              checked={showContacts}
              onChange={(e) => setShowContacts(e.target.checked)}
              className="mr-2"
            />
            碰撞接触点
          </label>
        </div>
      </div>

      {selectedBody && (
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <h3 className="text-gray-400 text-sm">选中物体</h3>
          <div className="bg-gray-700 p-2 rounded text-xs text-gray-300 space-y-1">
            <p>ID: {selectedBody.id.slice(0, 8)}...</p>
            <p>质量: {selectedBody.isStatic ? '∞ (静态)' : (selectedBody.mass ?? 0).toFixed(2)}</p>
            <p>位置: ({(selectedBody.position?.x ?? 0).toFixed(1)}, {(selectedBody.position?.y ?? 0).toFixed(1)})</p>
            <p>速度: ({(selectedBody.linearVelocity?.x ?? 0).toFixed(1)}, {(selectedBody.linearVelocity?.y ?? 0).toFixed(1)})</p>
            <p>状态: {selectedBody.isSleeping ? '休眠' : '活跃'}</p>
          </div>
          <button
            onClick={onDeleteBody}
            className="w-full p-2 rounded bg-red-700 hover:bg-red-600 text-white text-sm"
          >
            删除物体
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
