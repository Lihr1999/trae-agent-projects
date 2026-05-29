import { ref, onMounted, onUnmounted } from 'vue';
import anime from 'animejs';
import type { Point, AnimatedPolygon } from '../types';
import { usePatternStore } from '../stores/patternStore';
import { storeToRefs } from 'pinia';

export function useAnimation() {
  const store = usePatternStore();
  const { animationState, fabricFlow } = storeToRefs(store);
  
  const animationFrameId = ref<number | null>(null);
  const animationInstances = ref<anime.AnimeInstance[]>([]);
  
  function interpolatePoint(from: Point, to: Point, progress: number): Point {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress
    };
  }
  
  function interpolateAngle(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }
  
  function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  function animatePolygonTranslation(
    polygonId: string,
    fromPos: Point,
    toPos: Point,
    duration: number = 800,
    onUpdate?: (position: Point) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOutQuad(rawProgress);
        
        const currentPos = interpolatePoint(fromPos, toPos, easedProgress);
        onUpdate?.(currentPos);
        
        if (rawProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      
      requestAnimationFrame(animate);
    });
  }
  
  function animatePolygonRotation(
    polygonId: string,
    fromAngle: number,
    toAngle: number,
    duration: number = 600,
    onUpdate?: (rotation: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOutQuad(rawProgress);
        
        const currentAngle = interpolateAngle(fromAngle, toAngle, easedProgress);
        onUpdate?.(currentAngle);
        
        if (rawProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      
      requestAnimationFrame(animate);
    });
  }
  
  async function playNestingAnimation(
    steps: Array<{
      polygonId: string;
      from: { position: Point; rotation: number };
      to: { position: Point; rotation: number };
    }>,
    onStepComplete?: (stepIndex: number) => void
  ) {
    store.startAnimation('nesting');
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      store.updateAnimationProgress((i / steps.length) * 100);
      
      await Promise.all([
        animatePolygonTranslation(
          step.polygonId,
          step.from.position,
          step.to.position,
          500 + Math.random() * 300
        ),
        animatePolygonRotation(
          step.polygonId,
          step.from.rotation,
          step.to.rotation,
          400 + Math.random() * 200
        )
      ]);
      
      onStepComplete?.(i);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    store.updateAnimationProgress(100);
    store.stopAnimation();
  }
  
  function highlightCollision(polygonIds: string[], duration: number = 1500) {
    store.highlightedPolygonIds = polygonIds;
    store.startAnimation('collision');
    
    setTimeout(() => {
      store.clearHighlights();
      store.stopAnimation();
    }, duration);
  }
  
  function highlightSingularity(points: Point[], duration: number = 2000) {
    store.highlightedPoints = points;
    store.startAnimation('collision');
    
    setTimeout(() => {
      store.clearHighlights();
      store.stopAnimation();
    }, duration);
  }
  
  function startFabricFlowAnimation() {
    if (animationFrameId.value) return;
    
    function updateFlow() {
      fabricFlow.value.offset = (fabricFlow.value.offset + fabricFlow.value.speed) % 100;
      animationFrameId.value = requestAnimationFrame(updateFlow);
    }
    
    animationFrameId.value = requestAnimationFrame(updateFlow);
  }
  
  function stopFabricFlowAnimation() {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
  }
  
  function getAnimatedPolygonPosition(polygonId: string, basePosition: Point): Point {
    const anim = animationState.value.animatedPolygons.find(a => a.polygonId === polygonId);
    if (!anim) return basePosition;
    
    const elapsed = performance.now() - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);
    const easedProgress = easeInOutQuad(progress);
    
    return interpolatePoint(anim.from.position, anim.to.position, easedProgress);
  }
  
  function getAnimatedPolygonRotation(polygonId: string, baseRotation: number): number {
    const anim = animationState.value.animatedPolygons.find(a => a.polygonId === polygonId);
    if (!anim) return baseRotation;
    
    const elapsed = performance.now() - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);
    const easedProgress = easeInOutQuad(progress);
    
    return interpolateAngle(anim.from.rotation, anim.to.rotation, easedProgress);
  }
  
  onMounted(() => {
    startFabricFlowAnimation();
  });
  
  onUnmounted(() => {
    stopFabricFlowAnimation();
    animationInstances.value.forEach(anim => anim.pause());
  });
  
  return {
    animatePolygonTranslation,
    animatePolygonRotation,
    playNestingAnimation,
    highlightCollision,
    highlightSingularity,
    startFabricFlowAnimation,
    stopFabricFlowAnimation,
    getAnimatedPolygonPosition,
    getAnimatedPolygonRotation
  };
}
