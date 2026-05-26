<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useCloudStore } from '../stores/cloudStore';
import { AlertTriangle, Zap, Database, MonitorX, X } from 'lucide-vue-next';

const cloudStore = useCloudStore();
const { params, isTransitioning } = storeToRefs(cloudStore);

const showPanel = ref(false);
const showConfirmDialog = ref<string | null>(null);

interface AnomalyTest {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  confirmText: string;
  action: () => void;
}

const tests: AnomalyTest[] = [
  {
    id: 'noise-visualization',
    name: '噪点可视化',
    description: '降低采样精度，展示体积采样不足时的噪点效果',
    icon: AlertTriangle,
    color: '#f59e0b',
    confirmText: '开启噪点可视化将显著降低采样步数，产生明显的噪点和条纹效果。是否继续？',
    action: () => {
      cloudStore.updateParams({
        sampleCount: 16,
        noiseVisualization: true
      });
    }
  },
  {
    id: 'framerate-crash',
    name: '帧率崩溃测试',
    description: '将参数调至极限，展示帧率大幅下降现象',
    icon: Zap,
    color: '#ef4444',
    confirmText: '此测试将大幅提高渲染复杂度，可能导致帧率骤降至 10 FPS 以下。是否继续？',
    action: () => {
      cloudStore.updateParams({
        cloudDensity: 5.0,
        cloudThickness: 10.0,
        cloudCoverage: 1.0,
        sampleCount: 256,
        noiseResolution: 256,
        renderScale: 2.0,
        noiseVisualization: false
      });
    }
  },
  {
    id: 'memory-limit',
    name: '纹理内存限制',
    description: '触发 WebGL 纹理内存限制，测试渲染失败处理机制',
    icon: Database,
    color: '#8b5cf6',
    confirmText: '此测试将尝试创建超大纹理，可能触发 WebGL 内存警告或渲染失败。系统应自动降级处理。是否继续？',
    action: () => {
      cloudStore.updateParams({
        renderScale: 3.0,
        noiseResolution: 512,
        sampleCount: 192,
        noiseVisualization: false
      });
    }
  },
  {
    id: 'fallback-mode',
    name: '优雅降级演示',
    description: '模拟浏览器不支持计算着色器时的降级渲染效果',
    icon: MonitorX,
    color: '#06b6d4',
    confirmText: '此测试将切换到降级渲染模式，关闭计算着色器优化，展示兼容模式的渲染效果。是否继续？',
    action: () => {
      cloudStore.setComputeShaderSupported(false);
      cloudStore.updateParams({
        sampleCount: 48,
        renderScale: 0.75,
        noiseVisualization: false
      });
    }
  }
];

function triggerTest(test: AnomalyTest) {
  showConfirmDialog.value = test.id;
}

function confirmTest(testId: string) {
  const test = tests.find(t => t.id === testId);
  if (test) {
    test.action();
  }
  showConfirmDialog.value = null;
}

function resetToNormal() {
  cloudStore.updateParams({
    sampleCount: 96,
    renderScale: 1.0,
    noiseResolution: 128,
    noiseVisualization: false
  });
  cloudStore.setComputeShaderSupported(true);
}
</script>

<template>
  <div class="anomaly-demo">
    <button class="toggle-btn" @click="showPanel = !showPanel">
      <AlertTriangle :size="18" />
      <span>异常演示</span>
    </button>

    <div v-if="showPanel" class="anomaly-panel">
      <div class="panel-header">
        <h3>边界测试与异常演示</h3>
        <button class="close-btn" @click="showPanel = false">
          <X :size="16" />
        </button>
      </div>

      <div class="panel-content">
        <div
          v-for="test in tests"
          :key="test.id"
          class="test-card"
          :style="{ borderColor: test.color + '40' }"
        >
          <div class="test-icon" :style="{ background: test.color + '20', color: test.color }">
            <component :is="test.icon" :size="20" />
          </div>
          <div class="test-info">
            <div class="test-name" :style="{ color: test.color }">{{ test.name }}</div>
            <div class="test-desc">{{ test.description }}</div>
          </div>
          <button
            class="test-btn"
            :style="{ borderColor: test.color, color: test.color }"
            :disabled="isTransitioning"
            @click="triggerTest(test)"
          >
            触发
          </button>
        </div>

        <button class="reset-btn" @click="resetToNormal">
          重置为正常模式
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showConfirmDialog"
        class="confirm-overlay"
        @click.self="showConfirmDialog = null"
      >
        <div class="confirm-dialog">
          <div class="confirm-icon" :style="{ color: tests.find(t => t.id === showConfirmDialog)?.color }">
            <AlertTriangle :size="32" />
          </div>
          <h4 class="confirm-title">确认操作</h4>
          <p class="confirm-text">
            {{ tests.find(t => t.id === showConfirmDialog)?.confirmText }}
          </p>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="showConfirmDialog = null">取消</button>
            <button
              class="btn-confirm"
              :style="{ background: tests.find(t => t.id === showConfirmDialog)?.color }"
              @click="confirmTest(showConfirmDialog!)"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.anomaly-demo {
  position: absolute;
  bottom: 100px;
  right: 20px;
  z-index: 100;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(239, 68, 68, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.5);
  }
}

.anomaly-panel {
  position: absolute;
  bottom: 50px;
  right: 0;
  width: 320px;
  background: rgba(15, 20, 45, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), transparent);
}

.panel-header h3 {
  margin: 0;
  color: #ef4444;
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f0f4ff;
  }
}

.panel-content {
  padding: 12px;
}

.test-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.test-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
}

.test-info {
  flex: 1;
  min-width: 0;
}

.test-name {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 2px;
}

.test-desc {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
}

.test-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: currentColor;
    color: #0a0e27 !important;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.reset-btn {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  background: rgba(107, 114, 128, 0.2);
  border: 1px solid rgba(107, 114, 128, 0.3);
  border-radius: 8px;
  color: #c0c8e0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(107, 114, 128, 0.3);
  }
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.confirm-dialog {
  background: rgba(15, 20, 45, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  animation: scaleIn 0.3s ease;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.confirm-icon {
  margin-bottom: 16px;
}

.confirm-title {
  margin: 0 0 12px 0;
  color: #f0f4ff;
  font-size: 18px;
  font-weight: 600;
}

.confirm-text {
  color: #a0a8c0;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-cancel {
  background: rgba(107, 114, 128, 0.3);
  color: #c0c8e0;

  &:hover {
    background: rgba(107, 114, 128, 0.5);
  }
}

.btn-confirm {
  color: white;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}
</style>
