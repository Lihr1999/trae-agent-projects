<template>
  <div ref="containerRef" class="orrery-scene"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSimulationStore } from '../stores/simulationStore'
import { SceneRenderer } from '../utils/SceneRenderer'
import { simulateStep, vec3 } from '../utils/physicsEngine'
import { storeToRefs } from 'pinia'

const containerRef = ref<HTMLElement | null>(null)
let renderer: SceneRenderer | null = null
let lastFrameTime = 0
let animationFrameId: number | null = null

const store = useSimulationStore()
const { bodies, config, isRunning, simulationTime, showTrails, showPotentialField, showLabels } = storeToRefs(store)

function updatePhysics() {
  if (!isRunning.value || bodies.value.length < 2) return

  const result = simulateStep(bodies.value, config.value, simulationTime.value)

  store.$patch({
    bodies: result.bodies.map(b => ({
      ...b,
      trail: [
        ...(store.bodies.find(ob => ob.id === b.id)?.trail || []),
        { ...b.position }
      ].slice(-store.trailLength)
    })),
    simulationTime: result.newTime
  })

  if (result.events.length > 0) {
    result.events.forEach(e => store.addEvent(e))
    renderer?.handleEvents(result.events)
  }
}

function render() {
  if (!renderer) return

  bodies.value.forEach(body => {
    renderer!.updateBody(body, showLabels.value)
  })

  if (showPotentialField.value && bodies.value.length > 0) {
    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    bodies.value.forEach(b => {
      minX = Math.min(minX, b.position.x)
      maxX = Math.max(maxX, b.position.x)
      minZ = Math.min(minZ, b.position.z)
      maxZ = Math.max(maxZ, b.position.z)
    })
    const padding = Math.max((maxX - minX) * 0.3, 10)
    renderer.updatePotentialField(bodies.value, config.value, {
      min: { x: minX - padding, y: 0, z: minZ - padding },
      max: { x: maxX + padding, y: 0, z: maxZ + padding }
    })
  } else {
    renderer.hidePotentialField()
  }
}

function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastFrameTime
  lastFrameTime = timestamp

  if (deltaTime > 0 && deltaTime < 100) {
    const steps = Math.min(10, Math.ceil(deltaTime / 16))
    for (let i = 0; i < steps; i++) {
      updatePhysics()
    }
  }

  render()

  animationFrameId = requestAnimationFrame(gameLoop)
}

onMounted(() => {
  if (containerRef.value) {
    renderer = new SceneRenderer(containerRef.value)
    renderer.start()
    renderer.setOnFrameCallback(() => {})

    lastFrameTime = performance.now()
    animationFrameId = requestAnimationFrame(gameLoop)
  }
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  renderer?.dispose()
})

watch(bodies, (newBodies, oldBodies) => {
  if (!renderer) return

  const oldIds = new Set(oldBodies?.map(b => b.id) || [])
  const newIds = new Set(newBodies.map(b => b.id))

  oldIds.forEach(id => {
    if (!newIds.has(id)) {
      renderer!.removeBody(id)
    }
  })

  newBodies.forEach(body => {
    if (!oldIds.has(body.id)) {
      renderer!.addBody(body)
    }
  })
}, { deep: true })

function focusOnBody(bodyId: string) {
  const body = bodies.value.find(b => b.id === bodyId)
  if (body && renderer) {
    renderer.focusOnBody(body.position)
  }
}

function resetCamera() {
  renderer?.resetCamera()
}

defineExpose({
  focusOnBody,
  resetCamera
})
</script>

<style scoped>
.orrery-scene {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
