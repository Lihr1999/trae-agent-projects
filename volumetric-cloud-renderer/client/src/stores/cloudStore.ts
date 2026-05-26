import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CloudRenderParams, Config, PresetScene, PerformanceMetrics, SystemStatus } from '../types';
import { DEFAULT_PARAMS } from '../types';

export const useCloudStore = defineStore('cloud', () => {
  const params = ref<CloudRenderParams>({ ...DEFAULT_PARAMS });
  const targetParams = ref<CloudRenderParams | null>(null);
  const configs = ref<Config[]>([]);
  const presets = ref<PresetScene[]>([]);
  const currentPresetId = ref<string | null>(null);
  const currentConfigId = ref<string | null>(null);

  const performanceMetrics = ref<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    drawCalls: 0,
    timestamp: new Date().toISOString()
  });

  const systemStatus = ref<SystemStatus>('normal');
  const statusMessage = ref<string>('');
  const isTransitioning = ref(false);
  const computeShaderSupported = ref(true);
  const ripples = ref<Array<{ x: number; y: number; startTime: number; id: number }>>([]);

  const isLowPerformance = computed(() => performanceMetrics.value.fps < 20);
  const isCriticalPerformance = computed(() => performanceMetrics.value.fps < 10);

  function updateParams(newParams: Partial<CloudRenderParams>, ripplePos?: { x: number; y: number }) {
    params.value = { ...params.value, ...newParams };

    if (ripplePos) {
      addRipple(ripplePos.x, ripplePos.y);
    }
  }

  function addRipple(x: number, y: number) {
    const id = Date.now() + Math.random();
    ripples.value.push({ x, y, startTime: Date.now(), id });
    setTimeout(() => {
      ripples.value = ripples.value.filter(r => r.id !== id);
    }, 1000);
  }

  async function transitionToParams(target: CloudRenderParams, duration: number = 2000) {
    if (isTransitioning.value) return;

    isTransitioning.value = true;
    targetParams.value = { ...target };

    const startParams = { ...params.value };
    const startTime = Date.now();

    return new Promise<void>((resolve) => {
      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        const eased = easeInOutCubic(progress);

        const interpolated: Partial<CloudRenderParams> = {};
        (Object.keys(target) as Array<keyof CloudRenderParams>).forEach(key => {
          const startVal = startParams[key] as number;
          const targetVal = target[key] as number;
          if (typeof startVal === 'number' && typeof targetVal === 'number') {
            (interpolated[key] as number) = startVal + (targetVal - startVal) * eased;
          }
        });

        updateParams(interpolated as Partial<CloudRenderParams>);

        if (progress < 1.0) {
          requestAnimationFrame(animate);
        } else {
          isTransitioning.value = false;
          targetParams.value = null;
          resolve();
        }
      }
      animate();
    });
  }

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function updatePerformance(metrics: Partial<PerformanceMetrics>) {
    performanceMetrics.value = { ...performanceMetrics.value, ...metrics, timestamp: new Date().toISOString() };

    if (metrics.fps !== undefined) {
      if (metrics.fps < 10) {
        systemStatus.value = 'error';
        statusMessage.value = '性能严重不足，建议降低渲染质量';
      } else if (metrics.fps < 20) {
        systemStatus.value = 'warning';
        statusMessage.value = '性能较低，考虑调整参数';
      } else {
        systemStatus.value = 'normal';
        statusMessage.value = '';
      }
    }
  }

  function setComputeShaderSupported(supported: boolean) {
    computeShaderSupported.value = supported;
  }

  function loadPreset(preset: PresetScene) {
    currentPresetId.value = preset.id;
    currentConfigId.value = null;
    return transitionToParams(preset.params);
  }

  function loadConfig(config: Config) {
    currentConfigId.value = config.id;
    currentPresetId.value = null;
    return transitionToParams(config.params);
  }

  function resetToDefault() {
    currentPresetId.value = null;
    currentConfigId.value = null;
    return transitionToParams(DEFAULT_PARAMS);
  }

  function setConfigs(newConfigs: Config[]) {
    configs.value = newConfigs;
  }

  function setPresets(newPresets: PresetScene[]) {
    presets.value = newPresets;
  }

  return {
    params,
    targetParams,
    configs,
    presets,
    currentPresetId,
    currentConfigId,
    performanceMetrics,
    systemStatus,
    statusMessage,
    isTransitioning,
    computeShaderSupported,
    ripples,
    isLowPerformance,
    isCriticalPerformance,
    updateParams,
    addRipple,
    transitionToParams,
    updatePerformance,
    setComputeShaderSupported,
    loadPreset,
    loadConfig,
    resetToDefault,
    setConfigs,
    setPresets
  };
});
