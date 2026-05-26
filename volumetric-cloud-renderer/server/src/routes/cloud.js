import { Router } from 'express';
import Joi from 'joi';
import { rayMarch } from '../raymarch.js';
import { perlinNoise3D, fbm, noiseDerivatives } from '../noise.js';

const router = Router();

const vec3Schema = Joi.array().length(3).items(Joi.number()).required();

const rayMarchSchema = Joi.object({
  rayOrigin: vec3Schema,
  rayDir: vec3Schema,
  params: Joi.object({
    cloudDensity: Joi.number().min(0.1).max(5.0).required(),
    cloudThickness: Joi.number().min(0.5).max(10.0).required(),
    cloudCoverage: Joi.number().min(0.0).max(1.0).required(),
    cloudHeight: Joi.number().min(500).max(5000).required(),
    lightIntensity: Joi.number().min(0.1).max(5.0).required(),
    scatterCoeff: Joi.number().min(0.1).max(2.0).required(),
    sunHeight: Joi.number().min(0).max(90).required(),
    sunAzimuth: Joi.number().min(0).max(360).required(),
    windSpeed: Joi.number().min(0).max(100).default(0),
    windDirection: Joi.number().min(0).max(360).default(0)
  }).unknown(true).required(),
  maxSteps: Joi.number().min(16).max(256).integer().default(64)
}).unknown(true);

const noiseSchema = Joi.object({
  position: vec3Schema,
  octaves: Joi.number().min(1).max(10).integer().default(6),
  frequency: Joi.number().min(0.1).max(10.0).default(1.0),
  lacunarity: Joi.number().min(1.0).max(4.0).default(2.0),
  gain: Joi.number().min(0.1).max(1.0).default(0.5)
});

router.post('/raymarch', async (req, res) => {
  try {
    const { error, value } = rayMarchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = rayMarch(
      value.rayOrigin,
      value.rayDir,
      value.params,
      value.maxSteps
    );

    res.json(result);
  } catch (error) {
    console.error('Error in raymarch:', error);
    res.status(500).json({ error: 'Failed to compute raymarch' });
  }
});

router.post('/noise', async (req, res) => {
  try {
    const { error, value } = noiseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const [x, y, z] = value.position;
    const noiseValue = perlinNoise3D(x, y, z);
    const fbmValue = fbm(x, y, z, value.octaves, value.frequency, value.lacunarity, value.gain);
    const derivatives = noiseDerivatives(x, y, z);

    res.json({
      value: noiseValue,
      fbmValue,
      derivatives
    });
  } catch (error) {
    console.error('Error in noise computation:', error);
    res.status(500).json({ error: 'Failed to compute noise' });
  }
});

export default router;
