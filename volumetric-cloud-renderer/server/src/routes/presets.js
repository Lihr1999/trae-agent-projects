import { Router } from 'express';
import { readJsonFile } from '../fileStorage.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const data = await readJsonFile('presets.json');
    const presets = data?.presets || [];
    res.json(presets);
  } catch (error) {
    console.error('Error getting presets:', error);
    res.status(500).json({ error: 'Failed to get presets' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readJsonFile('presets.json');
    const preset = data?.presets?.find(p => p.id === id);

    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    res.json(preset);
  } catch (error) {
    console.error('Error getting preset:', error);
    res.status(500).json({ error: 'Failed to get preset' });
  }
});

export default router;
