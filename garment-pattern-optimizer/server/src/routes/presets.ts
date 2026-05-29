import Router from 'koa-router';
import { getPresetScenario, listPresetScenarios, PRESET_SCENARIOS } from '../presets/scenarios';
import type { PresetScene } from '../types';

const router = new Router({ prefix: '/api/presets' });

router.get('/', async (ctx) => {
  const presets = listPresetScenarios();
  ctx.body = presets;
});

router.get('/:id', async (ctx) => {
  const { id } = ctx.params;
  const preset = getPresetScenario(id);
  
  if (!preset) {
    ctx.status = 404;
    ctx.body = { error: '预设场景不存在' };
    return;
  }
  
  ctx.body = preset;
});

router.get('/:id/load', async (ctx) => {
  const { id } = ctx.params;
  const preset = getPresetScenario(id);
  
  if (!preset) {
    ctx.status = 404;
    ctx.body = { error: '预设场景不存在' };
    return;
  }
  
  const projectId = `project-${Date.now()}`;
  const project = {
    id: projectId,
    name: preset.name,
    polygons: preset.polygons.map(p => ({
      ...p,
      id: `${p.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    })),
    fabricWidth: preset.fabricWidth,
    fabricHeight: preset.fabricHeight,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  const { createProject } = await import('../db/database');
  const savedProject = await createProject(project);
  
  ctx.body = {
    ...preset,
    project: savedProject
  };
});

export default router;
