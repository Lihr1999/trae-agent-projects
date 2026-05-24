import * as THREE from 'three';

export function createRaycaster() {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line = { threshold: 0.1 };
  raycaster.params.Mesh = {};
  return raycaster;
}

export function pickFromEvent(camera, domElement, event, targets, excludeLines = true) {
  const rect = domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = createRaycaster();
  raycaster.setFromCamera(ndc, camera);

  const meshes = targets.filter((o) => o.isMesh);
  const lines = excludeLines ? [] : targets.filter((o) => o.isLine);

  const meshHits = raycaster.intersectObjects(meshes, true);
  if (meshHits.length) {
    return meshHits[0];
  }
  if (!excludeLines && lines.length) {
    const lineHits = raycaster.intersectObjects(lines, true);
    if (lineHits.length) return lineHits[0];
  }
  return null;
}
