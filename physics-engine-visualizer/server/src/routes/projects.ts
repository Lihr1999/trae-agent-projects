import express from 'express';
import { saveProject, loadProject, listProjects, deleteProject } from '../db/database';
import { generateId } from '../physics/math';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const projects = await listProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await loadProject(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load project' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, bodies, joints, gravity } = req.body;
    const id = generateId();

    await saveProject({
      id,
      name,
      bodies,
      joints,
      gravity
    });

    res.json({ id, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save project' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bodies, joints, gravity } = req.body;

    await saveProject({
      id,
      name,
      bodies,
      joints,
      gravity
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProject(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
