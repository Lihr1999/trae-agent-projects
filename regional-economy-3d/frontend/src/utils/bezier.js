import * as THREE from 'three';
import { geoToScene } from './extrude.js';

export function bezierCurve(fromLngLat, toLngLat, height = 8) {
  const p0 = geoToScene(fromLngLat);
  const p3 = geoToScene(toLngLat);
  const mid = p0.clone().lerp(p3, 0.5);
  mid.y = height;
  return new THREE.QuadraticBezierCurve3(p0, mid, p3);
}

export function buildFlyingLine(fromLngLat, toLngLat, color = 0x00e0ff, segments = 80) {
  const curve = bezierCurve(fromLngLat, toLngLat, Math.max(5, fromLngLat && toLngLat ? Math.hypot(fromLngLat[0] - toLngLat[0], fromLngLat[1] - toLngLat[1]) * 1.2 : 6));
  const points = curve.getPoints(segments);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geometry, material);

  const headGeom = new THREE.BufferGeometry();
  const headPos = new Float32Array(segments * 3);
  headGeom.setAttribute('position', new THREE.BufferAttribute(headPos, 3));
  const headMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, linewidth: 2 });
  const head = new THREE.Line(headGeom, headMat);
  head.userData = { progress: Math.random(), speed: 0.004 + Math.random() * 0.006, segments, basePoints: points };

  const group = new THREE.Group();
  group.add(line);
  group.add(head);
  group.userData.head = head;
  return group;
}

export function updateFlyingLine(group, delta) {
  const head = group.userData.head;
  if (!head) return;
  const { progress: p, speed, segments, basePoints } = head.userData;
  let np = p + speed * delta * 60;
  if (np > 1) np = 0;
  head.userData.progress = np;

  const headIdx = Math.floor(np * segments);
  const pos = head.geometry.attributes.position.array;
  const trailLen = Math.min(12, segments);
  for (let i = 0; i < trailLen; i++) {
    const idx = Math.max(0, headIdx - i);
    const pt = basePoints[idx];
    if (pt) {
      pos[i * 3] = pt.x;
      pos[i * 3 + 1] = pt.y;
      pos[i * 3 + 2] = pt.z;
    }
  }
  head.geometry.setDrawRange(0, trailLen);
  head.geometry.attributes.position.needsUpdate = true;
}
