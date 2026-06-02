export function getNodeSize(childCount: number): number {
  return Math.max(0.3, Math.min(2, 0.5 + Math.log2(childCount + 1) * 0.3));
}

export function getEdgePoints(
  parentPos: [number, number, number],
  childPos: [number, number, number],
  parentSize: number,
  childSize: number,
): [[number, number, number], [number, number, number]] {
  const dx = childPos[0] - parentPos[0];
  const dy = childPos[1] - parentPos[1];
  const dz = childPos[2] - parentPos[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist === 0) {
    return [parentPos, childPos];
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  const start: [number, number, number] = [
    parentPos[0] + nx * parentSize,
    parentPos[1] + ny * parentSize,
    parentPos[2] + nz * parentSize,
  ];

  const end: [number, number, number] = [
    childPos[0] - nx * childSize,
    childPos[1] - ny * childSize,
    childPos[2] - nz * childSize,
  ];

  return [start, end];
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
