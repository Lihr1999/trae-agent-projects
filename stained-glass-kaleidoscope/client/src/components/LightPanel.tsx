import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { computationAPI } from '../utils/api';

export default function LightPanel() {
  const { config, setConfig, updateLightSource, addLightSource, removeLightSource, setPhotons, setCausticPattern } = useKaleidoscopeStore();

  const handleAddLight = () => {
    const newLight = {
      id: `light_${Date.now()}`,
      name: 'New Light',
      position: { x: 0, y: 0, z: 2 },
      spectrum: [
        { wavelength: 450, intensity: 0.8 },
        { wavelength: 550, intensity: 1.0 },
        { wavelength: 650, intensity: 0.9 }
      ],
      polarization: { angle: 0, ellipticity: 0 },
      intensity: 1.0,
      type: 'point' as const
    };
    addLightSource(newLight);
  };

  const computePhotons = async () => {
    if (config.fragments.length === 0) return;

    try {
      const result = await computationAPI.photons(
        config.lights,
        config.fragments,
        config.materials,
        { width: 800, height: 600 }
      );
      setPhotons(result.photons);
      setCausticPattern(result.causticPattern);
    } catch (error) {
      console.error('Failed to compute photons:', error);
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>💡 Light Sources</span>
        <button className="btn btn-primary text-xs py-1 px-2" onClick={handleAddLight}>+ Add</button>
      </div>
      
      <div className="panel-content flex-1 overflow-y-auto">
        <div className="space-y-4 mb-4">
          {config.lights.map((light) => (
            <div key={light.id} className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{light.name}</span>
                <button
                  className="text-red-400 hover:text-red-300"
                  onClick={() => removeLightSource(light.id)}
                >
                  ✕
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Intensity: {light.intensity.toFixed(2)}
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max="3"
                  step="0.1"
                  value={light.intensity}
                  onChange={(e) => updateLightSource(light.id, { intensity: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Polarization Angle: {light.polarization.angle.toFixed(2)}
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max={Math.PI * 2}
                  step="0.1"
                  value={light.polarization.angle}
                  onChange={(e) => updateLightSource(light.id, {
                    polarization: {
                      ...light.polarization,
                      angle: parseFloat(e.target.value)
                    }
                  })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Position Z: {light.position.z?.toFixed(2)}
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={light.position.z || 2}
                  onChange={(e) => updateLightSource(light.id, {
                    position: {
                      ...light.position,
                      z: parseFloat(e.target.value)
                    }
                  })}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary w-full"
          onClick={computePhotons}
        >
          Compute Photon Tracing
        </button>

        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <div className="form-group">
            <label className="form-label">
              Caustic Intensity: {config.causticIntensity.toFixed(2)}
            </label>
            <input
              type="range"
              className="form-slider"
              min="0"
              max="3"
              step="0.1"
              value={config.causticIntensity}
              onChange={(e) => setConfig({ causticIntensity: parseFloat(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Interference Strength: {config.interferenceStrength.toFixed(2)}
            </label>
            <input
              type="range"
              className="form-slider"
              min="0"
              max="2"
              step="0.1"
              value={config.interferenceStrength}
              onChange={(e) => setConfig({ interferenceStrength: parseFloat(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Animation Speed: {config.animationSpeed.toFixed(2)}
            </label>
            <input
              type="range"
              className="form-slider"
              min="0"
              max="3"
              step="0.1"
              value={config.animationSpeed}
              onChange={(e) => setConfig({ animationSpeed: parseFloat(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
