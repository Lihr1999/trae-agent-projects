export function douglasPeucker(points, tolerance) {
  if (!points || points.length < 3) return points ? points.slice() : [];
  const sqTolerance = tolerance * tolerance;

  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [start, end] = stack.pop();
    let maxSqDist = sqTolerance;
    let index = -1;

    for (let i = start + 1; i < end; i++) {
      const d = sqSegDistance(points[i], points[start], points[end]);
      if (d > maxSqDist) {
        maxSqDist = d;
        index = i;
      }
    }

    if (index !== -1) {
      keep[index] = true;
      stack.push([start, index]);
      stack.push([index, end]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

function sqSegDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = p[0] - a[0];
    const ey = p[1] - a[1];
    return ex * ex + ey * ey;
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + t * dx;
  const py = a[1] + t * dy;
  const ex = p[0] - px;
  const ey = p[1] - py;
  return ex * ex + ey * ey;
}

export function simplifyGeoJSON(geojson, tolerance) {
  const simplify = (ring) => douglasPeucker(ring, tolerance);
  const walk = (geom) => {
    if (!geom) return geom;
    switch (geom.type) {
      case 'Polygon':
        return { ...geom, coordinates: geom.coordinates.map(simplify) };
      case 'MultiPolygon':
        return { ...geom, coordinates: geom.coordinates.map((poly) => poly.map(simplify)) };
      case 'Feature':
        return { ...geom, geometry: walk(geom.geometry) };
      case 'FeatureCollection':
        return { ...geom, features: geom.features.map(walk) };
      default:
        return geom;
    }
  };
  return walk(geojson);
}
