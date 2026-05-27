<template>
  <div class="dungeon-canvas-container" ref="containerRef">
    <canvas
      ref="canvasRef"
      @click="handleClick"
      @mousemove="handleMouseMove"
      :style="{ cursor: cursorStyle }"
    ></canvas>
    <div v-if="hoveredTile" class="tile-info">
      <div>位置: ({{ hoveredTile.x }}, {{ hoveredTile.y }})</div>
      <div>类型: {{ getTileTypeName(hoveredTile.type) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { TileType } from '~/types';
import type { Position } from '~/types';

const props = defineProps<{
  tiles: TileType[][] | null;
  visitedTiles: Set<string>;
  pathTiles: Set<string>;
  animationVisited?: Set<string>;
  animationPath?: Set<string>;
  showBSP?: boolean;
  bspTree?: any;
}>();

const emit = defineEmits<{
  (e: 'tileClick', pos: Position, tileType: TileType): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const hoveredTile = ref<{ x: number; y: number; type: TileType } | null>(null);
const tileSize = ref(16);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });

const cursorStyle = computed(() => {
  if (isDragging.value) return 'grabbing';
  return 'crosshair';
});

const getTileTypeName = (type: TileType): string => {
  const names: Record<TileType, string> = {
    [TileType.WALL]: '墙壁',
    [TileType.FLOOR]: '地板',
    [TileType.CORRIDOR]: '走廊',
    [TileType.DOOR]: '门',
    [TileType.CHEST]: '宝箱',
    [TileType.MONSTER]: '怪物',
    [TileType.TRAP]: '陷阱',
    [TileType.START]: '起点',
    [TileType.END]: '终点',
    [TileType.CAVE_FLOOR]: '洞穴地板'
  };
  return names[type] || '未知';
};

const getTileColor = (x: number, y: number, type: TileType): string => {
  const key = `${x},${y}`;
  
  if (props.animationPath?.has(key)) {
    return '#ffd700';
  }
  if (props.animationVisited?.has(key)) {
    const idx = Array.from(props.animationVisited).indexOf(key);
    const ratio = idx / props.animationVisited.size;
    const r = Math.floor(14 + ratio * 100);
    const g = Math.floor(165 + ratio * 90);
    const b = Math.floor(233);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  if (props.pathTiles.has(key)) {
    return '#ffd700';
  }
  if (props.visitedTiles.has(key)) {
    return 'rgba(14, 165, 233, 0.6)';
  }

  const colors: Record<TileType, string> = {
    [TileType.WALL]: '#1a1a2e',
    [TileType.FLOOR]: '#3a3a5e',
    [TileType.CORRIDOR]: '#4a4a6e',
    [TileType.DOOR]: '#8b4513',
    [TileType.CHEST]: '#ffd700',
    [TileType.MONSTER]: '#e94560',
    [TileType.TRAP]: '#ff6b6b',
    [TileType.START]: '#00b894',
    [TileType.END]: '#e94560',
    [TileType.CAVE_FLOOR]: '#3a3a4e'
  };
  return colors[type] || '#1a1a2e';
};

const render = () => {
  const canvas = canvasRef.value;
  if (!canvas || !props.tiles) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = props.tiles[0].length;
  const height = props.tiles.length;

  canvas.width = width * tileSize.value;
  canvas.height = height * tileSize.value;

  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = props.tiles[y][x];
      const px = x * tileSize.value + offsetX.value;
      const py = y * tileSize.value + offsetY.value;

      ctx.fillStyle = getTileColor(x, y, tile);
      ctx.fillRect(px, py, tileSize.value, tileSize.value);

      if (tileSize.value > 8) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, tileSize.value, tileSize.value);
      }

      if (tileSize.value > 12) {
        if (tile === TileType.CHEST) {
          ctx.fillStyle = '#000';
          ctx.font = `${tileSize.value * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📦', px + tileSize.value / 2, py + tileSize.value / 2);
        } else if (tile === TileType.MONSTER) {
          ctx.fillStyle = '#000';
          ctx.font = `${tileSize.value * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👹', px + tileSize.value / 2, py + tileSize.value / 2);
        } else if (tile === TileType.TRAP) {
          ctx.fillStyle = '#000';
          ctx.font = `${tileSize.value * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠️', px + tileSize.value / 2, py + tileSize.value / 2);
        } else if (tile === TileType.START) {
          ctx.fillStyle = '#000';
          ctx.font = `${tileSize.value * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚩', px + tileSize.value / 2, py + tileSize.value / 2);
        } else if (tile === TileType.END) {
          ctx.fillStyle = '#000';
          ctx.font = `${tileSize.value * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎯', px + tileSize.value / 2, py + tileSize.value / 2);
        } else if (tile === TileType.DOOR) {
          ctx.fillStyle = '#000';
          ctx.font = `${tileSize.value * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚪', px + tileSize.value / 2, py + tileSize.value / 2);
        }
      }
    }
  }

  if (props.showBSP && props.bspTree) {
    drawBSPTree(ctx, props.bspTree);
  }
};

const drawBSPTree = (ctx: CanvasRenderingContext2D, node: any) => {
  if (!node) return;

  const px = node.x * tileSize.value + offsetX.value;
  const py = node.y * tileSize.value + offsetY.value;
  const pw = node.width * tileSize.value;
  const ph = node.height * tileSize.value;

  ctx.strokeStyle = node.isLeaf ? 'rgba(0, 206, 201, 0.5)' : 'rgba(233, 69, 96, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, pw, ph);

  if (node.left) drawBSPTree(ctx, node.left);
  if (node.right) drawBSPTree(ctx, node.right);
};

const handleClick = (e: MouseEvent) => {
  const canvas = canvasRef.value;
  if (!canvas || !props.tiles) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left - offsetX.value) / tileSize.value);
  const y = Math.floor((e.clientY - rect.top - offsetY.value) / tileSize.value);

  if (x >= 0 && x < props.tiles[0].length && y >= 0 && y < props.tiles.length) {
    emit('tileClick', { x, y }, props.tiles[y][x]);
  }
};

const handleMouseMove = (e: MouseEvent) => {
  const canvas = canvasRef.value;
  if (!canvas || !props.tiles) return;

  if (isDragging.value) {
    offsetX.value += e.clientX - lastMousePos.value.x;
    offsetY.value += e.clientY - lastMousePos.value.y;
    lastMousePos.value = { x: e.clientX, y: e.clientY };
    render();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left - offsetX.value) / tileSize.value);
  const y = Math.floor((e.clientY - rect.top - offsetY.value) / tileSize.value);

  if (x >= 0 && x < props.tiles[0].length && y >= 0 && y < props.tiles.length) {
    hoveredTile.value = { x, y, type: props.tiles[y][x] };
  } else {
    hoveredTile.value = null;
  }
};

const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
    isDragging.value = true;
    lastMousePos.value = { x: e.clientX, y: e.clientY };
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -1 : 1;
  const newSize = Math.max(4, Math.min(64, tileSize.value + delta * 2));
  tileSize.value = newSize;
  render();
};

const fitToScreen = () => {
  if (!props.tiles || !containerRef.value) return;
  const width = props.tiles[0].length;
  const height = props.tiles.length;
  const containerWidth = containerRef.value.clientWidth;
  const containerHeight = containerRef.value.clientHeight;
  tileSize.value = Math.min(
    Math.floor(containerWidth / width),
    Math.floor(containerHeight / height)
  );
  offsetX.value = 0;
  offsetY.value = 0;
  render();
};

defineExpose({
  render,
  fitToScreen,
  resetView: () => {
    offsetX.value = 0;
    offsetY.value = 0;
    render();
  }
});

watch(
  () => [props.tiles, props.visitedTiles, props.pathTiles, props.animationVisited, props.animationPath],
  () => {
    render();
  },
  { deep: true }
);

onMounted(() => {
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('wheel', handleWheel, { passive: false });
  render();
});

onUnmounted(() => {
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('wheel', handleWheel);
});
</script>

<style scoped>
.dungeon-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0f0f1a;
  border-radius: 8px;
}

canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.tile-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #eaeaea;
  pointer-events: none;
  z-index: 10;
}
</style>
