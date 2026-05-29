import Router from 'koa-router';
import { createProject, getProject, updateProject, deleteProject, listProjects, saveMarkerResult } from '../db/database';
import type { Project, MarkerResult } from '../types';

const router = new Router({ prefix: '/api/projects' });

router.get('/', async (ctx) => {
  const projects = await listProjects();
  ctx.body = projects;
});

router.get('/:id', async (ctx) => {
  const { id } = ctx.params;
  const project = await getProject(id);
  
  if (!project) {
    ctx.status = 404;
    ctx.body = { error: '项目不存在' };
    return;
  }
  
  ctx.body = project;
});

router.post('/', async (ctx) => {
  const projectData = ctx.request.body as Omit<Project, 'createdAt' | 'updatedAt'>;
  
  if (!projectData.id || !projectData.name) {
    ctx.status = 400;
    ctx.body = { error: '项目ID和名称不能为空' };
    return;
  }
  
  const project = await createProject(projectData);
  ctx.status = 201;
  ctx.body = project;
});

router.put('/:id', async (ctx) => {
  const { id } = ctx.params;
  const projectData = ctx.request.body as Project;
  
  if (projectData.id !== id) {
    ctx.status = 400;
    ctx.body = { error: '项目ID不匹配' };
    return;
  }
  
  const existing = await getProject(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '项目不存在' };
    return;
  }
  
  await updateProject(projectData);
  ctx.body = await getProject(id);
});

router.delete('/:id', async (ctx) => {
  const { id } = ctx.params;
  
  const existing = await getProject(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '项目不存在' };
    return;
  }
  
  await deleteProject(id);
  ctx.status = 204;
});

router.post('/:id/marker-result', async (ctx) => {
  const { id } = ctx.params;
  const markerResult = ctx.request.body as MarkerResult;
  
  const existing = await getProject(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '项目不存在' };
    return;
  }
  
  await saveMarkerResult(id, markerResult);
  ctx.body = { success: true };
});

export default router;
