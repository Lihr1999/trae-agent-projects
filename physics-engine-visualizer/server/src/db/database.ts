import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { RigidBody, Joint, Vector2, Project } from '../physics/types';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  const dbPath = path.join(__dirname, '../../data/physics.db');

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      gravity_x REAL DEFAULT 0,
      gravity_y REAL DEFAULT 9.8
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bodies (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL,
      rotation REAL NOT NULL DEFAULT 0,
      vel_x REAL NOT NULL DEFAULT 0,
      vel_y REAL NOT NULL DEFAULT 0,
      angular_vel REAL NOT NULL DEFAULT 0,
      mass REAL NOT NULL,
      inertia REAL NOT NULL,
      shape_type TEXT NOT NULL,
      shape_radius REAL,
      shape_vertices TEXT,
      friction REAL NOT NULL DEFAULT 0.3,
      restitution REAL NOT NULL DEFAULT 0.2,
      density REAL NOT NULL DEFAULT 1,
      is_static INTEGER NOT NULL DEFAULT 0,
      color TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS joints (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      body_a TEXT NOT NULL,
      body_b TEXT NOT NULL,
      anchor_a_x REAL NOT NULL,
      anchor_a_y REAL NOT NULL,
      anchor_b_x REAL NOT NULL,
      anchor_b_y REAL NOT NULL,
      distance REAL,
      stiffness REAL,
      damping REAL,
      lower_limit REAL,
      upper_limit REAL,
      breaking_threshold REAL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  return db;
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export async function saveProject(project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = await getDatabase();

  await db.run('BEGIN TRANSACTION');

  try {
    await db.run(
      'INSERT OR REPLACE INTO projects (id, name, updated_at, gravity_x, gravity_y) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)',
      project.id,
      project.name,
      project.gravity.x,
      project.gravity.y
    );

    await db.run('DELETE FROM bodies WHERE project_id = ?', project.id);
    await db.run('DELETE FROM joints WHERE project_id = ?', project.id);

    for (const body of project.bodies) {
      await db.run(
        `INSERT INTO bodies (
          id, project_id, pos_x, pos_y, rotation, vel_x, vel_y, angular_vel,
          mass, inertia, shape_type, shape_radius, shape_vertices,
          friction, restitution, density, is_static, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        body.id,
        project.id,
        body.position.x,
        body.position.y,
        body.rotation,
        body.linearVelocity.x,
        body.linearVelocity.y,
        body.angularVelocity,
        body.mass,
        body.inertia,
        body.shape.type,
        body.shape.radius || null,
        body.shape.vertices ? JSON.stringify(body.shape.vertices) : null,
        body.material.friction,
        body.material.restitution,
        body.material.density,
        body.isStatic ? 1 : 0,
        body.color
      );
    }

    for (const joint of project.joints) {
      await db.run(
        `INSERT INTO joints (
          id, project_id, type, body_a, body_b,
          anchor_a_x, anchor_a_y, anchor_b_x, anchor_b_y,
          distance, stiffness, damping, lower_limit, upper_limit, breaking_threshold
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        joint.id,
        project.id,
        joint.type,
        joint.bodyA,
        joint.bodyB,
        joint.localAnchorA.x,
        joint.localAnchorA.y,
        joint.localAnchorB.x,
        joint.localAnchorB.y,
        joint.distance || null,
        joint.stiffness || null,
        joint.damping || null,
        joint.lowerLimit || null,
        joint.upperLimit || null,
        joint.breakingThreshold || null
      );
    }

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

export async function loadProject(id: string): Promise<Project | null> {
  const db = await getDatabase();

  const projectRow = await db.get('SELECT * FROM projects WHERE id = ?', id);
  if (!projectRow) return null;

  const bodyRows = await db.all('SELECT * FROM bodies WHERE project_id = ?', id);
  const jointRows = await db.all('SELECT * FROM joints WHERE project_id = ?', id);

  const bodies: RigidBody[] = bodyRows.map(row => ({
    id: row.id,
    position: { x: row.pos_x, y: row.pos_y },
    rotation: row.rotation,
    linearVelocity: { x: row.vel_x, y: row.vel_y },
    angularVelocity: row.angular_vel,
    force: { x: 0, y: 0 },
    torque: 0,
    mass: row.mass,
    invMass: row.mass === Infinity ? 0 : 1 / row.mass,
    inertia: row.inertia,
    invInertia: row.inertia === Infinity ? 0 : 1 / row.inertia,
    shape: {
      type: row.shape_type,
      radius: row.shape_radius,
      vertices: row.shape_vertices ? JSON.parse(row.shape_vertices) : undefined
    },
    material: {
      friction: row.friction,
      restitution: row.restitution,
      density: row.density
    },
    isSleeping: false,
    sleepTimer: 0,
    isStatic: row.is_static === 1,
    trail: [],
    color: row.color
  }));

  const joints: Joint[] = jointRows.map(row => ({
    id: row.id,
    type: row.type,
    bodyA: row.body_a,
    bodyB: row.body_b,
    localAnchorA: { x: row.anchor_a_x, y: row.anchor_a_y },
    localAnchorB: { x: row.anchor_b_x, y: row.anchor_b_y },
    distance: row.distance,
    stiffness: row.stiffness,
    damping: row.damping,
    lowerLimit: row.lower_limit,
    upperLimit: row.upper_limit,
    breakingThreshold: row.breaking_threshold,
    isBroken: false,
    force: { x: 0, y: 0 }
  }));

  return {
    id: projectRow.id,
    name: projectRow.name,
    createdAt: new Date(projectRow.created_at),
    updatedAt: new Date(projectRow.updated_at),
    bodies,
    joints,
    gravity: { x: projectRow.gravity_x, y: projectRow.gravity_y }
  };
}

export async function listProjects(): Promise<Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }>> {
  const db = await getDatabase();
  const rows = await db.all('SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC');

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }));
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDatabase();
  await db.run('DELETE FROM projects WHERE id = ?', id);
}
