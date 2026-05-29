import { RigidBody, Manifold, ContactPoint, Vector2 } from './types';
import { vec2 } from './math';
import { getTransformedVertices, getVelocityAtPoint } from './body';

export function detectCollision(bodyA: RigidBody, bodyB: RigidBody): Manifold | null {
  if (bodyA.shape.type === 'circle' && bodyB.shape.type === 'circle') {
    return circleVsCircle(bodyA, bodyB);
  } else if (bodyA.shape.type === 'circle' && bodyB.shape.type === 'polygon') {
    return circleVsPolygon(bodyA, bodyB);
  } else if (bodyA.shape.type === 'polygon' && bodyB.shape.type === 'circle') {
    const result = circleVsPolygon(bodyB, bodyA);
    if (result) {
      return {
        bodyA: result.bodyB,
        bodyB: result.bodyA,
        normal: vec2.negate(result.normal),
        contacts: result.contacts.map(c => ({
          ...c,
          normal: vec2.negate(c.normal),
          tangent: vec2.negate(c.tangent)
        }))
      };
    }
    return null;
  } else {
    return polygonVsPolygon(bodyA, bodyB);
  }
}

function circleVsCircle(bodyA: RigidBody, bodyB: RigidBody): Manifold | null {
  const radiusA = bodyA.shape.radius!;
  const radiusB = bodyB.shape.radius!;
  const distance = vec2.distance(bodyA.position, bodyB.position);
  const radii = radiusA + radiusB;

  if (distance >= radii) return null;

  const normal = vec2.normalize(vec2.sub(bodyB.position, bodyA.position));
  const point = vec2.add(bodyA.position, vec2.mul(normal, radiusA));

  return {
    bodyA: bodyA.id,
    bodyB: bodyB.id,
    normal,
    contacts: [{
      point,
      normal,
      penetration: radii - distance,
      tangent: { x: -normal.y, y: normal.x },
      normalImpulse: 0,
      tangentImpulse: 0
    }]
  };
}

function circleVsPolygon(circle: RigidBody, polygon: RigidBody): Manifold | null {
  const vertices = getTransformedVertices(polygon);
  const radius = circle.shape.radius!;
  const center = circle.position;

  let minDist = Infinity;
  let closestPoint: Vector2 = vertices[0];
  let closestIndex = 0;

  for (let i = 0; i < vertices.length; i++) {
    const dist = vec2.distanceSq(center, vertices[i]);
    if (dist < minDist) {
      minDist = dist;
      closestPoint = vertices[i];
      closestIndex = i;
    }
  }

  let minPenetration = Infinity;
  let minNormal: Vector2 | null = null;

  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const edge = vec2.sub(vertices[j], vertices[i]);
    const axis = vec2.normalize({ x: -edge.y, y: edge.x });

    const [minA, maxA] = projectCircle(center, radius, axis);
    const [minB, maxB] = projectPolygon(vertices, axis);

    if (minA >= maxB || minB >= maxA) return null;

    const penetration = Math.min(maxA - minB, maxB - minA);
    if (penetration < minPenetration) {
      minPenetration = penetration;
      minNormal = axis;
    }
  }

  const axisToClosest = vec2.normalize(vec2.sub(center, closestPoint));
  const [minA, maxA] = projectCircle(center, radius, axisToClosest);
  const [minB, maxB] = projectPolygon(vertices, axisToClosest);
  const penetrationToClosest = Math.min(maxA - minB, maxB - minA);

  if (penetrationToClosest < minPenetration) {
    minPenetration = penetrationToClosest;
    minNormal = axisToClosest;
  }

  if (!minNormal) return null;

  const direction = vec2.sub(polygon.position, center);
  if (vec2.dot(direction, minNormal) > 0) {
    minNormal = vec2.negate(minNormal);
  }

  const contactPoint = vec2.add(center, vec2.mul(minNormal, radius));

  return {
    bodyA: circle.id,
    bodyB: polygon.id,
    normal: minNormal,
    contacts: [{
      point: contactPoint,
      normal: minNormal,
      penetration: minPenetration,
      tangent: { x: -minNormal.y, y: minNormal.x },
      normalImpulse: 0,
      tangentImpulse: 0
    }]
  };
}

function polygonVsPolygon(bodyA: RigidBody, bodyB: RigidBody): Manifold | null {
  const verticesA = getTransformedVertices(bodyA);
  const verticesB = getTransformedVertices(bodyB);

  let minPenetration = Infinity;
  let minNormal: Vector2 | null = null;

  for (let i = 0; i < verticesA.length; i++) {
    const j = (i + 1) % verticesA.length;
    const edge = vec2.sub(verticesA[j], verticesA[i]);
    const axis = vec2.normalize({ x: -edge.y, y: edge.x });

    const [minA, maxA] = projectPolygon(verticesA, axis);
    const [minB, maxB] = projectPolygon(verticesB, axis);

    if (minA >= maxB || minB >= maxA) return null;

    const penetration = Math.min(maxA - minB, maxB - minA);
    if (penetration < minPenetration) {
      minPenetration = penetration;
      minNormal = axis;
    }
  }

  for (let i = 0; i < verticesB.length; i++) {
    const j = (i + 1) % verticesB.length;
    const edge = vec2.sub(verticesB[j], verticesB[i]);
    const axis = vec2.normalize({ x: -edge.y, y: edge.x });

    const [minA, maxA] = projectPolygon(verticesA, axis);
    const [minB, maxB] = projectPolygon(verticesB, axis);

    if (minA >= maxB || minB >= maxA) return null;

    const penetration = Math.min(maxA - minB, maxB - minA);
    if (penetration < minPenetration) {
      minPenetration = penetration;
      minNormal = axis;
    }
  }

  if (!minNormal) return null;

  const direction = vec2.sub(bodyB.position, bodyA.position);
  if (vec2.dot(direction, minNormal) > 0) {
    minNormal = vec2.negate(minNormal);
  }

  const contacts = findContactPoints(verticesA, verticesB, minNormal);

  if (contacts.length === 0) return null;

  return {
    bodyA: bodyA.id,
    bodyB: bodyB.id,
    normal: minNormal,
    contacts: contacts.map(point => ({
      point,
      normal: minNormal!,
      penetration: minPenetration,
      tangent: { x: -minNormal!.y, y: minNormal!.x },
      normalImpulse: 0,
      tangentImpulse: 0
    }))
  };
}

function projectPolygon(vertices: Vector2[], axis: Vector2): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of vertices) {
    const proj = vec2.dot(v, axis);
    min = Math.min(min, proj);
    max = Math.max(max, proj);
  }
  return [min, max];
}

function projectCircle(center: Vector2, radius: number, axis: Vector2): [number, number] {
  const proj = vec2.dot(center, axis);
  return [proj - radius, proj + radius];
}

function findContactPoints(verticesA: Vector2[], verticesB: Vector2[], normal: Vector2): Vector2[] {
  let maxDepthA = -Infinity;
  let maxDepthB = -Infinity;
  let incidentEdge: Vector2[] = [];
  let referenceEdge: Vector2[] = [];

  for (let i = 0; i < verticesA.length; i++) {
    const depth = -vec2.dot(verticesA[i], normal);
    if (depth > maxDepthA) {
      maxDepthA = depth;
      const j = (i + 1) % verticesA.length;
      referenceEdge = [verticesA[i], verticesA[j]];
    }
  }

  for (let i = 0; i < verticesB.length; i++) {
    const depth = vec2.dot(verticesB[i], normal);
    if (depth > maxDepthB) {
      maxDepthB = depth;
      const j = (i + 1) % verticesB.length;
      incidentEdge = [verticesB[i], verticesB[j]];
    }
  }

  const points: Vector2[] = [];
  for (const point of incidentEdge) {
    const edgeVec = vec2.sub(referenceEdge[1], referenceEdge[0]);
    const edgeLen = vec2.length(edgeVec);
    const edgeDir = vec2.div(edgeVec, edgeLen);

    const toPoint = vec2.sub(point, referenceEdge[0]);
    const t = vec2.dot(toPoint, edgeDir);

    if (t >= 0 && t <= edgeLen) {
      points.push(point);
    }
  }

  return points.slice(0, 2);
}

export function continuousDetection(
  bodyA: RigidBody,
  bodyB: RigidBody,
  dt: number
): { hit: boolean; toi: number } {
  const radiusA = bodyA.shape.type === 'circle' ? bodyA.shape.radius! : 20;
  const radiusB = bodyB.shape.type === 'circle' ? bodyB.shape.radius! : 20;

  const relVel = vec2.sub(bodyA.linearVelocity, bodyB.linearVelocity);
  const relPos = vec2.sub(bodyA.position, bodyB.position);
  const radii = radiusA + radiusB;

  const a = vec2.dot(relVel, relVel);
  const b = 2 * vec2.dot(relPos, relVel);
  const c = vec2.dot(relPos, relPos) - radii * radii;

  if (c < 0) return { hit: true, toi: 0 };

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return { hit: false, toi: 1 };

  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  if (t1 >= 0 && t1 <= dt) {
    return { hit: true, toi: t1 };
  }
  if (t2 >= 0 && t2 <= dt) {
    return { hit: true, toi: t2 };
  }

  return { hit: false, toi: 1 };
}
