import { useKaleidoscopeStore } from '../stores/kaleidoscopeStore';

export default function StatusBar() {
  const { config, photons, tessellatedCells } = useKaleidoscopeStore();

  return (
    <div className="status-bar flex items-center gap-6">
      <span>🎯 Fragments: {config.fragments.length}</span>
      <span>🔷 Cells: {tessellatedCells.length}</span>
      <span>💡 Photons: {photons.length}</span>
      <span>🎨 Materials: {config.materials.length}</span>
      <span>🔆 Lights: {config.lights.length}</span>
      <span>📐 {config.spaceGroup.schlafliSymbol}</span>
    </div>
  );
}
