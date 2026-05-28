import React, { useEffect, useState, useCallback } from 'react';
import { Save, FolderOpen, RotateCcw, Download, Plus } from 'lucide-react';
import Canvas2DEditor from './components/Canvas2DEditor';
import Kaleidoscope3D from './components/Kaleidoscope3D';
import ControlPanel from './components/ControlPanel';
import PresetButtons from './components/PresetButtons';
import StatusBar from './components/StatusBar';
import { useKaleidoscopeStore } from './stores/kaleidoscopeStore';
import { computeSymmetry, saveProject, getProjects, loadProject } from './utils/api';

const App: React.FC = () => {
  const {
    projectName,
    projectId,
    vertices,
    fragments,
    symmetry,
    lightSource,
    setProjectName,
    setProjectId,
    setSymmetryResult,
    addWarning,
    loadProject: loadProjectToStore,
    resetProject,
    addFragment,
    setIsAnimating,
    setAnimationProgress,
  } = useKaleidoscopeStore();

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [canvasSize, setCanvasSize] = useState(400);

  useEffect(() => {
    const updateSize = () => {
      const size = Math.min(window.innerWidth * 0.28, window.innerHeight * 0.45);
      setCanvasSize(size);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const calculateSymmetry = async () => {
      try {
        const result = await computeSymmetry(symmetry);
        setSymmetryResult(result);
        result.warnings.forEach((w) => addWarning(w));
      } catch (error) {
        console.error('对称群计算失败:', error);
      }
    };
    calculateSymmetry();
  }, [symmetry, setSymmetryResult, addWarning]);

  const handleSave = async () => {
    try {
      const result = await saveProject({
        id: projectId || undefined,
        name: projectName,
        vertices,
        fragments,
        symmetry,
        lightSource,
      });
      if (result.success && !projectId) {
        setProjectId(result.id);
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleLoad = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
      setShowProjectModal(true);
    } catch (error) {
      console.error('加载工程列表失败:', error);
    }
  };

  const handleLoadProject = async (id: string) => {
    try {
      const project = await loadProject(id);
      loadProjectToStore(project);
      setShowProjectModal(false);
      setAnimationProgress(0);
      setIsAnimating(true);
    } catch (error) {
      console.error('加载工程失败:', error);
    }
  };

  const handleNewFragment = useCallback(() => {
    const newId = `f${Date.now()}`;
    const availableVertices = vertices.slice(0, 3);
    if (availableVertices.length >= 3) {
      addFragment({
        id: newId,
        vertices: availableVertices.map((v) => v.id),
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        transparency: 0.4,
        refractiveIndex: 1.5,
      });
    }
  }, [vertices, addFragment]);

  const handleReset = () => {
    if (confirm('确定要重置工程吗？所有未保存的更改将丢失。')) {
      resetProject();
    }
  };

  const handleExport = () => {
    const data = {
      name: projectName,
      vertices,
      fragments,
      symmetry,
      lightSource,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'kaleidoscope'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full flex flex-col bg-primary overflow-hidden">
      <header className="glass-panel h-14 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl text-accent">
            彩色玻璃万花筒
          </h1>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-1 text-sm w-40 focus:outline-none focus:border-accent/50"
            placeholder="工程名称"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewFragment}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent/20 hover:bg-accent/30 text-accent text-sm transition-colors"
          >
            <Plus size={16} />
            新建碎片
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent/20 hover:bg-accent/30 text-accent text-sm transition-colors"
          >
            <Save size={16} />
            保存
          </button>
          <button
            onClick={handleLoad}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
          >
            <FolderOpen size={16} />
            打开
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
          >
            <RotateCcw size={16} />
            重置
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
          >
            <Download size={16} />
            导出
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />

        <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <div className="flex-1 flex gap-4 min-h-0">
            <div className="flex flex-col gap-4 w-1/3 min-w-[400px]">
              <div className="glass-panel p-4 flex-shrink-0" style={{ height: canvasSize + 32 }}>
                <h3 className="text-sm text-white/70 mb-3 font-display">
                  2D 设计画布
                </h3>
                <div className="flex justify-center">
                  <Canvas2DEditor width={canvasSize} height={canvasSize} />
                </div>
              </div>
              <PresetButtons />
            </div>

            <div className="flex-1 glass-panel p-4 min-w-0">
              <h3 className="text-sm text-white/70 mb-3 font-display">
                3D 万花筒预览
              </h3>
              <div className="h-full">
                <Kaleidoscope3D />
              </div>
            </div>
          </div>

          <StatusBar />
        </main>
      </div>

      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass-panel rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <h3 className="font-display text-xl text-accent mb-4">选择工程</h3>
            {projects.length === 0 ? (
              <p className="text-white/50 text-center py-8">暂无保存的工程</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleLoadProject(project.id)}
                    className="w-full text-left px-4 py-3 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-white">{project.name}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowProjectModal(false)}
              className="mt-4 w-full py-2 rounded bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
