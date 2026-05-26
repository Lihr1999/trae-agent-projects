<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useCloudStore } from '../stores/cloudStore';
import { cloudWebSocket } from '../utils/websocket';
import { getWebGLInfo } from '../utils/webgl';
import CloudRenderer from '../components/CloudRenderer.vue';
import ControlPanel from '../components/ControlPanel.vue';
import PresetButtons from '../components/PresetButtons.vue';
import PerformanceMonitor from '../components/PerformanceMonitor.vue';
import StatusIndicator from '../components/StatusIndicator.vue';
import ConfigManager from '../components/ConfigManager.vue';
import AnomalyDemo from '../components/AnomalyDemo.vue';

const cloudStore = useCloudStore();
const rendererRef = ref<InstanceType<typeof CloudRenderer> | null>(null);
const webglInfo = getWebGLInfo();

onMounted(() => {
  cloudWebSocket.connect();
  cloudStore.setComputeShaderSupported(webglInfo.webglCompute);

  cloudWebSocket.setOnAlertCallback((alert) => {
    if (alert.level === 'warning') {
      console.warn('System warning:', alert.message);
    } else if (alert.level === 'error') {
      console.error('System error:', alert.message);
    }
  });

  const interval = setInterval(() => {
    if (rendererRef.value) {
      const renderer = rendererRef.value.getRenderer();
      if (renderer) {
        cloudStore.updatePerformance({
          memoryUsage: renderer.getMemoryUsage()
        });
        cloudWebSocket.sendPerformance(cloudStore.performanceMetrics);
      }
    }
  }, 1000);

  onUnmounted(() => clearInterval(interval));
});

onUnmounted(() => {
  cloudWebSocket.disconnect();
});
</script>

<template>
  <div class="home-page">
    <CloudRenderer ref="rendererRef" />

    <div class="ui-overlay">
      <PerformanceMonitor />
      <StatusIndicator />
      <ControlPanel />
      <PresetButtons />
      <ConfigManager />
      <AnomalyDemo />
    </div>

    <div v-if="!webglInfo.webgl2" class="webgl-warning">
      <div class="warning-content">
        <h3>WebGL 2.0 不受支持</h3>
        <p>您的浏览器不支持 WebGL 2.0，系统已自动降级到兼容模式。部分高级功能可能无法正常工作。</p>
        <p class="hint">建议使用 Chrome、Firefox 或 Edge 的最新版本以获得最佳体验。</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0e27;
}

.ui-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.webgl-warning {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 39, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.warning-content {
  max-width: 500px;
  text-align: center;
  padding: 40px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 16px;

  h3 {
    color: #f59e0b;
    font-family: 'Rajdhani', sans-serif;
    font-size: 24px;
    margin: 0 0 16px 0;
  }

  p {
    color: #c0c8e0;
    line-height: 1.6;
    margin: 0 0 12px 0;
    font-size: 14px;
  }

  .hint {
    color: #6b7280;
    font-size: 13px;
  }
}
</style>
