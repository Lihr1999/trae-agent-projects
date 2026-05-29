import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';

const tools = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'bezier', label: 'Bezier', icon: '⌒' },
  { id: 'move', label: 'Move', icon: '✥' },
  { id: 'scale', label: 'Scale', icon: '⤢' },
  { id: 'rotate', label: 'Rotate', icon: '↻' }
] as const;

export default function Toolbar() {
  const { tool, setTool, isPlaying, setPlaying } = useKaleidoscopeStore();

  return (
    <div className="toolbar">
      {tools.map((t) => (
        <button
          key={t.id}
          className={`tool-btn ${tool === t.id ? 'active' : ''}`}
          onClick={() => setTool(t.id)}
          title={t.label}
        >
          <span className="text-lg">{t.icon}</span>
        </button>
      ))}
      
      <div className="w-px h-6 bg-white/10 mx-2" />
      
      <button
        className="tool-btn"
        onClick={() => setPlaying(!isPlaying)}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        <span className="text-lg">{isPlaying ? '⏸' : '▶'}</span>
      </button>
    </div>
  );
}
