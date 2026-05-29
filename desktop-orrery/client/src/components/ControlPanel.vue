<template>
  <div class="control-panel panel">
    <h3 class="panel-title">模拟控制</h3>

    <div class="control-group">
      <div class="playback-controls">
        <button class="btn" :class="{ 'btn-primary': !isRunning }" @click="toggleSimulation">
          {{ isRunning ? '⏸ 暂停' : '▶ 开始' }}
        </button>
        <button class="btn" @click="resetSimulation">
          ↺ 重置
        </button>
      </div>
    </div>

    <div class="input-group">
      <label>时间倍速: {{ formatTime(config.timeMultiplier) }}</label>
      <div class="slider-container">
        <input
          type="range"
          min="1"
          max="10000"
          step="1"
          :value="config.timeMultiplier"
          @input="updateTimeMultiplier(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="value-display">{{ config.timeMultiplier }}x</span>
      </div>
    </div>

    <div class="input-group">
      <label>轨迹长度: {{ trailLength }}</label>
      <div class="slider-container">
        <input
          type="range"
          min="10"
          max="2000"
          step="10"
          :value="trailLength"
          @input="trailLength = Number(($event.target as HTMLInputElement).value)"
        />
        <span class="value-display">{{ trailLength }}</span>
      </div>
    </div>

    <div class="checkbox-group">
      <input type="checkbox" id="showTrails" v-model="showTrails" />
      <label for="showTrails">显示轨迹线</label>
    </div>

    <div class="checkbox-group">
      <input type="checkbox" id="showPotential" v-model="showPotentialField" />
      <label for="showPotential">显示引力势场</label>
    </div>

    <div class="checkbox-group">
      <input type="checkbox" id="showLabels" v-model="showLabels" />
      <label for="showLabels">显示星体标签</label>
    </div>

    <h3 class="panel-title" style="margin-top: 20px;">物理参数</h3>

    <div class="checkbox-group">
      <input type="checkbox" id="adaptiveStep" v-model="config.adaptiveTimeStep" />
      <label for="adaptiveStep">自适应时间步长</label>
    </div>

    <div class="checkbox-group">
      <input type="checkbox" id="barnesHut" v-model="config.useBarnesHut" />
      <label for="barnesHut">Barnes-Hut 近似</label>
    </div>

    <div class="checkbox-group">
      <input type="checkbox" id="relativistic" v-model="config.useRelativisticCorrection" />
      <label for="relativistic">相对论修正</label>
    </div>

    <div class="checkbox-group">
      <input type="checkbox" id="collision" v-model="config.collisionDetection" />
      <label for="collision">碰撞检测</label>
    </div>

    <h3 class="panel-title" style="margin-top: 20px;">参考系</h3>

    <div class="input-group">
      <select v-model="config.referenceFrame" @change="updateReferenceFrame">
        <option :value="null">惯性系</option>
        <option v-for="body in bodies" :key="body.id" :value="body.id">
          {{ body.name }} 中心
        </option>
      </select>
    </div>

    <button class="btn" style="width: 100%; margin-top: 8px;" @click="focusOnReference">
      🎯 聚焦参考星体
    </button>
  </div>
</template>

<script setup lang="ts">
import { useSimulationStore } from '../stores/simulationStore'
import { storeToRefs } from 'pinia'

const emit = defineEmits<{
  focusBody: [bodyId: string | null]
}>()

const store = useSimulationStore()
const { bodies, config, isRunning, showTrails, showPotentialField, showLabels, trailLength } = storeToRefs(store)

function toggleSimulation() {
  store.isRunning = !store.isRunning
}

function resetSimulation() {
  store.isRunning = false
  store.simulationTime = 0
  store.clearTrails()
  store.clearEvents()
}

function updateTimeMultiplier(value: number) {
  store.updateConfig({ timeMultiplier: value })
}

function updateReferenceFrame(event: Event) {
  const target = event.target as HTMLSelectElement
  store.updateConfig({ referenceFrame: target.value || null })
  store.clearTrails()
}

function focusOnReference() {
  emit('focusBody', config.value.referenceFrame)
}

function formatTime(multiplier: number): string {
  const secondsPerSecond = 3600 * multiplier
  if (secondsPerSecond >= 86400 * 365) {
    return `${(secondsPerSecond / (86400 * 365)).toFixed(1)} 年/秒`
  } else if (secondsPerSecond >= 86400) {
    return `${(secondsPerSecond / 86400).toFixed(1)} 天/秒`
  } else if (secondsPerSecond >= 3600) {
    return `${(secondsPerSecond / 3600).toFixed(1)} 小时/秒`
  }
  return `${secondsPerSecond.toFixed(0)} 秒/秒`
}
</script>

<style scoped>
.control-panel {
  width: 260px;
}

.control-group {
  margin-bottom: 16px;
}

.playback-controls {
  display: flex;
  gap: 8px;
}

.playback-controls .btn {
  flex: 1;
}

select {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
