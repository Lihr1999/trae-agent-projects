import type { DungeonConfig, DungeonResult, PathRequest, PathResult, PresetScenario } from '~/types';

export const useApi = () => {
  const baseUrl = '/api';

  const generateDungeon = async (config: DungeonConfig): Promise<DungeonResult> => {
    const response = await $fetch<DungeonResult>(`${baseUrl}/generate`, {
      method: 'POST',
      body: config
    });
    return response;
  };

  const findPath = async (request: PathRequest): Promise<PathResult> => {
    const response = await $fetch<PathResult>(`${baseUrl}/pathfind`, {
      method: 'POST',
      body: request
    });
    return response;
  };

  const findAllPaths = async (
    tiles: number[][],
    start: { x: number; y: number },
    end: { x: number; y: number },
    snapshotId?: number
  ): Promise<PathResult[]> => {
    const response = await $fetch<PathResult[]>(`${baseUrl}/pathfind/all`, {
      method: 'POST',
      body: { tiles, start, end, snapshotId }
    });
    return response;
  };

  const getPresets = async (): Promise<PresetScenario[]> => {
    const response = await $fetch<PresetScenario[]>(`${baseUrl}/presets`);
    return response;
  };

  const getSnapshots = async (): Promise<any[]> => {
    const response = await $fetch<any[]>(`${baseUrl}/snapshots`);
    return response;
  };

  const getSnapshot = async (id: number): Promise<any> => {
    const response = await $fetch<any>(`${baseUrl}/snapshots/${id}`);
    return response;
  };

  const deleteSnapshot = async (id: number): Promise<void> => {
    await $fetch(`${baseUrl}/snapshots/${id}`, {
      method: 'DELETE'
    });
  };

  const getAlgorithmStats = async (name: string): Promise<{ avgTime: number; avgNodes: number; avgLength: number; count: number }> => {
    const response = await $fetch(`${baseUrl}/stats/algorithm/${name}`);
    return response as any;
  };

  return {
    generateDungeon,
    findPath,
    findAllPaths,
    getPresets,
    getSnapshots,
    getSnapshot,
    deleteSnapshot,
    getAlgorithmStats
  };
};
