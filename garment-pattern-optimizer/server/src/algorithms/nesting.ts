import type {
  Point,
  Polygon,
  Placement,
  MarkerResult,
  MarkerStep,
  MarkerWarning
} from '../types';
import {
  getPolygonArea,
  getPolygonBounds,
  rotatePolygon,
  translatePolygon,
  getPolygonCenter,
  distance
} from './geometry';
import {
  computeNFP,
  computeInnerNFP,
  getNFPCandidatePositions,
  checkOverlap,
  computeGap,
  detectZeroWidthGaps
} from './nfp';

const EPSILON = 1e-8;
const GRAIN_ANGLE_TOLERANCE = 5 * Math.PI / 180;

interface NestingOptions {
  fabricWidth: number;
  fabricHeight: number;
  rotationStep?: number;
  gap?: number;
}

interface CandidatePosition {
  position: Point;
  rotation: number;
  score: number;
  isValid: boolean;
  nfpPolygon?: Point[];
  overlap: boolean;
}

interface PlacedPolygon {
  polygon: Polygon;
  points: Point[];
  position: Point;
  rotation: number;
}

export class HeuristicNesting {
  private fabricWidth: number;
  private fabricHeight: number;
  private rotationStep: number;
  private gap: number;
  private warnings: MarkerWarning[] = [];
  private steps: MarkerStep[] = [];
  private stepCounter: number = 0;

  constructor(options: NestingOptions) {
    this.validateOptions(options);
    
    this.fabricWidth = options.fabricWidth;
    this.fabricHeight = options.fabricHeight;
    this.rotationStep = options.rotationStep ?? 90 * Math.PI / 180;
    this.gap = options.gap ?? 0;
  }

  private validateOptions(options: NestingOptions): void {
    if (options.fabricWidth <= 0) {
      throw new Error('Fabric width must be greater than 0');
    }
    if (options.fabricHeight <= 0) {
      throw new Error('Fabric height must be greater than 0');
    }
    if (options.rotationStep !== undefined && options.rotationStep <= 0) {
      throw new Error('Rotation step must be greater than 0');
    }
    if (options.gap !== undefined && options.gap < 0) {
      throw new Error('Gap cannot be negative');
    }
  }

  nest(polygons: Polygon[]): MarkerResult {
    const startTime = performance.now();
    this.warnings = [];
    this.steps = [];
    this.stepCounter = 0;

    try {
      if (polygons.length === 0) {
        return this.createEmptyResult(0);
      }

      this.validatePolygons(polygons);

      const expandedPolygons = this.expandQuantities(polygons);
      
      if (expandedPolygons.length === 0) {
        return this.createEmptyResult(0);
      }

      const totalArea = this.calculateTotalArea(expandedPolygons);
      
      this.checkFabricSize(expandedPolygons, totalArea);

      const sortedPolygons = this.sortPolygonsByArea(expandedPolygons);
      
      const placements: Placement[] = [];
      const placedPolygons: PlacedPolygon[] = [];

      for (const polygon of sortedPolygons) {
        const bestPlacement = this.findBestPlacement(polygon, placedPolygons);
        
        if (!bestPlacement) {
          this.warnings.push({
            type: 'no_solution',
            message: `无法为多边形 "${polygon.name}" (ID: ${polygon.id}) 找到有效放置位置。可能是由于布料尺寸不足或纹理角度约束过严格。`,
            polygonIds: [polygon.id]
          });
          
          this.recordStep(polygon, { x: 0, y: 0 }, 0, false, true);
          continue;
        }

        const placement: Placement = {
          polygonId: polygon.id,
          position: bestPlacement.position,
          rotation: bestPlacement.rotation,
          overlap: bestPlacement.overlap,
          step: this.stepCounter
        };

        placements.push(placement);

        const rotatedPoints = rotatePolygon(
          polygon.points,
          bestPlacement.rotation,
          getPolygonCenter(polygon.points)
        );
        const translatedPoints = translatePolygon(
          rotatedPoints,
          bestPlacement.position.x,
          bestPlacement.position.y
        );

        placedPolygons.push({
          polygon,
          points: translatedPoints,
          position: bestPlacement.position,
          rotation: bestPlacement.rotation
        });

        this.recordStep(
          polygon,
          bestPlacement.position,
          bestPlacement.rotation,
          true,
          bestPlacement.overlap,
          bestPlacement.nfpPolygon
        );

        if (bestPlacement.overlap) {
          this.warnings.push({
            type: 'collision',
            message: `多边形 "${polygon.name}" (ID: ${polygon.id}) 放置时存在重叠。`,
            polygonIds: [polygon.id]
          });
        }
      }

      this.detectZeroWidthGapWarnings(placedPolygons);
      this.detectSingularityWarnings(placedPolygons);

      const usedArea = this.calculateUsedArea(placedPolygons);
      const utilization = (usedArea / (this.fabricWidth * this.fabricHeight)) * 100;

      const computationTime = performance.now() - startTime;

      return {
        placements,
        utilization: Math.max(0, Math.min(100, utilization)),
        fabricWidth: this.fabricWidth,
        fabricHeight: this.fabricHeight,
        totalArea,
        usedArea,
        computationTime,
        steps: this.steps,
        warnings: this.warnings.length > 0 ? this.warnings : undefined
      };

    } catch (error) {
      const computationTime = performance.now() - startTime;
      return {
        placements: [],
        utilization: 0,
        fabricWidth: this.fabricWidth,
        fabricHeight: this.fabricHeight,
        totalArea: 0,
        usedArea: 0,
        computationTime,
        steps: this.steps,
        warnings: [
          ...this.warnings,
          {
            type: 'no_solution',
            message: error instanceof Error ? error.message : '排料过程中发生未知错误'
          }
        ]
      };
    }
  }

  private validatePolygons(polygons: Polygon[]): void {
    for (const polygon of polygons) {
      if (!polygon.id) {
        throw new Error('Polygon must have an id');
      }
      if (!polygon.points || polygon.points.length < 3) {
        throw new Error(`Polygon "${polygon.name}" must have at least 3 points`);
      }
      if (polygon.quantity < 1) {
        throw new Error(`Polygon "${polygon.name}" quantity must be at least 1`);
      }
    }
  }

  private expandQuantities(polygons: Polygon[]): Polygon[] {
    const expanded: Polygon[] = [];
    
    for (const polygon of polygons) {
      for (let i = 0; i < polygon.quantity; i++) {
        expanded.push({
          ...polygon,
          id: `${polygon.id}_${i}`
        });
      }
    }
    
    return expanded;
  }

  private calculateTotalArea(polygons: Polygon[]): number {
    return polygons.reduce((sum, p) => sum + Math.abs(getPolygonArea(p.points)), 0);
  }

  private checkFabricSize(polygons: Polygon[], totalArea: number): void {
    const fabricArea = this.fabricWidth * this.fabricHeight;
    
    if (totalArea > fabricArea + EPSILON) {
      this.warnings.push({
        type: 'no_solution',
        message: `所有多边形总面积 (${totalArea.toFixed(2)}) 超过布料面积 (${fabricArea.toFixed(2)})，无法完全放置。`
      });
    }

    for (const polygon of polygons) {
      const bounds = getPolygonBounds(polygon.points);
      const polyWidth = bounds.maxX - bounds.minX;
      const polyHeight = bounds.maxY - bounds.minY;

      if (polyWidth > this.fabricWidth + EPSILON || polyHeight > this.fabricHeight + EPSILON) {
        this.warnings.push({
          type: 'no_solution',
          message: `多边形 "${polygon.name}" 尺寸 (${polyWidth.toFixed(2)} x ${polyHeight.toFixed(2)}) 超过布料尺寸 (${this.fabricWidth} x ${this.fabricHeight})。`,
          polygonIds: [polygon.id]
        });
      }
    }
  }

  private sortPolygonsByArea(polygons: Polygon[]): Polygon[] {
    return [...polygons].sort((a, b) => {
      const areaA = Math.abs(getPolygonArea(a.points));
      const areaB = Math.abs(getPolygonArea(b.points));
      return areaB - areaA;
    });
  }

  private findBestPlacement(
    polygon: Polygon,
    placedPolygons: PlacedPolygon[]
  ): CandidatePosition | null {
    const rotations = this.generateValidRotations(polygon);
    
    if (rotations.length === 0) {
      this.warnings.push({
        type: 'no_solution',
        message: `多边形 "${polygon.name}" 没有满足纹理角度约束的有效旋转角度。`,
        polygonIds: [polygon.id]
      });
      return null;
    }

    let bestCandidate: CandidatePosition | null = null;

    for (const rotation of rotations) {
      const center = getPolygonCenter(polygon.points);
      const rotatedPoints = rotatePolygon(polygon.points, rotation, center);

      const candidates = this.generateCandidatePositions(
        rotatedPoints,
        placedPolygons
      );

      for (const candidate of candidates) {
        const translatedPoints = translatePolygon(
          rotatedPoints,
          candidate.position.x,
          candidate.position.y
        );

        const isInFabric = this.isWithinFabricBounds(translatedPoints);
        const hasOverlap = this.checkPolygonOverlap(translatedPoints, placedPolygons);
        const satisfiesGap = this.checkGapRequirement(translatedPoints, placedPolygons);

        const isValid = isInFabric && !hasOverlap && satisfiesGap;

        const score = this.calculateScore(
          candidate.position,
          translatedPoints,
          placedPolygons,
          isValid,
          hasOverlap
        );

        const candidateWithRotation: CandidatePosition = {
          ...candidate,
          rotation,
          score,
          isValid,
          overlap: hasOverlap
        };

        if (!bestCandidate || this.isBetterCandidate(candidateWithRotation, bestCandidate)) {
          bestCandidate = candidateWithRotation;
        }
      }
    }

    return bestCandidate;
  }

  private generateValidRotations(polygon: Polygon): number[] {
    const rotations: number[] = [];
    const grainAngle = polygon.grainAngle ?? 0;
    const tolerance = GRAIN_ANGLE_TOLERANCE;

    const baseRotations = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];

    for (const baseRotation of baseRotations) {
      const normalizedRotation = this.normalizeAngle(baseRotation);
      const normalizedGrain = this.normalizeAngle(grainAngle);
      
      let angleDiff = Math.abs(normalizedRotation - normalizedGrain);
      while (angleDiff > Math.PI) {
        angleDiff = Math.abs(angleDiff - 2 * Math.PI);
      }

      if (angleDiff <= tolerance + EPSILON) {
        rotations.push(baseRotation);
      }
    }

    if (rotations.length === 0) {
      rotations.push(0);
    }

    return rotations;
  }

  private normalizeAngle(angle: number): number {
    let normalized = angle % (2 * Math.PI);
    if (normalized < 0) {
      normalized += 2 * Math.PI;
    }
    return normalized;
  }

  private generateCandidatePositions(
    polygonPoints: Point[],
    placedPolygons: PlacedPolygon[]
  ): CandidatePosition[] {
    const candidates: CandidatePosition[] = [];
    const polyBounds = getPolygonBounds(polygonPoints);
    const offsetX = -polyBounds.minX;
    const offsetY = -polyBounds.minY;

    candidates.push({
      position: { x: offsetX, y: offsetY },
      rotation: 0,
      score: 0,
      isValid: true,
      overlap: false
    });

    const fabricBoundary: Point[] = [
      { x: 0, y: 0 },
      { x: this.fabricWidth, y: 0 },
      { x: this.fabricWidth, y: this.fabricHeight },
      { x: 0, y: this.fabricHeight }
    ];

    const innerNFP = computeInnerNFP(fabricBoundary, polygonPoints);
    if (innerNFP.valid && innerNFP.polygon.length >= 3) {
      const fabricCandidates = getNFPCandidatePositions(innerNFP.polygon, { x: 0, y: 0 });
      for (const pos of fabricCandidates) {
        candidates.push({
          position: { x: pos.x + offsetX, y: pos.y + offsetY },
          rotation: 0,
          score: 0,
          isValid: true,
          overlap: false,
          nfpPolygon: innerNFP.polygon
        });
      }
    }

    for (const placed of placedPolygons) {
      const nfpResult = computeNFP(placed.points, polygonPoints);
      
      if (nfpResult.valid && nfpResult.polygon.length >= 3) {
        const nfpCandidates = getNFPCandidatePositions(nfpResult.polygon, placed.position);
        
        for (const pos of nfpCandidates) {
          candidates.push({
            position: { x: pos.x + offsetX, y: pos.y + offsetY },
            rotation: 0,
            score: 0,
            isValid: true,
            overlap: false,
            nfpPolygon: nfpResult.polygon
          });
        }

        if (nfpResult.singularityPoints && nfpResult.singularityPoints.length > 0) {
          this.warnings.push({
            type: 'singularity',
            message: `在计算多边形 "${placed.polygon.name}" 和新多边形的 NFP 时检测到奇点。`,
            polygonIds: [placed.polygon.id],
            highlightPoints: nfpResult.singularityPoints
          });
        }
      }
    }

    const gridStep = Math.min(this.fabricWidth, this.fabricHeight) / 20;
    for (let x = 0; x <= this.fabricWidth - (polyBounds.maxX - polyBounds.minX); x += gridStep) {
      for (let y = 0; y <= this.fabricHeight - (polyBounds.maxY - polyBounds.minY); y += gridStep) {
        candidates.push({
          position: { x: x + offsetX, y: y + offsetY },
          rotation: 0,
          score: 0,
          isValid: true,
          overlap: false
        });
      }
    }

    return candidates;
  }

  private isWithinFabricBounds(points: Point[]): boolean {
    const bounds = getPolygonBounds(points);
    return (
      bounds.minX >= -EPSILON &&
      bounds.maxX <= this.fabricWidth + EPSILON &&
      bounds.minY >= -EPSILON &&
      bounds.maxY <= this.fabricHeight + EPSILON
    );
  }

  private checkPolygonOverlap(
    polygonPoints: Point[],
    placedPolygons: PlacedPolygon[]
  ): boolean {
    for (const placed of placedPolygons) {
      if (checkOverlap(polygonPoints, placed.points)) {
        return true;
      }
    }
    return false;
  }

  private checkGapRequirement(
    polygonPoints: Point[],
    placedPolygons: PlacedPolygon[]
  ): boolean {
    if (this.gap <= EPSILON) {
      return true;
    }

    for (const placed of placedPolygons) {
      const gap = computeGap(polygonPoints, placed.points);
      if (gap < this.gap - EPSILON) {
        return false;
      }
    }

    return true;
  }

  private calculateScore(
    position: Point,
    polygonPoints: Point[],
    placedPolygons: PlacedPolygon[],
    isValid: boolean,
    hasOverlap: boolean
  ): number {
    let score = 0;

    const bounds = getPolygonBounds(polygonPoints);
    
    score += bounds.minY * 1000;
    score += bounds.minX * 10;
    
    const usedHeight = bounds.maxY;
    score += usedHeight * 100;

    if (placedPolygons.length > 0) {
      let minDistance = Infinity;
      for (const placed of placedPolygons) {
        const dist = this.polygonDistance(polygonPoints, placed.points);
        if (dist < minDistance) {
          minDistance = dist;
        }
      }
      
      if (minDistance < Infinity) {
        score -= minDistance * 5;
      }
    }

    if (!isValid) {
      score += 1000000;
    }

    if (hasOverlap) {
      score += 500000;
    }

    return score;
  }

  private polygonDistance(A: Point[], B: Point[]): number {
    let minDist = Infinity;
    
    for (const a of A) {
      for (const b of B) {
        const dist = distance(a, b);
        if (dist < minDist) {
          minDist = dist;
        }
      }
    }
    
    return minDist;
  }

  private isBetterCandidate(a: CandidatePosition, b: CandidatePosition): boolean {
    if (a.isValid && !b.isValid) return true;
    if (!a.isValid && b.isValid) return false;
    return a.score < b.score;
  }

  private recordStep(
    polygon: Polygon,
    position: Point,
    rotation: number,
    isValid: boolean,
    overlap: boolean,
    nfpPolygon?: Point[]
  ): void {
    this.stepCounter++;
    
    const placement: Placement = {
      polygonId: polygon.id,
      position,
      rotation,
      overlap,
      step: this.stepCounter
    };

    this.steps.push({
      step: this.stepCounter,
      placement,
      nfpPolygon,
      isValid
    });
  }

  private detectZeroWidthGapWarnings(placedPolygons: PlacedPolygon[]): void {
    if (placedPolygons.length < 2) return;

    const allPoints = placedPolygons.map(p => p.points);
    const zeroGapPoints = detectZeroWidthGaps(allPoints, 1e-6);

    if (zeroGapPoints.length > 0) {
      const involvedIds = placedPolygons.map(p => p.polygon.id);
      this.warnings.push({
        type: 'zero_width_gap',
        message: `检测到 ${zeroGapPoints.length} 处零宽度间隙，可能导致切割问题。`,
        polygonIds: involvedIds,
        highlightPoints: zeroGapPoints
      });
    }
  }

  private detectSingularityWarnings(placedPolygons: PlacedPolygon[]): void {
    for (const placed of placedPolygons) {
      const bounds = getPolygonBounds(placed.points);
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;

      if (width < 1e-6 || height < 1e-6) {
        this.warnings.push({
          type: 'singularity',
          message: `多边形 "${placed.polygon.name}" 放置后出现零宽度或零高度。`,
          polygonIds: [placed.polygon.id]
        });
      }
    }
  }

  private calculateUsedArea(placedPolygons: PlacedPolygon[]): number {
    if (placedPolygons.length === 0) return 0;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const placed of placedPolygons) {
      const bounds = getPolygonBounds(placed.points);
      minX = Math.min(minX, bounds.minX);
      maxX = Math.max(maxX, bounds.maxX);
      minY = Math.min(minY, bounds.minY);
      maxY = Math.max(maxY, bounds.maxY);
    }

    const usedWidth = Math.max(0, maxX - minX);
    const usedHeight = Math.max(0, maxY - minY);
    
    return usedWidth * usedHeight;
  }

  private createEmptyResult(totalArea: number): MarkerResult {
    return {
      placements: [],
      utilization: 0,
      fabricWidth: this.fabricWidth,
      fabricHeight: this.fabricHeight,
      totalArea,
      usedArea: 0,
      computationTime: 0,
      steps: [],
      warnings: this.warnings.length > 0 ? this.warnings : undefined
    };
  }
}

export default HeuristicNesting;
