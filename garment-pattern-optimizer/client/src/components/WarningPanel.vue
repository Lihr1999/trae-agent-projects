<script setup lang="ts">
import { computed } from 'vue';
import { usePatternStore } from '../stores/patternStore';
import type { MarkerWarning } from '../types';

const patternStore = usePatternStore();

interface WarningConfig {
  iconPath: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  label: string;
}

const warningConfigs: Record<MarkerWarning['type'], WarningConfig> = {
  singularity: {
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-800',
    iconColor: 'text-amber-500',
    label: '奇异性警告'
  },
  zero_width_gap: {
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-500',
    label: '零宽度间隙警告'
  },
  self_intersection: {
    iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
    label: '自相交错误'
  },
  no_solution: {
    iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
    label: '无解错误'
  },
  collision: {
    iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
    label: '碰撞错误'
  }
};

const sortedWarnings = computed(() => {
  const order: Record<MarkerWarning['type'], number> = {
    collision: 0,
    self_intersection: 1,
    no_solution: 2,
    zero_width_gap: 3,
    singularity: 4
  };
  return [...patternStore.warnings].sort((a, b) => order[a.type] - order[b.type]);
});

const errorCount = computed(() => {
  return patternStore.warnings.filter(w => 
    w.type === 'self_intersection' || w.type === 'no_solution' || w.type === 'collision'
  ).length;
});

const warningCount = computed(() => {
  return patternStore.warnings.filter(w => 
    w.type === 'singularity' || w.type === 'zero_width_gap'
  ).length;
});

function handleWarningClick(warning: MarkerWarning) {
  if (warning.highlightPoints && warning.highlightPoints.length > 0) {
    patternStore.highlightedPoints = warning.highlightPoints;
  }
  if (warning.polygonIds && warning.polygonIds.length > 0) {
    patternStore.highlightedPolygonIds = warning.polygonIds;
    if (warning.polygonIds.length > 0) {
      patternStore.selectPolygon(warning.polygonIds[0]);
    }
  }
}

function handleClearWarnings() {
  patternStore.clearWarnings();
}
</script>

<template>
  <div class="w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span class="font-semibold text-gray-800">警告面板</span>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="errorCount > 0" class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          {{ errorCount }} 错误
        </span>
        <span v-if="warningCount > 0" class="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
          {{ warningCount }} 警告
        </span>
      </div>
    </div>

    <div class="max-h-80 overflow-y-auto">
      <div v-if="sortedWarnings.length === 0" class="py-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto mb-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-gray-500">暂无警告信息</p>
        <p class="text-xs text-gray-400 mt-1">排料结果正常</p>
      </div>

      <div v-else class="p-3 space-y-2">
        <div
          v-for="(warning, index) in sortedWarnings"
          :key="index"
          @click="handleWarningClick(warning)"
          class="group p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99]"
          :class="[
            warningConfigs[warning.type].bgColor,
            warningConfigs[warning.type].borderColor
          ]"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 transition-transform duration-200 group-hover:scale-110"
              :class="warningConfigs[warning.type].bgColor"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                :class="warningConfigs[warning.type].iconColor"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  :d="warningConfigs[warning.type].iconPath"
                />
              </svg>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  :class="[
                    warningConfigs[warning.type].bgColor,
                    warningConfigs[warning.type].textColor,
                    `ring-1 ring-inset`,
                    warning.type === 'singularity' ? 'ring-amber-600/20' :
                    warning.type === 'zero_width_gap' ? 'ring-orange-600/20' :
                    'ring-red-600/20'
                  ]"
                >
                  {{ warningConfigs[warning.type].label }}
                </span>
                <span
                  v-if="warning.polygonIds && warning.polygonIds.length > 0"
                  class="text-xs text-gray-500"
                >
                  {{ warning.polygonIds.length }} 个裁片
                </span>
              </div>
              <p
                class="text-sm leading-relaxed"
                :class="warningConfigs[warning.type].textColor"
              >
                {{ warning.message }}
              </p>
              <div class="mt-2 flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span>点击高亮相关裁片</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="sortedWarnings.length > 0" class="p-3 border-t border-gray-200 bg-gray-50">
      <button
        @click="handleClearWarnings"
        class="w-full py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>清除警告</span>
      </button>
    </div>
  </div>
</template>
