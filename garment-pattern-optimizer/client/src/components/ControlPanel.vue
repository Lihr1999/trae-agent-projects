<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePatternStore } from '../stores/patternStore';
import { getPolygonArea } from '../utils/geometry';

const patternStore = usePatternStore();

type TabId = 'polygon' | 'fabric' | 'nesting';

interface TabConfig {
  id: TabId;
  name: string;
  icon: string;
}

const activeTab = ref<TabId>('polygon');
const isSaving = ref(false);

const tabs: TabConfig[] = [
  { id: 'polygon', name: '多边形属性', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { id: 'fabric', name: '面料设置', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { id: 'nesting', name: '排料控制', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' }
];

const rotationStepOptions = [
  { value: Math.PI / 2, label: '90°' },
  { value: Math.PI / 4, label: '45°' },
  { value: Math.PI / 6, label: '30°' },
  { value: Math.PI / 12, label: '15°' },
  { value: 0, label: '0° (不旋转)' }
];

const selectedPolygon = computed(() => patternStore.selectedPolygon);

const polygonArea = computed(() => {
  if (!selectedPolygon.value) return 0;
  return Math.abs(getPolygonArea(selectedPolygon.value.points));
});

function updatePolygonName(name: string) {
  if (selectedPolygon.value) {
    patternStore.updatePolygon(selectedPolygon.value.id, { name });
  }
}

function updatePolygonColor(color: string) {
  if (selectedPolygon.value) {
    patternStore.updatePolygon(selectedPolygon.value.id, { color });
  }
}

function updateGrainAngle(angle: number) {
  if (selectedPolygon.value) {
    patternStore.updatePolygon(selectedPolygon.value.id, { grainAngle: angle });
  }
}

function updateQuantity(quantity: number) {
  if (selectedPolygon.value) {
    patternStore.updatePolygon(selectedPolygon.value.id, { quantity: Math.max(1, quantity) });
  }
}

async function handleSaveProject() {
  isSaving.value = true;
  try {
    await patternStore.saveProject();
  } catch (error) {
    console.error('Failed to save project:', error);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 overflow-hidden">
    <div class="flex border-b border-gray-200">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 px-3 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5"
        :class="[
          activeTab === tab.id
            ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        ]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path :d="tab.icon" />
        </svg>
        <span>{{ tab.name }}</span>
      </button>
    </div>

    <div class="p-4 max-h-[500px] overflow-y-auto">
      <div v-show="activeTab === 'polygon'" class="space-y-4">
        <template v-if="selectedPolygon">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input
              type="text"
              :value="selectedPolygon.name"
              @input="updatePolygonName(($event.target as HTMLInputElement).value)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              placeholder="输入多边形名称"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">颜色</label>
            <div class="flex items-center gap-3">
              <input
                type="color"
                :value="selectedPolygon.color"
                @input="updatePolygonColor(($event.target as HTMLInputElement).value)"
                class="w-12 h-10 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-primary-400 transition-colors"
              />
              <span class="text-sm text-gray-500 font-mono">{{ selectedPolygon.color }}</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              丝绺角度: {{ (selectedPolygon.grainAngle * 180 / Math.PI).toFixed(0) }}°
            </label>
            <input
              type="range"
              :value="selectedPolygon.grainAngle"
              @input="updateGrainAngle(parseFloat(($event.target as HTMLInputElement).value))"
              min="-3.14159"
              max="3.14159"
              step="0.01745"
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>-180°</span>
              <span>0°</span>
              <span>180°</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">数量</label>
            <input
              type="number"
              :value="selectedPolygon.quantity"
              @input="updateQuantity(parseInt(($event.target as HTMLInputElement).value) || 1)"
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">面积</label>
            <div class="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span class="text-lg font-semibold text-gray-800">{{ polygonArea.toFixed(2) }}</span>
              <span class="text-sm text-gray-500 ml-1">cm²</span>
            </div>
          </div>
        </template>
        <div v-else class="text-center py-8 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p class="text-sm">请选择一个多边形以编辑其属性</p>
        </div>
      </div>

      <div v-show="activeTab === 'fabric'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">面料宽度 (cm)</label>
          <input
            type="number"
            v-model.number="patternStore.fabricWidth"
            min="10"
            step="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">面料高度 (cm)</label>
          <input
            type="number"
            v-model.number="patternStore.fabricHeight"
            min="10"
            step="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            间隙 (cm)
            <span class="text-gray-400 font-normal ml-1">裁片间距</span>
          </label>
          <input
            type="number"
            v-model.number="patternStore.gap"
            min="0"
            step="0.1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
          />
        </div>

        <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="text-sm text-gray-600">
            <div class="flex justify-between mb-1">
              <span>面料面积:</span>
              <span class="font-medium">{{ (patternStore.fabricWidth * patternStore.fabricHeight).toFixed(0) }} cm²</span>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'nesting'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">旋转步长</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in rotationStepOptions"
              :key="option.value"
              @click="patternStore.rotationStep = option.value"
              class="px-3 py-2 text-sm rounded-lg border transition-all duration-200"
              :class="[
                patternStore.rotationStep === option.value
                  ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
              ]"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">排料进度</label>
          <div class="relative h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300 ease-out rounded-full"
              :style="{ width: `${patternStore.computeProgress}%` }"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xs font-semibold text-gray-700">{{ patternStore.computeProgress.toFixed(0) }}%</span>
            </div>
          </div>
        </div>

        <button
          @click="patternStore.computeNesting()"
          :disabled="patternStore.isComputing || patternStore.polygons.length === 0"
          class="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-primary-600 hover:to-primary-700 active:scale-98 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg
            v-if="patternStore.isComputing"
            class="w-5 h-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ patternStore.isComputing ? '排料计算中...' : '开始排料' }}</span>
        </button>

        <div v-if="patternStore.polygons.length === 0" class="text-center text-sm text-amber-600 py-2">
          请先添加多边形裁片
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-gray-200 bg-gray-50">
      <button
        @click="handleSaveProject"
        :disabled="!patternStore.currentProject || isSaving"
        class="w-full py-2.5 px-4 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-medium rounded-lg shadow hover:shadow-lg hover:from-accent-600 hover:to-accent-700 active:scale-98 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <svg
          v-if="isSaving"
          class="w-4 h-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        <span>{{ isSaving ? '保存中...' : '保存项目' }}</span>
      </button>
    </div>
  </div>
</template>
