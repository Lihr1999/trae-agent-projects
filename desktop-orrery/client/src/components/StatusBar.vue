<template>
  <div class="status-bar">
    <div class="status-item">
      <span class="status-label">模拟时间</span>
      <span class="status-value">{{ formatSimulationTime(simulationTime) }}</span>
    </div>
    <div class="status-item">
      <span class="status-label">星体数量</span>
      <span class="status-value">{{ bodyCount }}</span>
    </div>
    <div class="status-item">
      <span class="status-label">状态</span>
      <span class="status-value" :class="{ running: isRunning }">
        {{ isRunning ? '运行中' : '已暂停' }}
      </span>
    </div>
    <div class="status-item">
      <span class="status-label">事件</span>
      <span class="status-value event-count" :class="{ hasEvents: events.length > 0 }">
        {{ events.length }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSimulationStore } from '../stores/simulationStore'
import { storeToRefs } from 'pinia'

const store = useSimulationStore()
const { simulationTime, bodyCount, isRunning, events } = storeToRefs(store)

function formatSimulationTime(seconds: number): string {
  const totalDays = seconds / 86400

  if (totalDays >= 365.25 * 1e9) {
    return `${(totalDays / (365.25 * 1e9)).toFixed(2)} 十亿年`
  } else if (totalDays >= 365.25 * 1e6) {
    return `${(totalDays / (365.25 * 1e6)).toFixed(2)} 百万年`
  } else if (totalDays >= 365.25 * 1e3) {
    return `${(totalDays / (365.25 * 1e3)).toFixed(2)} 千年`
  } else if (totalDays >= 365.25) {
    return `${(totalDays / 365.25).toFixed(2)} 年`
  } else if (totalDays >= 1) {
    return `${totalDays.toFixed(1)} 天`
  } else if (seconds >= 3600) {
    return `${(seconds / 3600).toFixed(1)} 小时`
  } else if (seconds >= 60) {
    return `${(seconds / 60).toFixed(1)} 分钟`
  }
  return `${seconds.toFixed(1)} 秒`
}
</script>

<style scoped>
.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 36px;
  background: rgba(20, 20, 40, 0.95);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 32px;
  z-index: 100;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-value.running {
  color: var(--accent-success);
}

.status-value.event-count {
  min-width: 20px;
  text-align: center;
}

.status-value.event-count.hasEvents {
  color: var(--accent-warning);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
