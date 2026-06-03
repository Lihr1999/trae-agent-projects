<template>
  <div />
</template>

<script setup lang="ts">
import { ElNotification } from 'element-plus'

function success(msg: string) {
  ElNotification({ title: '成功', message: msg, type: 'success', duration: 3000 })
}

function error(msg: string) {
  ElNotification({ title: '错误', message: msg, type: 'error', duration: 5000 })
}

function warning(msg: string) {
  ElNotification({ title: '警告', message: msg, type: 'warning', duration: 4000 })
}

function info(msg: string) {
  ElNotification({ title: '提示', message: msg, type: 'info', duration: 3000 })
}

defineExpose({ success, error, warning, info })
</script>

<script lang="ts">
export function useNotifications() {
  const success = (msg: string) => {
    ElNotification({ title: '成功', message: msg, type: 'success', duration: 3000 })
  }
  const error = (msg: string) => {
    ElNotification({ title: '错误', message: msg, type: 'error', duration: 5000 })
  }
  const warning = (msg: string) => {
    ElNotification({ title: '警告', message: msg, type: 'warning', duration: 4000 })
  }
  const info = (msg: string) => {
    ElNotification({ title: '提示', message: msg, type: 'info', duration: 3000 })
  }
  return { success, error, warning, info }
}
</script>

<style scoped>
</style>
