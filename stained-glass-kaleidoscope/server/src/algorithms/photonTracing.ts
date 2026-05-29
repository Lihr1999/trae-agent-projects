import { Point, Material, LightSource, GlassFragment, Photon, CausticPattern } from '../types';

const SPEED_OF_LIGHT = 3e8;
const MAX_PHOTON_DEPTH = 10;
const PHOTON_COUNT = 1000;

export class PhotonTracer {
  tracePhotons(
    lights: LightSource[],
    fragments: GlassFragment[],
    materials: Material[],
    bounds: { width: number; height: number }
  ): Photon[] {
    const photons: Photon[] = [];
    const materialMap = new Map(materials.map(m => [m.id, m]));

    for (const light of lights) {
      for (let i = 0; i < PHOTON_COUNT / lights.length; i++) {
        const photon = this.createPhoton(light, i);
        const traced = this.tracePhoton(photon, fragments, materialMap, bounds);
        photons.push(...traced);
      }
    }

    return photons;
  }

  private createPhoton(light: LightSource, index: number): Photon {
    const angle = (index / PHOTON_COUNT) * Math.PI * 2 + Math.random() * 0.1;
    
    return {
      position: { ...light.position },
      direction: {
        x: Math.cos(angle),
        y: Math.sin(angle),
        z: (Math.random() - 0.5) * 0.1
      },
      wavelength: 400 + Math.random() * 300,
      intensity: light.intensity / PHOTON_COUNT,
      polarization: light.polarization.angle,
      depth: 0
    };
  }

  private tracePhoton(
    photon: Photon,
    fragments: GlassFragment[],
    materials: Map<string, Material>,
    bounds: { width: number; height: number }
  ): Photon[] {
    const path: Photon[] = [{ ...photon }];
    let current = { ...photon };

    while (current.depth < MAX_PHOTON_DEPTH) {
      const intersection = this.findNearestIntersection(current, fragments, bounds);
      
      if (!intersection) break;

      const { fragment, point, normal } = intersection;
      const material = materials.get(fragment.materialId);

      if (!material) break;

      current.position = point;
      path.push({ ...current });

      const n1 = 1.0;
      const n2 = this.getWavelengthDependentRefractiveIndex(material, current.wavelength);
      
      const reflectance = this.fresnel(current.direction, normal, n1, n2);
      
      if (Math.random() < reflectance) {
        current.direction = this.reflect(current.direction, normal);
      } else {
        const refracted = this.refract(current.direction, normal, n1, n2);
        if (refracted) {
          current.direction = refracted;
        } else {
          current.direction = this.reflect(current.direction, normal);
        }
      }

      current.intensity *= (1 - material.absorption * 0.1);
      current.depth++;

      if (current.intensity < 0.01) break;
    }

    return path;
  }

  private getWavelengthDependentRefractiveIndex(material: Material, wavelength: number): number {
    const lambda = wavelength / 1000;
    const B1 = material.refractiveIndex - 1;
    const C1 = 0.5;
    return 1 + B1 * lambda * lambda / (lambda * lambda - C1);
  }

  private fresnel(
    direction: Point,
    normal: Point,
    n1: number,
    n2: number
  ): number {
    const cosThetaI = Math.abs(this.dot(direction, normal));
    const sinThetaT = (n1 / n2) * Math.sqrt(Math.max(0, 1 - cosThetaI * cosThetaI));

    if (sinThetaT >= 1) return 1;

    const cosThetaT = Math.sqrt(1 - sinThetaT * sinThetaT);

    const rs = ((n1 * cosThetaI) - (n2 * cosThetaT)) / ((n1 * cosThetaI) + (n2 * cosThetaT));
    const rp = ((n2 * cosThetaI) - (n1 * cosThetaT)) / ((n2 * cosThetaI) + (n1 * cosThetaT));

    return (rs * rs + rp * rp) / 2;
  }

  private reflect(direction: Point, normal: Point): Point {
    const d = 2 * this.dot(direction, normal);
    return {
      x: direction.x - d * normal.x,
      y: direction.y - d * normal.y,
      z: (direction.z || 0) - d * (normal.z || 0)
    };
  }

  private refract(direction: Point, normal: Point, n1: number, n2: number): Point | null {
    const cosThetaI = -this.dot(direction, normal);
    const eta = n1 / n2;
    const k = 1 - eta * eta * (1 - cosThetaI * cosThetaI);

    if (k < 0) return null;

    return {
      x: eta * direction.x + (eta * cosThetaI - Math.sqrt(k)) * normal.x,
      y: eta * direction.y + (eta * cosThetaI - Math.sqrt(k)) * normal.y,
      z: eta * (direction.z || 0) + (eta * cosThetaI - Math.sqrt(k)) * (normal.z || 0)
    };
  }

  private findNearestIntersection(
    photon: Photon,
    fragments: GlassFragment[],
    bounds: { width: number; height: number }
  ): { fragment: GlassFragment; point: Point; normal: Point } | null {
    let nearest: { fragment: GlassFragment; point: Point; normal: Point; distance: number } | null = null;

    for (const fragment of fragments) {
      const intersection = this.rayPolygonIntersection(photon, fragment);
      if (intersection) {
        const distance = this.distance(photon.position, intersection.point);
        if (distance > 0.01 && (!nearest || distance < nearest.distance)) {
          nearest = { fragment, ...intersection, distance };
        }
      }
    }

    return nearest ? { fragment: nearest.fragment, point: nearest.point, normal: nearest.normal } : null;
  }

  private rayPolygonIntersection(
    photon: Photon,
    fragment: GlassFragment
  ): { point: Point; normal: Point } | null {
    const vertices = fragment.vertices;
    if (vertices.length < 3) return null;

    const centroid = this.centroid(vertices);
    const planeNormal = this.polygonNormal(vertices);
    
    const t = this.rayPlaneIntersection(photon, centroid, planeNormal);
    if (t === null || t <= 0) return null;

    const point = {
      x: photon.position.x + photon.direction.x * t,
      y: photon.position.y + photon.direction.y * t,
      z: (photon.position.z || 0) + (photon.direction.z || 0) * t
    };

    if (this.isPointInPolygon2D(point, vertices)) {
      return { point, normal: planeNormal };
    }

    return null;
  }

  private rayPlaneIntersection(
    photon: Photon,
    planePoint: Point,
    planeNormal: Point
  ): number | null {
    const denom = this.dot(photon.direction, planeNormal);
    if (Math.abs(denom) < 0.0001) return null;

    const t = this.dot(
      { x: planePoint.x - photon.position.x, y: planePoint.y - photon.position.y, z: (planePoint.z || 0) - (photon.position.z || 0) },
      planeNormal
    ) / denom;

    return t;
  }

  private isPointInPolygon2D(point: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  private centroid(polygon: Point[]): Point {
    let x = 0, y = 0, z = 0;
    for (const p of polygon) {
      x += p.x;
      y += p.y;
      z += p.z || 0;
    }
    return { x: x / polygon.length, y: y / polygon.length, z: z / polygon.length };
  }

  private polygonNormal(polygon: Point[]): Point {
    if (polygon.length < 3) return { x: 0, y: 0, z: 1 };
    
    const v1 = {
      x: polygon[1].x - polygon[0].x,
      y: polygon[1].y - polygon[0].y,
      z: (polygon[1].z || 0) - (polygon[0].z || 0)
    };
    const v2 = {
      x: polygon[2].x - polygon[0].x,
      y: polygon[2].y - polygon[0].y,
      z: (polygon[2].z || 0) - (polygon[0].z || 0)
    };

    return this.normalize(this.cross(v1, v2));
  }

  private dot(a: Point, b: Point): number {
    return a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0);
  }

  private cross(a: Point, b: Point): Point {
    return {
      x: a.y * (b.z || 0) - (a.z || 0) * b.y,
      y: (a.z || 0) * b.x - a.x * (b.z || 0),
      z: a.x * b.y - a.y * b.x
    };
  }

  private normalize(v: Point): Point {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0));
    if (len === 0) return { x: 0, y: 0, z: 1 };
    return { x: v.x / len, y: v.y / len, z: (v.z || 0) / len };
  }

  private distance(a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = (b.z || 0) - (a.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  generateCausticPattern(photons: Photon[]): CausticPattern {
    const positions: Point[] = [];
    const intensities: number[] = [];
    const wavelengths: number[] = [];

    for (const photon of photons) {
      if (photon.depth >= 2) {
        positions.push(photon.position);
        intensities.push(photon.intensity);
        wavelengths.push(photon.wavelength);
      }
    }

    return { positions, intensities, wavelengths };
  }
}

export const photonTracer = new PhotonTracer();
