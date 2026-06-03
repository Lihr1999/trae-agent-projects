<template>
  <div class="status-bar">
    <div class="bar-left">
      <div class="drill-status" :class="{ running: isRunning }">
        <span class="status-dot" />
        <span class="status-text">{{ isRunning ? '演习进行中' : '演习已停止' }}</span>
      </div>
      <div v-if="isRunning" class="timer">
        <el-icon><Timer /></el-icon>
        <span>{{ formattedElapsed }}</span>
      </div>
    </div>

    <div class="bar-center">
      <span class="drill-name">{{ drillName }}</span>
    </div>

    <div class="bar-right">
      <div class="fps-counter">
        <span class="fps-label">FPS</span>
        <span class="fps-value" :class="fpsClass">{{ fps }}</span>
      </div>
      <el-radio-group v-model="viewMode" size="small" @change="emit('toggle-view', viewMode)">
        <el-radio-button value="first-person">第一人称</el-radio-button>
        <el-radio-button value="third-person">第三人称</el-radio-button>
        <el-radio-button value="overview">俯瞰</el-radio-button>
      </el-radio-group>
      <div class="drill-controls">
        <el-button
          v-if="!isRunning"
          type="success"
          size="small"
          :icon="VideoPlay"
          @click="emit('start-drill')"
        >
          开始
        </el-button>
        <el-button
          v-if="isRunning"
          type="danger"
          size="small"
          :icon="VideoPause"
          @click="emit('stop-drill')"
        >
          停止
        </el-button>
        <el-button
          size="small"
          :icon="RefreshRight"
          @click="emit('reset-drill')"
        >
          重置
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Timer, VideoPlay, VideoPause, RefreshRight } from '@element-plus/icons-vue'

const props = defineProps<{
  isRunning: boolean
  fps: number
  drillName: string
}>()

const emit = defineEmits<{
  'start-drill': []
  'stop-drill': []
  'reset-drill': []
  'toggle-view': [mode: string]
}>()

const viewMode = ref('overview')
const elapsedSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const formattedElapsed = computed(() => {
  const h = Math.floor(elapsedSeconds.value / 3600)
  const m = Math.floor((elapsedSeconds.value % 3600) / 60)
  const s = elapsedSeconds.value % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const fpsClass = computed(() => {
  if (props.fps >= 50) return 'fps-good'
  if (props.fps >= 30) return 'fps-medium'
  return 'fps-bad'
})

watch(
  () => props.isRunning,
  (running) => {
    if (running) {
      timer = setInterval(() => {
        elapsedSeconds.value++
      }, 1000)
    } else {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
  }
)

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.drill-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.drill-status.running .status-dot {
  background: var(--safe-green-light);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

.status-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.timer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--warning-orange-light);
  font-family: monospace;
}

.bar-center {
  flex: 1;
  text-align: center;
}

.drill-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.fps-counter {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fps-label {
  font-size: 11px;
  color: var(--text-muted);
}

.fps-value {
  font-size: 13px;
  font-weight: 600;
  font-family: monospace;
}

.fps-good {
  color: var(--safe-green-light);
}

.fps-medium {
  color: var(--warning-orange-light);
}

.fps-bad {
  color: var(--fire-red);
}

.drill-controls {
  display: flex;
  gap: 4px;
}
</style>
