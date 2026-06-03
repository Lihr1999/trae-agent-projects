<template>
  <div class="report-charts">
    <div class="chart-grid">
      <div class="chart-item">
        <h4 class="chart-title">疏散时间线</h4>
        <div ref="evacuationTimelineRef" class="chart-container"></div>
      </div>
      <div class="chart-item">
        <h4 class="chart-title">建筑风险分布</h4>
        <div ref="riskDistributionRef" class="chart-container"></div>
      </div>
      <div class="chart-item">
        <h4 class="chart-title">各建筑疏散进度</h4>
        <div ref="evacuationProgressRef" class="chart-container"></div>
      </div>
      <div class="chart-item">
        <h4 class="chart-title">火情扩散趋势</h4>
        <div ref="fireSpreadRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  reportData: any
}>()

const evacuationTimelineRef = ref<HTMLElement | null>(null)
const riskDistributionRef = ref<HTMLElement | null>(null)
const evacuationProgressRef = ref<HTMLElement | null>(null)
const fireSpreadRef = ref<HTMLElement | null>(null)

let evacuationTimelineChart: echarts.ECharts | null = null
let riskDistributionChart: echarts.ECharts | null = null
let evacuationProgressChart: echarts.ECharts | null = null
let fireSpreadChart: echarts.ECharts | null = null

const darkTextColor = '#e0e0e0'
const mutedTextColor = '#888'
const borderColor = '#2a2a4a'

onMounted(() => {
  nextTick(() => {
    initAllCharts()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeAllCharts()
})

watch(() => props.reportData, () => {
  nextTick(() => {
    updateAllCharts()
  })
}, { deep: true })

function handleResize() {
  evacuationTimelineChart?.resize()
  riskDistributionChart?.resize()
  evacuationProgressChart?.resize()
  fireSpreadChart?.resize()
}

function disposeAllCharts() {
  evacuationTimelineChart?.dispose()
  riskDistributionChart?.dispose()
  evacuationProgressChart?.dispose()
  fireSpreadChart?.dispose()
  evacuationTimelineChart = null
  riskDistributionChart = null
  evacuationProgressChart = null
  fireSpreadChart = null
}

function initAllCharts() {
  if (evacuationTimelineRef.value) {
    evacuationTimelineChart = echarts.init(evacuationTimelineRef.value)
  }
  if (riskDistributionRef.value) {
    riskDistributionChart = echarts.init(riskDistributionRef.value)
  }
  if (evacuationProgressRef.value) {
    evacuationProgressChart = echarts.init(evacuationProgressRef.value)
  }
  if (fireSpreadRef.value) {
    fireSpreadChart = echarts.init(fireSpreadRef.value)
  }
  updateAllCharts()
}

function updateAllCharts() {
  initEvacuationTimelineChart()
  initRiskDistributionChart()
  initEvacuationProgressChart()
  initFireSpreadChart()
}

function initEvacuationTimelineChart() {
  if (!evacuationTimelineChart) return
  const data = props.reportData?.evacuationTimeline || generateDefaultTimelineData()
  evacuationTimelineChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e3048',
      borderColor: '#2a2a4a',
      textStyle: { color: darkTextColor }
    },
    legend: {
      data: ['已疏散人数', '剩余人数'],
      textStyle: { color: mutedTextColor },
      top: 0
    },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.timePoints || ['0分', '5分', '10分', '15分', '20分', '25分', '30分'],
      axisLabel: { color: mutedTextColor },
      axisLine: { lineStyle: { color: borderColor } }
    },
    yAxis: {
      type: 'value',
      name: '人数',
      nameTextStyle: { color: mutedTextColor },
      axisLabel: { color: mutedTextColor },
      axisLine: { lineStyle: { color: borderColor } },
      splitLine: { lineStyle: { color: borderColor, type: 'dashed' } }
    },
    series: [
      {
        name: '已疏散人数',
        type: 'line',
        data: data.evacuated || [0, 20, 80, 200, 350, 480, 550],
        smooth: true,
        lineStyle: { color: '#52b788', width: 2 },
        itemStyle: { color: '#52b788' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(82, 183, 136, 0.3)' },
            { offset: 1, color: 'rgba(82, 183, 136, 0.02)' }
          ])
        }
      },
      {
        name: '剩余人数',
        type: 'line',
        data: data.remaining || [600, 580, 520, 400, 250, 120, 50],
        smooth: true,
        lineStyle: { color: '#e94560', width: 2 },
        itemStyle: { color: '#e94560' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(233, 69, 96, 0.3)' },
            { offset: 1, color: 'rgba(233, 69, 96, 0.02)' }
          ])
        }
      }
    ]
  })
}

function initRiskDistributionChart() {
  if (!riskDistributionChart) return
  const data = props.reportData?.riskDistribution || [
    { name: '低风险', value: 8 },
    { name: '中风险', value: 5 },
    { name: '高风险', value: 3 },
    { name: '极高风险', value: 2 }
  ]
  riskDistributionChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e3048',
      borderColor: '#2a2a4a',
      textStyle: { color: darkTextColor },
      formatter: '{b}: {c}栋 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: mutedTextColor }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#1e3048',
          borderWidth: 2
        },
        label: {
          color: darkTextColor,
          formatter: '{b}\n{c}栋'
        },
        data: data.map((item: any, index: number) => ({
          ...item,
          itemStyle: {
            color: ['#52b788', '#fcbf49', '#f77f00', '#e63946'][index] || '#8d99ae'
          }
        }))
      }
    ]
  })
}

function initEvacuationProgressChart() {
  if (!evacuationProgressChart) return
  const data = props.reportData?.evacuationProgress || [
    { name: 'A栋', evacuated: 95, total: 100 },
    { name: 'B栋', evacuated: 78, total: 120 },
    { name: 'C栋', evacuated: 45, total: 80 },
    { name: 'D栋', evacuated: 30, total: 60 },
    { name: 'E栋', evacuated: 15, total: 90 }
  ]
  const categories = data.map((d: any) => d.name)
  const evacuatedData = data.map((d: any) => d.evacuated)
  const remainingData = data.map((d: any) => d.total - d.evacuated)
  evacuationProgressChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e3048',
      borderColor: '#2a2a4a',
      textStyle: { color: darkTextColor }
    },
    legend: {
      data: ['已疏散', '未疏散'],
      textStyle: { color: mutedTextColor },
      top: 0
    },
    grid: { left: 80, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'value',
      name: '人数',
      nameTextStyle: { color: mutedTextColor },
      axisLabel: { color: mutedTextColor },
      axisLine: { lineStyle: { color: borderColor } },
      splitLine: { lineStyle: { color: borderColor, type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: darkTextColor },
      axisLine: { lineStyle: { color: borderColor } }
    },
    series: [
      {
        name: '已疏散',
        type: 'bar',
        stack: 'total',
        data: evacuatedData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#2d6a4f' },
            { offset: 1, color: '#52b788' }
          ]),
          borderRadius: [0, 0, 0, 0]
        },
        barWidth: 16
      },
      {
        name: '未疏散',
        type: 'bar',
        stack: 'total',
        data: remainingData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#c1121f' },
            { offset: 1, color: '#e63946' }
          ]),
          borderRadius: [0, 4, 4, 0]
        },
        barWidth: 16
      }
    ]
  })
}

function initFireSpreadChart() {
  if (!fireSpreadChart) return
  const data = props.reportData?.fireSpread || { timePoints: ['0分', '5分', '10分', '15分', '20分', '25分', '30分'], radius: [5, 12, 25, 40, 55, 62, 65] }
  fireSpreadChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e3048',
      borderColor: '#2a2a4a',
      textStyle: { color: darkTextColor },
      formatter: (params: any) => {
        const p = params[0]
        return `${p.name}<br/>影响半径: ${p.value}m`
      }
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.timePoints,
      axisLabel: { color: mutedTextColor },
      axisLine: { lineStyle: { color: borderColor } },
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '半径(m)',
      nameTextStyle: { color: mutedTextColor },
      axisLabel: { color: mutedTextColor },
      axisLine: { lineStyle: { color: borderColor } },
      splitLine: { lineStyle: { color: borderColor, type: 'dashed' } }
    },
    series: [
      {
        type: 'line',
        data: data.radius,
        smooth: true,
        lineStyle: { color: '#f77f00', width: 2 },
        itemStyle: { color: '#f77f00' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(247, 127, 0, 0.4)' },
            { offset: 0.5, color: 'rgba(230, 57, 70, 0.2)' },
            { offset: 1, color: 'rgba(230, 57, 70, 0.02)' }
          ])
        },
        markLine: {
          silent: true,
          lineStyle: { color: '#e63946', type: 'dashed' },
          data: [{ yAxis: 60, label: { formatter: '警戒线', color: '#e63946' } }]
        }
      }
    ]
  })
}

function generateDefaultTimelineData() {
  return {
    timePoints: ['0分', '5分', '10分', '15分', '20分', '25分', '30分'],
    evacuated: [0, 20, 80, 200, 350, 480, 550],
    remaining: [600, 580, 520, 400, 250, 120, 50]
  }
}
</script>

<style scoped>
.report-charts {
  width: 100%;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.chart-container {
  width: 100%;
  height: 260px;
}
</style>
