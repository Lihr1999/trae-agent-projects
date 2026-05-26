<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useCloudStore } from '../stores/cloudStore';
import { VolumetricCloudRenderer } from '../utils/VolumetricCloudRenderer';

const containerRef = ref<HTMLDivElement | null>(null);
const cloudStore = useCloudStore();
const { params, ripples } = storeToRefs(cloudStore);

let renderer: VolumetricCloudRenderer | null = null;

onMounted(() => {
  if (containerRef.value) {
    renderer = new VolumetricCloudRenderer(containerRef.value, params.value);

    renderer.setOnPerformanceUpdate((fps, frameTime) => {
      cloudStore.updatePerformance({ fps, frameTime });
    });

    renderer.setOnError((error) => {
      console.warn('Renderer warning:', error);
    });

    cloudStore.setComputeShaderSupported(!renderer.isFallbackMode());

    renderer.start();
  }
});

watch(
  () => ({ ...params.value }),
  (newParams) => {
    if (renderer) {
      renderer.setParams(newParams);
    }
  },
  { deep: true }
);

onUnmounted(() => {
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
});

defineExpose({
  getRenderer: () => renderer
});
</script>

<template>
  <div ref="containerRef" class="cloud-renderer-container">
    <div
      v-for="ripple in ripples"
      :key="ripple.id"
      class="ripple"
      :style="{
        left: ripple.x + 'px',
        top: ripple.y + 'px',
        animationDelay: '0ms'
      }"
    ></div>
  </div>
</template>

<style lang="scss" scoped>
.cloud-renderer-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(to bottom, #0a0e27 0%, #1a1f3a 50%, #2d1b4e 100%);
}

.ripple {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(123, 44, 191, 0.8);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: ripple-expand 1s ease-out forwards;
}

@keyframes ripple-expand {
  0% {
    width: 10px;
    height: 10px;
    opacity: 1;
    border-width: 3px;
  }
  100% {
    width: 200px;
    height: 200px;
    opacity: 0;
    border-width: 1px;
  }
}
</style>
