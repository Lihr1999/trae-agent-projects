<template>
  <div 
    ref="canvasContainer"
    class="pattern-canvas-container"
    @contextmenu.prevent
  >
    <svg
      ref="svgElement"
      class="pattern-canvas"
      :viewBox="viewBox"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @wheel="handleWheel"
      @dblclick="handleDoubleClick"
    >
      <defs>
        <pattern 
          id="fabricTexture" 
          :x="fabricFlow.offset" 
          :y="fabricFlow.offset * 0.5" 
          width="20" 
          height="20" 
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="20" stroke="#e5e7eb" stroke-width="0.5" />
        </pattern>
        
        <pattern 
          id="gridPattern" 
          width="10" 
          height="10" 
          patternUnits="userSpaceOnUse"
        >
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" stroke-width="0.3" />
        </pattern>

        <filter id="collisionGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="singularityGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="grainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6b7280" stop-opacity="0" />
          <stop offset="50%" stop-color="#6b7280" stop-opacity="1" />
          <stop offset="100%" stop-color="#6b7280" stop-opacity="0" />
        </linearGradient>
      </defs>

      <rect 
        :x="0" 
        :y="0" 
        :width="fabricWidth" 
        :height="fabricHeight" 
        fill="url(#fabricTexture)"
        class="fabric-background"
      />
      
      <rect 
        v-if="showGrid"
        :x="0" 
        :y="0" 
        :width="fabricWidth" 
        :height="fabricHeight" 
        fill="url(#gridPattern)"
        class="grid-overlay"
      />

      <rect 
        :x="0" 
        :y="0" 
        :width="fabricWidth" 
        :height="fabricHeight" 
        fill="none"
        stroke="#374151"
        stroke-width="2"
        class="fabric-boundary"
      />

      <g v-if="nfpPolygons.length > 0">
        <path
          v-for="(nfp, index) in nfpPolygons"
          :key="'nfp-' + index"
          :d="pointsToPathData(nfp)"
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          stroke-width="1"
          stroke-dasharray="5,5"
          class="nfp-polygon"
        />
      </g>

      <g class="polygons-layer">
        <g
          v-for="polygon in polygons"
          :key="polygon.id"
          :transform="getPolygonTransform(polygon)"
          :class="getPolygonClasses(polygon)"
          @mousedown.stop="(e: MouseEvent) => handlePolygonMouseDown(e, polygon)"
          @mouseenter="hoveredPolygonId = polygon.id"
          @mouseleave="hoveredPolygonId = null"
        >
          <path
            :d="pointsToPathData(polygon.points)"
            :fill="getPolygonFill(polygon)"
            :stroke="getPolygonStroke(polygon)"
            :stroke-width="getPolygonStrokeWidth(polygon)"
            class="polygon-shape"
          />

          <line
            v-if="showGrainLines"
            :x1="grainLineStart(polygon).x"
            :y1="grainLineStart(polygon).y"
            :x2="grainLineEnd(polygon).x"
            :y2="grainLineEnd(polygon).y"
            stroke="url(#grainGradient)"
            stroke-width="2"
            marker-start="url(#grainArrowStart)"
            marker-end="url(#grainArrowEnd)"
            class="grain-line"
          />

          <defs>
            <marker
              :id="'grainArrowStart-' + polygon.id"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 5 L 10 0 L 10 10 z" fill="#6b7280" />
            </marker>
            <marker
              :id="'grainArrowEnd-' + polygon.id"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
            </marker>
          </defs>

          <g v-if="isSelected(polygon.id)" class="vertex-handles">
            <circle
              v-for="(point, vertexIndex) in polygon.points"
              :key="'vertex-' + vertexIndex"
              :cx="point.x"
              :cy="point.y"
              :r="getVertexHandleRadius(vertexIndex)"
              :fill="getVertexFill(vertexIndex)"
              :stroke="getVertexStroke(vertexIndex)"
              stroke-width="2"
              class="vertex-handle"
              @mousedown.stop="(e: MouseEvent) => handleVertexMouseDown(e, polygon, vertexIndex)"
              @mouseenter="hoveredVertexIndex = vertexIndex"
              @mouseleave="hoveredVertexIndex = null"
            />
          </g>

          <g v-if="isSelected(polygon.id) && currentTool === 'rotate'" class="rotate-handle">
            <circle
              :cx="rotateHandlePosition(polygon).x"
              :cy="rotateHandlePosition(polygon).y"
              r="8"
              fill="#8b5cf6"
              stroke="white"
              stroke-width="2"
              class="rotate-control"
              @mousedown.stop="(e: MouseEvent) => handleRotateStart(e, polygon)"
            />
            <line
              :x1="polygonCenter(polygon).x"
              :y1="polygonCenter(polygon).y"
              :x2="rotateHandlePosition(polygon).x"
              :y2="rotateHandlePosition(polygon).y"
              stroke="#8b5cf6"
              stroke-width="1"
              stroke-dasharray="3,3"
            />
          </g>
        </g>
      </g>

      <g v-if="isDrawing && currentPoints.length > 0" class="drawing-preview">
        <path
          :d="getDrawingPreviewPath()"
          fill="rgba(34, 197, 94, 0.2)"
          stroke="#22c55e"
          stroke-width="2"
          stroke-dasharray="5,5"
          class="drawing-path"
        />
        <circle
          v-for="(point, index) in currentPoints"
          :key="'draw-point-' + index"
          :cx="point.x"
          :cy="point.y"
          r="5"
          fill="#22c55e"
          stroke="white"
          stroke-width="2"
          class="drawing-vertex"
        />
        <line
          v-if="currentPoints.length > 0 && mousePosition"
          :x1="currentPoints[currentPoints.length - 1].x"
          :y1="currentPoints[currentPoints.length - 1].y"
          :x2="mousePosition.x"
          :y2="mousePosition.y"
          stroke="#22c55e"
          stroke-width="1"
          stroke-dasharray="3,3"
          class="drawing-line"
        />
      </g>

      <g v-if="currentTool === 'rectangle' && isDrawing && rectangleStart && mousePosition" class="rectangle-preview">
        <rect
          :x="Math.min(rectangleStart.x, mousePosition.x)"
          :y="Math.min(rectangleStart.y, mousePosition.y)"
          :width="Math.abs(mousePosition.x - rectangleStart.x)"
          :height="Math.abs(mousePosition.y - rectangleStart.y)"
          fill="rgba(34, 197, 94, 0.2)"
          stroke="#22c55e"
          stroke-width="2"
          stroke-dasharray="5,5"
          class="rectangle-preview-shape"
        />
      </g>

      <g v-if="highlightedPoints.length > 0" class="highlighted-points">
        <circle
          v-for="(point, index) in highlightedPoints"
          :key="'highlight-' + index"
          :cx="point.x"
          :cy="point.y"
          r="8"
          fill="#f59e0b"
          filter="url(#singularityGlow)"
          class="singularity-point"
        >
          <animate
            attributeName="r"
            values="6;10;6"
            dur="1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      <g v-if="animationState.type === 'collision'" class="collision-overlay">
        <path
          v-for="polygonId in highlightedPolygonIds"
          :key="'collision-' + polygonId"
          :d="getHighlightedPolygonPath(polygonId)"
          fill="rgba(239, 68, 68, 0.3)"
          stroke="#ef4444"
          stroke-width="3"
          filter="url(#collisionGlow)"
          class="collision-flash"
        >
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="0.5s"
            repeatCount="3"
          />
        </path>
      </g>
    </svg>

    <div class="canvas-controls">
      <div class="zoom-controls">
        <button 
          class="zoom-btn" 
          @click="zoomIn"
          title="放大"
        >
          +
        </button>
        <div class="zoom-level">{{ Math.round(zoom * 100) }}%</div>
        <button 
          class="zoom-btn" 
          @click="zoomOut"
          title="缩小"
        >
          −
        </button>
        <button 
          class="zoom-btn" 
          @click="resetView"
          title="重置视图"
        >
          ⟲
        </button>
      </div>
      <div class="view-info">
        <span>X: {{ pan.x.toFixed(1) }}, Y: {{ pan.y.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePatternStore } from '../stores/patternStore';
import { useAnimation } from '../composables/useAnimation';
import type { Polygon, Point, ToolType } from '../types';
import {
  add,
  subtract,
  distance,
  rotatePolygon,
  translatePolygon,
  getPolygonCenter,
  getPolygonBounds,
  findNearestVertex,
  pointsToPathData,
  getGrainLinePoints,
  generateId
} from '../utils/geometry';

interface Props {
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  showGrainLines?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showGrid: true,
  snapToGrid: false,
  gridSize: 10,
  showGrainLines: true
});

const store = usePatternStore();
const { 
  polygons, 
  selectedPolygon, 
  drawingState, 
  currentTool,
  fabricWidth,
  fabricHeight,
  animationState,
  fabricFlow,
  highlightedPoints,
  highlightedPolygonIds,
  markerResult
} = storeToRefs(store);

const { getAnimatedPolygonPosition, getAnimatedPolygonRotation } = useAnimation();

const canvasContainer = ref<HTMLDivElement | null>(null);
const svgElement = ref<SVGSVGElement | null>(null);

const pan = reactive({ x: 0, y: 0 });
const zoom = ref(1);
const minZoom = 0.1;
const maxZoom = 5;

const isPanning = ref(false);
const isDraggingPolygon = ref(false);
const isDraggingVertex = ref(false);
const isRotating = ref(false);

const dragStart = ref<Point | null>(null);
const dragPolygonStart = ref<Point | null>(null);
const dragVertexIndex = ref<number | null>(null);
const rotationStartAngle = ref(0);

const mousePosition = ref<Point | null>(null);
const hoveredPolygonId = ref<string | null>(null);
const hoveredVertexIndex = ref<number | null>(null);

const rectangleStart = ref<Point | null>(null);

const nfpPolygons = computed(() => {
  if (!markerResult.value?.steps) return [];
  return markerResult.value.steps
    .filter(step => step.nfpPolygon)
    .map(step => step.nfpPolygon!);
});

const currentPoints = computed(() => drawingState.value.currentPoints);
const isDrawing = computed(() => drawingState.value.isDrawing);

const viewBox = computed(() => {
  const containerWidth = canvasContainer.value?.clientWidth || 800;
  const containerHeight = canvasContainer.value?.clientHeight || 600;
  const viewWidth = containerWidth / zoom.value;
  const viewHeight = containerHeight / zoom.value;
  return `${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`;
});

function snapPoint(point: Point): Point {
  if (!props.snapToGrid) return point;
  return {
    x: Math.round(point.x / props.gridSize) * props.gridSize,
    y: Math.round(point.y / props.gridSize) * props.gridSize
  };
}

function getSVGPoint(event: MouseEvent): Point {
  if (!svgElement.value) return { x: 0, y: 0 };
  
  const rect = svgElement.value.getBoundingClientRect();
  const containerWidth = canvasContainer.value?.clientWidth || 800;
  const containerHeight = canvasContainer.value?.clientHeight || 600;
  const viewWidth = containerWidth / zoom.value;
  const viewHeight = containerHeight / zoom.value;
  
  const x = pan.x + ((event.clientX - rect.left) / rect.width) * viewWidth;
  const y = pan.y + ((event.clientY - rect.top) / rect.height) * viewHeight;
  
  return snapPoint({ x, y });
}

function getPolygonTransform(polygon: Polygon): string {
  const pos = getAnimatedPolygonPosition(polygon.id, polygon.position);
  const rot = getAnimatedPolygonRotation(polygon.id, polygon.rotation);
  const center = getPolygonCenter(polygon.points);
  
  return `translate(${pos.x}, ${pos.y}) rotate(${rot * 180 / Math.PI}, ${center.x}, ${center.y})`;
}

function polygonCenter(polygon: Polygon): Point {
  return getPolygonCenter(polygon.points);
}

function grainLineStart(polygon: Polygon): Point {
  const center = polygonCenter(polygon);
  const bounds = getPolygonBounds(polygon.points);
  const length = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.8;
  return getGrainLinePoints(center, polygon.grainAngle, length)[0];
}

function grainLineEnd(polygon: Polygon): Point {
  const center = polygonCenter(polygon);
  const bounds = getPolygonBounds(polygon.points);
  const length = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.8;
  return getGrainLinePoints(center, polygon.grainAngle, length)[1];
}

function rotateHandlePosition(polygon: Polygon): Point {
  const center = polygonCenter(polygon);
  const bounds = getPolygonBounds(polygon.points);
  const radius = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2 + 30;
  return {
    x: center.x,
    y: center.y - radius
  };
}

function isSelected(polygonId: string): boolean {
  return drawingState.value.selectedPolygonId === polygonId;
}

function getPolygonClasses(polygon: Polygon): Record<string, boolean> {
  return {
    'polygon': true,
    'selected': isSelected(polygon.id),
    'hovered': hoveredPolygonId.value === polygon.id,
    'highlighted': highlightedPolygonIds.value.includes(polygon.id),
    'collision-flash': animationState.value.type === 'collision' && highlightedPolygonIds.value.includes(polygon.id)
  };
}

function getPolygonFill(polygon: Polygon): string {
  if (highlightedPolygonIds.value.includes(polygon.id) && animationState.value.type === 'collision') {
    return 'rgba(239, 68, 68, 0.4)';
  }
  return polygon.color + '80';
}

function getPolygonStroke(polygon: Polygon): string {
  if (isSelected(polygon.id)) return '#3b82f6';
  if (hoveredPolygonId.value === polygon.id) return '#60a5fa';
  return '#374151';
}

function getPolygonStrokeWidth(polygon: Polygon): number {
  if (isSelected(polygon.id)) return 3;
  return 1.5;
}

function getVertexHandleRadius(vertexIndex: number): number {
  if (drawingState.value.selectedVertexIndex === vertexIndex) return 7;
  if (hoveredVertexIndex.value === vertexIndex) return 6;
  return 5;
}

function getVertexFill(vertexIndex: number): string {
  if (drawingState.value.selectedVertexIndex === vertexIndex) return '#3b82f6';
  if (hoveredVertexIndex.value === vertexIndex) return '#60a5fa';
  return 'white';
}

function getVertexStroke(vertexIndex: number): string {
  if (drawingState.value.selectedVertexIndex === vertexIndex) return '#1d4ed8';
  return '#374151';
}

function getDrawingPreviewPath(): string {
  if (currentPoints.value.length === 0) return '';
  const points = [...currentPoints.value];
  if (mousePosition.value) {
    points.push(mousePosition.value);
  }
  return pointsToPathData(points);
}

function getHighlightedPolygonPath(polygonId: string): string {
  const polygon = polygons.value.find(p => p.id === polygonId);
  if (!polygon) return '';
  
  const pos = getAnimatedPolygonPosition(polygonId, polygon.position);
  const rot = getAnimatedPolygonRotation(polygonId, polygon.rotation);
  const center = getPolygonCenter(polygon.points);
  
  const transformedPoints = rotatePolygon(polygon.points, rot, center);
  const translatedPoints = translatePolygon(transformedPoints, pos.x, pos.y);
  
  return pointsToPathData(translatedPoints);
}

function handleMouseDown(event: MouseEvent) {
  const point = getSVGPoint(event);
  
  if (event.button === 2) {
    isPanning.value = true;
    dragStart.value = point;
    return;
  }
  
  if (event.button !== 0) return;
  
  switch (currentTool.value) {
    case 'select':
      store.selectPolygon(null);
      break;
      
    case 'pen':
      if (!isDrawing.value) {
        store.startDrawing(point);
      } else {
        store.addDrawingPoint(point);
      }
      break;
      
    case 'rectangle':
      rectangleStart.value = point;
      drawingState.value.isDrawing = true;
      drawingState.value.currentPoints = [];
      break;
      
    case 'delete':
      const polygonToDelete = findPolygonAtPoint(point);
      if (polygonToDelete) {
        store.deletePolygon(polygonToDelete.id);
      }
      break;
  }
}

function handleMouseMove(event: MouseEvent) {
  const point = getSVGPoint(event);
  mousePosition.value = point;
  
  if (isPanning.value && dragStart.value) {
    const dx = dragStart.value.x - point.x;
    const dy = dragStart.value.y - point.y;
    pan.x += dx;
    pan.y += dy;
    dragStart.value = point;
    return;
  }
  
  if (isDraggingPolygon.value && dragStart.value && dragPolygonStart.value && selectedPolygon.value) {
    const dx = point.x - dragStart.value.x;
    const dy = point.y - dragStart.value.y;
    store.updatePolygon(selectedPolygon.value.id, {
      position: {
        x: dragPolygonStart.value.x + dx,
        y: dragPolygonStart.value.y + dy
      }
    });
    return;
  }
  
  if (isDraggingVertex.value && dragVertexIndex.value !== null && selectedPolygon.value) {
    const newPoints = [...selectedPolygon.value.points];
    newPoints[dragVertexIndex.value] = point;
    store.updatePolygon(selectedPolygon.value.id, { points: newPoints });
    return;
  }
  
  if (isRotating.value && dragStart.value && selectedPolygon.value) {
    const center = polygonCenter(selectedPolygon.value);
    const startAngle = Math.atan2(
      dragStart.value.y - center.y,
      dragStart.value.x - center.x
    );
    const currentAngle = Math.atan2(
      point.y - center.y,
      point.x - center.x
    );
    const deltaAngle = currentAngle - startAngle;
    store.updatePolygon(selectedPolygon.value.id, {
      rotation: rotationStartAngle.value + deltaAngle
    });
    return;
  }
}

function handleMouseUp(event: MouseEvent) {
  const point = getSVGPoint(event);
  
  if (isPanning.value) {
    isPanning.value = false;
    dragStart.value = null;
    return;
  }
  
  if (isDraggingPolygon.value) {
    isDraggingPolygon.value = false;
    dragStart.value = null;
    dragPolygonStart.value = null;
    return;
  }
  
  if (isDraggingVertex.value) {
    isDraggingVertex.value = false;
    dragVertexIndex.value = null;
    return;
  }
  
  if (isRotating.value) {
    isRotating.value = false;
    dragStart.value = null;
    return;
  }
  
  if (currentTool.value === 'rectangle' && rectangleStart.value && drawingState.value.isDrawing) {
    const width = Math.abs(point.x - rectangleStart.value.x);
    const height = Math.abs(point.y - rectangleStart.value.y);
    
    if (width >= 5 && height >= 5) {
      const minX = Math.min(rectangleStart.value.x, point.x);
      const minY = Math.min(rectangleStart.value.y, point.y);
      
      const rectPoints: Point[] = [
        { x: minX, y: minY },
        { x: minX + width, y: minY },
        { x: minX + width, y: minY + height },
        { x: minX, y: minY + height }
      ];
      
      store.addPolygon({
        name: `衣片 ${polygons.value.length + 1}`,
        points: rectPoints,
        grainAngle: 0,
        rotation: 0,
        position: { x: 0, y: 0 },
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        quantity: 1
      });
    }
    
    drawingState.value.isDrawing = false;
    rectangleStart.value = null;
  }
}

function handleDoubleClick(event: MouseEvent) {
  if (currentTool.value === 'pen' && isDrawing.value) {
    store.finishDrawing();
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  
  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom.value * delta));
  
  if (newZoom !== zoom.value) {
    const mousePoint = getSVGPoint(event);
    const rect = svgElement.value?.getBoundingClientRect();
    if (!rect) return;
    
    const containerWidth = canvasContainer.value?.clientWidth || 800;
    const containerHeight = canvasContainer.value?.clientHeight || 600;
    
    const oldViewWidth = containerWidth / zoom.value;
    const oldViewHeight = containerHeight / zoom.value;
    const newViewWidth = containerWidth / newZoom;
    const newViewHeight = containerHeight / newZoom;
    
    const scaleX = newViewWidth / oldViewWidth;
    const scaleY = newViewHeight / oldViewHeight;
    
    pan.x = mousePoint.x - (mousePoint.x - pan.x) * scaleX;
    pan.y = mousePoint.y - (mousePoint.y - pan.y) * scaleY;
    
    zoom.value = newZoom;
  }
}

function handlePolygonMouseDown(event: MouseEvent, polygon: Polygon) {
  if (currentTool.value === 'select') {
    store.selectPolygon(polygon.id);
  } else if (currentTool.value === 'move') {
    store.selectPolygon(polygon.id);
    isDraggingPolygon.value = true;
    dragStart.value = getSVGPoint(event);
    dragPolygonStart.value = { ...polygon.position };
  } else if (currentTool.value === 'delete') {
    store.deletePolygon(polygon.id);
  }
}

function handleVertexMouseDown(event: MouseEvent, polygon: Polygon, vertexIndex: number) {
  if (currentTool.value !== 'select') return;
  
  store.selectPolygon(polygon.id);
  drawingState.value.selectedVertexIndex = vertexIndex;
  isDraggingVertex.value = true;
  dragVertexIndex.value = vertexIndex;
}

function handleRotateStart(event: MouseEvent, polygon: Polygon) {
  store.selectPolygon(polygon.id);
  isRotating.value = true;
  dragStart.value = getSVGPoint(event);
  rotationStartAngle.value = polygon.rotation;
}

function findPolygonAtPoint(point: Point): Polygon | null {
  for (let i = polygons.value.length - 1; i >= 0; i--) {
    const polygon = polygons.value[i];
    const transformedPoints = getTransformedPolygonPoints(polygon);
    if (isPointInPolygon(point, transformedPoints)) {
      return polygon;
    }
  }
  return null;
}

function getTransformedPolygonPoints(polygon: Polygon): Point[] {
  const center = getPolygonCenter(polygon.points);
  const rotated = rotatePolygon(polygon.points, polygon.rotation, center);
  return translatePolygon(rotated, polygon.position.x, polygon.position.y);
}

function isPointInPolygon(point: Point, polygonPoints: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const xi = polygonPoints[i].x, yi = polygonPoints[i].y;
    const xj = polygonPoints[j].x, yj = polygonPoints[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function zoomIn() {
  zoom.value = Math.min(maxZoom, zoom.value * 1.2);
}

function zoomOut() {
  zoom.value = Math.max(minZoom, zoom.value / 1.2);
}

function resetView() {
  zoom.value = 1;
  pan.x = 0;
  pan.y = 0;
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (isDrawing.value) {
      store.cancelDrawing();
    }
    store.selectPolygon(null);
    drawingState.value.selectedVertexIndex = null;
  }
  
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (drawingState.value.selectedPolygonId) {
      store.deletePolygon(drawingState.value.selectedPolygonId);
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.pattern-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f3f4f6;
  cursor: crosshair;
}

.pattern-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.fabric-background {
  transition: fill 0.3s ease;
}

.fabric-boundary {
  pointer-events: none;
}

.polygon {
  cursor: pointer;
  transition: all 0.15s ease;
}

.polygon:hover .polygon-shape {
  filter: brightness(1.1);
}

.polygon.selected .polygon-shape {
  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));
}

.polygon.highlighted .polygon-shape {
  animation: collisionPulse 0.5s ease-in-out 3;
}

@keyframes collisionPulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.5) saturate(2); }
}

.vertex-handle {
  cursor: move;
  transition: all 0.15s ease;
}

.vertex-handle:hover {
  r: 8;
}

.rotate-control {
  cursor: grab;
  transition: all 0.15s ease;
}

.rotate-control:hover {
  r: 10;
}

.rotate-control:active {
  cursor: grabbing;
}

.grain-line {
  pointer-events: none;
  opacity: 0.7;
}

.drawing-preview {
  pointer-events: none;
}

.rectangle-preview {
  pointer-events: none;
}

.nfp-polygon {
  pointer-events: none;
  opacity: 0.6;
}

.singularity-point {
  pointer-events: none;
}

.collision-flash {
  pointer-events: none;
  animation: flash 0.5s ease-in-out 3;
}

@keyframes flash {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.canvas-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.zoom-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  color: #374151;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.zoom-btn:hover {
  background: #f3f4f6;
}

.zoom-level {
  font-size: 11px;
  color: #6b7280;
  padding: 2px 0;
  min-width: 40px;
  text-align: center;
}

.view-info {
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  color: #6b7280;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
}

.grid-overlay {
  pointer-events: none;
  opacity: 0.5;
}
</style>
