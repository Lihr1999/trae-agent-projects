import { useState } from 'react';
import KaleidoscopeViewport from './components/KaleidoscopeViewport';
import Toolbar from './components/Toolbar';
import MaterialPanel from './components/MaterialPanel';
import SpaceGroupPanel from './components/SpaceGroupPanel';
import LightPanel from './components/LightPanel';
import PresetPanel from './components/PresetPanel';
import FragmentCanvas from './components/FragmentCanvas';
import StatusBar from './components/StatusBar';
import { useKaleidoscopeStore } from './stores/kaleidoscopeStore';

function App() {
  const [leftPanel, setLeftPanel] = useState<'fragments' | 'materials'>('fragments');
  const [rightPanel, setRightPanel] = useState<'spacegroup' | 'lights' | 'presets'>('presets');

  return (
    <div className="w-full h-full flex flex-col">
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-2 flex items-center justify-between z-50">
        <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          🔮 Stained Glass Kaleidoscope Workbench
        </h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-xs">New Project</button>
          <button className="btn btn-secondary text-xs">Save</button>
          <button className="btn btn-primary text-xs">Export</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 flex flex-col gap-2 p-2">
          <div className="flex gap-1">
            <button
              className={`flex-1 py-1 px-3 rounded text-xs transition-all ${
                leftPanel === 'fragments' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              onClick={() => setLeftPanel('fragments')}>
              Fragments
            </button>
            <button
              className={`flex-1 py-1 px-3 rounded text-xs transition-all ${
                leftPanel === 'materials' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              onClick={() => setLeftPanel('materials')}>
              Materials
            </button>
          </div>
          
          <div className="flex-1 min-h-0">
            {leftPanel === 'fragments' ? <FragmentCanvas /> : <MaterialPanel />}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <KaleidoscopeViewport />
          <Toolbar />
          <StatusBar />
        </div>

        <div className="w-72 flex flex-col gap-2 p-2">
          <div className="flex gap-1">
            <button
              className={`flex-1 py-1 px-2 rounded text-xs transition-all ${
                rightPanel === 'presets' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              onClick={() => setRightPanel('presets')}>
              Presets
            </button>
            <button
              className={`flex-1 py-1 px-2 rounded text-xs transition-all ${
                rightPanel === 'spacegroup' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              onClick={() => setRightPanel('spacegroup')}>
              Space Group
            </button>
            <button
              className={`flex-1 py-1 px-2 rounded text-xs transition-all ${
                rightPanel === 'lights' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              onClick={() => setRightPanel('lights')}>
              Lights
            </button>
          </div>
          
          <div className="flex-1 min-h-0">
            {rightPanel === 'presets' && <PresetPanel />}
            {rightPanel === 'spacegroup' && <SpaceGroupPanel />}
            {rightPanel === 'lights' && <LightPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
