<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          🏰 程序化地牢生成与寻路可视化器
          <span class="subtitle">Procedural Dungeon Generator & Pathfinder Visualizer</span>
        </h1>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="showHelp = !showHelp">
            ❓ 帮助
          </button>
        </div>
      </div>
    </header>

    <div class="main-content">
      <aside class="sidebar">
        <ConfigPanel
          :config="store.config"
          :isGenerating="store.isGenerating"
          :canFindPath="canFindPath"
          :currentPathResult="store.currentPathResult"
          :comparisonResults="store.pathfindingComparison.results"
          :bestAlgorithm="store.pathfindingComparison.bestAlgorithm"
          :isComparing="store.pathfindingComparison.isComparing"
          @update:config="store.setConfig"
          @generate="generateDungeon"
          @reset="store.resetConfig"
          @compareAll="compareAllAlgorithms"
          @update:selectedAlgorithm="store.selectedAlgorithm = $event"
          @update:allowDiagonal="store.allowDiagonal = $event"
        />
      </aside>

      <main class="canvas-area">
        <div class="canvas-toolbar">
          <div class="toolbar-left">
            <button
              class="btn btn-secondary"
              @click="setPointMode = setPointMode === 'start' ? null : 'start'"
              :class="{ active: setPointMode === 'start' }"
              :disabled="!store.dungeonResult"
            >
              🚩 设置起点
            </button>
            <button
              class="btn btn-secondary"
              @click="setPointMode = setPointMode === 'end' ? null : 'end'"
              :class="{ active: setPointMode === 'end' }"
              :disabled="!store.dungeonResult"
            >
              🎯 设置终点
            </button>
            <button
              class="btn btn-primary"
              @click="runPathfinding"
              :disabled="!canFindPath || store.isPathfinding"
            >
              {{ store.isPathfinding ? '寻路中...' : '🗺️ 开始寻路' }}
            </button>
            <button
              class="btn btn-secondary"
              @click="store.clearPathfinding"
              :disabled="!store.currentPathResult && store.pathfindingComparison.results.length === 0"
            >
              🗑️ 清除路径
            </button>
          </div>
          <div class="toolbar-right">
            <label class="checkbox">
              <input type="checkbox" v-model="showBSP" />
              显示BSP树
            </label>
            <button
              class="btn btn-secondary"
              @click="fitCanvas"
              :disabled="!store.dungeonResult"
            >
              🔍 适配屏幕
            </button>
          </div>
        </div>

        <div class="canvas-wrapper">
          <DungeonCanvas
            ref="canvasRef"
            :tiles="store.displayTiles"
            :visitedTiles="store.visitedTiles"
            :pathTiles="store.pathTiles"
            :animationVisited="animationVisited"
            :animationPath="animationPath"
            :showBSP="showBSP"
            :bspTree="store.dungeonResult?.bspTree"
            @tileClick="handleTileClick"
          />
          
          <div v-if="!store.dungeonResult" class="empty-state">
            <div class="empty-icon">🏰</div>
            <h2>欢迎使用程序化地牢生成器</h2>
            <p>调整左侧参数并点击"生成地牢"开始</p>
            <p>或选择预设场景快速体验</p>
          </div>
        </div>

        <div class="animation-bar" v-if="store.currentPathResult || store.pathfindingComparison.results.length > 0">
          <AnimationControls
            :visited="visitedArray"
            :path="pathArray"
            v-model:isPlaying="store.animationState.isPlaying"
            v-model:currentStep="store.animationState.currentStep"
            v-model:speed="store.animationState.speed"
            @animationFrame="handleAnimationFrame"
          />
        </div>
      </main>
    </div>

    <div v-if="showHelp" class="help-modal" @click.self="showHelp = false">
      <div class="help-content">
        <div class="help-header">
          <h2>📖 使用帮助</h2>
          <button class="btn btn-secondary" @click="showHelp = false">✕</button>
        </div>
        <div class="help-body">
          <section>
            <h3>🎮 基本操作</h3>
            <ul>
              <li><strong>生成地牢</strong>: 调整左侧参数后点击"生成地牢"按钮</li>
              <li><strong>设置起点</strong>: 点击"设置起点"按钮，然后点击地图上的可行走区域</li>
              <li><strong>设置终点</strong>: 点击"设置终点"按钮，然后点击地图上的可行走区域</li>
              <li><strong>寻路</strong>: 设置起点和终点后，选择算法并点击"开始寻路"</li>
              <li><strong>对比算法</strong>: 点击"对比所有算法"查看四种算法的性能对比</li>
            </ul>
          </section>
          <section>
            <h3>🖱️ 地图交互</h3>
            <ul>
              <li><strong>滚轮缩放</strong>: 使用鼠标滚轮缩放地图</li>
              <li><strong>平移视图</strong>: 按住Shift+左键或中键拖动平移</li>
              <li><strong>查看信息</strong>: 鼠标悬停查看格子信息</li>
            </ul>
          </section>
          <section>
            <h3>🎨 图例</h3>
            <div class="legend">
              <div class="legend-item"><span class="legend-color wall"></span> 墙壁</div>
              <div class="legend-item"><span class="legend-color floor"></span> 地板</div>
              <div class="legend-item"><span class="legend-color corridor"></span> 走廊</div>
              <div class="legend-item"><span class="legend-color door"></span> 门</div>
              <div class="legend-item"><span class="legend-color chest"></span> 宝箱</div>
              <div class="legend-item"><span class="legend-color monster"></span> 怪物</div>
              <div class="legend-item"><span class="legend-color trap"></span> 陷阱</div>
              <div class="legend-item"><span class="legend-color start"></span> 起点</div>
              <div class="legend-item"><span class="legend-color end"></span> 终点</div>
              <div class="legend-item"><span class="legend-color visited"></span> 已探索</div>
              <div class="legend-item"><span class="legend-color path"></span> 路径</div>
            </div>
          </section>
          <section>
            <h3>📊 算法说明</h3>
            <ul>
              <li><strong>A*</strong>: 使用启发式函数的最优路径搜索算法</li>
              <li><strong>Dijkstra</strong>: 保证最短路径的广度优先算法</li>
              <li><strong>JPS</strong>: 跳点搜索，A*的优化版本，减少节点展开</li>
              <li><strong>BFS</strong>: 广度优先搜索，适合无权图最短路径</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useApi } from '~/composables/useApi';
import { useDungeonStore } from '~/composables/useDungeonStore';
import { TileType } from '~/types';
import type { Position } from '~/types';
import DungeonCanvas from '~/components/DungeonCanvas.vue';
import ConfigPanel from '~/components/ConfigPanel.vue';
import AnimationControls from '~/components/AnimationControls.vue';

const store = useDungeonStore();
const { generateDungeon: apiGenerate, findPath, findAllPaths } = useApi();

const canvasRef = ref<InstanceType<typeof DungeonCanvas> | null>(null);
const showHelp = ref(false);
const showBSP = ref(false);
const setPointMode = ref<'start' | 'end' | null>(null);
const animationVisited = ref<Record<string, boolean>>({});
const animationPath = ref<Record<string, boolean>>({});

const canFindPath = computed(() => {
  return store.startPoint && store.endPoint && store.dungeonResult;
});

const visitedArray = computed(() => {
  if (store.currentPathResult?.visited) {
    return store.currentPathResult.visited.map(p => `${p.x},${p.y}`);
  }
  if (store.pathfindingComparison.results.length > 0) {
    const best = store.pathfindingComparison.results.find(
      r => r.algorithm === store.pathfindingComparison.bestAlgorithm
    );
    return best?.visited ? best.visited.map(p => `${p.x},${p.y}`) : [];
  }
  return [];
});

const pathArray = computed(() => {
  if (store.currentPathResult?.path) {
    return store.currentPathResult.path.map(p => `${p.x},${p.y}`);
  }
  if (store.pathfindingComparison.results.length > 0) {
    const best = store.pathfindingComparison.results.find(
      r => r.algorithm === store.pathfindingComparison.bestAlgorithm
    );
    return best?.path ? best.path.map(p => `${p.x},${p.y}`) : [];
  }
  return [];
});

const generateDungeon = async () => {
  store.isGenerating = true;
  store.error = null;
  try {
    const result = await apiGenerate({ ...store.config });
    store.setDungeonResult(result);
    nextTick(() => {
      fitCanvas();
    });
  } catch (e) {
    store.error = '生成地牢失败';
    console.error(e);
  } finally {
    store.isGenerating = false;
  }
};

const handleTileClick = (pos: Position, tileType: TileType) => {
  if (!store.dungeonResult) return;
  
  const isWalkable = tileType !== TileType.WALL;
  
  if (!isWalkable) {
    return;
  }

  if (setPointMode.value === 'start') {
    store.setStartPoint(pos);
    setPointMode.value = null;
  } else if (setPointMode.value === 'end') {
    store.setEndPoint(pos);
    setPointMode.value = null;
  }
};

const runPathfinding = async () => {
  if (!store.dungeonResult || !store.startPoint || !store.endPoint) return;

  store.isPathfinding = true;
  store.error = null;

  try {
    const result = await findPath({
      tiles: store.dungeonResult.tiles,
      start: store.startPoint,
      end: store.endPoint,
      algorithm: store.selectedAlgorithm,
      allowDiagonal: store.allowDiagonal
    });
    store.setPathResult(result);
    store.animationState.type = 'pathfinding';
    store.animationState.currentStep = 0;
    store.animationState.isPlaying = false;
    animationVisited.value = {};
    animationPath.value = {};
  } catch (e) {
    store.error = '寻路失败';
    console.error(e);
  } finally {
    store.isPathfinding = false;
  }
};

const compareAllAlgorithms = async () => {
  if (!store.dungeonResult || !store.startPoint || !store.endPoint) return;

  store.pathfindingComparison.isComparing = true;
  store.error = null;

  try {
    const results = await findAllPaths(
      store.dungeonResult.tiles,
      store.startPoint,
      store.endPoint,
      store.dungeonResult.snapshotId
    );
    store.setComparisonResults(results);
    store.currentPathResult = null;
    store.visitedTiles.value = {};
    store.pathTiles.value = {};
    store.animationState.type = 'pathfinding';
    store.animationState.currentStep = 0;
    store.animationState.isPlaying = false;
    animationVisited.value = {};
    animationPath.value = {};
  } catch (e) {
    store.error = '对比算法失败';
    console.error(e);
  } finally {
    store.pathfindingComparison.isComparing = false;
  }
};

const handleAnimationFrame = (visited: Record<string, boolean>, path: Record<string, boolean>) => {
  animationVisited.value = visited;
  animationPath.value = path;
};

const fitCanvas = () => {
  nextTick(() => {
    canvasRef.value?.fitToScreen();
  });
};

watch(
  () => store.currentPathResult,
  () => {
    animationVisited.value = {};
    animationPath.value = {};
  }
);
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  background: linear-gradient(135deg, #16213e, #0f3460);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 24px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #eaeaea;
  margin: 0;
}

.subtitle {
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: #a0a0a0;
  margin-top: 2px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 360px;
  background: #0f0f1a;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
  flex-shrink: 0;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(22, 33, 62, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn.active {
  background: linear-gradient(135deg, #e94560, #ff6b6b);
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #a0a0a0;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h2 {
  color: #eaeaea;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 4px 0;
}

.animation-bar {
  padding: 12px 16px;
  background: rgba(15, 15, 26, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.help-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.help-content {
  background: #16213e;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  animation: fadeIn 0.2s ease;
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  background: #16213e;
}

.help-header h2 {
  margin: 0;
  font-size: 18px;
}

.help-body {
  padding: 24px;
}

.help-body section {
  margin-bottom: 24px;
}

.help-body h3 {
  color: #e94560;
  margin-bottom: 12px;
  font-size: 16px;
}

.help-body ul {
  padding-left: 20px;
  margin: 0;
}

.help-body li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.legend {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.legend-color.wall { background: #1a1a2e; }
.legend-color.floor { background: #3a3a5e; }
.legend-color.corridor { background: #4a4a6e; }
.legend-color.door { background: #8b4513; }
.legend-color.chest { background: #ffd700; }
.legend-color.monster { background: #e94560; }
.legend-color.trap { background: #ff6b6b; }
.legend-color.start { background: #00b894; }
.legend-color.end { background: #e94560; }
.legend-color.visited { background: rgba(14, 165, 233, 0.6); }
.legend-color.path { background: #ffd700; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
