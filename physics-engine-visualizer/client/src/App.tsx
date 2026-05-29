import React, { useState, useEffect, useCallback, useRef } from 'react';
import PhysicsCanvas from './components/PhysicsCanvas';
import ControlPanel from './components/ControlPanel';
import PresetButtons from './components/PresetButtons';
import { SimulationState, ToolMode, Vector2, RigidBody, Shape } from './types';
import {
  stepSimulation,
  getSimulationState,
  createBody,
  deleteBody,
  createJoint,
  applyImpulse,
  setGravity,
  loadPreset,
  getPresets,
  clearSimulation,
  setSimulationSettings
} from './utils/api';

const INITIAL_STATE: SimulationState = {
  bodies: [],
  joints: [],
  manifolds: [],
  particles: [],
  gravity: { x: 0, y: 500 },
  iterations: 10,
  timeStep: 1 / 60
};

const App: React.FC = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>(INITIAL_STATE);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isPaused, setIsPaused] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [showForces, setShowForces] = useState(true);
  const [showContacts, setShowContacts] = useState(true);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [jointStart, setJointStart] = useState<{ bodyId: string; position: Vector2 } | null>(null);
  const [presets, setPresets] = useState<Array<{ id: string; name: string }>>([]);
  const [backendOnline, setBackendOnline] = useState(true);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const failCountRef = useRef(0);

  useEffect(() => {
    getPresets().then(data => {
      if (data.length > 0) setBackendOnline(true);
      setPresets(data);
    });
    getSimulationState().then(state => {
      setSimulationState(state);
      setBackendOnline(true);
      failCountRef.current = 0;
    });
  }, []);

  const simulate = useCallback(async (timestamp: number) => {
    if (lastTimeRef.current && !isPaused && backendOnline) {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      try {
        const state = await stepSimulation(dt);
        setSimulationState(state);
        failCountRef.current = 0;
        setBackendOnline(true);
      } catch {
        failCountRef.current++;
        if (failCountRef.current > 5) {
          setBackendOnline(false);
        }
      }
    }
    lastTimeRef.current = timestamp;
    animationRef.current = requestAnimationFrame(simulate);
  }, [isPaused, backendOnline]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [simulate]);

  const handleCreateBody = async (shape: Shape, position: Vector2) => {
    await createBody(shape, position);
    const state = await getSimulationState();
    setSimulationState(state);
  };

  const handleDeleteBody = async () => {
    if (selectedBodyId) {
      await deleteBody(selectedBodyId);
      setSelectedBodyId(null);
      const state = await getSimulationState();
      setSimulationState(state);
    }
  };

  const handleStartJoint = (bodyId: string, position: Vector2) => {
    setJointStart({ bodyId, position });
  };

  const handleEndJoint = async (bodyId: string, position: Vector2) => {
    if (jointStart) {
      await createJoint('distance', jointStart.bodyId, bodyId, jointStart.position, position);
      setJointStart(null);
      const state = await getSimulationState();
      setSimulationState(state);
    }
  };

  const handleApplyImpulse = async (bodyId: string, impulse: Vector2) => {
    await applyImpulse(bodyId, impulse);
  };

  const handleLoadPreset = async (id: string) => {
    const state = await loadPreset(id);
    setSimulationState(state);
    setBackendOnline(true);
    failCountRef.current = 0;
  };

  const handleClearScene = async () => {
    await clearSimulation();
    const state = await getSimulationState();
    setSimulationState(state);
  };

  const handleSetGravity = async (gravity: Vector2) => {
    setSimulationState(prev => ({ ...prev, gravity }));
    await setGravity(gravity);
  };

  const handleSetIterations = async (iterations: number) => {
    setSimulationState(prev => ({ ...prev, iterations }));
    await setSimulationSettings({ iterations });
  };

  const selectedBody = simulationState.bodies.find(b => b.id === selectedBodyId) || null;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          🎮 游戏物理引擎可视化系统
        </h1>
        <p className="text-gray-400 text-center mt-1">
          2D 多体动力学与关节约束迭代求解器
        </p>
        {!backendOnline && (
          <div className="mt-2 text-center">
            <span className="bg-red-900 text-red-300 px-4 py-1 rounded-full text-sm">
              ⚠️ 后端服务未连接，请确保服务器运行在端口 3001
            </span>
          </div>
        )}
      </header>

      <div className="flex gap-4 justify-center">
        <div className="flex flex-col gap-4">
          <ControlPanel
            toolMode={toolMode}
            setToolMode={setToolMode}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            gravity={simulationState.gravity}
            setGravity={handleSetGravity}
            iterations={simulationState.iterations}
            setIterations={handleSetIterations}
            showTrails={showTrails}
            setShowTrails={setShowTrails}
            showForces={showForces}
            setShowForces={setShowForces}
            showContacts={showContacts}
            setShowContacts={setShowContacts}
            selectedBody={selectedBody}
            onDeleteBody={handleDeleteBody}
            onClearScene={handleClearScene}
          />
        </div>

        <PhysicsCanvas
          bodies={simulationState.bodies}
          joints={simulationState.joints}
          manifolds={simulationState.manifolds}
          particles={simulationState.particles}
          toolMode={toolMode}
          selectedBody={selectedBodyId}
          onSelectBody={setSelectedBodyId}
          onCreateBody={handleCreateBody}
          onStartJoint={handleStartJoint}
          onEndJoint={handleEndJoint}
          onApplyImpulse={handleApplyImpulse}
          jointStart={jointStart}
          showTrails={showTrails}
          showForces={showForces}
          showContacts={showContacts}
        />

        <div className="flex flex-col gap-4 w-72">
          <PresetButtons presets={presets} onLoadPreset={handleLoadPreset} />
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-2">📊 模拟统计</h3>
            <div className="text-gray-300 text-sm space-y-1">
              <p>物体数量: <span className="text-blue-400">{simulationState.bodies.length}</span></p>
              <p>关节数量: <span className="text-green-400">{simulationState.joints.length}</span></p>
              <p>碰撞对数: <span className="text-red-400">{simulationState.manifolds.length}</span></p>
              <p>粒子数量: <span className="text-yellow-400">{simulationState.particles.length}</span></p>
              <p>休眠物体: <span className="text-purple-400">
                {simulationState.bodies.filter(b => b.isSleeping).length}
              </span></p>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-2">💡 使用说明</h3>
            <ul className="text-gray-300 text-xs space-y-1">
              <li>• 点击工具选择工具切换模式</li>
              <li>• 圆形/方块: 点击画布创建</li>
              <li>• 关节: 依次点击两个物体</li>
              <li>• 冲量: 拖拽物体释放</li>
              <li>• 右键取消选择</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
