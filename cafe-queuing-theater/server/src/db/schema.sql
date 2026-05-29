CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  config_id TEXT NOT NULL,
  FOREIGN KEY (config_id) REFERENCES simulation_configs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS map_elements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bar', 'seat', 'entrance', 'obstacle')),
  polygon TEXT NOT NULL,
  properties TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seats (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  position TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  occupied INTEGER NOT NULL DEFAULT 0,
  group_id TEXT,
  reserved INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS simulation_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  map_width INTEGER NOT NULL,
  map_height INTEGER NOT NULL,
  queuing_topology_id TEXT NOT NULL,
  arrival_model TEXT NOT NULL,
  social_force TEXT NOT NULL,
  lbm_params TEXT NOT NULL,
  sir_params TEXT NOT NULL,
  employee_config TEXT NOT NULL,
  time_step REAL NOT NULL,
  max_agents INTEGER NOT NULL,
  anomaly_detection INTEGER NOT NULL DEFAULT 1,
  deadlock_detection INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (queuing_topology_id) REFERENCES queue_topologies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue_topologies (
  id TEXT PRIMARY KEY,
  order_queue TEXT NOT NULL,
  pickup_queue TEXT NOT NULL,
  roaming_queue TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sir_matrices (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  adjacency TEXT NOT NULL,
  agent_ids TEXT NOT NULL,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  nodes TEXT NOT NULL,
  depth_distribution TEXT NOT NULL,
  max_depth INTEGER NOT NULL,
  sir_matrix_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (sir_matrix_id) REFERENCES sir_matrices(id)
);

CREATE TABLE IF NOT EXISTS event_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_map_elements_project_id ON map_elements(project_id);
CREATE INDEX IF NOT EXISTS idx_seats_project_id ON seats(project_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_project_id_timestamp ON snapshots(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_project_id_timestamp ON event_logs(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_sir_matrices_snapshot_id ON sir_matrices(snapshot_id);
