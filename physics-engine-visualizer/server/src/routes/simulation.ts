import express from 'express';
import { PhysicsWorld, Vector2 } from '../physics/types';
import { createWorld, step, addBody, addJoint, applyImpulseToBody, clearWorld } from '../physics/world';
import { createRigidBody } from '../physics/body';
import { createJoint } from '../physics/constraints';
import { presets } from '../presets/scenarios';

const router = express.Router();

let simulationWorld: PhysicsWorld = createWorld();

router.post('/step', (req, res) => {
  const { dt = 1 / 60 } = req.body;
  step(simulationWorld, dt);

  res.json({
    bodies: Array.from(simulationWorld.bodies.values()),
    joints: Array.from(simulationWorld.joints.values()),
    manifolds: simulationWorld.manifolds,
    particles: simulationWorld.particles
  });
});

router.post('/body', (req, res) => {
  const { shape, position, material, isStatic = false } = req.body;
  const body = createRigidBody(shape, position, material, isStatic);
  addBody(simulationWorld, body);
  res.json(body);
});

router.delete('/body/:id', (req, res) => {
  const { id } = req.params;
  simulationWorld.bodies.delete(id);
  for (const [jointId, joint] of simulationWorld.joints) {
    if (joint.bodyA === id || joint.bodyB === id) {
      simulationWorld.joints.delete(jointId);
    }
  }
  res.json({ success: true });
});

router.post('/joint', (req, res) => {
  const { type, bodyA, bodyB, localAnchorA, localAnchorB, options = {} } = req.body;
  const bodyAObj = simulationWorld.bodies.get(bodyA);
  const bodyBObj = simulationWorld.bodies.get(bodyB);

  if (!bodyAObj || !bodyBObj) {
    return res.status(400).json({ error: 'Body not found' });
  }

  const joint = createJoint(type, bodyAObj, bodyBObj, localAnchorA, localAnchorB, options);
  addJoint(simulationWorld, joint);
  res.json(joint);
});

router.delete('/joint/:id', (req, res) => {
  const { id } = req.params;
  simulationWorld.joints.delete(id);
  res.json({ success: true });
});

router.post('/impulse', (req, res) => {
  const { bodyId, impulse } = req.body;
  applyImpulseToBody(simulationWorld, bodyId, impulse);
  res.json({ success: true });
});

router.post('/gravity', (req, res) => {
  const { x, y } = req.body;
  simulationWorld.gravity = { x, y };
  res.json({ success: true });
});

router.post('/preset/:id', (req, res) => {
  const { id } = req.params;
  const preset = presets.find(p => p.id === id);

  if (!preset) {
    return res.status(404).json({ error: 'Preset not found' });
  }

  simulationWorld = preset.create();
  res.json({
    bodies: Array.from(simulationWorld.bodies.values()),
    joints: Array.from(simulationWorld.joints.values()),
    manifolds: simulationWorld.manifolds,
    particles: simulationWorld.particles,
    gravity: simulationWorld.gravity,
    iterations: simulationWorld.iterations,
    timeStep: simulationWorld.timeStep
  });
});

router.get('/presets', (req, res) => {
  res.json(presets.map(p => ({ id: p.id, name: p.name })));
});

router.post('/clear', (req, res) => {
  clearWorld(simulationWorld);
  res.json({ success: true });
});

router.get('/state', (req, res) => {
  res.json({
    bodies: Array.from(simulationWorld.bodies.values()),
    joints: Array.from(simulationWorld.joints.values()),
    manifolds: simulationWorld.manifolds,
    particles: simulationWorld.particles,
    gravity: simulationWorld.gravity,
    iterations: simulationWorld.iterations,
    timeStep: simulationWorld.timeStep
  });
});

router.post('/settings', (req, res) => {
  const { iterations, timeStep, sleepingThreshold } = req.body;

  if (iterations !== undefined) simulationWorld.iterations = iterations;
  if (timeStep !== undefined) simulationWorld.timeStep = timeStep;
  if (sleepingThreshold !== undefined) simulationWorld.sleepingThreshold = sleepingThreshold;

  res.json({ success: true });
});

export default router;
