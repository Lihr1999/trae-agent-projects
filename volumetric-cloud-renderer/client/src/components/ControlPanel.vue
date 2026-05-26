<script setup lang="ts">
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useCloudStore } from '../stores/cloudStore';
import { PARAM_RANGES } from '../types';
import type { CloudRenderParams } from '../types';
import { ChevronDown, ChevronUp, Cloud, Sun, Wind, Settings } from 'lucide-vue-next';

const cloudStore = useCloudStore();
const { params, isTransitioning } = storeToRefs(cloudStore);

const expandedGroups = ref({
  cloud: true,
  lighting: true,
  animation: true,
  advanced: false
});

interface ParamGroup {
  name: string;
  key: 'cloud' | 'lighting' | 'animation' | 'advanced';
  icon: any;
  params: Array<keyof CloudRenderParams>;
}

const paramGroups: ParamGroup[] = [
  {
    name: '云层参数',
    key: 'cloud',
    icon: Cloud,
    params: ['cloudDensity', 'cloudThickness', 'cloudCoverage', 'cloudHeight']
  },
  {
    name: '光照参数',
    key: 'lighting',
    icon: Sun,
    params: ['lightIntensity', 'scatterCoeff', 'sunHeight', 'sunAzimuth']
  },
  {
    name: '动画参数',
    key: 'animation',
    icon: Wind,
    params: ['windSpeed', 'windDirection', 'particleSpeed']
  },
  {
    name: '高级参数',
    key: 'advanced',
    icon: Settings,
    params: ['sampleCount', 'noiseResolution', 'renderScale', 'noiseVisualization']
  }
];

function toggleGroup(key: string) {
  expandedGroups.value[key as keyof typeof expandedGroups.value] =
    !expandedGroups.value[key as keyof typeof expandedGroups.value];
}

function updateParam(key: keyof CloudRenderParams, event: Event, ripplePos?: { x: number; y: number }) {
  const target = event.target as HTMLInputElement;
  const value = PARAM_RANGES[key].step === 1 ? parseInt(target.value) : parseFloat(target.value);
  const boolValue = value === 1;

  if (PARAM_RANGES[key].min === 0 && PARAM_RANGES[key].max === 1 && PARAM_RANGES[key].step === 1) {
    cloudStore.updateParams({ [key]: boolValue } as Partial<CloudRenderParams>, ripplePos);
  } else {
    cloudStore.updateParams({ [key]: value } as Partial<CloudRenderParams>, ripplePos);
  }
}

function handleInput(event: Event, key: keyof CloudRenderParams) {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const parentRect = (event.target as HTMLElement).closest('.param-slider')?.getBoundingClientRect();
  if (parentRect) {
    updateParam(key, event, {
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top + rect.height / 2
    });
  } else {
    updateParam(key, event);
  }
}

const formatValue = (key: keyof CloudRenderParams, value: number | boolean) => {
  if (typeof value === 'boolean') {
    return value ? '开启' : '关闭';
  }
  if (PARAM_RANGES[key].step >= 1) {
    return Math.round(value).toString();
  }
  return value.toFixed(2);
};

const isCollapsed = ref(false);

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <div class="control-panel" :class="{ collapsed: isCollapsed }">
    <div class="panel-header" @click="toggleCollapse">
      <h2 class="panel-title">参数控制</h2>
      <component :is="isCollapsed ? ChevronDown : ChevronUp" class="collapse-icon" />
    </div>

    <div v-show="!isCollapsed" class="panel-content">
      <div
        v-for="group in paramGroups"
        :key="group.key"
        class="param-group"
      >
        <div class="group-header" @click="toggleGroup(group.key)">
          <div class="group-title">
            <component :is="group.icon" class="group-icon" />
            <span>{{ group.name }}</span>
          </div>
          <component :is="expandedGroups[group.key] ? ChevronUp : ChevronDown" class="chevron-icon" />
        </div>

        <div v-show="expandedGroups[group.key]" class="group-content">
          <div
            v-for="paramKey in group.params"
            :key="paramKey"
            class="param-slider"
          >
            <div class="param-label">
              <span>{{ PARAM_RANGES[paramKey].label }}</span>
              <span class="param-value">
                {{ formatValue(paramKey, params[paramKey]) }}
              </span>
            </div>
            <div v-if="PARAM_RANGES[paramKey].step === 1 && PARAM_RANGES[paramKey].min === 0 && PARAM_RANGES[paramKey].max === 1" class="param-toggle">
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="Boolean(params[paramKey])"
                  @change="handleInput($event, paramKey)"
                  :disabled="isTransitioning"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <input
              v-else
              type="range"
              :min="PARAM_RANGES[paramKey].min"
              :max="PARAM_RANGES[paramKey].max"
              :step="PARAM_RANGES[paramKey].step"
              :value="params[paramKey]"
              @input="handleInput($event, paramKey)"
              :disabled="isTransitioning"
              class="slider"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 380px;
  max-height: calc(100vh - 40px);
  background: rgba(15, 20, 45, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(123, 44, 191, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  transition: all 0.3s ease;
  z-index: 100;

  &.collapsed {
    width: 200px;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid rgba(123, 44, 191, 0.2);
  background: linear-gradient(135deg, rgba(123, 44, 191, 0.2) 0%, transparent 100%);

  &:hover {
    background: linear-gradient(135deg, rgba(123, 44, 191, 0.3) 0%, transparent 100%);
  }
}

.panel-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #f0f4ff;
  margin: 0;
  letter-spacing: 1px;
}

.collapse-icon {
  width: 20px;
  height: 20px;
  color: #7b2cbf;
}

.panel-content {
  padding: 8px;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(123, 44, 191, 0.5);
  border-radius: 3px;

  &:hover {
    background: rgba(123, 44, 191, 0.7);
  }
}

.param-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(123, 44, 191, 0.15);
  }
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #c0c8e0;
  font-weight: 500;
  font-size: 14px;
}

.group-icon {
  width: 18px;
  height: 18px;
  color: #7b2cbf;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: #6b7280;
  transition: transform 0.2s ease;
}

.group-content {
  padding: 0 16px 8px;
}

.param-slider {
  position: relative;
  padding: 12px 0;
  border-bottom: 1px solid rgba(123, 44, 191, 0.1);

  &:last-child {
    border-bottom: none;
  }
}

.param-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #a0a8c0;
}

.param-value {
  font-family: 'Rajdhani', monospace;
  font-weight: 600;
  color: #7b2cbf;
  font-size: 14px;
  min-width: 48px;
  text-align: right;
}

.slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, rgba(123, 44, 191, 0.3), rgba(74, 144, 217, 0.3));
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: background 0.2s ease;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7b2cbf, #4a90d9);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(123, 44, 191, 0.5);
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: scale(1.2);
      box-shadow: 0 0 15px rgba(123, 44, 191, 0.8);
    }
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7b2cbf, #4a90d9);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 10px rgba(123, 44, 191, 0.5);
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: scale(1.2);
      box-shadow: 0 0 15px rgba(123, 44, 191, 0.8);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.param-toggle {
  display: flex;
  justify-content: flex-end;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(107, 114, 128, 0.5);
    transition: 0.3s;
    border-radius: 24px;

    &:before {
      position: absolute;
      content: '';
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: #c0c8e0;
      transition: 0.3s;
      border-radius: 50%;
    }
  }

  input:checked + .toggle-slider {
    background: linear-gradient(135deg, #7b2cbf, #4a90d9);
    box-shadow: 0 0 10px rgba(123, 44, 191, 0.5);

    &:before {
      transform: translateX(24px);
      background-color: #ffffff;
    }
  }
}
</style>
