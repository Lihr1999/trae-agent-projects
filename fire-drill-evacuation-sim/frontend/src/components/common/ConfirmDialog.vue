<template>
  <div />
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import type { Action } from 'element-plus'

const props = defineProps<{
  title: string
  message: string
  type?: 'success' | 'warning' | 'info' | 'error'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function show() {
  ElMessageBox.confirm(props.message, props.title, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: props.type || 'warning',
    customClass: 'fire-drill-confirm-dialog',
    callback: (action: Action) => {
      if (action === 'confirm') {
        emit('confirm')
      } else {
        emit('cancel')
      }
    }
  })
}

defineExpose({ show })
</script>

<style>
.fire-drill-confirm-dialog {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border-color) !important;
}

.fire-drill-confirm-dialog .el-message-box__title {
  color: var(--text-primary) !important;
}

.fire-drill-confirm-dialog .el-message-box__message {
  color: var(--text-secondary) !important;
}
</style>
