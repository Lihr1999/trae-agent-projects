<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">
        <span class="title-icon">🌌</span>
        桌面行星仪
        <span class="subtitle">Desktop Orrery & N-Body Simulator</span>
      </h1>
    </header>

    <div class="main-content">
      <aside class="left-panel">
        <PresetButtons />
        <BodyManager @focus-body="handleFocusBody" />
      </aside>

      <div class="scene-container">
        <OrreryScene ref="sceneRef" />
        <StatusBar />
      </div>

      <aside class="right-panel">
        <ControlPanel @focus-body="handleFocusBody" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import OrreryScene from './components/OrreryScene.vue'
import ControlPanel from './components/ControlPanel.vue'
import PresetButtons from './components/PresetButtons.vue'
import BodyManager from './components/BodyManager.vue'
import StatusBar from './components/StatusBar.vue'
import { useSimulationStore } from './stores/simulationStore'

const sceneRef = ref<InstanceType<typeof OrreryScene> | null>(null)
const store = useSimulationStore()

function handleFocusBody(bodyId: string | null) {
  if (bodyId && sceneRef.value) {
    sceneRef.value.focusOnBody(bodyId)
  }
}

onMounted(async () => {
  try {
    const response = await fetch('/api/presets/solar-system')
    if (response.ok) {
      const scene = await response.json()
      store.setBodies(scene.bodies)
      store.updateConfig(scene.config)
    }
  } catch (error) {
    console.log('Using offline mode')
  }
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.app-header {
  height: 48px;
  background: rgba(20, 20, 40, 0.95);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 100;
}

.app-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.title-icon {
  font-size: 20px;
}

.subtitle {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: 8px;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.left-panel {
  width: 280px;
  padding: 16px;
  overflow-y: auto;
  background: rgba(10, 10, 26, 0.9);
  border-right: 1px solid var(--border-color);
}

.right-panel {
  width: 280px;
  padding: 16px;
  overflow-y: auto;
  background: rgba(10, 10, 26, 0.9);
  border-left: 1px solid var(--border-color);
}

.scene-container {
  flex: 1;
  position: relative;
}
</style>
