<template>
  <div class="config-panel">
    <div class="panel">
      <h3 class="panel-title">🏰 地牢生成参数</h3>
      
      <div class="form-group">
        <label class="form-label">生成器类型</label>
        <select class="form-select" v-model="localConfig.generatorType">
          <option value="bsp">BSP 树房间</option>
          <option value="cave">Drunkard Walker 洞穴</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">
          地图尺寸: {{ localConfig.width }} × {{ localConfig.height }}
        </label>
        <div class="slider-group">
          <label class="form-label">宽度</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.width"
            min="10"
            max="200"
            step="10"
          />
        </div>
        <div class="slider-group">
          <label class="form-label">高度</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.height"
            min="10"
            max="200"
            step="10"
          />
        </div>
      </div>

      <template v-if="localConfig.generatorType === 'bsp'">
        <div class="form-group">
          <label class="form-label">
            房间数量: {{ localConfig.minRooms }} - {{ localConfig.maxRooms }}
          </label>
          <div class="slider-group">
            <label class="form-label">最小房间数</label>
            <input
              type="range"
              class="slider"
              v-model.number="localConfig.minRooms"
              min="2"
              max="50"
              step="1"
            />
          </div>
          <div class="slider-group">
            <label class="form-label">最大房间数</label>
            <input
              type="range"
              class="slider"
              v-model.number="localConfig.maxRooms"
              :min="localConfig.minRooms"
              max="50"
              step="1"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            房间尺寸: {{ localConfig.minRoomSize }} - {{ localConfig.maxRoomSize }}
          </label>
          <div class="slider-group">
            <label class="form-label">最小尺寸</label>
            <input
              type="range"
              class="slider"
              v-model.number="localConfig.minRoomSize"
              min="3"
              max="20"
              step="1"
            />
          </div>
          <div class="slider-group">
            <label class="form-label">最大尺寸</label>
            <input
              type="range"
              class="slider"
              v-model.number="localConfig.maxRoomSize"
              :min="localConfig.minRoomSize"
              max="30"
              step="1"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">BSP 分割深度: {{ localConfig.bspDepth }}</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.bspDepth"
            min="1"
            max="8"
            step="1"
          />
        </div>

        <div class="form-group">
          <label class="form-label">走廊弯曲度: {{ (localConfig.corridorBendiness ?? 0).toFixed(2) }}</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.corridorBendiness"
            min="0"
            max="1"
            step="0.05"
          />
        </div>

        <div class="form-group">
          <label class="form-label">门密度: {{ (localConfig.doorDensity ?? 0).toFixed(2) }}</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.doorDensity"
            min="0"
            max="1"
            step="0.05"
          />
        </div>

        <div class="form-group">
          <label class="form-label">宝箱密度: {{ (localConfig.chestDensity ?? 0).toFixed(2) }}</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.chestDensity"
            min="0"
            max="1"
            step="0.05"
          />
        </div>

        <div class="form-group">
          <label class="form-label">怪物密度: {{ (localConfig.monsterDensity ?? 0).toFixed(2) }}</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.monsterDensity"
            min="0"
            max="1"
            step="0.05"
          />
        </div>

        <div class="form-group">
          <label class="form-label">陷阱密度: {{ (localConfig.trapDensity ?? 0).toFixed(2) }}</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.trapDensity"
            min="0"
            max="0.5"
            step="0.01"
          />
        </div>
      </template>

      <template v-if="localConfig.generatorType === 'cave'">
        <div class="form-group">
          <label class="form-label">
            初始填充概率: {{ localConfig.caveFillProbability?.toFixed(2) }}
          </label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.caveFillProbability"
            min="0.3"
            max="0.6"
            step="0.01"
          />
        </div>

        <div class="form-group">
          <label class="form-label">平滑迭代次数: {{ localConfig.caveSmoothingIterations }}</label>
          <input
            type="range"
            class="slider"
            v-model.number="localConfig.caveSmoothingIterations"
            min="1"
            max="10"
            step="1"
          />
        </div>
      </template>

      <div class="form-group">
        <label class="form-label">随机种子</label>
        <div class="seed-input">
          <input
            type="number"
            class="form-input"
            v-model.number="localConfig.seed"
          />
          <button class="btn btn-secondary" @click="randomizeSeed">🎲</button>
        </div>
      </div>

      <div class="button-group">
        <button
          class="btn btn-primary"
          @click="generate"
          :disabled="isGenerating"
        >
          {{ isGenerating ? '生成中...' : '🎮 生成地牢' }}
        </button>
        <button class="btn btn-secondary" @click="resetConfig">🔄 重置</button>
      </div>
    </div>

    <div class="panel">
      <h3 class="panel-title">📋 预设场景</h3>
      <div class="preset-buttons">
        <button
          v-for="preset in presets"
          :key="preset.id"
          class="btn btn-secondary preset-btn"
          @click="loadPreset(preset)"
          :title="preset.description"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>

    <div class="panel">
      <h3 class="panel-title">🗺️ 寻路设置</h3>
      
      <div class="form-group">
        <label class="form-label">选择算法</label>
        <select class="form-select" v-model="selectedAlgorithm">
          <option value="astar">A* 算法</option>
          <option value="dijkstra">Dijkstra 算法</option>
          <option value="jps">JPS (Jump Point Search)</option>
          <option value="bfs">BFS (广度优先)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="checkbox">
          <input type="checkbox" v-model="allowDiagonal" />
          允许对角移动
        </label>
      </div>

      <div class="button-group">
        <button
          class="btn btn-success"
          @click="compareAll"
          :disabled="!canFindPath || isComparing"
        >
          {{ isComparing ? '对比中...' : '⚡ 对比所有算法' }}
        </button>
      </div>

      <div class="hint">
        💡 提示: 点击地图设置起点(🚩)和终点(🎯)，然后运行寻路算法
      </div>
    </div>

    <div class="panel" v-if="comparisonResults.length > 0">
      <h3 class="panel-title">📊 算法对比结果</h3>
      <div class="comparison-table">
        <div class="comparison-header">
          <span>算法</span>
          <span>耗时</span>
          <span>节点数</span>
          <span>路径长度</span>
        </div>
        <div
          v-for="result in sortedComparisonResults"
          :key="result.algorithm"
          class="comparison-row"
          :class="{ 'best': result.algorithm === bestAlgorithm }"
        >
          <span class="algorithm-name">{{ result.algorithm }}</span>
          <span :class="{ 'best': result.algorithm === bestAlgorithm }">
            {{ (result.timeMs ?? 0).toFixed(2) }}ms
          </span>
          <span>{{ result.nodesExpanded }}</span>
          <span>{{ result.pathLength }}</span>
        </div>
      </div>
      <div class="best-algorithm" v-if="bestAlgorithm">
        🏆 最快算法: {{ bestAlgorithm }}
      </div>
    </div>

    <div class="panel" v-if="currentPathResult">
      <h3 class="panel-title">📈 当前寻路结果</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">算法</span>
          <span class="stat-value">{{ currentPathResult.algorithm }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">耗时</span>
          <span class="stat-value">{{ (currentPathResult.timeMs ?? 0).toFixed(2) }}ms</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">展开节点</span>
          <span class="stat-value">{{ currentPathResult.nodesExpanded }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">路径长度</span>
          <span class="stat-value">{{ currentPathResult.pathLength }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">最大OpenSet</span>
          <span class="stat-value">{{ currentPathResult.maxOpenSetSize }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">结果</span>
          <span class="stat-value" :class="{ 'success': currentPathResult.found, 'error': !currentPathResult.found }">
            {{ currentPathResult.found ? '✓ 找到路径' : '✗ 无法到达' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useApi } from '~/composables/useApi';
import type { DungeonConfig, PresetScenario, PathResult } from '~/types';

const props = defineProps<{
  config: DungeonConfig;
  isGenerating: boolean;
  canFindPath: boolean;
  currentPathResult: PathResult | null;
  comparisonResults: PathResult[];
  bestAlgorithm: string | null;
  isComparing: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:config', config: DungeonConfig): void;
  (e: 'generate'): void;
  (e: 'reset'): void;
  (e: 'compareAll'): void;
  (e: 'update:selectedAlgorithm', algo: 'astar' | 'dijkstra' | 'jps' | 'bfs'): void;
  (e: 'update:allowDiagonal', value: boolean): void;
}>();

const { getPresets } = useApi();

const localConfig = reactive<DungeonConfig>({ ...props.config });
const selectedAlgorithm = ref<'astar' | 'dijkstra' | 'jps' | 'bfs'>('astar');
const allowDiagonal = ref(false);
const presets = ref<PresetScenario[]>([]);

const sortedComparisonResults = computed(() => {
  return [...props.comparisonResults].sort((a, b) => a.timeMs - b.timeMs);
});

watch(
  () => props.config,
  (newConfig) => {
    Object.assign(localConfig, newConfig);
  },
  { deep: true }
);

const randomizeSeed = () => {
  localConfig.seed = Math.floor(Math.random() * 100000);
};

const generate = () => {
  emit('update:config', { ...localConfig });
  emit('generate');
};

const resetConfig = () => {
  emit('reset');
};

const loadPreset = (preset: PresetScenario) => {
  Object.assign(localConfig, preset.config);
  emit('update:config', { ...localConfig });
  emit('generate');
};

const compareAll = () => {
  emit('compareAll');
};

watch(selectedAlgorithm, (val) => {
  emit('update:selectedAlgorithm', val);
});

watch(allowDiagonal, (val) => {
  emit('update:allowDiagonal', val);
});

onMounted(async () => {
  presets.value = await getPresets();
});
</script>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
  max-height: 100%;
}

.slider-group {
  margin-top: 4px;
}

.seed-input {
  display: flex;
  gap: 8px;
}

.seed-input .form-input {
  flex: 1;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.button-group .btn {
  flex: 1;
}

.preset-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-btn {
  width: 100%;
  text-align: left;
  white-space: normal;
  line-height: 1.3;
}

.hint {
  font-size: 12px;
  color: #a0a0a0;
  margin-top: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.comparison-table {
  font-size: 12px;
}

.comparison-header,
.comparison-row {
  display: grid;
  grid-template-columns: 80px 60px 60px 70px;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.comparison-header {
  font-weight: 600;
  color: #e94560;
}

.comparison-row.best {
  background: rgba(0, 184, 148, 0.1);
  border-radius: 4px;
  padding: 6px 8px;
}

.comparison-row .best {
  color: #00b894;
  font-weight: 600;
}

.algorithm-name {
  font-weight: 500;
}

.best-algorithm {
  margin-top: 12px;
  padding: 8px;
  background: rgba(0, 184, 148, 0.2);
  border-radius: 4px;
  text-align: center;
  font-weight: 600;
  color: #00b894;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.stat-label {
  font-size: 11px;
  color: #a0a0a0;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
}

.stat-value.success {
  color: #00b894;
}

.stat-value.error {
  color: #e94560;
}
</style>
