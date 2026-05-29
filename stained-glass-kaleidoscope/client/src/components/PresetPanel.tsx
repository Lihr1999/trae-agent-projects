import { useState, useEffect } from 'react';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { presetAPI } from '../utils/api';
import { PresetScene } from '../types';

export default function PresetPanel() {
  const { loadPreset } = useKaleidoscopeStore();
  const [presets, setPresets] = useState<PresetScene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const data = await presetAPI.getAll();
        setPresets(data);
      } catch (error) {
        console.error('Failed to load presets:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPresets();
  }, []);

  const handleLoadPreset = (preset: PresetScene) => {
    if (preset.config) {
      loadPreset(preset.config);
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>✨ Preset Scenes</span>
      </div>
      
      <div className="panel-content flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-white/50">Loading presets...</div>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
            <button
              key={preset.id}
              className="preset-btn"
              onClick={() => handleLoadPreset(preset)}
            >
              <div className="preset-btn-title">{preset.name}</div>
              <div className="preset-btn-desc">{preset.description}</div>
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
