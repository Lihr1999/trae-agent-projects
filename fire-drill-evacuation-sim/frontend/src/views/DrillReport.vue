<template>
  <div class="report-page">
    <div class="report-page-header">
      <div class="header-left">
        <el-button @click="router.push({ name: 'CommandCenter' })" :icon="ArrowLeft">返回指挥中心</el-button>
        <h2 class="page-title">演练报告管理</h2>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showGenerateDialog = true" :loading="generating">生成报告</el-button>
      </div>
    </div>

    <div class="report-page-body">
      <el-tabs v-model="activeTab" class="report-tabs">
        <el-tab-pane label="报告列表" name="list">
          <ReportList
            :reports="reportStore.reports"
            @select="handleSelectReport"
            @generate="showGenerateDialog = true"
          />
        </el-tab-pane>

        <el-tab-pane label="报告详情" name="detail" :disabled="!selectedReport">
          <ReportDetail
            v-if="selectedReport"
            :report="selectedReport"
            @export-pdf="handleExportPdf"
            @export-excel="handleExportExcel"
          />
          <el-empty v-else description="请从列表中选择一份报告查看详情" :image-size="80" />
        </el-tab-pane>

        <el-tab-pane label="历史对比" name="compare">
          <ReportCompare
            :reports="reportStore.reports"
            :selected-ids="compareIds"
            @compare="handleCompare"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog
      v-model="showGenerateDialog"
      title="生成演练报告"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form :model="generateForm" label-width="100px" size="default">
        <el-form-item label="演练名称">
          <el-input v-model="generateForm.drill_name" placeholder="请输入演练名称" />
        </el-form-item>
        <el-form-item label="演练日期">
          <el-date-picker
            v-model="generateForm.start_time"
            type="datetime"
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGenerate" :loading="generating">确认生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useReportStore } from '@/stores/report'
import { ElMessage } from 'element-plus'
import type { DrillReport } from '@/types'

import ReportList from '@/components/report/ReportList.vue'
import ReportDetail from '@/components/report/ReportDetail.vue'
import ReportCompare from '@/components/report/ReportCompare.vue'

const router = useRouter()
const reportStore = useReportStore()

const activeTab = ref('list')
const selectedReport = ref<DrillReport | null>(null)
const showGenerateDialog = ref(false)
const generating = ref(false)
const compareIds = ref<number[]>([])

const generateForm = reactive({
  drill_name: '',
  start_time: new Date().toISOString()
})

onMounted(async () => {
  await reportStore.fetchReports()
  if (reportStore.reports.length > 0) {
    generateForm.drill_name = `消防演练 ${new Date().toLocaleDateString('zh-CN')}`
  }
})

async function handleSelectReport(report: DrillReport) {
  try {
    await reportStore.fetchReport(report.id)
    selectedReport.value = reportStore.currentReport
    activeTab.value = 'detail'
  } catch (err: any) {
    ElMessage.error('加载报告详情失败')
  }
}

async function handleGenerate() {
  if (!generateForm.drill_name) {
    ElMessage.warning('请输入演练名称')
    return
  }
  generating.value = true
  try {
    await reportStore.generateReport({
      drill_name: generateForm.drill_name,
      start_time: generateForm.start_time,
      total_buildings: 0,
      total_people: 0,
      evacuated_people: 0,
      total_vehicles: 0,
      statistics: {}
    })
    ElMessage.success('报告生成成功')
    showGenerateDialog.value = false
    generateForm.drill_name = `消防演练 ${new Date().toLocaleDateString('zh-CN')}`
    await reportStore.fetchReports()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.detail || '生成报告失败')
  } finally {
    generating.value = false
  }
}

async function handleExportPdf() {
  if (!selectedReport.value) return
  try {
    await reportStore.exportPdf(selectedReport.value.id)
    ElMessage.success('PDF 导出成功')
  } catch (err: any) {
    ElMessage.error('PDF 导出失败')
  }
}

async function handleExportExcel() {
  if (!selectedReport.value) return
  try {
    await reportStore.exportExcel(selectedReport.value.id)
    ElMessage.success('Excel 导出成功')
  } catch (err: any) {
    ElMessage.error('Excel 导出失败')
  }
}

function handleCompare(leftId: number, rightId: number) {
  compareIds.value = [leftId, rightId]
}
</script>

<style scoped>
.report-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.report-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.report-page-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.report-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.report-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
}

.report-tabs :deep(.el-tab-pane) {
  height: 100%;
}
</style>
