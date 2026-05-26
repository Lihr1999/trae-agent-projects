<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useCloudStore } from '../stores/cloudStore';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-vue-next';

const cloudStore = useCloudStore();
const { systemStatus, statusMessage } = storeToRefs(cloudStore);

const statusConfig = computed(() => {
  switch (systemStatus.value) {
    case 'normal':
      return {
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 0.4)',
        icon: CheckCircle,
        text: '运行正常',
        pulse: false
      };
    case 'warning':
      return {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
        icon: AlertTriangle,
        text: '性能警告',
        pulse: true
      };
    case 'error':
      return {
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        icon: XCircle,
        text: '渲染异常',
        pulse: true
      };
    default:
      return {
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.2)',
        borderColor: 'rgba(107, 114, 128, 0.4)',
        icon: CheckCircle,
        text: '未知状态',
        pulse: false
      };
  }
});
</script>

<template>
  <div
    class="status-indicator"
    :style="{
      background: statusConfig.bgColor,
      borderColor: statusConfig.borderColor
    }"
  >
    <div
      class="status-dot"
      :class="{ pulsing: statusConfig.pulse }"
      :style="{ background: statusConfig.color }"
    ></div>
    <div class="status-info">
      <component :is="statusConfig.icon" class="status-icon" :style="{ color: statusConfig.color }" />
      <span class="status-text" :style="{ color: statusConfig.color }">
        {{ statusConfig.text }}
      </span>
    </div>
    <div v-if="statusMessage" class="status-message">
      {{ statusMessage }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.status-indicator {
  position: absolute;
  top: 20px;
  right: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid;
  z-index: 100;
  transition: all 0.3s ease;
  min-width: 120px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;

  &.pulsing {
    animation: pulse 2s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.status-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  width: 16px;
  height: 16px;
}

.status-text {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.5px;
}

.status-message {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  max-width: 150px;
  line-height: 1.3;
}
</style>
