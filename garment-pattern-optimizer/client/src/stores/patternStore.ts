import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Polygon, Project, MarkerResult, MarkerWarning, Point, Placement, AnimationState, AnimatedPolygon, DrawingState, FabricFlowState, ToolType } from '../types';
import api from '../utils/api';
import { generateId } from '../utils/geometry';

export const usePatternStore = defineStore('pattern', () => {
  const currentProject = ref<Project | null>(null);
  const markerResult = ref<MarkerResult | null>(null);
  const isComputing = ref(false);
  const computeProgress = ref(0);
  
  const fabricWidth = ref(150);
  const fabricHeight = ref(200);
  const gap = ref(0);
  const rotationStep = ref(90 * Math.PI / 180);
  
  const drawingState = ref<DrawingState>({
    mode: 'select',
    selectedPolygonId: null,
    selectedVertexIndex: null,
    isDrawing: false,
    currentPoints: [],
    hoveredPoint: null
  });
  
  const currentTool = ref<ToolType>('select');
  
  const animationState = ref<AnimationState>({
    isPlaying: false,
    currentStep: 0,
    progress: 0,
    type: null,
    animatedPolygons: []
  });
  
  const fabricFlow = ref<FabricFlowState>({
    offset: 0,
    direction: { x: 1, y: 0.5 },
    speed: 0.5,
    pattern: 'diagonal'
  });
  
  const warnings = ref<MarkerWarning[]>([]);
  const highlightedPoints = ref<Point[]>([]);
  const highlightedPolygonIds = ref<string[]>([]);
  
  const polygons = computed(() => currentProject.value?.polygons || []);
  
  const selectedPolygon = computed(() => {
    if (!drawingState.value.selectedPolygonId || !currentProject.value) return null;
    return currentProject.value.polygons.find(p => p.id === drawingState.value.selectedPolygonId) || null;
  });
  
  const utilization = computed(() => markerResult.value?.utilization || 0);
  
  const utilizationColor = computed(() => {
    const u = utilization.value;
    if (u >= 85) return '#22c55e';
    if (u >= 70) return '#eab308';
    if (u >= 50) return '#f97316';
    return '#ef4444';
  });
  
  function setTool(tool: ToolType) {
    currentTool.value = tool;
    switch (tool) {
      case 'pen':
      case 'rectangle':
        drawingState.value.mode = 'draw';
        break;
      case 'move':
        drawingState.value.mode = 'move';
        break;
      case 'rotate':
        drawingState.value.mode = 'rotate';
        break;
      default:
        drawingState.value.mode = 'select';
    }
  }
  
  function selectPolygon(polygonId: string | null) {
    drawingState.value.selectedPolygonId = polygonId;
    drawingState.value.selectedVertexIndex = null;
  }
  
  function addPolygon(polygon: Omit<Polygon, 'id'>) {
    if (!currentProject.value) return;
    
    const newPolygon: Polygon = {
      ...polygon,
      id: generateId()
    };
    
    currentProject.value.polygons.push(newPolygon);
    selectPolygon(newPolygon.id);
  }
  
  function updatePolygon(id: string, updates: Partial<Polygon>) {
    if (!currentProject.value) return;
    
    const index = currentProject.value.polygons.findIndex(p => p.id === id);
    if (index !== -1) {
      currentProject.value.polygons[index] = {
        ...currentProject.value.polygons[index],
        ...updates
      };
    }
  }
  
  function deletePolygon(id: string) {
    if (!currentProject.value) return;
    
    const index = currentProject.value.polygons.findIndex(p => p.id === id);
    if (index !== -1) {
      currentProject.value.polygons.splice(index, 1);
      if (drawingState.value.selectedPolygonId === id) {
        selectPolygon(null);
      }
    }
  }
  
  function startDrawing(startPoint: Point) {
    drawingState.value.isDrawing = true;
    drawingState.value.currentPoints = [startPoint];
  }
  
  function addDrawingPoint(point: Point) {
    if (!drawingState.value.isDrawing) return;
    drawingState.value.currentPoints.push(point);
  }
  
  function finishDrawing() {
    if (drawingState.value.currentPoints.length >= 3 && currentProject.value) {
      const newPolygon: Polygon = {
        id: generateId(),
        name: `衣片 ${currentProject.value.polygons.length + 1}`,
        points: drawingState.value.currentPoints,
        grainAngle: 0,
        rotation: 0,
        position: { x: 0, y: 0 },
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        quantity: 1
      };
      currentProject.value.polygons.push(newPolygon);
      selectPolygon(newPolygon.id);
    }
    drawingState.value.isDrawing = false;
    drawingState.value.currentPoints = [];
  }
  
  function cancelDrawing() {
    drawingState.value.isDrawing = false;
    drawingState.value.currentPoints = [];
  }
  
  function setFabricSize(width: number, height: number) {
    fabricWidth.value = width;
    fabricHeight.value = height;
    if (currentProject.value) {
      currentProject.value.fabricWidth = width;
      currentProject.value.fabricHeight = height;
    }
  }
  
  async function computeNesting() {
    if (!currentProject.value || currentProject.value.polygons.length === 0) return;
    
    isComputing.value = true;
    computeProgress.value = 0;
    warnings.value = [];
    markerResult.value = null;
    
    try {
      const result = await api.nesting.compute({
        polygons: currentProject.value.polygons,
        fabricWidth: fabricWidth.value,
        fabricHeight: fabricHeight.value,
        rotationStep: rotationStep.value,
        gap: gap.value
      });
      
      markerResult.value = result;
      computeProgress.value = 100;
      
      if (result.warnings) {
        warnings.value = result.warnings;
        
        const singularityWarnings = result.warnings.filter(w => w.type === 'singularity');
        if (singularityWarnings.length > 0) {
          highlightedPoints.value = singularityWarnings.flatMap(w => w.highlightPoints || []);
        }
        
        const collisionWarnings = result.warnings.filter(w => w.type === 'collision' || w.type === 'self_intersection');
        if (collisionWarnings.length > 0) {
          highlightedPolygonIds.value = collisionWarnings.flatMap(w => w.polygonIds || []);
        }
      }
      
      if (currentProject.value) {
        currentProject.value.markerResult = result;
      }
      
    } catch (error) {
      console.error('Nesting computation failed:', error);
      warnings.value.push({
        type: 'no_solution',
        message: error instanceof Error ? error.message : '排料计算失败'
      });
    } finally {
      isComputing.value = false;
    }
  }
  
  async function loadPreset(presetId: string) {
    try {
      const result = await api.presets.load(presetId);
      currentProject.value = result.project;
      fabricWidth.value = result.fabricWidth;
      fabricHeight.value = result.fabricHeight;
      markerResult.value = null;
      warnings.value = [];
      highlightedPoints.value = [];
      highlightedPolygonIds.value = [];
      selectPolygon(null);
      return result;
    } catch (error) {
      console.error('Failed to load preset:', error);
      throw error;
    }
  }
  
  async function saveProject() {
    if (!currentProject.value) return;
    
    try {
      await api.projects.update(currentProject.value);
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  }
  
  async function createNewProject(name: string = '新项目') {
    const project: Omit<Project, 'createdAt' | 'updatedAt'> = {
      id: generateId(),
      name,
      polygons: [],
      fabricWidth: fabricWidth.value,
      fabricHeight: fabricHeight.value
    };
    
    try {
      const saved = await api.projects.create(project);
      currentProject.value = saved;
      markerResult.value = null;
      warnings.value = [];
      selectPolygon(null);
      return saved;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }
  
  function startAnimation(type: AnimationState['type'], steps?: Array<{
    polygonId: string;
    from: { position: Point; rotation: number };
    to: { position: Point; rotation: number };
    duration: number;
  }>) {
    if (steps && steps.length > 0) {
      animationState.value = {
        isPlaying: true,
        currentStep: 0,
        progress: 0,
        type,
        animatedPolygons: steps.map(s => ({
          ...s,
          startTime: performance.now(),
          easing: 'easeInOutQuad'
        }))
      };
    } else {
      animationState.value.isPlaying = true;
      animationState.value.type = type;
    }
  }
  
  function stopAnimation() {
    animationState.value.isPlaying = false;
    animationState.value.currentStep = 0;
    animationState.value.progress = 0;
    animationState.value.type = null;
    animationState.value.animatedPolygons = [];
  }
  
  function updateAnimationProgress(progress: number) {
    animationState.value.progress = progress;
    fabricFlow.value.offset = (fabricFlow.value.offset + fabricFlow.value.speed) % 100;
  }
  
  function clearHighlights() {
    highlightedPoints.value = [];
    highlightedPolygonIds.value = [];
  }
  
  function clearWarnings() {
    warnings.value = [];
    clearHighlights();
  }
  
  function resetMarkerResult() {
    markerResult.value = null;
    clearWarnings();
    stopAnimation();
  }
  
  return {
    currentProject,
    markerResult,
    isComputing,
    computeProgress,
    fabricWidth,
    fabricHeight,
    gap,
    rotationStep,
    drawingState,
    currentTool,
    animationState,
    fabricFlow,
    warnings,
    highlightedPoints,
    highlightedPolygonIds,
    polygons,
    selectedPolygon,
    utilization,
    utilizationColor,
    setTool,
    selectPolygon,
    addPolygon,
    updatePolygon,
    deletePolygon,
    startDrawing,
    addDrawingPoint,
    finishDrawing,
    cancelDrawing,
    setFabricSize,
    computeNesting,
    loadPreset,
    saveProject,
    createNewProject,
    startAnimation,
    stopAnimation,
    updateAnimationProgress,
    clearHighlights,
    clearWarnings,
    resetMarkerResult
  };
});
