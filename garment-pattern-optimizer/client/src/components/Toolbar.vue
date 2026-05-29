<script setup lang="ts">
import { usePatternStore } from '../stores/patternStore';
import type { ToolType } from '../types';

const patternStore = usePatternStore();

interface ToolConfig {
  id: ToolType;
  name: string;
  tooltip: string;
  iconPath: string;
}

const tools: ToolConfig[] = [
  {
    id: 'select',
    name: '选择',
    tooltip: '选择和编辑多边形',
    iconPath: 'M15.043 12.69l5.585 5.585a1 1 0 01-1.414 1.414l-5.585-5.585a1 1 0 011.414-1.414zM12 2a1 1 0 011 1v8.586l3.293-3.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L11 11.586V3a1 1 0 011-1z'
  },
  {
    id: 'pen',
    name: '画笔',
    tooltip: '绘制自由多边形',
    iconPath: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
  },
  {
    id: 'rectangle',
    name: '矩形',
    tooltip: '绘制矩形',
    iconPath: 'M4 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z'
  },
  {
    id: 'move',
    name: '移动',
    tooltip: '移动选中的多边形',
    iconPath: 'M7 11V7a5 5 0 0110 0v4m-7 0h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2zm0 0a2 2 0 114 0v0a2 2 0 01-4 0z'
  },
  {
    id: 'rotate',
    name: '旋转',
    tooltip: '旋转选中的多边形',
    iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
  },
  {
    id: 'delete',
    name: '删除',
    tooltip: '删除选中的多边形',
    iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
  }
];

function handleSetTool(tool: ToolType) {
  if (tool === 'delete') {
    if (patternStore.drawingState.selectedPolygonId) {
      patternStore.deletePolygon(patternStore.drawingState.selectedPolygonId);
    }
  } else {
    patternStore.setTool(tool);
  }
}
</script>

<template>
  <div class="flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2 border border-gray-200">
    <button
      v-for="tool in tools"
      :key="tool.id"
      @click="handleSetTool(tool.id)"
      class="group relative w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ease-out hover:bg-gray-100 active:scale-95"
      :class="[
        patternStore.currentTool === tool.id
          ? 'bg-primary-500 text-white shadow-md hover:bg-primary-600'
          : 'text-gray-600 hover:text-gray-900'
      ]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-6 h-6 transition-transform duration-200 group-hover:scale-110"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path :d="tool.iconPath" />
      </svg>

      <div class="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 whitespace-nowrap z-50">
        <div class="font-medium">{{ tool.name }}</div>
        <div class="text-xs text-gray-300">{{ tool.tooltip }}</div>
        <div class="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-gray-900" />
      </div>
    </button>
  </div>
</template>
