<template>
  <el-dialog
    :model-value="visible"
    title="事件详情"
    width="520px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="event">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="时间戳">{{ formatTime(event.timestamp) }}</el-descriptions-item>
        <el-descriptions-item label="事件类型">
          <el-tag size="small" :color="eventTypeColor(event.event_type)" effect="dark" style="border: none;">
            {{ eventTypeLabel(event.event_type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述">
          <div class="desc-content">
            <span v-if="!isEditing">{{ event.description || '无描述' }}</span>
            <el-input v-else v-model="editDesc" type="textarea" :rows="3" placeholder="编辑事件描述" />
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="关联对象">
          {{ event.related_object_id != null ? `对象 #${event.related_object_id}` : '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作人">
          {{ event.operator_name || '系统' }}
        </el-descriptions-item>
      </el-descriptions>
    </template>
    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="!isEditing" type="primary" size="small" @click="startEdit">编辑</el-button>
        <template v-else>
          <el-button size="small" @click="cancelEdit">取消</el-button>
          <el-button type="primary" size="small" @click="saveEdit">保存</el-button>
        </template>
        <el-button size="small" @click="emit('update:modelValue', false)">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { EventLog } from '@/types'

const props = defineProps<{
  event: EventLog | null
  visible: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [visible: boolean]
  edit: [event: EventLog]
}>()

const isEditing = ref(false)
const editDesc = ref('')

watch(
  () => props.visible,
  (val) => {
    if (val) {
      isEditing.value = false
      editDesc.value = props.event?.description || ''
    }
  }
)

const eventTypeColor = (type: string) => {
  const map: Record<string, string> = {
    fire_detected: '#e63946',
    evacuation_started: '#f77f00',
    vehicle_dispatched: '#457b9d',
    exit_blocked: '#fcbf49',
    road_blocked: '#6c757d',
    vehicle_arrived: '#2d6a4f',
    fire_contained: '#52b788',
    fire_extinguished: '#2d6a4f',
    drill_start: '#8b5cf6',
    drill_end: '#8b5cf6'
  }
  return map[type] || '#8d99ae'
}

const eventTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    fire_detected: '火情检测',
    evacuation_started: '疏散开始',
    vehicle_dispatched: '车辆调度',
    exit_blocked: '出口封锁',
    road_blocked: '道路封锁',
    vehicle_arrived: '车辆到达',
    fire_contained: '火情控制',
    fire_extinguished: '火情扑灭',
    drill_start: '演习开始',
    drill_end: '演习结束'
  }
  return map[type] || type
}

const formatTime = (timestamp: string) => {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const startEdit = () => {
  isEditing.value = true
  editDesc.value = props.event?.description || ''
}

const cancelEdit = () => {
  isEditing.value = false
}

const saveEdit = () => {
  if (props.event) {
    emit('edit', { ...props.event, description: editDesc.value })
  }
  isEditing.value = false
}
</script>

<style scoped>
.desc-content {
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
