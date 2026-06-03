<template>
  <div v-if="building" class="building-detail">
    <div class="detail-header">
      <div class="header-info">
        <h3 class="building-name">{{ building.name }}</h3>
        <div class="header-tags">
          <el-tag size="small" :type="buildingTypeTag(building.building_type)">
            {{ buildingTypeLabel(building.building_type) }}
          </el-tag>
          <el-tag size="small" :type="riskLevelType(building.risk_level)" effect="dark">
            {{ riskLevelLabel(building.risk_level) }}
          </el-tag>
          <el-tag size="small" :type="statusType(building.status)">
            {{ statusLabel(building.status) }}
          </el-tag>
        </div>
      </div>
      <el-button :icon="Close" circle size="small" @click="emit('close')" />
    </div>

    <div class="detail-body">
      <div class="section">
        <h4 class="section-title">楼层信息</h4>
        <div class="floor-list">
          <div v-for="floor in floors" :key="floor.id" class="floor-item">
            <div class="floor-header">
              <span class="floor-number">{{ floor.floor_number }}F</span>
              <span class="floor-people">{{ floor.current_people }}/{{ floor.max_capacity }}人</span>
            </div>
            <el-progress
              :percentage="floorUtilization(floor)"
              :color="utilizationColor(floor)"
              :stroke-width="8"
              :show-text="false"
            />
          </div>
          <el-empty v-if="floors.length === 0" description="暂无楼层数据" :image-size="40" />
        </div>
      </div>

      <div class="section">
        <h4 class="section-title">出口信息</h4>
        <div class="exit-list">
          <div
            v-for="exit in exits"
            :key="exit.id"
            class="exit-item"
            @click="handleExitClick(exit)"
          >
            <span class="exit-dot" :class="exit.status" />
            <div class="exit-info">
              <span class="exit-label">出口 #{{ exit.id }}</span>
              <span class="exit-pos">({{ exit.position_x }}, {{ exit.position_y }}, {{ exit.position_z }})</span>
            </div>
            <el-tag size="small" :type="exitStatusType(exit.status)">
              {{ exitStatusLabel(exit.status) }}
            </el-tag>
          </div>
          <el-empty v-if="exits.length === 0" description="暂无出口数据" :image-size="40" />
        </div>
      </div>

      <div class="section">
        <h4 class="section-title">风险评估</h4>
        <div class="risk-metrics">
          <div class="metric">
            <span class="metric-label">风险等级</span>
            <el-rate
              :model-value="riskScore"
              disabled
              :colors="['#52b788', '#f77f00', '#e63946']"
            />
          </div>
          <div class="metric">
            <span class="metric-label">建筑类型</span>
            <span class="metric-value">{{ buildingTypeLabel(building.building_type) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">当前状态</span>
            <span class="metric-value">{{ statusLabel(building.status) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">总容量</span>
            <span class="metric-value">{{ totalCapacity }}人</span>
          </div>
          <div class="metric">
            <span class="metric-label">当前人数</span>
            <span class="metric-value">{{ currentPeople }}人</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import type { Building, Floor, Exit } from '@/types'

const props = defineProps<{
  building: Building | null
  floors: Floor[]
  exits: Exit[]
}>()

const emit = defineEmits<{
  close: []
  'block-exit': [exitId: number]
  'unblock-exit': [exitId: number]
}>()

const riskScore = computed(() => {
  const map: Record<string, number> = { low: 1, medium: 2, high: 4, critical: 5 }
  return map[props.building?.risk_level ?? 'low'] ?? 1
})

const totalCapacity = computed(() => props.floors.reduce((sum, f) => sum + f.max_capacity, 0))
const currentPeople = computed(() => props.floors.reduce((sum, f) => sum + f.current_people, 0))

const floorUtilization = (floor: Floor) => {
  if (floor.max_capacity === 0) return 0
  return Math.round((floor.current_people / floor.max_capacity) * 100)
}

const utilizationColor = (floor: Floor) => {
  const pct = floorUtilization(floor)
  if (pct < 50) return 'var(--safe-green-light)'
  if (pct < 80) return 'var(--warning-orange)'
  return 'var(--fire-red)'
}

const riskLevelType = (level: string) => {
  const map: Record<string, string> = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' }
  return map[level] || 'info'
}

const riskLevelLabel = (level: string) => {
  const map: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险', critical: '极高风险' }
  return map[level] || level
}

const statusType = (status: string) => {
  const map: Record<string, string> = { normal: 'success', fire: 'danger', evacuating: 'warning', damaged: 'info' }
  return map[status] || 'info'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = { normal: '正常', fire: '着火', evacuating: '疏散中', damaged: '受损' }
  return map[status] || status
}

const buildingTypeTag = (type: string) => {
  const map: Record<string, string> = { residential: '', commercial: 'success', industrial: 'warning', public: 'info' }
  return map[type] || ''
}

const buildingTypeLabel = (type: string) => {
  const map: Record<string, string> = { residential: '住宅', commercial: '商业', industrial: '工业', public: '公共' }
  return map[type] || type
}

const exitStatusType = (status: string) => {
  const map: Record<string, string> = { normal: 'success', congested: 'warning', blocked: 'danger' }
  return map[status] || 'info'
}

const exitStatusLabel = (status: string) => {
  const map: Record<string, string> = { normal: '正常', congested: '拥堵', blocked: '已封锁' }
  return map[status] || status
}

const handleExitClick = async (exit: Exit) => {
  try {
    if (exit.status === 'blocked') {
      await ElMessageBox.confirm('确定要解除封锁该出口吗？', '解除出口封锁', { type: 'warning' })
      emit('unblock-exit', exit.id)
    } else {
      await ElMessageBox.confirm('确定要封锁该出口吗？封锁后将影响疏散路线。', '封锁出口', { type: 'warning' })
      emit('block-exit', exit.id)
    }
  } catch {}
}
</script>

<style scoped>
.building-detail {
  height: 100%;
  overflow-y: auto;
  background: var(--bg-secondary);
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.header-info {
  flex: 1;
  min-width: 0;
}

.building-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-tags {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.detail-body {
  padding: 12px 16px;
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

.floor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.floor-item {
  padding: 8px;
  background: var(--bg-card);
  border-radius: 6px;
}

.floor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.floor-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.floor-people {
  font-size: 12px;
  color: var(--text-secondary);
}

.exit-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-card);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.exit-item:hover {
  background: var(--bg-hover);
}

.exit-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.exit-dot.normal {
  background: var(--safe-green-light);
}

.exit-dot.congested {
  background: var(--warning-orange-light);
}

.exit-dot.blocked {
  background: var(--fire-red);
}

.exit-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.exit-label {
  font-size: 13px;
  color: var(--text-primary);
}

.exit-pos {
  font-size: 11px;
  color: var(--text-muted);
}

.risk-metrics {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.metric-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
</style>
