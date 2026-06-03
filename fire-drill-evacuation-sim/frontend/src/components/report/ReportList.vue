<template>
  <div class="report-list">
    <div class="list-header">
      <h3 class="list-title">演练报告列表</h3>
      <el-button type="primary" size="small" @click="emit('generate')">生成报告</el-button>
    </div>

    <el-table
      :data="paginatedReports"
      stripe
      style="width: 100%"
      empty-text="暂无报告数据"
      @row-click="handleRowClick"
      class="report-table"
    >
      <el-table-column prop="drill_name" label="演练名称" min-width="150">
        <template #default="{ row }">
          <span class="drill-name-cell">{{ row.drill_name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="start_time" label="开始时间" width="170">
        <template #default="{ row }">
          {{ formatDateTime(row.start_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="end_time" label="结束时间" width="170">
        <template #default="{ row }">
          {{ row.end_time ? formatDateTime(row.end_time) : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="total_buildings" label="建筑数量" width="90" align="center" />
      <el-table-column label="疏散人数" width="120" align="center">
        <template #default="{ row }">
          <span class="evacuated-count">{{ row.evacuated_people }}</span>
          <span class="total-count">/{{ row.total_people }}</span>
        </template>
      </el-table-column>
      <el-table-column label="平均疏散时间" width="130" align="center">
        <template #default="{ row }">
          {{ row.average_evacuation_time != null ? `${row.average_evacuation_time.toFixed(1)}分钟` : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click.stop="emit('select', row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="reports.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        small
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DrillReport } from '@/types'

const props = defineProps<{
  reports: DrillReport[]
}>()

const emit = defineEmits<{
  select: [report: DrillReport]
  generate: []
}>()

const currentPage = ref(1)
const pageSize = ref(10)

const paginatedReports = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return props.reports.slice(start, start + pageSize.value)
})

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function handleRowClick(row: DrillReport) {
  emit('select', row)
}
</script>

<style scoped>
.report-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.report-table {
  cursor: pointer;
}

.drill-name-cell {
  color: var(--color-accent);
  font-weight: 500;
}

.evacuated-count {
  color: var(--safe-green-light);
  font-weight: 600;
}

.total-count {
  color: var(--text-muted);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
