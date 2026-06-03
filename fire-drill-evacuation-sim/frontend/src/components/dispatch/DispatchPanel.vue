<template>
  <div class="dispatch-panel">
    <div class="panel-header">
      <h3 class="panel-title">资源调度</h3>
      <el-button type="primary" size="small" @click="handleAutoDispatch">自动调度</el-button>
    </div>

    <div class="section">
      <h4 class="section-title">待命车辆</h4>
      <div class="vehicle-grid">
        <VehicleStatusCard
          v-for="vehicle in availableVehicles"
          :key="vehicle.id"
          :vehicle="vehicle"
          @dispatch="handleDispatch"
          @cancel="() => {}"
          @return="() => {}"
        />
        <el-empty v-if="availableVehicles.length === 0" description="暂无待命车辆" :image-size="40" />
      </div>
    </div>

    <div class="section">
      <h4 class="section-title">已调度车辆</h4>
      <div class="vehicle-grid">
        <VehicleStatusCard
          v-for="vehicle in dispatchedVehicles"
          :key="vehicle.id"
          :vehicle="vehicle"
          @dispatch="handleDispatch"
          @cancel="handleCancel"
          @return="() => {}"
        />
        <el-empty v-if="dispatchedVehicles.length === 0" description="暂无调度任务" :image-size="40" />
      </div>
    </div>

    <div v-if="selectedVehicleForDispatch" class="section">
      <h4 class="section-title">手动调度 - {{ selectedVehicleForDispatch.vehicle_number }}</h4>
      <el-form :model="dispatchForm" label-width="80px" size="small">
        <el-form-item label="任务类型">
          <el-select v-model="dispatchForm.task_type" placeholder="选择任务类型">
            <el-option label="灭火" value="fire_suppression" />
            <el-option label="救援" value="rescue" />
            <el-option label="疏散辅助" value="evacuation_assist" />
            <el-option label="物资运输" value="supply" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标 X">
          <el-input-number v-model="dispatchForm.target_x" :step="1" />
        </el-form-item>
        <el-form-item label="目标 Y">
          <el-input-number v-model="dispatchForm.target_y" :step="1" />
        </el-form-item>
        <el-form-item label="目标 Z">
          <el-input-number v-model="dispatchForm.target_z" :step="1" />
        </el-form-item>
      </el-form>
      <div class="dispatch-confirm">
        <el-button type="primary" size="small" @click="confirmDispatch">确认调度</el-button>
        <el-button size="small" @click="selectedVehicleForDispatch = null">取消</el-button>
      </div>
    </div>

    <div v-if="tasks.length > 0" class="section">
      <h4 class="section-title">任务列表</h4>
      <div class="task-list">
        <div v-for="task in tasks" :key="task.id" class="task-item">
          <div class="task-main">
            <el-tag size="small" :type="taskStatusType(task.status)">{{ taskStatusLabel(task.status) }}</el-tag>
            <span class="task-type">{{ taskTypeLabel(task.task_type) }}</span>
            <span class="task-target">目标 ({{ task.target_x }}, {{ task.target_y }}, {{ task.target_z }})</span>
          </div>
          <el-button
            v-if="task.status === 'pending' || task.status === 'in_progress'"
            size="small"
            type="danger"
            @click="emit('cancel-task', task.id)"
          >
            取消
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { RescueVehicle, DispatchTask } from '@/types'
import VehicleStatusCard from './VehicleStatusCard.vue'

const props = defineProps<{
  vehicles: RescueVehicle[]
  tasks: DispatchTask[]
}>()

const emit = defineEmits<{
  dispatch: [params: { vehicleId: number; target: { target_x: number; target_y: number; target_z: number; task_type: string } }]
  'auto-dispatch': []
  'cancel-task': [taskId: number]
}>()

const selectedVehicleForDispatch = ref<RescueVehicle | null>(null)
const dispatchForm = reactive({
  task_type: 'fire_suppression' as string,
  target_x: 0,
  target_y: 0,
  target_z: 0
})

const availableVehicles = computed(() => props.vehicles.filter((v) => v.status === 'idle'))
const dispatchedVehicles = computed(() => props.vehicles.filter((v) => v.status !== 'idle'))

const handleDispatch = (vehicle: RescueVehicle) => {
  selectedVehicleForDispatch.value = vehicle
}

const confirmDispatch = () => {
  if (!selectedVehicleForDispatch.value) return
  emit('dispatch', {
    vehicleId: selectedVehicleForDispatch.value.id,
    target: { ...dispatchForm }
  })
  selectedVehicleForDispatch.value = null
  dispatchForm.task_type = 'fire_suppression'
  dispatchForm.target_x = 0
  dispatchForm.target_y = 0
  dispatchForm.target_z = 0
}

const handleAutoDispatch = () => {
  emit('auto-dispatch')
}

const handleCancel = (vehicle: RescueVehicle) => {
  const task = props.tasks.find((t) => t.vehicle_id === vehicle.id && (t.status === 'pending' || t.status === 'in_progress'))
  if (task) {
    emit('cancel-task', task.id)
  }
}

const taskStatusType = (status: string) => {
  const map: Record<string, string> = { pending: 'info', in_progress: 'warning', completed: 'success', cancelled: 'danger' }
  return map[status] || 'info'
}

const taskStatusLabel = (status: string) => {
  const map: Record<string, string> = { pending: '待执行', in_progress: '执行中', completed: '已完成', cancelled: '已取消' }
  return map[status] || status
}

const taskTypeLabel = (type: string) => {
  const map: Record<string, string> = { fire_suppression: '灭火', rescue: '救援', evacuation_assist: '疏散辅助', supply: '物资运输' }
  return map[type] || type
}
</script>

<style scoped>
.dispatch-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--bg-secondary);
  padding: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.vehicle-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dispatch-confirm {
  display: flex;
  gap: 8px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--bg-card);
  border-radius: 6px;
}

.task-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.task-type {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.task-target {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
