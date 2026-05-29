import { useState } from 'react';
import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';

export default function MaterialPanel() {
  const { config, selectedMaterialId, selectMaterial, updateMaterial, addMaterial, removeMaterial } = useKaleidoscopeStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedMaterial = config.materials.find(m => m.id === selectedMaterialId);

  const handleAddMaterial = () => {
    const newMaterial = {
      id: `mat_${Date.now()}`,
      name: 'New Material',
      refractiveIndex: 1.5,
      dispersionCoefficient: 0.01,
      subsurfaceScattering: 0.3,
      anisotropy: 0.1,
      color: { r: 0.8, g: 0.6, b: 0.4 },
      absorption: 0.1,
      roughness: 0.1
    };
    addMaterial(newMaterial);
    selectMaterial(newMaterial.id);
    setEditingId(newMaterial.id);
  };

  const handleUpdateMaterial = (id: string, updates: any) => {
    updateMaterial(id, updates);
  };

  const colorToHex = (color: { r: number; g: number; b: number }) => {
    return '#' + [color.r, color.g, color.b]
      .map(c => Math.round(c * 255).toString(16).padStart(2, '0'))
      .join('');
  };

  const hexToColor = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 1, g: 1, b: 1 };
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>🎨 Materials</span>
        <button className="btn btn-primary text-xs py-1 px-2" onClick={handleAddMaterial}>+ Add</button>
      </div>
      
      <div className="panel-content flex-1 overflow-y-auto">
        <div className="space-y-2 mb-4">
          {config.materials.map((material) => (
            <div
              key={material.id}
              className={`p-2 rounded cursor-pointer transition-all ${selectedMaterialId === material.id ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'}`}
              onClick={() => {
                selectMaterial(material.id);
                setEditingId(material.id);
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: colorToHex(material.color) }}
                />
                <span className="text-sm flex-1">{material.name}</span>
                <button
                  className="text-red-400 hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMaterial(material.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedMaterial && editingId === selectedMaterial.id && (
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-medium mb-4">Edit Material Properties</h4>
            
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={selectedMaterial.name}
                onChange={(e) => handleUpdateMaterial(selectedMaterial.id, { name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <input
                type="color"
                className="color-picker"
                value={colorToHex(selectedMaterial.color)}
                onChange={(e) => handleUpdateMaterial(selectedMaterial.id, { color: hexToColor(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Refractive Index: {selectedMaterial.refractiveIndex.toFixed(3)}
              </label>
              <input
                type="range"
                className="form-slider"
                min="1.0"
                max="2.0"
                step="0.01"
                value={selectedMaterial.refractiveIndex}
                onChange={(e) => handleUpdateMaterial(selectedMaterial.id, { refractiveIndex: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Dispersion: {selectedMaterial.dispersionCoefficient.toFixed(3)}
              </label>
              <input
                type="range"
                className="form-slider"
                min="0"
                max="0.1"
                step="0.001"
                value={selectedMaterial.dispersionCoefficient}
                onChange={(e) => handleUpdateMaterial(selectedMaterial.id, { dispersionCoefficient: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Subsurface Scattering: {selectedMaterial.subsurfaceScattering.toFixed(2)}
              </label>
              <input
                type="range"
                className="form-slider"
                min="0"
                max="1"
                step="0.01"
                value={selectedMaterial.subsurfaceScattering}
                onChange={(e) => handleUpdateMaterial(selectedMaterial.id, { subsurfaceScattering: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Anisotropy: {selectedMaterial.anisotropy.toFixed(2)}
              </label>
              <input
                type="range"
                className="form-slider"
                min="0"
                max="1"
                step="0.01"
                value={selectedMaterial.anisotropy}
                onChange={(e) => handleUpdateMaterial(selectedMaterial.id, { anisotropy: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Absorption: {selectedMaterial.absorption.toFixed(2)}
              </label>
              <input
                type="range"
                className="form-slider"
                min="0"
                max="1"
                step="0.01"
                value={selectedMaterial.absorption}
                onChange={(e) => handleUpdateMaterial(selectedMaterial.id, { absorption: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Roughness: {selectedMaterial.roughness.toFixed(2)}
              </label>
              <input
                type="range"
                className="form-slider"
                min="0"
                max="1"
                step="0.01"
                value={selectedMaterial.roughness}
                onChange={(e) => handleUpdateMaterial(selectedMaterial.id, { roughness: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
