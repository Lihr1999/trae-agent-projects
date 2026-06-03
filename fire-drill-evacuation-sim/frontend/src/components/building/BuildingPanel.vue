<template>
  <div class="building-panel">
    <el-collapse v-model="activeCollapse">
      <el-collapse-item name="risk">
        <template #title>
          <div class="collapse-title">
            <el-icon><Warning /></el-icon>
            <span>风险建筑列表</span>
            <el-badge :value="buildings.length" class="title-badge" />
          </div>
        </template>
        <div class="search-box">
          <el-input
            v-model="searchText"
            placeholder="搜索建筑名称..."
            clearable
            :prefix-icon="Search"
            size="small"
          />
        </div>
        <div class="building-list">
          <div
            v-for="building in sortedBuildings"
            :key="building.id"
            class="building-item"
            :class="{ active: modelValue === building.id }"
            @click="handleSelect(building)"
          >
            <div class="building-main">
              <el-icon class="type-icon"><OfficeBuilding /></el-icon>
              <div class="building-info">
                <div class="building-name">{{ building.name }}</div>
                <div class="building-meta">
                  <el-tag size="small" :type="buildingTypeTag(building.building_type)">
                    {{ buildingTypeLabel(building.building_type) }}
                  </el-tag>
                </div>
              </div>
            </div>
            <div class="building-badges">
              <el-tag
                size="small"
                :type="riskLevelType(building.risk_level)"
                effect="dark"
                class="risk-badge"
              >
                {{ riskLevelLabel(building.risk_level) }}
              </el-tag>
              <el-tag size="small" :type="statusType(building.status)">
                {{ statusLabel(building.status) }}
              </el-tag>
            </div>
          </div>
          <el-empty v-if="sortedBuildings.length === 0" description="暂无建筑数据" :image-size="60" />
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Warning, OfficeBuilding } from '@element-plus/icons-vue'
import type { Building } from '@/types'

const props = defineProps<{
  buildings: Building[]
  modelValue: number | null
}>()

const emit = defineEmits<{
  select: [building: Building]
  'update:modelValue': [id: number | null]
}>()

const activeCollapse = ref(['risk'])
const searchText = ref('')

const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const sortedBuildings = computed(() => {
  let list = [...props.buildings]
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter((b) => b.name.toLowerCase().includes(q))
  }
  return list.sort((a, b) => (riskOrder[a.risk_level] ?? 3) - (riskOrder[b.risk_level] ?? 3))
})

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

const handleSelect = (building: Building) => {
  emit('update:modelValue', building.id)
  emit('select', building)
}
</script>

<style scoped>
.building-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.title-badge {
  margin-left: auto;
}

.search-box {
  padding: 8px 0;
}

.building-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.building-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-card);
  border: 1px solid transparent;
}

.building-item:hover {
  background: var(--bg-hover);
}

.building-item.active {
  border-color: var(--info-blue);
  background: var(--bg-hover);
}

.building-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.type-icon {
  font-size: 20px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.building-info {
  flex: 1;
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

.building-meta {
  margin-top: 4px;
}

.building-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.risk-badge {
  min-width: 60px;
  text-align: center;
}
</style>
