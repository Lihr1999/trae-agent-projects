import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';
import { computationAPI } from '../utils/api';

const spaceGroupTypes = [
  { value: '2d', label: '2D Crystal' },
  { value: 'spherical', label: 'Spherical' },
  { value: 'hyperbolic', label: 'Hyperbolic' }
];

const schlafliPresets = [
  { p: 3, q: 6, label: '{3,6} - Triangular Tiling' },
  { p: 4, q: 4, label: '{4,4} - Square Tiling' },
  { p: 5, q: 4, label: '{5,4} - Hyperbolic' },
  { p: 6, q: 3, label: '{6,3} - Hexagonal' },
  { p: 6, q: 4, label: '{6,4} - Hyperbolic' }
];

export default function SpaceGroupPanel() {
  const { config, setSpaceGroup, setTessellatedCells } = useKaleidoscopeStore();

  const handleTypeChange = async (type: '2d' | 'spherical' | 'hyperbolic') => {
    try {
      const spaceGroup = await computationAPI.spaceGroup(type, config.spaceGroup.p, config.spaceGroup.q);
      setSpaceGroup(spaceGroup);
    } catch (error) {
        console.error('Failed to compute space group:', error);
      }
  };

  const handlePQChange = async (p: number, q: number) => {
    try {
      const spaceGroup = await computationAPI.spaceGroup(config.spaceGroup.type, p, q);
      setSpaceGroup(spaceGroup);
    } catch (error) {
      console.error('Failed to compute space group:', error);
    }
  };

  const generateTessellation = async () => {
    if (config.fragments.length === 0) return;

    const basePoints = config.fragments[0].vertices;
    if (basePoints.length < 3) return;

    try {
      const cells = await computationAPI.tessellation(basePoints, config.spaceGroup, 3);
      setTessellatedCells(cells);
    } catch (error) {
      console.error('Failed to generate tessellation:', error);
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>🔷 Space Group</span>
        <span className="text-xs text-white/50">
          {config.spaceGroup.schlafliSymbol}
        </span>
      </div>
      
      <div className="panel-content flex-1 overflow-y-auto">
        <div className="form-group">
          <label className="form-label">Geometry Type</label>
          <div className="grid grid-cols-3 gap-2">
            {spaceGroupTypes.map((type) => (
              <button
                key={type.value}
                className={`btn ${config.spaceGroup.type === type.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleTypeChange(type.value as any)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Schläfli Symbol {config.spaceGroup.schlafliSymbol}</label>
          <div className="flex gap-4">
            <div className="flex-1">
            <label className="text-xs text-white/50 mb-1">p: {config.spaceGroup.p}</label>
            <input
              type="range"
              className="form-slider"
              min="3"
              max="12"
              value={config.spaceGroup.p}
              onChange={(e) => handlePQChange(parseInt(e.target.value), config.spaceGroup.q)}
            />
            </div>
            <div className="flex-1">
            <label className="text-xs text-white/50 mb-1">q: {config.spaceGroup.q}</label>
            <input
              type="range"
              className="form-slider"
              min="3"
              max="12"
              value={config.spaceGroup.q}
              onChange={(e) => handlePQChange(config.spaceGroup.p, parseInt(e.target.value))}
            />
          </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {schlafliPresets.map((preset) => (
              <button
                key={preset.label}
                className="btn btn-secondary text-xs"
                onClick={() => handlePQChange(preset.p, preset.q)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Mirror Count: {config.spaceGroup.mirrorCount}
          </label>
          <input
            type="range"
            className="form-slider"
            min="2"
            max="12"
            value={config.spaceGroup.mirrorCount}
            onChange={(e) => setSpaceGroup({
              ...config.spaceGroup,
              mirrorCount: parseInt(e.target.value)
            })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Mirror Angle: {(config.spaceGroup.mirrorAngle.toFixed(2)} rad
          </label>
          <input
            type="range"
            className="form-slider"
            min="0"
            max={Math.PI / 2}
            step="0.01"
            value={config.spaceGroup.mirrorAngle}
            onChange={(e) => setSpaceGroup({
              ...config.spaceGroup,
              mirrorAngle: parseFloat(e.target.value)
            })}
          />
        </div>

        <button
          className="btn btn-primary w-full"
          onClick={generateTessellation}
        >
          Generate Tessellation
        </button>
      </div>
    </div>
  );
}
