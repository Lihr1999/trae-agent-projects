<script setup lang="ts">
import { ref } from 'vue';
import { usePatternStore } from '../stores/patternStore';

const patternStore = usePatternStore();
const loadingPreset = ref<string | null>(null);

interface PresetConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  gradient: string;
  hoverGradient: string;
}

const presets: PresetConfig[] = [
  {
    id: 'preset-1',
    name: '预设一：T恤基础版型',
    shortName: '预设一',
    description: '经典圆领T恤，包含前片、后片和两个袖子',
    gradient: 'from-blue-500 to-cyan-500',
    hoverGradient: 'from-blue-600 to-cyan-600'
  },
  {
    id: 'preset-2',
    name: '预设二：衬衫多部件',
    shortName: '预设二',
    description: '正装衬衫，包含前片、后片、袖子、领子、袖口、口袋',
    gradient: 'from-emerald-500 to-teal-500',
    hoverGradient: 'from-emerald-600 to-teal-600'
  },
  {
    id: 'preset-3',
    name: '预设三：裤子复杂版型',
    shortName: '预设三',
    description: '西裤版型，包含前片、后片、腰头、口袋布，含凹多边形测试NFP算法',
    gradient: 'from-orange-500 to-amber-500',
    hoverGradient: 'from-orange-600 to-amber-600'
  },
  {
    id: 'preset-4',
    name: '预设四：外套极限测试',
    shortName: '预设四',
    description: '外套多部件，包含凹多边形、自交测试用例，测试算法鲁棒性',
    gradient: 'from-rose-500 to-pink-500',
    hoverGradient: 'from-rose-600 to-pink-600'
  }
];

async function handleLoadPreset(presetId: string) {
  if (loadingPreset.value) return;
  
  loadingPreset.value = presetId;
  try {
    await patternStore.loadPreset(presetId);
  } catch (error) {
    console.error('Failed to load preset:', error);
  } finally {
    loadingPreset.value = null;
  }
}
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <button
      v-for="preset in presets"
      :key="preset.id"
      @click="handleLoadPreset(preset.id)"
      :disabled="loadingPreset !== null"
      class="group relative overflow-hidden rounded-xl px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      :class="[
        `bg-gradient-to-r ${preset.gradient}`,
        loadingPreset === preset.id ? 'animate-pulse' : ''
      ]"
    >
      <div
        class="absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        :class="preset.hoverGradient"
      />
      
      <div class="relative flex items-center gap-2">
        <svg
          v-if="loadingPreset === preset.id"
          class="h-5 w-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span v-else class="text-lg font-bold">{{ preset.shortName }}</span>
      </div>

      <div class="absolute left-0 right-0 top-full z-10 mt-2 w-64 transform rounded-lg bg-gray-900/95 p-3 text-left text-sm shadow-xl opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 pointer-events-none backdrop-blur-sm">
        <div class="font-bold text-white mb-1">{{ preset.name }}</div>
        <div class="text-gray-300 text-xs leading-relaxed">{{ preset.description }}</div>
        <div class="absolute -top-1 left-6 h-2 w-2 rotate-45 bg-gray-900/95" />
      </div>
    </button>
  </div>
</template>
