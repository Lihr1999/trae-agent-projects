import * as THREE from 'three';

export function geoToScene([lng, lat]) {
  const x = (lng - 104) * 2;
  const z = (35 - lat) * 2;
  return new THREE.Vector3(x, 0, z);
}

function clipRing(ring) {
  if (!ring || ring.length < 3) return null;
  const clipped = [];
  let prev = null;
  for (const p of ring) {
    if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 0.05) {
      clipped.push(p);
      prev = p;
    }
  }
  if (clipped.length < 3) return null;
  if (clipped[0][0] !== clipped[clipped.length - 1][0] || clipped[0][1] !== clipped[clipped.length - 1][1]) {
    clipped.push([...clipped[0]]);
  }
  return clipped;
}

function ringToShape(ring) {
  const shape = new THREE.Shape();
  const pts = ring.map((p) => geoToScene(p));
  shape.moveTo(pts[0].x, pts[0].z);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].z);
  return shape;
}

export function buildExtrudedGeometry(geojson, height = 1, opts = {}) {
  if (!geojson) return null;
  const geom = geojson.type === 'Feature' ? geojson.geometry : geojson;
  if (!geom) return null;
  const polygons = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];

  const shapes = [];
  polygons.forEach((poly) => {
    if (!poly || !poly.length) return;
    const outer = clipRing(poly[0]);
    if (!outer) return;
    const shape = ringToShape(outer);
    const holes = (poly.slice(1) || []).map(clipRing).filter(Boolean);
    holes.forEach((h) => {
      const holePts = h.map((p) => geoToScene(p));
      const hp = new THREE.Path();
      hp.moveTo(holePts[0].x, holePts[0].z);
      for (let i = 1; i < holePts.length; i++) hp.lineTo(holePts[i].x, holePts[i].z);
      shape.holes.push(hp);
    });
    shapes.push(shape);
  });

  if (!shapes.length) return null;

  const merged = new THREE.ShapeGeometry(shapes);
  const extruded = new THREE.ExtrudeGeometry(shapes, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  extruded.rotateX(-Math.PI / 2);
  extruded.translate(0, 0, 0);

  const positions = extruded.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const t = Math.min(1, Math.max(0, y / height));
    colors[i * 3] = 0.15 + t * 0.5;
    colors[i * 3 + 1] = 0.35 + t * 0.4;
    colors[i * 3 + 2] = 0.75 + t * 0.2;
  }
  extruded.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const triangles = extruded.index ? extruded.index.count / 3 : positions.count / 3;
  if (triangles > 500000) {
    console.warn('Extruded geometry exceeds 500k triangles, decimating...');
    const simplified = new THREE.ShapeGeometry(shapes);
    simplified.rotateX(-Math.PI / 2);
    return simplified;
  }
  return extruded;
}
