<template>
  <div class="preset-buttons">
    <h3 class="panel-title">预设场景</h3>
    <div class="button-grid">
      <button
        v-for="preset in presets"
        :key="preset.id"
        class="btn preset-btn"
        :class="{ active: activePreset === preset.id }"
        @click="loadPreset(preset.id)"
        :title="preset.description"
      >
        <span class="btn-icon">{{ getPresetIcon(preset.id) }}</span>
        <span class="btn-text">{{ preset.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSimulationStore } from '../stores/simulationStore'

interface PresetInfo {
  id: string
  name: string
  description: string
}

const presets = ref<PresetInfo[]>([])
const activePreset = ref<string | null>(null)

const store = useSimulationStore()

async function fetchPresets() {
  try {
    const response = await fetch('/api/presets')
    presets.value = await response.json()
  } catch (error) {
    presets.value = [
      { id: 'solar-system', name: '经典日心说八大行星稳定轨道', description: '太阳系八大行星模拟' },
      { id: 'three-body-lagrange', name: '地月日三体系统拉格朗日点探测', description: '三体系统模拟' },
      { id: 'binary-slingshot', name: '双星系统引力弹弓加速变轨', description: '引力弹弓效应' },
      { id: 'chaotic-multi-body', name: '混沌多体系统星体碰撞与抛射', description: '混沌系统演示' }
    ]
  }
}

async function loadPreset(id: string) {
  try {
    const response = await fetch(`/api/presets/${id}`)
    const scene = await response.json()

    store.setBodies(scene.bodies)
    store.updateConfig(scene.config)
    store.clearTrails()
    store.clearEvents()
    store.simulationTime = 0

    activePreset.value = id
  } catch (error) {
    console.error('Failed to load preset:', error)
  }
}

function getPresetIcon(id: string): string {
  const icons: Record<string, string> = {
    'solar-system': '☀️',
    'three-body-lagrange': '🌍',
    'binary-slingshot': '⭐',
    'chaotic-multi-body': '💥'
  }
  return icons[id] || '🪐'
}

onMounted(() => {
  fetchPresets()
})
</script>

<style scoped>
.preset-buttons {
  margin-bottom: 16px;
}

.button-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  padding: 10px 12px;
  width: 100%;
}

.preset-btn.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-size: 11px;
  line-height: 1.3;
  flex: 1;
}
</style>
