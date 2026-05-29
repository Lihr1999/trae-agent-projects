<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePatternStore } from '../stores/patternStore';

const patternStore = usePatternStore();
const animatedValue = ref(0);

const size = 180;
const strokeWidth = 12;
const radius = (size - strokeWidth) / 2;
const circumference = radius * 2 * Math.PI;

const displayValue = computed(() => animatedValue.value);

const color = computed(() => {
  const u = patternStore.utilization;
  if (u >= 85) return '#22c55e';
  if (u >= 70) return '#eab308';
  if (u >= 50) return '#f97316';
  return '#ef4444';
});

const gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;

const strokeDashoffset = computed(() => {
  return circumference - (displayValue.value / 100) * circumference;
});

watch(
  () => patternStore.utilization,
  (newVal) => {
    const startVal = animatedValue.value;
    const endVal = newVal;
    const duration = 800;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      animatedValue.value = startVal + (endVal - startVal) * easeOutCubic;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        animatedValue.value = endVal;
      }
    }

    requestAnimationFrame(animate);
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="relative" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :width="size" :height="size" class="transform -rotate-90">
        <defs>
          <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" :stop-color="color" stop-opacity="1" />
            <stop offset="100%" :stop-color="color" stop-opacity="0.7" />
          </linearGradient>
        </defs>
        
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          stroke="#e5e7eb"
          :stroke-width="strokeWidth"
        />
        
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          :stroke="`url(#${gradientId})`"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          class="transition-all duration-100 ease-out"
          :style="{ filter: `drop-shadow(0 0 8px ${color}40)` }"
        />
      </svg>
      
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          class="text-4xl font-bold transition-colors duration-300"
          :style="{ color }"
        >
          {{ displayValue.toFixed(1) }}%
        </span>
        <span class="text-sm text-gray-500 mt-1">面料利用率</span>
      </div>

      <div
        class="absolute w-3 h-3 rounded-full transition-all duration-100 ease-out"
        :style="{
          backgroundColor: color,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${displayValue * 3.6 - 90}deg) translateY(-${radius}px)`,
          boxShadow: `0 0 10px ${color}80`
        }"
      />
    </div>

    <div class="mt-4 flex items-center gap-4">
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded-full bg-red-500" />
        <span class="text-xs text-gray-500">&lt;50%</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded-full bg-orange-500" />
        <span class="text-xs text-gray-500">50-70%</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded-full bg-yellow-500" />
        <span class="text-xs text-gray-500">70-85%</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded-full bg-green-500" />
        <span class="text-xs text-gray-500">&gt;85%</span>
      </div>
    </div>
  </div>
</template>
