<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useCloudStore } from '../stores/cloudStore';
import { presetApi } from '../api';
import { Cloud, CloudLightning, Sunrise, Activity } from 'lucide-vue-next';

const cloudStore = useCloudStore();
const { presets, currentPresetId, isTransitioning } = storeToRefs(cloudStore);

const iconMap: Record<string, any> = {
  'static': Cloud,
  'dynamic': CloudLightning,
  'lighting': Sunrise,
  'stress': Activity
};

onMounted(async () => {
  try {
    const data = await presetApi.list();
    cloudStore.setPresets(data);
  } catch (error) {
    console.error('Failed to load presets:', error);
  }
});

async function loadPreset(preset: any) {
  if (isTransitioning.value) return;
  await cloudStore.loadPreset(preset);
}
</script>

<template>
  <div class="preset-buttons">
    <button
      v-for="preset in presets"
      :key="preset.id"
      class="preset-btn"
      :class="{ active: currentPresetId === preset.id, transitioning: isTransitioning }"
      :disabled="isTransitioning"
      @click="loadPreset(preset)"
    >
      <div class="btn-icon">
        <component :is="iconMap[preset.category]" class="icon" />
      </div>
      <div class="btn-content">
        <span class="btn-title">{{ preset.name }}</span>
        <span class="btn-desc">{{ preset.description }}</span>
      </div>
      <div v-if="currentPresetId === preset.id" class="active-indicator"></div>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.preset-buttons {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 100;
}

.preset-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(15, 20, 45, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(123, 44, 191, 0.3);
  border-radius: 12px;
  color: #c0c8e0;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 180px;
  text-align: left;
  overflow: hidden;

  &:hover:not(:disabled) {
    background: rgba(123, 44, 191, 0.2);
    border-color: rgba(123, 44, 191, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 44, 191, 0.3);
  }

  &.active {
    background: rgba(123, 44, 191, 0.3);
    border-color: #7b2cbf;
    box-shadow: 0 0 20px rgba(123, 44, 191, 0.4);
  }

  &.transitioning {
    opacity: 0.7;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.btn-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(123, 44, 191, 0.3), rgba(74, 144, 217, 0.3));
  border-radius: 8px;
  flex-shrink: 0;
}

.icon {
  width: 24px;
  height: 24px;
  color: #7b2cbf;
}

.btn-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.btn-title {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #f0f4ff;
  white-space: nowrap;
}

.btn-desc {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.active-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #7b2cbf, #4a90d9);
  animation: indicator-pulse 2s ease-in-out infinite;
}

@keyframes indicator-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>
