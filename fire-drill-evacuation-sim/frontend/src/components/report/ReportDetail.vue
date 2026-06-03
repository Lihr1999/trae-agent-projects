<template>
  <div v-if="report" class="report-detail">
    <div class="summary-cards">
      <div class="summary-card">
        <el-statistic title="建筑总数" :value="report.total_buildings">
          <template #suffix>栋</template>
        </el-statistic>
        <div class="card-icon building-icon">🏢</div>
      </div>
      <div class="summary-card">
        <el-statistic title="疏散人数" :value="report.evacuated_people">
          <template #suffix>/ {{ report.total_people }}</template>
        </el-statistic>
        <div class="card-icon people-icon">👥</div>
      </div>
      <div class="summary-card">
        <el-statistic title="救援车辆" :value="report.total_vehicles">
          <template #suffix>辆</template>
        </el-statistic>
        <div class="card-icon vehicle-icon">🚒</div>
      </div>
      <div class="summary-card">
        <el-statistic
          title="平均疏散时间"
          :value="report.average_evacuation_time ?? 0"
          :precision="1"
        >
          <template #suffix>分钟</template>
        </el-statistic>
        <div class="card-icon time-icon">⏱️</div>
      </div>
      <div class="summary-card">
        <el-statistic
          title="火情控制时间"
          :value="report.fire_containment_time ?? 0"
          :precision="1"
        >
          <template #suffix>分钟</template>
        </el-statistic>
        <div class="card-icon fire-icon">🔥</div>
      </div>
    </div>

    <div class="charts-section">
      <ReportCharts :report-data="report.statistics" />
    </div>

    <div v-if="report.statistics?.events" class="events-section">
      <h4 class="section-title">事件日志</h4>
      <el-table :data="report.statistics.events || []" stripe size="small" max-height="300">
        <el-table-column prop="timestamp" label="时间" width="100">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="event_type" label="事件类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="eventTypeTag(row.event_type)">
              {{ eventTypeLabel(row.event_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="事件描述" min-width="200" show-overflow-tooltip />
      </el-table>
    </div>

    <div class="export-actions">
      <el-button type="danger" @click="emit('export-pdf')">导出 PDF</el-button>
      <el-button type="success" @click="emit('export-excel')">导出 Excel</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DrillReport } from '@/types'
import ReportCharts from './ReportCharts.vue'

const props = defineProps<{
  report: DrillReport | null
}>()

const emit = defineEmits<{
  'export-pdf': []
  'export-excel': []
}>()

function formatTime(timestamp: string) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function eventTypeTag(type: string) {
  const map: Record<string, string> = {
    fire_detected: 'danger',
    evacuation_started: 'warning',
    vehicle_dispatched: '',
    fire_contained: 'success',
    fire_extinguished: 'success',
    drill_start: 'info',
    drill_end: 'info'
  }
  return map[type] || 'info'
}

function eventTypeLabel(type: string) {
  const map: Record<string, string> = {
    fire_detected: '火情检测',
    evacuation_started: '疏散开始',
    vehicle_dispatched: '车辆调度',
    exit_blocked: '出口封锁',
    fire_contained: '火情控制',
    fire_extinguished: '火情扑灭',
    drill_start: '演习开始',
    drill_end: '演习结束'
  }
  return map[type] || type
}
</script>

<style scoped>
.report-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.summary-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.card-icon {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 28px;
  opacity: 0.3;
}

.charts-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}

.events-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.export-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
