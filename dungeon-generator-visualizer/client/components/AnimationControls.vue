<template>
  <div class="animation-controls">
    <div class="control-group">
      <button
        class="btn btn-secondary"
        @click="togglePlay"
        :disabled="!hasAnimationData"
      >
        {{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}
      </button>
      <button
        class="btn btn-secondary"
        @click="reset"
        :disabled="!hasAnimationData"
      >
        ⏮ 重置
      </button>
      <button
        class="btn btn-secondary"
        @click="stepForward"
        :disabled="!hasAnimationData || isAtEnd"
      >
        ⏭ 步进
      </button>
    </div>

    <div class="control-group">
      <label class="form-label">动画速度: {{ speedLabel }}</label>
      <input
        type="range"
        class="slider"
        v-model.number="localSpeed"
        min="1"
        max="100"
        step="1"
      />
    </div>

    <div class="progress-bar" v-if="totalSteps > 0">
      <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      <div class="progress-text">
        {{ currentStep }} / {{ totalSteps }}
      </div>
    </div>

    <div class="animation-type">
      <label class="checkbox">
        <input type="radio" :value="'visited'" v-model="animationType" />
        节点展开动画
      </label>
      <label class="checkbox">
        <input type="radio" :value="'path'" v-model="animationType" />
        路径绘制动画
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps<{
  visited: string[];
  path: string[];
  isPlaying: boolean;
  currentStep: number;
  speed: number;
}>();

const emit = defineEmits<{
  (e: 'update:isPlaying', value: boolean): void;
  (e: 'update:currentStep', value: number): void;
  (e: 'update:speed', value: number): void;
  (e: 'animationFrame', visited: Set<string>, path: Set<string>): void;
}>();

const localSpeed = ref(props.speed);
const animationType = ref<'visited' | 'path'>('visited');
let animationFrameId: number | null = null;
let lastTimestamp = 0;

const hasAnimationData = computed(() => {
  return props.visited.length > 0 || props.path.length > 0;
});

const totalSteps = computed(() => {
  if (animationType.value === 'visited') {
    return props.visited.length;
  }
  return props.path.length;
});

const isAtEnd = computed(() => {
  return props.currentStep >= totalSteps.value;
});

const progressPercent = computed(() => {
  if (totalSteps.value === 0) return 0;
  return (props.currentStep / totalSteps.value) * 100;
});

const speedLabel = computed(() => {
  if (localSpeed.value < 20) return '极慢';
  if (localSpeed.value < 40) return '慢';
  if (localSpeed.value < 60) return '正常';
  if (localSpeed.value < 80) return '快';
  return '极快';
});

const animate = (timestamp: number) => {
  if (!props.isPlaying) return;

  const frameInterval = 1000 / (localSpeed.value * 0.6);
  
  if (timestamp - lastTimestamp >= frameInterval) {
    if (props.currentStep < totalSteps.value) {
      emit('update:currentStep', props.currentStep + 1);
      updateAnimationFrame(props.currentStep + 1);
    } else {
      emit('update:isPlaying', false);
      return;
    }
    lastTimestamp = timestamp;
  }

  animationFrameId = requestAnimationFrame(animate);
};

const updateAnimationFrame = (step: number) => {
  const visitedSet = new Set<string>();
  const pathSet = new Set<string>();

  if (animationType.value === 'visited') {
    for (let i = 0; i < Math.min(step, props.visited.length); i++) {
      visitedSet.add(props.visited[i]);
    }
  } else {
    for (let i = 0; i < props.visited.length; i++) {
      visitedSet.add(props.visited[i]);
    }
    for (let i = 0; i < Math.min(step, props.path.length); i++) {
      pathSet.add(props.path[i]);
    }
  }

  emit('animationFrame', visitedSet, pathSet);
};

const togglePlay = () => {
  if (isAtEnd.value) {
    emit('update:currentStep', 0);
  }
  emit('update:isPlaying', !props.isPlaying);
};

const reset = () => {
  emit('update:isPlaying', false);
  emit('update:currentStep', 0);
  updateAnimationFrame(0);
};

const stepForward = () => {
  if (props.currentStep < totalSteps.value) {
    const newStep = props.currentStep + 1;
    emit('update:currentStep', newStep);
    updateAnimationFrame(newStep);
  }
};

watch(
  () => props.isPlaying,
  (playing) => {
    if (playing) {
      lastTimestamp = performance.now();
      animationFrameId = requestAnimationFrame(animate);
    } else if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
);

watch(
  () => [props.visited, props.path],
  () => {
    emit('update:currentStep', 0);
    updateAnimationFrame(0);
  },
  { deep: true }
);

watch(localSpeed, (val) => {
  emit('update:speed', val);
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.animation-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: rgba(22, 33, 62, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group .btn {
  flex: 1;
}

.progress-bar {
  position: relative;
  height: 24px;
  background: #16213e;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #00b894);
  transition: width 0.1s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.animation-type {
  display: flex;
  gap: 16px;
}

.animation-type .checkbox {
  flex: 1;
}
</style>
