<template>
  <div class="report-compare">
    <div class="compare-header">
      <h4 class="compare-title">历史对比分析</h4>
      <div class="compare-selectors">
        <el-select v-model="selectedLeft" placeholder="选择报告 A" clearable size="small" class="compare-select">
          <el-option
            v-for="r in reports"
            :key="r.id"
            :label="r.drill_name"
            :value="r.id"
          />
        </el-select>
        <span class="vs-label">VS</span>
        <el-select v-model="selectedRight" placeholder="选择报告 B" clearable size="small" class="compare-select">
          <el-option
            v-for="r in reports"
            :key="r.id"
            :label="r.drill_name"
            :value="r.id"
          />
        </el-select>
        <el-button type="primary" size="small" :disabled="!canCompare" @click="handleCompare">对比</el-button>
      </div>
    </div>

    <div v-if="leftReport && rightReport" class="compare-result">
      <el-table :data="compareMetrics" stripe size="small" border>
        <el-table-column prop="label" label="指标" width="150" />
        <el-table-column label="报告 A" align="center">
          <template #default="{ row }">
            <span>{{ row.leftValue }}</span>
          </template>
        </el-table-column>
        <el-table-column label="报告 B" align="center">
          <template #default="{ row }">
            <span>{{ row.rightValue }}</span>
          </template>
        </el-table-column>
        <el-table-column label="差异" align="center" width="120">
          <template #default="{ row }">
            <span :class="deltaClass(row.delta)">
              {{ row.delta > 0 ? '↑' : row.delta < 0 ? '↓' : '→' }}
              {{ Math.abs(row.delta).toFixed(1) }}{{ row.unit }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-empty v-else-if="!leftReport && !rightReport" description="请选择两份报告进行对比" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DrillReport } from '@/types'

const props = defineProps<{
  reports: DrillReport[]
  selectedIds: number[]
}>()

const emit = defineEmits<{
  compare: [leftId: number, rightId: number]
}>()

const selectedLeft = ref<number | undefined>(undefined)
const selectedRight = ref<number | undefined>(undefined)

const canCompare = computed(() => selectedLeft.value != null && selectedRight.value != null && selectedLeft.value !== selectedRight.value)

const leftReport = computed(() => {
  if (!selectedLeft.value) return null
  return props.reports.find(r => r.id === selectedLeft.value) || null
})

const rightReport = computed(() => {
  if (!selectedRight.value) return null
  return props.reports.find(r => r.id === selectedRight.value) || null
})

const compareMetrics = computed(() => {
  if (!leftReport.value || !rightReport.value) return []
  const l = leftReport.value
  const r = rightReport.value
  return [
    {
      label: '建筑总数',
      leftValue: `${l.total_buildings}栋`,
      rightValue: `${r.total_buildings}栋`,
      delta: r.total_buildings - l.total_buildings,
      unit: '栋',
      inverse: false
    },
    {
      label: '疏散人数',
      leftValue: `${l.evacuated_people}/${l.total_people}`,
      rightValue: `${r.evacuated_people}/${r.total_people}`,
      delta: r.evacuated_people - l.evacuated_people,
      unit: '人',
      inverse: false
    },
    {
      label: '平均疏散时间',
      leftValue: l.average_evacuation_time != null ? `${l.average_evacuation_time.toFixed(1)}分钟` : '-',
      rightValue: r.average_evacuation_time != null ? `${r.average_evacuation_time.toFixed(1)}分钟` : '-',
      delta: (r.average_evacuation_time ?? 0) - (l.average_evacuation_time ?? 0),
      unit: '分钟',
      inverse: true
    },
    {
      label: '救援车辆',
      leftValue: `${l.total_vehicles}辆`,
      rightValue: `${r.total_vehicles}辆`,
      delta: r.total_vehicles - l.total_vehicles,
      unit: '辆',
      inverse: false
    },
    {
      label: '火情控制时间',
      leftValue: l.fire_containment_time != null ? `${l.fire_containment_time.toFixed(1)}分钟` : '-',
      rightValue: r.fire_containment_time != null ? `${r.fire_containment_time.toFixed(1)}分钟` : '-',
      delta: (r.fire_containment_time ?? 0) - (l.fire_containment_time ?? 0),
      unit: '分钟',
      inverse: true
    }
  ]
})

function deltaClass(delta: number) {
  if (delta > 0) return 'delta-up'
  if (delta < 0) return 'delta-down'
  return 'delta-neutral'
}

function handleCompare() {
  if (selectedLeft.value != null && selectedRight.value != null) {
    emit('compare', selectedLeft.value, selectedRight.value)
  }
}
</script>

<style scoped>
.report-compare {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.compare-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.compare-selectors {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compare-select {
  width: 200px;
}

.vs-label {
  font-weight: 700;
  color: var(--color-accent);
  font-size: 14px;
}

.compare-result {
  animation: fadeIn 0.3s ease;
}

.delta-up {
  color: var(--safe-green-light);
  font-weight: 600;
}

.delta-down {
  color: var(--fire-red);
  font-weight: 600;
}

.delta-neutral {
  color: var(--text-muted);
}
</style>
