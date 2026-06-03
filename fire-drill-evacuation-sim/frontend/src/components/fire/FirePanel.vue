<template>
  <div class="fire-panel">
    <div class="panel-header">
      <h3 class="panel-title">火情管理</h3>
      <el-button type="danger" size="small" :icon="Plus" @click="showCreateDialog = true">
        新增火情
      </el-button>
    </div>

    <div class="fire-list">
      <div
        v-for="fire in fires"
        :key="fire.id"
        class="fire-item"
        :class="{ active: modelValue === fire.id }"
        @click="handleSelect(fire)"
      >
        <div class="fire-main">
          <el-icon class="fire-icon" :style="{ color: fireLevelColor(fire.fire_level) }">
            <Warning />
          </el-icon>
          <div class="fire-info">
            <div class="fire-position">位置 ({{ fire.position_x }}, {{ fire.position_y }}, {{ fire.position_z }})</div>
            <div class="fire-meta">
              <span class="fire-level">等级: {{ fire.fire_level }}</span>
              <span class="fire-speed">扩散: {{ fire.spread_speed }}m/s</span>
            </div>
          </div>
        </div>
        <div class="fire-badges">
          <el-tag size="small" :type="fireStatusType(fire.status)">
            {{ fireStatusLabel(fire.status) }}
          </el-tag>
        </div>
      </div>
      <el-empty v-if="fires.length === 0" description="暂无火情记录" :image-size="60" />
    </div>

    <div v-if="selectedFire" class="fire-detail">
      <el-divider />
      <h4 class="detail-title">火情详情 #{{ selectedFire.id }}</h4>
      <el-descriptions :column="1" size="small" border>
        <el-descriptions-item label="位置">
          ({{ selectedFire.position_x }}, {{ selectedFire.position_y }}, {{ selectedFire.position_z }})
        </el-descriptions-item>
        <el-descriptions-item label="火情等级">{{ selectedFire.fire_level }}</el-descriptions-item>
        <el-descriptions-item label="扩散速度">{{ selectedFire.spread_speed }}m/s</el-descriptions-item>
        <el-descriptions-item label="影响半径">{{ selectedFire.affected_radius }}m</el-descriptions-item>
        <el-descriptions-item label="天气状况">{{ weatherLabel(selectedFire.weather_condition) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="fireStatusType(selectedFire.status)">
            {{ fireStatusLabel(selectedFire.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div class="spread-section">
        <h5 class="sub-title">扩散计算</h5>
        <el-form :model="spreadForm" label-width="80px" size="small">
          <el-form-item label="经过时间">
            <el-slider v-model="spreadForm.elapsed_minutes" :min="0" :max="120" :step="5" show-input />
          </el-form-item>
          <el-form-item label="天气条件">
            <el-select v-model="spreadForm.weather_condition" placeholder="选择天气">
              <el-option label="晴天" value="clear" />
              <el-option label="大风" value="windy" />
              <el-option label="雨天" value="rainy" />
              <el-option label="雪天" value="snowy" />
            </el-select>
          </el-form-item>
        </el-form>
        <el-button
          type="warning"
          size="small"
          @click="emit('calculate-spread', { fireId: selectedFire.id, ...spreadForm })"
        >
          计算扩散
        </el-button>
      </div>

      <div class="detail-actions">
        <el-button
          v-if="selectedFire.status === 'active'"
          type="warning"
          size="small"
          @click="emit('contain', selectedFire.id)"
        >
          控制火情
        </el-button>
        <el-button
          v-if="selectedFire.status === 'active' || selectedFire.status === 'contained'"
          type="danger"
          size="small"
          @click="emit('extinguish', selectedFire.id)"
        >
          扑灭火情
        </el-button>
      </div>
    </div>

    <el-dialog v-model="showCreateDialog" title="新增火情" width="440px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="80px" size="default">
        <el-form-item label="位置 X">
          <el-input-number v-model="createForm.position_x" :step="1" />
        </el-form-item>
        <el-form-item label="位置 Y">
          <el-input-number v-model="createForm.position_y" :step="1" />
        </el-form-item>
        <el-form-item label="位置 Z">
          <el-input-number v-model="createForm.position_z" :step="1" />
        </el-form-item>
        <el-form-item label="火情等级">
          <el-slider v-model="createForm.fire_level" :min="1" :max="5" :step="1" show-stops />
        </el-form-item>
        <el-form-item label="扩散速度">
          <el-input-number v-model="createForm.spread_speed" :min="0.1" :step="0.1" />
        </el-form-item>
        <el-form-item label="天气条件">
          <el-select v-model="createForm.weather_condition" placeholder="选择天气">
            <el-option label="晴天" value="clear" />
            <el-option label="大风" value="windy" />
            <el-option label="雨天" value="rainy" />
            <el-option label="雪天" value="snowy" />
          </el-select>
        </el-form-item>
        <el-form-item label="影响半径">
          <el-input-number v-model="createForm.affected_radius" :min="1" :step="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="danger" @click="handleCreate">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { Plus, Warning } from '@element-plus/icons-vue'
import type { FireIncident } from '@/types'

const props = defineProps<{
  fires: FireIncident[]
  modelValue: number | null
}>()

const emit = defineEmits<{
  select: [fire: FireIncident]
  create: [data: Partial<FireIncident>]
  'calculate-spread': [params: { fireId: number; elapsed_minutes: number; weather_condition: string }]
  contain: [fireId: number]
  extinguish: [fireId: number]
}>()

const showCreateDialog = ref(false)
const spreadForm = reactive({
  elapsed_minutes: 30,
  weather_condition: 'clear'
})

const createForm = reactive({
  position_x: 0,
  position_y: 0,
  position_z: 0,
  fire_level: 1,
  spread_speed: 1.0,
  weather_condition: 'clear' as 'clear' | 'windy' | 'rainy' | 'snowy',
  affected_radius: 10
})

const selectedFire = computed(() => props.fires.find((f) => f.id === props.modelValue) || null)

const fireLevelColor = (level: number) => {
  const colors = ['', '#52b788', '#fcbf49', '#f77f00', '#e63946', '#c1121f']
  return colors[level] || '#e63946'
}

const fireStatusType = (status: string) => {
  const map: Record<string, string> = { active: 'danger', contained: 'warning', extinguished: 'success' }
  return map[status] || 'info'
}

const fireStatusLabel = (status: string) => {
  const map: Record<string, string> = { active: '活跃', contained: '已控制', extinguished: '已扑灭' }
  return map[status] || status
}

const weatherLabel = (weather: string) => {
  const map: Record<string, string> = { clear: '晴天', windy: '大风', rainy: '雨天', snowy: '雪天' }
  return map[weather] || weather
}

const handleSelect = (fire: FireIncident) => {
  emit('select', fire)
}

const handleCreate = () => {
  emit('create', { ...createForm })
  showCreateDialog.value = false
  createForm.position_x = 0
  createForm.position_y = 0
  createForm.position_z = 0
  createForm.fire_level = 1
  createForm.spread_speed = 1.0
  createForm.weather_condition = 'clear'
  createForm.affected_radius = 10
}
</script>

<style scoped>
.fire-panel {
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

.fire-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fire-item {
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-card);
  border: 1px solid transparent;
}

.fire-item:hover {
  background: var(--bg-hover);
}

.fire-item.active {
  border-color: var(--fire-red);
}

.fire-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.fire-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.fire-info {
  flex: 1;
  min-width: 0;
}

.fire-position {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.fire-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.fire-badges {
  margin-top: 6px;
}

.fire-detail {
  margin-top: 4px;
}

.detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.spread-section {
  margin-top: 12px;
}

.sub-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
