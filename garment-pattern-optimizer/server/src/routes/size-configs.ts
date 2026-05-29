import Router from 'koa-router';
import { saveSizeConfig, getSizeConfig, listSizeConfigs } from '../db/database';
import type { SizeConfig } from '../types';

const router = new Router({ prefix: '/api/size-configs' });

router.get('/', async (ctx) => {
  const configs = await listSizeConfigs();
  ctx.body = configs;
});

router.get('/:id', async (ctx) => {
  const { id } = ctx.params;
  const config = await getSizeConfig(id);
  
  if (!config) {
    ctx.status = 404;
    ctx.body = { error: '尺寸配置不存在' };
    return;
  }
  
  ctx.body = config;
});

router.post('/', async (ctx) => {
  const config = ctx.request.body as SizeConfig;
  
  if (!config.id || !config.name) {
    ctx.status = 400;
    ctx.body = { error: '配置ID和名称不能为空' };
    return;
  }
  
  await saveSizeConfig(config);
  ctx.status = 201;
  ctx.body = config;
});

export default router;
