import React, { useCallback, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import MonacoEditor from './components/MonacoEditor';
import Viewport3D from './components/Viewport3D';
import DiffPanel from './components/DiffPanel';
import PerformanceMonitor from './components/PerformanceMonitor';
import ErrorBoundary from './components/ErrorBoundary';
import { useStore } from './store/useStore';
import './App.css';

const App: React.FC = () => {
  const isLoading = useStore((s) => s.isLoading);
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  const performanceMetrics = useStore((s) => s.performanceMetrics);
  const showDiffPanel = useStore((s) => s.showDiffPanel);
  const parseCode = useStore((s) => s.parseCode);

  useEffect(() => {
    parseCode();
  }, []);

  const handleCanvasClick = useCallback(() => {
    useStore.getState().selectNodes([]);
  }, []);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">
        <div className="editor-panel">
          <div className="panel-header">
            <span className="panel-title">Code Editor</span>
            <span className="panel-badge">{useStore.getState().language.toUpperCase()}</span>
          </div>
          <MonacoEditor />
        </div>
        <div className="viewport-panel" onClick={handleCanvasClick}>
          <div className="panel-header">
            <span className="panel-title">3D AST Viewport</span>
            <span className="panel-badge">{performanceMetrics.nodeCount} nodes</span>
          </div>
          <div className="canvas-container">
            <ErrorBoundary>
              <Viewport3D />
            </ErrorBoundary>
            {isLoading && (
              <div className="loading-overlay">
                <div className="spinner" />
                <span>Processing AST...</span>
              </div>
            )}
            <PerformanceMonitor />
          </div>
        </div>
      </div>
      {showDiffPanel && <DiffPanel />}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">FPS: {performanceMetrics.fps}</span>
          <span className="status-item">Nodes: {performanceMetrics.nodeCount}</span>
          <span className="status-item">Parse: {performanceMetrics.parseTime.toFixed(1)}ms</span>
          <span className="status-item">Layout: {performanceMetrics.layoutTime.toFixed(1)}ms</span>
        </div>
        <div className="status-right">
          <span className="status-item">
            Memory: {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
          </span>
        </div>
      </div>
      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={clearError}>✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
