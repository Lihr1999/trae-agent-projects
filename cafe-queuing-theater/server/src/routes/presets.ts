import Router, { RouterContext } from '@koa/router';
import { PresetManager } from '../presets';

const router = new Router({ prefix: '/api/presets' });

const presetManager = new PresetManager();

router.get('/', async (ctx) => {
  try {
    const scenarios = presetManager.getScenarios();
    ctx.body = {
      success: true,
      data: scenarios.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        anomalyTrigger: s.anomalyTrigger,
      })),
    };
  } catch (error) {
    console.error('[API] Get presets error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to get presets' };
  }
});

router.get('/:id', async (ctx: RouterContext) => {
  try {
    const { id } = ctx.params;
    const scenario = presetManager.getScenarioById(id);

    if (!scenario) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Preset not found' };
      return;
    }

    const loaded = presetManager.loadScenario(id);

    ctx.body = {
      success: true,
      data: {
        scenario: {
          id: loaded.scenario.id,
          name: loaded.scenario.name,
          description: loaded.scenario.description,
          icon: loaded.scenario.icon,
          anomalyTrigger: loaded.scenario.anomalyTrigger,
        },
        config: loaded.config,
        mapElements: loaded.mapElements,
        seats: loaded.seats,
        employees: loaded.employees,
      },
    };
  } catch (error) {
    console.error('[API] Load preset error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load preset',
    };
  }
});

router.get('/:id/validate', async (ctx) => {
  try {
    const { id } = ctx.params;
    const scenario = presetManager.getScenarioById(id);

    if (!scenario) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Preset not found' };
      return;
    }

    const validation = presetManager.validateScenario(scenario);
    ctx.body = {
      success: true,
      data: validation,
    };
  } catch (error) {
    console.error('[API] Validate preset error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to validate preset' };
  }
});

router.post('/validate', async (ctx) => {
  try {
    const body = ctx.request.body as any;
    const validation = presetManager.validateScenario(body);
    ctx.body = {
      success: true,
      data: validation,
    };
  } catch (error) {
    console.error('[API] Validate custom preset error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to validate preset' };
  }
});

router.get('/:id/config', async (ctx) => {
  try {
    const { id } = ctx.params;
    const loaded = presetManager.loadScenario(id);
    ctx.body = {
      success: true,
      data: loaded.config,
    };
  } catch (error) {
    console.error('[API] Get preset config error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to get preset config' };
  }
});

export const presetRoutes = router;
