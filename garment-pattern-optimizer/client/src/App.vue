<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { usePatternStore } from './stores/patternStore';
import PresetButtons from './components/PresetButtons.vue';
import Toolbar from './components/Toolbar.vue';
import PatternCanvas from './components/PatternCanvas.vue';
import ControlPanel from './components/ControlPanel.vue';
import UtilizationGauge from './components/UtilizationGauge.vue';
import WarningPanel from './components/WarningPanel.vue';

const store = usePatternStore();
const isInitializing = ref(true);

onMounted(async () => {
  try {
    await store.createNewProject();
  } catch (error) {
    console.error('Failed to initialize project:', error);
  } finally {
    isInitializing.value = false;
  }
});
</script>

<template>
  <div class="w-full h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div 
      v-if="isInitializing" 
      class="fixed inset-0 flex items-center justify-center bg-slate-900 z-50"
    >
      <div class="text-center">
        <div class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white text-lg">正在初始化...</p>
      </div>
    </div>
    
    <header class="h-16 flex items-center justify-between px-6 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 shadow-lg z-10">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-white tracking-tight">服装排料优化器</h1>
          <p class="text-xs text-slate-400">Garment Pattern Optimizer</p>
        </div>
      </div>
      
      <PresetButtons />
      
      <div class="flex items-center gap-3">
        <button 
          @click="store.saveProject()" 
          class="btn-secondary flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          保存
        </button>
        <button 
          @click="store.computeNesting()" 
          :disabled="store.isComputing || store.polygons.length === 0"
          class="btn-success flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="!store.isComputing" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ store.isComputing ? '计算中...' : '开始排料' }}
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <aside class="w-20 flex flex-col items-center py-4 bg-slate-800/60 backdrop-blur-sm border-r border-slate-700/50 gap-2">
        <Toolbar />
      </aside>

      <main class="flex-1 relative overflow-hidden">
        <PatternCanvas />
      </main>

      <aside class="w-80 flex flex-col bg-slate-800/60 backdrop-blur-sm border-l border-slate-700/50 overflow-hidden">
        <ControlPanel />
      </aside>
    </div>

    <footer class="h-20 flex items-center gap-6 px-6 bg-slate-800/80 backdrop-blur-md border-t border-slate-700/50">
      <div class="flex items-center gap-4">
        <UtilizationGauge />
        <div class="flex flex-col">
          <span class="text-sm text-slate-400">面料利用率</span>
          <span 
            class="text-2xl font-bold"
            :style="{ color: store.utilizationColor }"
          >
            {{ store.utilization.toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="flex-1 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-400">
            {{ store.isComputing ? '排料计算进度' : '计算状态' }}
          </span>
          <span class="text-sm font-medium text-slate-300">
            {{ store.isComputing ? `${store.computeProgress}%` : '就绪' }}
          </span>
        </div>
        <div class="nesting-progress">
          <div 
            class="nesting-progress-bar"
            :style="{ width: `${store.computeProgress}%` }"
          ></div>
        </div>
        <div v-if="store.markerResult" class="flex gap-6 text-xs text-slate-400">
          <span>总面料面积: {{ store.markerResult.totalArea.toFixed(1) }} cm²</span>
          <span>已用面积: {{ store.markerResult.usedArea.toFixed(1) }} cm²</span>
          <span>计算耗时: {{ store.markerResult.computationTime.toFixed(2) }}s</span>
        </div>
      </div>

      <div class="w-80">
        <WarningPanel />
      </div>
    </footer>
  </div>
</template>
