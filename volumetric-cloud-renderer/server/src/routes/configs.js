import { Router } from 'express';
import Joi from 'joi';
import { readJsonFile, writeJsonFile, generateId } from '../fileStorage.js';

const router = Router();

const paramsSchema = Joi.object({
  cloudDensity: Joi.number().min(0.1).max(5.0).required(),
  cloudThickness: Joi.number().min(0.5).max(10.0).required(),
  cloudCoverage: Joi.number().min(0.0).max(1.0).required(),
  cloudHeight: Joi.number().min(500).max(5000).required(),
  lightIntensity: Joi.number().min(0.1).max(5.0).required(),
  scatterCoeff: Joi.number().min(0.1).max(2.0).required(),
  sunHeight: Joi.number().min(0).max(90).required(),
  sunAzimuth: Joi.number().min(0).max(360).required(),
  windSpeed: Joi.number().min(0).max(100).required(),
  windDirection: Joi.number().min(0).max(360).required(),
  particleSpeed: Joi.number().min(0).max(10).required(),
  sampleCount: Joi.number().min(16).max(256).integer().required(),
  noiseResolution: Joi.number().min(32).max(256).integer().required(),
  renderScale: Joi.number().min(0.25).max(2.0).required(),
  transitionProgress: Joi.number().min(0).max(1).optional(),
  noiseVisualization: Joi.boolean().optional()
});

const saveConfigSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  params: paramsSchema.required()
});

router.get('/', async (req, res) => {
  try {
    const data = await readJsonFile('configs.json');
    const configs = data?.configs || [];
    const result = configs.map(cfg => ({
      id: cfg.id,
      name: cfg.name,
      description: cfg.description || '',
      createdAt: cfg.createdAt,
      updatedAt: cfg.updatedAt
    }));
    res.json(result);
  } catch (error) {
    console.error('Error getting configs:', error);
    res.status(500).json({ error: 'Failed to get configs' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readJsonFile('configs.json');
    const config = data?.configs?.find(c => c.id === id);

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = saveConfigSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const data = await readJsonFile('configs.json') || {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      configs: []
    };

    const newConfig = {
      id: generateId(),
      name: value.name,
      description: value.description || '',
      params: value.params,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.configs.push(newConfig);
    data.lastModified = new Date().toISOString();

    await writeJsonFile('configs.json', data);

    res.json({
      success: true,
      id: newConfig.id,
      message: 'Config saved successfully'
    });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = saveConfigSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const data = await readJsonFile('configs.json');
    const configIndex = data?.configs?.findIndex(c => c.id === id);

    if (configIndex === -1 || configIndex === undefined) {
      return res.status(404).json({ error: 'Config not found' });
    }

    data.configs[configIndex] = {
      ...data.configs[configIndex],
      name: value.name,
      description: value.description || '',
      params: value.params,
      updatedAt: new Date().toISOString()
    };
    data.lastModified = new Date().toISOString();

    await writeJsonFile('configs.json', data);

    res.json({
      success: true,
      id,
      message: 'Config updated successfully'
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readJsonFile('configs.json');

    if (!data?.configs) {
      return res.status(404).json({ error: 'Config not found' });
    }

    const initialLength = data.configs.length;
    data.configs = data.configs.filter(c => c.id !== id);

    if (data.configs.length === initialLength) {
      return res.status(404).json({ error: 'Config not found' });
    }

    data.lastModified = new Date().toISOString();
    await writeJsonFile('configs.json', data);

    res.json({
      success: true,
      message: 'Config deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

export default router;
