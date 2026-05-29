<template>
  <div class="body-manager panel">
    <h3 class="panel-title">星体管理 ({{ bodies.length }})</h3>

    <div class="body-list">
      <div
        v-for="body in bodies"
        :key="body.id"
        class="body-item"
        :class="{ selected: selectedBody === body.id }"
        @click="selectBody(body.id)"
      >
        <div class="body-color" :style="{ backgroundColor: body.color }"></div>
        <div class="body-info">
          <div class="body-name">{{ body.name }}</div>
          <div class="body-mass">{{ formatMass(body.mass) }}</div>
        </div>
        <button class="btn btn-danger remove-btn" @click.stop="removeBody(body.id)">×</button>
      </div>
    </div>

    <div class="add-body-section">
      <button class="btn btn-success" style="width: 100%" @click="showAddModal = true">
        + 添加星体
      </button>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content panel">
        <h3 class="panel-title">添加新星体</h3>

        <div class="input-group">
          <label>名称</label>
          <input v-model="newBody.name" type="text" placeholder="星体名称" />
        </div>

        <div class="input-group">
          <label>质量 (kg)</label>
          <input v-model.number="newBody.mass" type="number" step="1e20" />
        </div>

        <div class="input-group">
          <label>半径</label>
          <input v-model.number="newBody.radius" type="number" step="0.01" />
        </div>

        <div class="input-group">
          <label>位置 X</label>
          <input v-model.number="newBody.position.x" type="number" step="1" />
        </div>

        <div class="input-group">
          <label>位置 Y</label>
          <input v-model.number="newBody.position.y" type="number" step="1" />
        </div>

        <div class="input-group">
          <label>位置 Z</label>
          <input v-model.number="newBody.position.z" type="number" step="1" />
        </div>

        <div class="input-group">
          <label>速度 X</label>
          <input v-model.number="newBody.velocity.x" type="number" step="0.001" />
        </div>

        <div class="input-group">
          <label>速度 Y</label>
          <input v-model.number="newBody.velocity.y" type="number" step="0.001" />
        </div>

        <div class="input-group">
          <label>速度 Z</label>
          <input v-model.number="newBody.velocity.z" type="number" step="0.001" />
        </div>

        <div class="modal-buttons">
          <button class="btn" @click="showAddModal = false">取消</button>
          <button class="btn btn-primary" @click="addNewBody">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useSimulationStore } from '../stores/simulationStore'
import { storeToRefs } from 'pinia'
import type { Vector3 } from '../types'

const emit = defineEmits<{
  focusBody: [bodyId: string]
}>()

const store = useSimulationStore()
const { bodies } = storeToRefs(store)

const selectedBody = ref<string | null>(null)
const showAddModal = ref(false)

const newBody = reactive({
  name: '新星体',
  mass: 5.972e24,
  radius: 0.1,
  position: { x: 10, y: 0, z: 0 } as Vector3,
  velocity: { x: 0, y: 0, z: 0 } as Vector3
})

function selectBody(id: string) {
  selectedBody.value = id
  emit('focusBody', id)
}

function removeBody(id: string) {
  store.removeBody(id)
  if (selectedBody.value === id) {
    selectedBody.value = null
  }
}

function addNewBody() {
  store.addBody({
    ...newBody,
    color: store.getBodyColor('', newBody.name)
  })
  showAddModal.value = false
  newBody.name = '新星体'
  newBody.mass = 5.972e24
  newBody.radius = 0.1
  newBody.position = { x: 10, y: 0, z: 0 }
  newBody.velocity = { x: 0, y: 0, z: 0 }
}

function formatMass(mass: number): string {
  if (mass >= 1e30) {
    return `${(mass / 1e30).toFixed(2)} × 10³⁰ kg`
  } else if (mass >= 1e24) {
    return `${(mass / 1e24).toFixed(2)} × 10²⁴ kg`
  } else if (mass >= 1e21) {
    return `${(mass / 1e21).toFixed(2)} × 10²¹ kg`
  }
  return mass.toExponential(2) + ' kg'
}
</script>

<style scoped>
.body-manager {
  width: 260px;
  max-height: 400px;
  overflow-y: auto;
}

.body-list {
  max-height: 250px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.body-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.body-item:hover {
  background: var(--bg-tertiary);
}

.body-item.selected {
  background: var(--accent-primary);
}

.body-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.body-info {
  flex: 1;
  min-width: 0;
}

.body-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.body-mass {
  font-size: 10px;
  color: var(--text-secondary);
}

.remove-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
}

.add-body-section {
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 320px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.modal-buttons .btn {
  flex: 1;
}
</style>
