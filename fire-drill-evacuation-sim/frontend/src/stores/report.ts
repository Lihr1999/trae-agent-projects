import { defineStore } from 'pinia'
import { ref } from 'vue'
import { reportApi } from '@/services/api'
import type { DrillReport } from '@/types'

export const useReportStore = defineStore('report', () => {
  const reports = ref<DrillReport[]>([])
  const currentReport = ref<DrillReport | null>(null)

  async function fetchReports() {
    const res = await reportApi.getAll()
    reports.value = res.data
  }

  async function generateReport(data: Partial<DrillReport>) {
    const res = await reportApi.generate(data)
    reports.value.push(res.data)
    currentReport.value = res.data
    return res.data
  }

  async function fetchReport(id: number) {
    const res = await reportApi.getById(id)
    currentReport.value = res.data
    return res.data
  }

  async function exportPdf(id: number) {
    const res = await reportApi.exportPdf(id)
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report-${id}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  async function exportExcel(id: number) {
    const res = await reportApi.exportExcel(id)
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report-${id}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return {
    reports,
    currentReport,
    fetchReports,
    generateReport,
    fetchReport,
    exportPdf,
    exportExcel
  }
})
