<template>
  <div class="vehicle-status-card" :class="statusClass">
    <div class="card-header">
      <span class="vehicle-emoji">{{ vehicleEmoji }}</span>
      <div class="vehicle-identity">
        <span class="vehicle-number">{{ vehicle.vehicle_number }}</span>
        <el-tag size="small" :type="statusTagType">{{ statusLabel }}</el-tag>
      </div>
    </div>
    <div class="card-body">
      <div class="info-row">
        <span class="info-label">位置</span>
        <span class="info-value">({{ vehicle.position_x }}, {{ vehicle.position_y }}, {{ vehicle.position_z }})</span>
      </div>
      <div class="info-row">
        <span class="info-label">速度</span>
        <span class="info-value">{{ vehicle.max_speed }} km/h</span>
      </div>
      <div class="info-row">
        <span class="info-label">容量</span>
        <span class="info-value">{{ vehicle.capacity }}</span>
      </div>
    </div>
    <div class="card-actions">
      <el-button v-if="vehicle.status === 'idle'" type="primary" size="small" @click="emit('dispatch', vehicle)">
        调度
      </el-button>
      <el-button v-if="vehicle.status === 'dispatched' || vehicle.status === 'en_route'" type="danger" size="small" @click="emit('cancel', vehicle)">
        取消
      </el-button>
      <el-button v-if="vehicle.status === 'on_site'" type="success" size="small" @click="emit('return', vehicle)">
        返程
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RescueVehicle } from '@/types'

const props = defineProps<{
  vehicle: RescueVehicle
}>()

const emit = defineEmits<{
  dispatch: [vehicle: RescueVehicle]
  cancel: [vehicle: RescueVehicle]
  return: [vehicle: RescueVehicle]
}>()

const vehicleEmoji = computed(() => {
  const map: Record<string, string> = { fire_truck: '🚒', ambulance: '🚑', command_car: '🚔' }
  return map[props.vehicle.vehicle_type] || '🚗'
})

const statusTagType = computed(() => {
  const map: Record<string, string> = { idle: 'success', dispatched: 'warning', en_route: 'primary', on_site: 'danger', returning: 'info' }
  return map[props.vehicle.status] || 'info'
})

const statusLabel = computed(() => {
  const map: Record<string, string> = { idle: '待命', dispatched: '已调度', en_route: '途中', on_site: '现场', returning: '返程' }
  return map[props.vehicle.status] || props.vehicle.status
})

const statusClass = computed(() => `status-${props.vehicle.status}`)
</script>

<style scoped>
.vehicle-status-card {
  background: var(--bg-card);
  border-radius: 6px;
  padding: 10px;
  border-left: 3px solid var(--border-color);
  transition: all 0.2s;
}

.vehicle-status-card:hover {
  background: var(--bg-hover);
}

.status-idle {
  border-left-color: var(--safe-green-light);
}

.status-dispatched {
  border-left-color: var(--warning-orange);
}

.status-en_route {
  border-left-color: var(--info-blue);
}

.status-on_site {
  border-left-color: var(--fire-red);
}

.status-returning {
  border-left-color: var(--text-muted);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vehicle-emoji {
  font-size: 22px;
  line-height: 1;
}

.vehicle-identity {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.vehicle-number {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.info-value {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
}

.card-actions {
  margin-top: 8px;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}
</style>
