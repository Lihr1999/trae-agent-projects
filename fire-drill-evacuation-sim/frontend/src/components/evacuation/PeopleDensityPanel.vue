<template>
  <div class="people-density-panel">
    <div class="panel-header">
      <h3 class="panel-title">人员密度</h3>
      <el-button type="primary" size="small" :icon="Plus" @click="showAddDialog = true">添加</el-button>
    </div>

    <el-tabs v-model="statusFilter" class="status-tabs">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="静止" name="stationary" />
      <el-tab-pane label="疏散中" name="evacuating" />
      <el-tab-pane label="已疏散" name="evacuated" />
    </el-tabs>

    <div class="group-list">
      <div v-for="group in filteredGroups" :key="group.id" class="group-item">
        <div class="group-main">
          <div class="group-info">
            <span class="group-name">{{ group.name }}</span>
            <div class="group-meta">
              <span class="group-count">{{ group.count }}人</span>
              <span class="group-pos">({{ group.position_x }}, {{ group.position_y }}, {{ group.position_z }})</span>
            </div>
          </div>
          <el-tag size="small" :type="statusTagType(group.status)">
            {{ statusLabel(group.status) }}
          </el-tag>
        </div>
        <div class="group-footer">
          <div class="priority-col">
            <span class="priority-label">优先级</span>
            <el-input-number
              :model-value="group.evacuation_priority"
              :min="1"
              :max="10"
              size="small"
              controls-position="right"
              @change="(val: number | undefined) => emit('update', { ...group, evacuation_priority: val ?? 1 })"
            />
          </div>
          <div class="group-actions">
            <el-button size="small" :icon="Edit" @click="openEditDialog(group)" />
            <el-button size="small" type="danger" :icon="Delete" @click="emit('delete', group.id)" />
            <el-button
              v-if="group.status === 'stationary'"
              size="small"
              type="warning"
              @click="emit('evacuate', group.id)"
            >
              疏散
            </el-button>
          </div>
        </div>
      </div>
      <el-empty v-if="filteredGroups.length === 0" description="暂无人员数据" :image-size="60" />
    </div>

    <el-dialog v-model="showAddDialog" :title="editingGroup ? '编辑人员组' : '添加人员组'" width="440px" :close-on-click-modal="false">
      <el-form :model="formData" label-width="80px" size="default">
        <el-form-item label="名称">
          <el-input v-model="formData.name" placeholder="输入组名称" />
        </el-form-item>
        <el-form-item label="人数">
          <el-input-number v-model="formData.count" :min="1" :step="1" />
        </el-form-item>
        <el-form-item label="位置 X">
          <el-input-number v-model="formData.position_x" :step="1" />
        </el-form-item>
        <el-form-item label="位置 Y">
          <el-input-number v-model="formData.position_y" :step="1" />
        </el-form-item>
        <el-form-item label="位置 Z">
          <el-input-number v-model="formData.position_z" :step="1" />
        </el-form-item>
        <el-form-item label="移动速度">
          <el-input-number v-model="formData.move_speed" :min="0.1" :step="0.1" :precision="1" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="formData.evacuation_priority" :min="1" :max="10" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { PeopleGroup } from '@/types'

const props = defineProps<{
  peopleGroups: PeopleGroup[]
}>()

const emit = defineEmits<{
  add: [data: Partial<PeopleGroup>]
  update: [data: PeopleGroup]
  delete: [id: number]
  evacuate: [id: number]
}>()

const statusFilter = ref('all')
const showAddDialog = ref(false)
const editingGroup = ref<PeopleGroup | null>(null)

const defaultFormData = () => ({
  name: '',
  count: 10,
  position_x: 0,
  position_y: 0,
  position_z: 0,
  move_speed: 1.0,
  evacuation_priority: 5
})

const formData = reactive(defaultFormData())

const filteredGroups = computed(() => {
  if (statusFilter.value === 'all') return props.peopleGroups
  return props.peopleGroups.filter((g) => g.status === statusFilter.value)
})

const statusTagType = (status: string) => {
  const map: Record<string, string> = { stationary: 'info', evacuating: 'warning', evacuated: 'success' }
  return map[status] || 'info'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = { stationary: '静止', evacuating: '疏散中', evacuated: '已疏散' }
  return map[status] || status
}

const openEditDialog = (group: PeopleGroup) => {
  editingGroup.value = group
  Object.assign(formData, {
    name: group.name,
    count: group.count,
    position_x: group.position_x,
    position_y: group.position_y,
    position_z: group.position_z,
    move_speed: group.move_speed,
    evacuation_priority: group.evacuation_priority
  })
  showAddDialog.value = true
}

const closeDialog = () => {
  showAddDialog.value = false
  editingGroup.value = null
  Object.assign(formData, defaultFormData())
}

const handleSubmit = () => {
  if (editingGroup.value) {
    emit('update', { ...editingGroup.value, ...formData })
  } else {
    emit('add', { ...formData })
  }
  closeDialog()
}
</script>

<style scoped>
.people-density-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--bg-secondary);
  padding: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.status-tabs {
  margin-bottom: 8px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-item {
  background: var(--bg-card);
  border-radius: 6px;
  padding: 10px;
}

.group-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.group-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.group-count {
  color: var(--warning-orange-light);
  font-weight: 500;
}

.group-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.priority-col {
  display: flex;
  align-items: center;
  gap: 6px;
}

.priority-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
