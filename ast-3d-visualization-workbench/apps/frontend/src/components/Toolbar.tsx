import React, { useCallback, useEffect, useState } from 'react';
import { useStore, type LayoutAlgorithm, type CoordinateSystem } from '../store/useStore';
import type { ScenePreset } from '../../../../packages/shared/src';
import { api } from '../services/api';

const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    description: 'Recursive Fibonacci function',
    sourceCode: `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst result = fibonacci(10);\nconsole.log(result);`,
    language: 'javascript',
  },
  {
    id: 'class-hierarchy',
    name: 'Class Tree',
    description: 'Class inheritance hierarchy',
    sourceCode: `class Animal {\n  constructor(name) {\n    this.name = name;\n  }\n  speak() {\n    return this.name + " makes a noise.";\n  }\n}\n\nclass Dog extends Animal {\n  speak() {\n    return this.name + " barks.";\n  }\n}\n\nclass Cat extends Animal {\n  speak() {\n    return this.name + " meows.";\n  }\n}`,
    language: 'javascript',
  },
  {
    id: 'async-pattern',
    name: 'Async Flow',
    description: 'Async/await data fetching pattern',
    sourceCode: `async function fetchUserData(userId) {\n  try {\n    const response = await fetch(\`/api/users/\${userId}\`);\n    const data = await response.json();\n    const processed = data.map(item => ({\n      ...item,\n      timestamp: Date.now()\n    }));\n    return processed;\n  } catch (error) {\n    console.error("Failed to fetch:", error);\n    throw error;\n  }\n}`,
    language: 'javascript',
  },
  {
    id: 'typescript-generics',
    name: 'TS Generics',
    description: 'TypeScript generic types and interfaces',
    sourceCode: `interface Repository<T> {\n  items: T[];\n  findById(id: string): T | undefined;\n  add(item: T): void;\n  remove(id: string): boolean;\n}\n\nclass DataStore<T extends { id: string }> implements Repository<T> {\n  items: T[] = [];\n\n  findById(id: string): T | undefined {\n    return this.items.find(item => item.id === id);\n  }\n\n  add(item: T): void {\n    this.items.push(item);\n  }\n\n  remove(id: string): boolean {\n    const index = this.items.findIndex(item => item.id === id);\n    if (index >= 0) {\n      this.items.splice(index, 1);\n      return true;\n    }\n    return false;\n  }\n}`,
    language: 'typescript',
  },
];

const SCENE_ICONS = ['λ', '◇', '⟳', 'T'];

const Toolbar: React.FC = () => {
  const language = useStore((s) => s.language);
  const layoutAlgorithm = useStore((s) => s.layoutAlgorithm);
  const coordinateSystem = useStore((s) => s.coordinateSystem);
  const isLoading = useStore((s) => s.isLoading);
  const performanceMetrics = useStore((s) => s.performanceMetrics);
  const collapsedNodeIds = useStore((s) => s.collapsedNodeIds);
  const astNodes = useStore((s) => s.astNodes);

  const setLanguage = useStore((s) => s.setLanguage);
  const parseCode = useStore((s) => s.parseCode);
  const setLayoutAlgorithm = useStore((s) => s.setLayoutAlgorithm);
  const setCoordinateSystem = useStore((s) => s.setCoordinateSystem);
  const collapseAll = useStore((s) => s.collapseAll);
  const expandAll = useStore((s) => s.expandAll);
  const loadScene = useStore((s) => s.loadScene);
  const setAnimationState = useStore((s) => s.setAnimationState);

  const [remoteScenes, setRemoteScenes] = useState<ScenePreset[]>([]);

  useEffect(() => {
    api.getScenes().then(setRemoteScenes).catch(() => {});
  }, []);

  const handleSceneClick = useCallback(
    (preset: ScenePreset) => {
      loadScene(preset);
    },
    [loadScene],
  );

  const handleLanguageToggle = useCallback(() => {
    setLanguage(language === 'javascript' ? 'typescript' : 'javascript');
  }, [language, setLanguage]);

  const handleParse = useCallback(() => {
    parseCode();
  }, [parseCode]);

  const handleLayoutChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setLayoutAlgorithm(e.target.value as LayoutAlgorithm);
    },
    [setLayoutAlgorithm],
  );

  const handleCoordSystemChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCoordinateSystem(e.target.value as CoordinateSystem);
    },
    [setCoordinateSystem],
  );

  const handleAnimation = useCallback(
    (type: 'explode' | 'pulse' | 'collapse' | 'morph') => {
      const nodeIds = astNodes.map((n) => n.id);
      setAnimationState({
        type,
        progress: 0,
        duration: 2000,
        startTime: Date.now(),
        affectedNodes: nodeIds,
      });
    },
    [astNodes, setAnimationState],
  );

  const allCollapsed = astNodes.length > 0 && collapsedNodeIds.size > 0;

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {SCENE_PRESETS.map((preset, i) => (
          <button
            key={preset.id}
            className="toolbar-btn scene-btn"
            onClick={() => handleSceneClick(preset)}
            title={preset.description}
          >
            <span className="btn-icon">{SCENE_ICONS[i]}</span>
            <span>{preset.name}</span>
          </button>
        ))}
        {remoteScenes.map((scene) => (
          <button
            key={scene.id}
            className="toolbar-btn scene-btn"
            onClick={() => handleSceneClick(scene)}
            title={scene.description}
          >
            <span className="btn-icon">★</span>
            <span>{scene.name}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${language === 'typescript' ? 'active' : ''}`}
          onClick={handleLanguageToggle}
          title={`Switch to ${language === 'javascript' ? 'TypeScript' : 'JavaScript'}`}
        >
          {language === 'javascript' ? 'JS' : 'TS'}
        </button>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label">Layout</label>
        <select
          className="toolbar-select"
          value={layoutAlgorithm}
          onChange={handleLayoutChange}
        >
          <option value="hybrid">Hybrid</option>
          <option value="reingold-tilford">Reingold-Tilford 3D</option>
          <option value="force-directed">Force-Directed</option>
        </select>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label">Coords</label>
        <select
          className="toolbar-select"
          value={coordinateSystem}
          onChange={handleCoordSystemChange}
        >
          <option value="cartesian">Cartesian</option>
          <option value="sphere">Sphere</option>
          <option value="cylinder">Cylinder</option>
        </select>
      </div>

      <div className="toolbar-group">
        <button
          className="toolbar-btn parse-btn"
          onClick={handleParse}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Parsing...' : '▶ Parse'}
        </button>
        <button
          className="toolbar-btn diff-btn"
          disabled={isLoading}
          onClick={useStore.getState().toggleDiffPanel}
          title="Compare two versions"
        >
          ⧟ Diff
        </button>
      </div>

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={collapseAll} disabled={allCollapsed}>
          ⊟ Collapse
        </button>
        <button className="toolbar-btn" onClick={expandAll} disabled={collapsedNodeIds.size === 0}>
          ⊞ Expand
        </button>
      </div>

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => handleAnimation('pulse')} title="Pulse animation">
          ◎ Pulse
        </button>
        <button className="toolbar-btn" onClick={() => handleAnimation('explode')} title="Explode animation">
          ✦ Explode
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setAnimationState({ type: 'none', progress: 0, duration: 0, startTime: 0, affectedNodes: [] })}
          title="Stop animation"
        >
          ■ Stop
        </button>
      </div>

      <div className="toolbar-metrics">
        <div className="metric">
          FPS: <span className="metric-value">{performanceMetrics.fps}</span>
        </div>
        <div className="metric">
          Nodes: <span className="metric-value">{performanceMetrics.nodeCount}</span>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
