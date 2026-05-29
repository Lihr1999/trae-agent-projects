## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React + TypeScript"] --> B["Zustand状态管理"]
        A --> C["WebGL渲染引擎"]
        A --> D["WebWorker计算集群"]
        D --> D1["LBM流场计算"]
        D --> D2["高斯核密度估计"]
        A --> E["WebSocket客户端"]
    end
    
    subgraph "后端层"
        F["Node.js + Koa"] --> G["仿真引擎核心"]
        G --> H["时间步进器"]
        G --> I["离散事件调度器"]
        G --> J["四叉树空间索引"]
        G --> K["社会力模型"]
        G --> L["SIR情绪传染模型"]
        G --> M["排队网络管理器"]
        G --> N["死锁检测机制"]
        F --> O["WebSocket服务端"]
        F --> P["REST API路由"]
    end
    
    subgraph "数据层"
        Q["SQLite (sql.js)"] --> R["拓扑多边形表"]
        Q --> S["排队配置表"]
        Q --> T["SIR邻接矩阵表"]
        Q --> U["四叉树快照表"]
        Q --> V["事件溯源日志表"]
    end
    
    E <--> O
    P --> Q
```

## 2. 技术描述

- **前端**：React@18 + TypeScript@5 + Vite@5 + TailwindCSS@3 + Zustand@4 + Three.js@0.160
- **并行计算**：WebWorker API + Comlink
- **图形渲染**：WebGL2 + 自定义着色器
- **后端**：Node.js@20 + Koa@2 + TypeScript@5 + ws@8
- **数据库**：sql.js@1.10（SQLite WASM版本）
- **通信协议**：WebSocket + 增量状态差分编码
- **构建工具**：Vite@5 + tsup

## 3. 路由定义

| 路由 | 方法 | 用途 |
|------|------|------|
| /api/projects | GET | 获取所有仿真工程列表 |
| /api/projects | POST | 创建新仿真工程 |
| /api/projects/:id | GET | 获取单个工程详情 |
| /api/projects/:id | PUT | 更新工程配置 |
| /api/projects/:id | DELETE | 删除工程 |
| /api/presets | GET | 获取所有预设场景 |
| /api/presets/:id | GET | 加载指定预设场景 |
| /api/simulation/:id/snapshot | POST | 保存四叉树快照 |
| /api/simulation/:id/events | GET | 获取事件溯源日志 |
| /ws | WS | WebSocket实时通信端点 |

## 4. API类型定义

```typescript
// 核心类型定义
interface Point { x: number; y: number; }

interface MapElement {
  id: string;
  type: 'bar' | 'seat' | 'entrance' | 'obstacle';
  polygon: Point[];
  properties: Record<string, any>;
}

interface Agent {
  id: string;
  position: Point;
  velocity: Point;
  target: Point;
  state: 'queuing' | 'ordering' | 'waiting' | 'seating' | 'leaving';
  emotion: 'S' | 'I' | 'R';
  groupId?: string;
  frustration: number;
}

interface Employee {
  id: string;
  position: Point;
  skillMatrix: number[];
  fatigue: number;
  efficiency: number;
}

interface SimulationConfig {
  queuingTopology: {
    orderQueue: { servers: number; capacity: number };
    pickupQueue: { servers: number; capacity: number };
    roamingQueue: { capacity: number };
  };
  arrivalModel: {
    lambda: number;
    groupSizeDistribution: number[];
  };
  socialForce: {
    A: number; B: number; k: number; kappa: number;
  };
  lbmParams: {
    relaxationTime: number;
    initialDensity: number;
  };
  sirParams: {
    beta: number; gamma: number;
    infectionRadius: number;
  };
}

interface SimulationState {
  time: number;
  agents: Agent[];
  employees: Employee[];
  queues: { name: string; length: number }[];
  flowField: number[][][];
  heatMap: number[][];
  deadlockDetected: boolean;
  anomalyFlags: string[];
}
```

## 5. 服务器架构

```mermaid
graph TD
    A["WebSocket网关"] --> B["连接管理器"]
    C["HTTP控制器"] --> D["鉴权中间件"]
    D --> E["参数校验"]
    E --> F["业务服务"]
    
    G["仿真引擎服务"] --> H["四叉树索引服务"]
    G --> I["Agent行为服务"]
    G --> J["流体动力学服务"]
    G --> K["情绪传播服务"]
    G --> L["排队网络服务"]
    G --> M["死锁检测服务"]
    
    N["数据持久化服务"] --> O["SQLite连接池"]
    P["事件溯源服务"] --> N
    
    F --> G
    F --> N
    B --> G
```

## 6. 数据模型

### 6.1 ER图

```mermaid
erDiagram
    PROJECT ||--o{ MAP_ELEMENT : contains
    PROJECT ||--o{ SIMULATION_CONFIG : has
    PROJECT ||--o{ SNAPSHOT : has
    PROJECT ||--o{ EVENT_LOG : has
    SIMULATION_CONFIG ||--|| SIR_MATRIX : contains
    SIMULATION_CONFIG ||--|| QUEUE_TOPOLOGY : contains
    
    PROJECT {
        uuid id PK
        string name
        datetime created_at
        datetime updated_at
    }
    
    MAP_ELEMENT {
        uuid id PK
        uuid project_id FK
        string type
        text polygon_data
        text properties
    }
    
    SIMULATION_CONFIG {
        uuid id PK
        uuid project_id FK
        text config_json
    }
    
    SIR_MATRIX {
        uuid id PK
        uuid config_id FK
        text adjacency_matrix
    }
    
    QUEUE_TOPOLOGY {
        uuid id PK
        uuid config_id FK
        text topology_data
    }
    
    SNAPSHOT {
        uuid id PK
        uuid project_id FK
        datetime timestamp
        text quadtree_data
    }
    
    EVENT_LOG {
        uuid id PK
        uuid project_id FK
        datetime timestamp
        string event_type
        text payload
    }
```

### 6.2 DDL语句

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE map_elements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  type TEXT NOT NULL CHECK (type IN ('bar', 'seat', 'entrance', 'obstacle')),
  polygon_data TEXT NOT NULL,
  properties TEXT DEFAULT '{}'
);

CREATE TABLE simulation_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  config_json TEXT NOT NULL
);

CREATE TABLE sir_matrices (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES simulation_configs(id),
  adjacency_matrix TEXT NOT NULL
);

CREATE TABLE queue_topologies (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES simulation_configs(id),
  topology_data TEXT NOT NULL
);

CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  quadtree_data TEXT NOT NULL
);

CREATE TABLE event_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL,
  payload TEXT DEFAULT '{}'
);

CREATE INDEX idx_map_elements_project ON map_elements(project_id);
CREATE INDEX idx_snapshots_project ON snapshots(project_id);
CREATE INDEX idx_event_logs_project ON event_logs(project_id);
CREATE INDEX idx_event_logs_type ON event_logs(event_type);
```
