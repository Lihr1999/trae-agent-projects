<template>
  <div class="evacuation-panel">
    <div class="panel-header">
      <h3 class="panel-title">疏散路线</h3>
      <div class="header-actions">
        <el-button type="danger" size="small" @click="handleEvacuateAll">全员疏散</el-button>
      </div>
    </div>

    <div class="route-list">
      <div v-for="route in routes" :key="route.route_id" class="route-item">
        <div class="route-header" @click="toggleExpand(route.route_id)">
          <div class="route-main">
            <el-icon class="route-icon"><Guide /></el-icon>
            <div class="route-info">
              <span class="building-name">{{ getBuildingName(route.building_id) }}</span>
              <span class="route-meta">
                预计 {{ route.estimated_time_minutes }}分钟 | 距离 {{ route.total_distance }}m
              </span>
            </div>
          </div>
          <div class="route-actions">
            <el-tag size="small" type="info">出口 #{{ route.target_exit_id }}</el-tag>
            <el-button size="small" type="warning" @click.stop="emit('evacuate', route.building_id)">
              疏散
            </el-button>
            <el-icon class="expand-icon" :class="{ expanded: expandedRoutes.has(route.route_id) }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>

        <div v-if="expandedRoutes.has(route.route_id)" class="route-steps">
          <el-timeline>
            <el-timeline-item
              v-for="(step, idx) in route.steps"
              :key="idx"
              :type="stepTypeColor(step.step_type)"
              :timestamp="step.description"
              placement="top"
            >
              <span class="step-type">{{ step.step_type }}</span>
              <span class="step-pos">({{ step.position_x }}, {{ step.position_y }}, {{ step.position_z }})</span>
            </el-timeline-item>
          </el-timeline>
          <div class="priority-section">
            <span class="priority-label">优先级调整</span>
            <el-input-number
              :model-value="1"
              :min="1"
              :max="10"
              size="small"
              @change="(val: number | undefined) => handlePriorityChange(route.building_id, val ?? 1)"
            />
          </div>
        </div>
      </div>
      <el-empty v-if="routes.length === 0" description="暂无疏散路线" :image-size="60" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Guide, ArrowDown } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import type { EvacuationRoute, Building } from '@/types'

const props = defineProps<{
  routes: EvacuationRoute[]
  buildings: Building[]
}>()

const emit = defineEmits<{
  evacuate: [buildingId: number]
  'evacuate-all': []
  'update-priority': [params: { buildingId: number; priority: number }]
}>()

const expandedRoutes = ref(new Set<string>())

const getBuildingName = (buildingId: number) => {
  const b = props.buildings.find((b) => b.id === buildingId)
  return b?.name ?? `建筑 #${buildingId}`
}

const toggleExpand = (routeId: string) => {
  if (expandedRoutes.value.has(routeId)) {
    expandedRoutes.value.delete(routeId)
  } else {
    expandedRoutes.value.add(routeId)
  }
}

const stepTypeColor = (type: string) => {
  const map: Record<string, string> = { start: 'primary', move: '', exit: 'success', arrive: 'success' }
  return map[type] || ''
}

const handlePriorityChange = (buildingId: number, priority: number) => {
  emit('update-priority', { buildingId, priority })
}

const handleEvacuateAll = async () => {
  try {
    await ElMessageBox.confirm('确定要对所有建筑执行全员疏散吗？', '全员疏散确认', { type: 'warning' })
    emit('evacuate-all')
  } catch {}
}
</script>

<style scoped>
.evacuation-panel {
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

.route-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-item {
  background: var(--bg-card);
  border-radius: 6px;
  overflow: hidden;
}

.route-header {
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.2s;
}

.route-header:hover {
  background: var(--bg-hover);
}

.route-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.route-icon {
  font-size: 18px;
  color: var(--warning-orange);
  flex-shrink: 0;
}

.route-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.building-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.route-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.expand-icon {
  transition: transform 0.3s;
  color: var(--text-secondary);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.route-steps {
  padding: 10px 16px 12px;
  border-top: 1px solid var(--border-color);
}

.step-type {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-right: 8px;
}

.step-pos {
  font-size: 11px;
  color: var(--text-muted);
}

.priority-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.priority-label {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
