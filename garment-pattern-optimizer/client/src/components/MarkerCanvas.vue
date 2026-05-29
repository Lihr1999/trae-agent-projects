<template>
  <div class="marker-canvas-container w-full h-full flex flex-col bg-slate-900/50">
    <div class="tab-bar flex border-b border-slate-700">
      <button
        class="tab-btn px-6 py-3 font-medium transition-all duration-200"
        :class="{ 'active': activeTab === 'editor' }"
        @click="activeTab = 'editor'"
      >
        📝 编辑画布
      </button>
      <button
        class="tab-btn px-6 py-3 font-medium transition-all duration-200"
        :class="{ 'active': activeTab === 'marker' }"
        @click="activeTab = 'marker'"
      >
        🎯 排料结果
      </button>
    </div>

    <div class="flex-1 relative overflow-hidden">
      <div v-show="activeTab === 'editor'" class="w-full h-full">
        <svg
          ref="editorSvgRef"
          class="w-full h-full"
          @mousemove="handleEditorMouseMove"
          @click="handleEditorClick"
          @contextmenu.prevent
        >
          <defs>
            <pattern id="editorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100, 116, 139, 0.2)" stroke-width="0.5"/>
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#editorGrid)" />
          
          <g :transform="editorTransform">
            <rect
              :x="0"
              :y="0"
              :width="store.fabricWidth"
              :height="store.fabricHeight"
              fill="rgba(30, 41, 59, 0.8)"
              stroke="#475569"
              stroke-width="2"
            />
            
            <text :x="store.fabricWidth / 2" :y="-10" text-anchor="middle" fill="#94a3b8" font-size="12">
              {{ store.fabricWidth }} cm
            </text>
            <text :x="-10" :y="store.fabricHeight / 2" text-anchor="middle" fill="#94a3b8" font-size="12" transform="rotate(-90, -10, store.fabricHeight / 2)">
              {{ store.fabricHeight }} cm
            </text>

            <path
              v-for="polygon in store.polygons"
              :key="polygon.id"
              :d="getPolygonPath(polygon)"
              :fill="polygon.color"
              :fill-opacity="0.7"
              :stroke="isPolygonSelected(polygon.id) ? '#f59e0b' : '#ffffff'"
              :stroke-width="isPolygonSelected(polygon.id) ? 3 : 1.5"
              class="polygon-path"
              :class="{ selected: isPolygonSelected(polygon.id), highlighted: isPolygonHighlighted(polygon.id) }"
              :style="{ color: polygon.color }"
              @click.stop="selectPolygon(polygon.id)"
              @mouseenter="hoveredPolygonId = polygon.id"
              @mouseleave="hoveredPolygonId = null"
            />

            <g v-if="store.drawingState.isDrawing && store.drawingState.currentPoints.length > 0">
              <path
                :d="getDrawingPath()"
                fill="rgba(59, 130, 246, 0.3)"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
              <circle
                v-for="(point, index) in store.drawingState.currentPoints"
                :key="index"
                :cx="point.x"
                :cy="point.y"
                r="4"
                fill="#3b82f6"
              />
            </g>
          </g>
        </svg>
      </div>

      <div v-show="activeTab === 'marker'" class="w-full h-full">
        <div class="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
          <div class="panel p-4">
            <div class="flex items-center gap-4">
              <div class="gauge-container">
                <div class="gauge-bg"></div>
                <div 
                  class="gauge-fill"
                  :style="{ 
                    borderTopColor: store.utilizationColor,
                    borderRightColor: store.utilizationColor,
                    transform: `rotate(${store.utilization * 3.6 - 90}deg)`
                  }"
                ></div>
                <div class="absolute inset-0 flex items-center justify-center flex-col">
                  <span class="text-2xl font-bold" :style="{ color: store.utilizationColor }">
                    {{ store.utilization.toFixed(1) }}%
                  </span>
                  <span class="text-xs text-slate-400">利用率</span>
                </div>
              </div>
              <div>
                <div class="text-sm text-slate-400">总面积: {{ formatArea(store.markerResult?.totalArea || 0) }}</div>
                <div class="text-sm text-slate-400">已用面积: {{ formatArea(store.markerResult?.usedArea || 0) }}</div>
                <div class="text-sm text-slate-400">计算时间: {{ store.markerResult?.computationTime.toFixed(2) || 0 }}s</div>
              </div>
            </div>
          </div>

          <div class="panel p-3">
            <div class="flex gap-2 mb-3">
              <button
                class="btn-secondary text-sm"
                @click="togglePlayAnimation"
                :disabled="!store.markerResult"
              >
                {{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}
              </button>
              <button
                class="btn-secondary text-sm"
                @click="stepBackward"
                :disabled="!store.markerResult || currentStep <= 0"
              >
                ⏮ 上一步
              </button>
              <button
                class="btn-secondary text-sm"
                @click="stepForward"
                :disabled="!store.markerResult || currentStep >= totalSteps"
              >
                ⏭ 下一步
              </button>
              <button
                class="btn-secondary text-sm"
                @click="resetAnimation"
                :disabled="!store.markerResult"
              >
                ↺ 重置
              </button>
            </div>
            <div class="nesting-progress mb-2">
              <div 
                class="nesting-progress-bar"
                :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
              ></div>
            </div>
            <div class="text-xs text-slate-400 text-center">
              步骤 {{ currentStep }} / {{ totalSteps }}
            </div>
          </div>

          <div class="panel p-3">
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="showNfp" class="rounded" />
                <span class="text-sm">显示 NFP 多边形</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="showUtilizationOverlay" class="rounded" />
                <span class="text-sm">显示利用率覆盖层</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="showFabricTexture" class="rounded" />
                <span class="text-sm">显示面料纹理</span>
              </label>
            </div>
          </div>
        </div>

        <svg
          ref="markerSvgRef"
          class="w-full h-full"
          @mousemove="handleMarkerMouseMove"
          @click="handleMarkerClick"
        >
          <defs>
            <pattern id="markerGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100, 116, 139, 0.2)" stroke-width="0.5"/>
            </pattern>
            <pattern 
              id="fabricTexture" 
              patternUnits="userSpaceOnUse" 
              :width="50" 
              :height="50"
              :patternTransform="`translate(${fabricFlowOffset.x}, ${fabricFlowOffset.y})`"
            >
              <rect width="50" height="50" fill="rgba(30, 41, 59, 0.9)"/>
              <path 
                d="M 0 25 L 50 25 M 25 0 L 25 50" 
                stroke="rgba(59, 130, 246, 0.1)" 
                stroke-width="1"
              />
              <path 
                d="M 0 12.5 L 50 12.5 M 0 37.5 L 50 37.5 M 12.5 0 L 12.5 50 M 37.5 0 L 37.5 50" 
                stroke="rgba(59, 130, 246, 0.05)" 
                stroke-width="0.5"
              />
            </pattern>
            <linearGradient id="utilizationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.3" />
              <stop offset="50%" style="stop-color:#eab308;stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:#22c55e;stop-opacity:0.3" />
            </linearGradient>
            <filter id="markerGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#markerGrid)" />
          
          <g :transform="markerTransform">
            <rect
              :x="0"
              :y="0"
              :width="store.fabricWidth"
              :height="store.fabricHeight"
              :fill="showFabricTexture ? 'url(#fabricTexture)' : 'rgba(30, 41, 59, 0.8)'"
              stroke="#475569"
              stroke-width="3"
            />

            <rect
              v-if="showUtilizationOverlay"
              :x="0"
              :y="0"
              :width="store.fabricWidth"
              :height="store.fabricHeight * (1 - store.utilization / 100)"
              fill="rgba(239, 68, 68, 0.1)"
              stroke="rgba(239, 68, 68, 0.3)"
              stroke-width="1"
              stroke-dasharray="5,5"
            />

            <text :x="store.fabricWidth / 2" :y="-15" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">
              {{ store.fabricWidth }} cm
            </text>
            <text :x="-15" :y="store.fabricHeight / 2" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold" transform="rotate(-90, -15, store.fabricHeight / 2)">
              {{ store.fabricHeight }} cm
            </text>
            <text :x="store.fabricWidth / 2" :y="store.fabricHeight + 25" text-anchor="middle" fill="#94a3b8" font-size="12">
              面料边界
            </text>

            <template v-for="(markerStep, index) in visibleSteps" :key="`nfp-${index}`">
              <path
                v-if="showNfp && markerStep.nfpPolygon && markerStep.nfpPolygon.length > 0"
                :d="pointsToPath(markerStep.nfpPolygon)"
                fill="rgba(168, 85, 247, 0.15)"
                stroke="#a855f7"
                stroke-width="1.5"
                stroke-dasharray="8,4"
                :opacity="0.3 + (index / visibleSteps.length) * 0.7"
              />
            </template>

            <g
              v-for="(placement, index) in visiblePlacements"
              :key="placement.polygonId"
              :transform="getPlacementTransform(placement)"
            >
              <path
                :d="getPolygonPointsPath(getPolygonById(placement.polygonId))"
                :fill="getPolygonColor(placement.polygonId)"
                :fill-opacity="0.8"
                :stroke="getStrokeColor(placement, index)"
                :stroke-width="isPlacementSelected(placement.polygonId) ? 4 : 2"
                class="polygon-path"
                :class="{ 
                  selected: isPlacementSelected(placement.polygonId),
                  highlighted: isPlacementHighlighted(placement.polygonId)
                }"
                :style="{ color: getPolygonColor(placement.polygonId) }"
                :filter="animationState.type === 'collision' && isPlacementHighlighted(placement.polygonId) ? 'url(#markerGlow)' : ''"
                @click.stop="selectPlacement(placement.polygonId)"
                @mouseenter="hoveredPlacementId = placement.polygonId"
                @mouseleave="hoveredPlacementId = null"
              />
              
              <line
                v-if="getPolygonById(placement.polygonId)"
                :x1="getGrainLineStart(getPolygonById(placement.polygonId)!).x"
                :y1="getGrainLineStart(getPolygonById(placement.polygonId)!).y"
                :x2="getGrainLineEnd(getPolygonById(placement.polygonId)!).x"
                :y2="getGrainLineEnd(getPolygonById(placement.polygonId)!).y"
                stroke="#ffffff"
                stroke-width="2"
                stroke-dasharray="6,3"
                class="grain-line"
              />
            </g>

            <g v-for="(warning, index) in zeroWidthGapWarnings" :key="`gap-${index}`">
              <line
                v-for="(point, pIndex) in warning.highlightPoints?.slice(0, -1) || []"
                :key="pIndex"
                :x1="point.x"
                :y1="point.y"
                :x2="(warning.highlightPoints?.[pIndex + 1] || point).x"
                :y2="(warning.highlightPoints?.[pIndex + 1] || point).y"
                stroke="#f59e0b"
                stroke-width="3"
                stroke-dasharray="4,2"
              />
            </g>

            <g v-for="(point, index) in store.highlightedPoints" :key="`singularity-${index}`">
              <circle
                :cx="point.x"
                :cy="point.y"
                r="8"
                fill="none"
                stroke="#f59e0b"
                stroke-width="2"
                class="singularity-glow"
              />
              <circle
                :cx="point.x"
                :cy="point.y"
                r="4"
                fill="#f59e0b"
              />
            </g>
          </g>
        </svg>

        <div
          v-if="hoveredPlacementId && store.markerResult"
          class="absolute bg-slate-800/95 backdrop-blur-sm rounded-lg border border-slate-600 p-3 shadow-2xl z-20 pointer-events-none"
          :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }"
        >
          <div class="font-semibold text-white mb-2">{{ getPolygonById(hoveredPlacementId)?.name }}</div>
          <div class="text-sm text-slate-300 space-y-1">
            <div>ID: {{ hoveredPlacementId }}</div>
            <div>位置: ({{ getPlacementById(hoveredPlacementId)?.position.x.toFixed(1) }}, {{ getPlacementById(hoveredPlacementId)?.position.y.toFixed(1) }})</div>
            <div>旋转: {{ ((getPlacementById(hoveredPlacementId)?.rotation || 0) * 180 / Math.PI).toFixed(0) }}°</div>
            <div>面积: {{ formatArea(getPolygonArea(getPolygonById(hoveredPlacementId)?.points || [])) }}</div>
          </div>
        </div>

        <div
          v-if="hoveredPolygonId && activeTab === 'editor'"
          class="absolute bg-slate-800/95 backdrop-blur-sm rounded-lg border border-slate-600 p-3 shadow-2xl z-20 pointer-events-none"
          :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }"
        >
          <div class="font-semibold text-white mb-2">{{ getPolygonById(hoveredPolygonId)?.name }}</div>
          <div class="text-sm text-slate-300 space-y-1">
            <div>ID: {{ hoveredPolygonId }}</div>
            <div>顶点数: {{ getPolygonById(hoveredPolygonId)?.points.length }}</div>
            <div>面积: {{ formatArea(getPolygonArea(getPolygonById(hoveredPolygonId)?.points || [])) }}</div>
            <div>数量: {{ getPolygonById(hoveredPolygonId)?.quantity }}</div>
          </div>
        </div>

        <div
          v-if="store.warnings.length > 0"
          class="absolute bottom-4 left-4 right-4 panel p-3 max-h-32 overflow-y-auto scrollbar-thin"
        >
          <div class="text-sm font-semibold text-amber-400 mb-2">⚠️ 警告 ({{ store.warnings.length }})</div>
          <div class="space-y-1">
            <div
              v-for="(warning, index) in store.warnings"
              :key="index"
              class="text-xs flex items-start gap-2"
              :class="{
                'text-red-400': warning.type === 'collision' || warning.type === 'no_solution' || warning.type === 'self_intersection',
                'text-amber-400': warning.type === 'singularity' || warning.type === 'zero_width_gap'
              }"
            >
              <span class="mt-0.5">
                {{ warning.type === 'collision' ? '🔴' : warning.type === 'no_solution' ? '❌' : warning.type === 'self_intersection' ? '🔴' : '⚠️' }}
              </span>
              <span>{{ warning.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePatternStore } from '../stores/patternStore';
import { useAnimation } from '../composables/useAnimation';
import type { Polygon, Point, Placement, MarkerStep } from '../types';
import { 
  rotatePolygon, 
  translatePolygon, 
  getPolygonCenter, 
  getPolygonArea, 
  pointsToPathData,
  getGrainLinePoints,
  distance
} from '../utils/geometry';

const store = usePatternStore();
const { 
  markerResult, 
  animationState, 
  fabricFlow,
  drawingState,
  selectedPolygon
} = storeToRefs(store);

const { 
  getAnimatedPolygonPosition, 
  getAnimatedPolygonRotation,
  highlightCollision
} = useAnimation();

const activeTab = ref<'editor' | 'marker'>('editor');
const editorSvgRef = ref<SVGSVGElement | null>(null);
const markerSvgRef = ref<SVGSVGElement | null>(null);

const showNfp = ref(false);
const showUtilizationOverlay = ref(true);
const showFabricTexture = ref(true);

const hoveredPolygonId = ref<string | null>(null);
const hoveredPlacementId = ref<string | null>(null);
const selectedPlacementId = ref<string | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

const currentStep = ref(0);
const isPlaying = ref(false);
let animationFrameId: number | null = null;
let lastFrameTime = 0;

const editorTransform = ref('translate(50, 50) scale(2)');
const markerTransform = ref('translate(50, 50) scale(2)');

const fabricFlowOffset = computed(() => ({
  x: fabricFlow.value.offset * fabricFlow.value.direction.x,
  y: fabricFlow.value.offset * fabricFlow.value.direction.y
}));

const totalSteps = computed(() => {
  if (!markerResult.value) return 0;
  return markerResult.value.placements.length;
});

const visiblePlacements = computed(() => {
  if (!markerResult.value) return [];
  return markerResult.value.placements.slice(0, currentStep.value);
});

const visibleSteps = computed(() => {
  if (!markerResult.value?.steps) return [];
  return markerResult.value.steps.slice(0, currentStep.value);
});

const zeroWidthGapWarnings = computed(() => {
  return store.warnings.filter(w => w.type === 'zero_width_gap');
});

function getPolygonById(id: string): Polygon | undefined {
  return store.polygons.find(p => p.id === id);
}

function getPlacementById(id: string): Placement | undefined {
  return markerResult.value?.placements.find(p => p.polygonId === id);
}

function getPolygonColor(id: string): string {
  return getPolygonById(id)?.color || '#64748b';
}

function getStrokeColor(placement: Placement, index: number): string {
  if (isPlacementHighlighted(placement.polygonId)) {
    return '#ef4444';
  }
  if (isPlacementSelected(placement.polygonId)) {
    return '#f59e0b';
  }
  if (placement.overlap) {
    return '#ef4444';
  }
  return '#ffffff';
}

function isPolygonSelected(id: string): boolean {
  return drawingState.value.selectedPolygonId === id;
}

function isPolygonHighlighted(id: string): boolean {
  return store.highlightedPolygonIds.includes(id);
}

function isPlacementSelected(id: string): boolean {
  return selectedPlacementId.value === id;
}

function isPlacementHighlighted(id: string): boolean {
  return store.highlightedPolygonIds.includes(id);
}

function selectPolygon(id: string) {
  store.selectPolygon(id);
}

function selectPlacement(id: string) {
  selectedPlacementId.value = selectedPlacementId.value === id ? null : id;
}

function getPolygonPath(polygon: Polygon): string {
  const rotatedPoints = rotatePolygon(polygon.points, polygon.rotation, getPolygonCenter(polygon.points));
  const translatedPoints = translatePolygon(rotatedPoints, polygon.position.x, polygon.position.y);
  return pointsToPathData(translatedPoints);
}

function getPolygonPointsPath(polygon: Polygon | undefined): string {
  if (!polygon) return '';
  return pointsToPathData(polygon.points);
}

function getPlacementTransform(placement: Placement): string {
  const animatedPos = getAnimatedPolygonPosition(placement.polygonId, placement.position);
  const animatedRot = getAnimatedPolygonRotation(placement.polygonId, placement.rotation);
  return `translate(${animatedPos.x}, ${animatedPos.y}) rotate(${animatedRot * 180 / Math.PI})`;
}

function getGrainLineStart(polygon: Polygon): Point {
  const center = getPolygonCenter(polygon.points);
  const [start] = getGrainLinePoints(center, polygon.grainAngle, 30);
  return start;
}

function getGrainLineEnd(polygon: Polygon): Point {
  const center = getPolygonCenter(polygon.points);
  const [, end] = getGrainLinePoints(center, polygon.grainAngle, 30);
  return end;
}

function pointsToPath(points: Point[]): string {
  return pointsToPathData(points);
}

function getDrawingPath(): string {
  if (drawingState.value.currentPoints.length < 2) return '';
  const points = [...drawingState.value.currentPoints];
  if (drawingState.value.hoveredPoint) {
    points.push(drawingState.value.hoveredPoint);
  }
  return pointsToPathData(points);
}

function formatArea(area: number): string {
  return `${area.toFixed(2)} cm²`;
}

function togglePlayAnimation() {
  if (isPlaying.value) {
    pauseAnimation();
  } else {
    playAnimation();
  }
}

function playAnimation() {
  if (!markerResult.value || currentStep.value >= totalSteps.value) {
    currentStep.value = 0;
  }
  isPlaying.value = true;
  store.startAnimation('nesting');
  lastFrameTime = performance.now();
  animate();
}

function pauseAnimation() {
  isPlaying.value = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function resetAnimation() {
  pauseAnimation();
  currentStep.value = 0;
  store.stopAnimation();
}

function stepForward() {
  if (currentStep.value < totalSteps.value) {
    currentStep.value++;
    animatePlacement(currentStep.value - 1);
    checkStepWarnings(currentStep.value - 1);
  }
}

function stepBackward() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function animate() {
  if (!isPlaying.value) return;

  const now = performance.now();
  const delta = now - lastFrameTime;

  if (delta > 800) {
    if (currentStep.value < totalSteps.value) {
      currentStep.value++;
      animatePlacement(currentStep.value - 1);
      checkStepWarnings(currentStep.value - 1);
      lastFrameTime = now;
    } else {
      pauseAnimation();
      store.stopAnimation();
      return;
    }
  }

  store.updateAnimationProgress((currentStep.value / totalSteps.value) * 100);
  animationFrameId = requestAnimationFrame(animate);
}

function animatePlacement(index: number) {
  if (!markerResult.value) return;
  
  const placement = markerResult.value.placements[index];
  const polygon = getPolygonById(placement.polygonId);
  if (!polygon) return;

  store.startAnimation('translation', [{
    polygonId: placement.polygonId,
    from: {
      position: { x: -100, y: -100 },
      rotation: polygon.rotation
    },
    to: {
      position: placement.position,
      rotation: placement.rotation
    },
    duration: 600
  }]);
}

function checkStepWarnings(index: number) {
  if (!markerResult.value?.steps) return;
  
  const step = markerResult.value.steps[index];
  if (step.placement.overlap) {
    highlightCollision([step.placement.polygonId], 1000);
  }
}

function handleEditorMouseMove(event: MouseEvent) {
  if (!editorSvgRef.value) return;
  
  const svg = editorSvgRef.value;
  const rect = svg.getBoundingClientRect();
  const x = (event.clientX - rect.left) / 2 - 50;
  const y = (event.clientY - rect.top) / 2 - 50;
  
  tooltipPosition.value = {
    x: event.clientX - rect.left + 15,
    y: event.clientY - rect.top + 15
  };

  if (drawingState.value.isDrawing) {
    drawingState.value.hoveredPoint = { x, y };
  }
}

function handleEditorClick(event: MouseEvent) {
  if (!editorSvgRef.value) return;
  
  const svg = editorSvgRef.value;
  const rect = svg.getBoundingClientRect();
  const x = (event.clientX - rect.left) / 2 - 50;
  const y = (event.clientY - rect.top) / 2 - 50;

  if (store.currentTool === 'pen' && drawingState.value.isDrawing) {
    const existingIndex = drawingState.value.currentPoints.findIndex(
      p => distance(p, { x, y }) < 10
    );
    
    if (existingIndex === 0 && drawingState.value.currentPoints.length >= 3) {
      store.finishDrawing();
      store.setTool('select');
    } else if (existingIndex === -1) {
      store.addDrawingPoint({ x, y });
    }
  }
}

function handleMarkerMouseMove(event: MouseEvent) {
  if (!markerSvgRef.value) return;
  
  const rect = markerSvgRef.value.getBoundingClientRect();
  
  tooltipPosition.value = {
    x: event.clientX - rect.left + 15,
    y: event.clientY - rect.top + 15
  };
}

function handleMarkerClick(event: MouseEvent) {
  if (event.target === markerSvgRef.value) {
    selectedPlacementId.value = null;
  }
}

watch(() => markerResult.value, (newResult) => {
  if (newResult) {
    currentStep.value = 0;
    selectedPlacementId.value = null;
  }
});

onMounted(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (activeTab.value !== 'marker') return;
    
    switch (event.key) {
      case ' ':
        event.preventDefault();
        togglePlayAnimation();
        break;
      case 'ArrowRight':
        stepForward();
        break;
      case 'ArrowLeft':
        stepBackward();
        break;
      case 'r':
      case 'R':
        resetAnimation();
        break;
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    pauseAnimation();
  });
});

defineExpose({
  playAnimation,
  pauseAnimation,
  resetAnimation,
  stepForward,
  stepBackward
});
</script>

<style scoped>
.marker-canvas-container {
  position: relative;
}

.tab-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: #e2e8f0;
  background: rgba(51, 65, 85, 0.3);
}

.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}
</style>
