import { reactive, ref } from 'vue';
import type { DungeonConfig, DungeonResult, PathResult, Position, TileType, AnimationState, PathfindingComparison } from '~/types';

export const useDungeonStore = () => {
  const defaultConfig: DungeonConfig = {
    width: 50,
    height: 50,
    minRoomSize: 4,
    maxRoomSize: 10,
    minRooms: 8,
    maxRooms: 12,
    bspDepth: 4,
    corridorBendiness: 0.1,
    doorDensity: 0.3,
    chestDensity: 0.5,
    monsterDensity: 0.3,
    trapDensity: 0.05,
    seed: Math.floor(Math.random() * 100000),
    generatorType: 'bsp',
    caveFillProbability: 0.45,
    caveSmoothingIterations: 5
  };

  const config = reactive<DungeonConfig>({ ...defaultConfig });
  const dungeonResult = ref<DungeonResult | null>(null);
  const startPoint = ref<Position | null>(null);
  const endPoint = ref<Position | null>(null);
  const selectedAlgorithm = ref<'astar' | 'dijkstra' | 'jps' | 'bfs'>('astar');
  const allowDiagonal = ref(false);
  const currentPathResult = ref<PathResult | null>(null);

  const animationState = reactive<AnimationState>({
    isPlaying: false,
    currentStep: 0,
    speed: 50,
    type: null
  });

  const pathfindingComparison = reactive<PathfindingComparison>({
    results: [],
    bestAlgorithm: null,
    isComparing: false
  });

  const isGenerating = ref(false);
  const isPathfinding = ref(false);
  const error = ref<string | null>(null);

  const displayTiles = ref<TileType[][] | null>(null);
  const visitedTiles = ref<Record<string, boolean>>({});
  const pathTiles = ref<Record<string, boolean>>({});

  const setConfig = (newConfig: Partial<DungeonConfig>) => {
    Object.assign(config, newConfig);
  };

  const resetConfig = () => {
    Object.assign(config, defaultConfig);
  };

  const setDungeonResult = (result: DungeonResult) => {
    dungeonResult.value = result;
    displayTiles.value = JSON.parse(JSON.stringify(result.tiles));
    startPoint.value = null;
    endPoint.value = null;
    currentPathResult.value = null;
    visitedTiles.value = {};
    pathTiles.value = {};
    pathfindingComparison.results = [];
    pathfindingComparison.bestAlgorithm = null;
  };

  const setStartPoint = (pos: Position | null) => {
    startPoint.value = pos;
    if (pos && dungeonResult.value) {
      const tiles = JSON.parse(JSON.stringify(dungeonResult.value.tiles));
      tiles[pos.y][pos.x] = 7 as TileType;
      displayTiles.value = tiles;
    }
  };

  const setEndPoint = (pos: Position | null) => {
    endPoint.value = pos;
    if (pos && dungeonResult.value) {
      const tiles = displayTiles.value ? JSON.parse(JSON.stringify(displayTiles.value)) : JSON.parse(JSON.stringify(dungeonResult.value.tiles));
      tiles[pos.y][pos.x] = 8 as TileType;
      displayTiles.value = tiles;
    }
  };

  const clearPathfinding = () => {
    currentPathResult.value = null;
    visitedTiles.value = {};
    pathTiles.value = {};
    pathfindingComparison.results = [];
    pathfindingComparison.bestAlgorithm = null;
    if (dungeonResult.value) {
      const tiles = JSON.parse(JSON.stringify(dungeonResult.value.tiles));
      if (startPoint.value) {
        tiles[startPoint.value.y][startPoint.value.x] = 7 as TileType;
      }
      if (endPoint.value) {
        tiles[endPoint.value.y][endPoint.value.x] = 8 as TileType;
      }
      displayTiles.value = tiles;
    }
  };

  const setPathResult = (result: PathResult) => {
    currentPathResult.value = result;
    const visited: Record<string, boolean> = {};
    result.visited.forEach(p => { visited[`${p.x},${p.y}`] = true; });
    visitedTiles.value = visited;
    const path: Record<string, boolean> = {};
    result.path.forEach(p => { path[`${p.x},${p.y}`] = true; });
    pathTiles.value = path;
  };

  const setComparisonResults = (results: PathResult[]) => {
    pathfindingComparison.results = results;
    const validResults = results.filter(r => r.found);
    if (validResults.length > 0) {
      validResults.sort((a, b) => a.timeMs - b.timeMs);
      pathfindingComparison.bestAlgorithm = validResults[0].algorithm;
    }
  };

  const reset = () => {
    resetConfig();
    dungeonResult.value = null;
    startPoint.value = null;
    endPoint.value = null;
    currentPathResult.value = null;
    displayTiles.value = null;
    visitedTiles.value = {};
    pathTiles.value = {};
    pathfindingComparison.results = [];
    pathfindingComparison.bestAlgorithm = null;
    error.value = null;
  };

  return {
    config,
    dungeonResult,
    startPoint,
    endPoint,
    selectedAlgorithm,
    allowDiagonal,
    currentPathResult,
    animationState,
    pathfindingComparison,
    isGenerating,
    isPathfinding,
    error,
    displayTiles,
    visitedTiles,
    pathTiles,
    setConfig,
    resetConfig,
    setDungeonResult,
    setStartPoint,
    setEndPoint,
    clearPathfinding,
    setPathResult,
    setComparisonResults,
    reset
  };
};
