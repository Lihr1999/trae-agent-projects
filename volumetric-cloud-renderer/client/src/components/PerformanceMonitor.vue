<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useCloudStore } from '../stores/cloudStore';
import { Activity, Cpu, HardDrive, Clock } from 'lucide-vue-next';

const cloudStore = useCloudStore();
const { performanceMetrics, isLowPerformance, isCriticalPerformance, computeShaderSupported } = storeToRefs(cloudStore);

const fpsColor = computed(() => {
  if (isCriticalPerformance.value) return '#ef4444';
  if (isLowPerformance.value) return '#f59e0b';
  return '#10b981';
});

const formatMemory = (mb: number) => {
  if (mb < 1024) return mb.toFixed(1) + ' MB';
  return (mb / 1024).toFixed(2) + ' GB';
};
</script>

<template>
  <div class="performance-monitor">
    <div class="monitor-header">
      <Activity class="monitor-icon" />
      <span>性能监控</span>
    </div>
    <div class="monitor-content">
      <div class="metric-row">
        <div class="metric-icon">
          <Clock :size="14" />
        </div>
        <div class="metric-info">
          <span class="metric-label">FPS</span>
          <span class="metric-value" :style="{ color: fpsColor }">
            {{ Math.round(performanceMetrics.fps) }}
          </span>
        </div>
      </div>
      <div class="metric-row">
        <div class="metric-icon">
          <Cpu :size="14" />
        </div>
        <div class="metric-info">
          <span class="metric-label">帧耗时</span>
          <span class="metric-value">{{ performanceMetrics.frameTime.toFixed(1) }} ms</span>
        </div>
      </div>
      <div class="metric-row">
        <div class="metric-icon">
          <HardDrive :size="14" />
        </div>
        <div class="metric-info">
          <span class="metric-label">显存使用</span>
          <span class="metric-value">{{ formatMemory(performanceMetrics.memoryUsage) }}</span>
        </div>
      </div>
      <div v-if="!computeShaderSupported" class="fallback-warning">
        已降级至渲染管线模式
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.performance-monitor {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(15, 20, 45, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(74, 144, 217, 0.3);
  padding: 16px;
  min-width: 180px;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.monitor-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(74, 144, 217, 0.2);
  color: #4a90d9;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 1px;
}

.monitor-icon {
  width: 18px;
  height: 18px;
}

.monitor-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 144, 217, 0.2);
  border-radius: 6px;
  color: #4a90d9;
}

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-family: 'Rajdhani', monospace;
  font-weight: 700;
  font-size: 18px;
  color: #f0f4ff;
  line-height: 1.2;
  transition: color 0.3s ease;
}

.fallback-warning {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 6px;
  font-size: 11px;
  color: #f59e0b;
  text-align: center;
}
</style>
