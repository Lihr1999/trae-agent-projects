# 智能仓库调度系统 (Intelligent Warehouse Scheduling System)

一个基于Svelte + Koa + SQLite的智能仓库调度系统，支持2D仓库可视化、机器人路径规划、波次调度、异常告警等功能。

## ✨ 功能特性

### 🎨 2D仓库可视化
- 多楼层仓库布局展示
- D3.js实现的交互式2D视图
- 支持缩放、平移操作
- 货架拖拽调整与库位编辑
- 机器人实时位置追踪

### 🤖 智能调度
- A*路径规划算法
- 多机器人协同调度
- 拥堵/冲突实时检测
- 动态路径重规划

### 📦 波次管理
- 智能订单波次生成算法
- 基于优先级和商品相似度合并
- 任务自动分配与执行
- 波次执行进度监控

### 📊 数据展示
- Echarts库存分布图表
- 实时任务看板
- 机器人状态监控
- 异常事件分级告警

### 🔔 异常处理
- 库存不足预警与订单拆分
- 机器人故障自动重派
- 任务锁定与冲突检测
- 任务取消与状态回滚

## 🏗️ 技术栈

### 前端
- **框架**: Svelte 4
- **构建工具**: Vite 5
- **可视化**: D3.js 7
- **图表**: ECharts 5
- **路由**: svelte-spa-router
- **语言**: TypeScript

### 后端
- **框架**: Koa 2
- **数据库**: SQLite (better-sqlite3)
- **实时通信**: WebSocket (ws)
- **语言**: TypeScript
- **测试**: Jest + ts-jest

## 📁 项目结构

```
intelligent-warehouse-scheduling-system/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── algorithms/      # 核心算法（路径规划、波次生成）
│   │   ├── database/        # 数据库初始化
│   │   ├── routes/          # API路由
│   │   ├── services/        # 业务服务层
│   │   ├── types/           # 类型定义
│   │   ├── index.ts         # 入口文件
│   │   └── seed.ts          # 种子数据
│   └── package.json
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/      # Svelte组件
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # API/WebSocket服务
│   │   ├── stores/          # 状态管理
│   │   └── styles/          # 全局样式
│   └── package.json
├── docs/                    # 项目文档
│   ├── database-design.md   # 数据库设计文档
│   ├── api-documentation.md # API接口文档
│   ├── test-cases.md        # 测试用例与操作手册
│   └── deployment-guide.md  # 部署指南
└── package.json
```

## 🚀 快速开始

### 环境要求

- Node.js ≥ 16.0.0
- pnpm ≥ 7.0.0

### 安装依赖

```bash
# 进入项目目录
cd intelligent-warehouse-scheduling-system

# 安装所有依赖
pnpm install
```

### 启动开发服务

```bash
# 启动后端服务 (端口: 3000)
cd backend
pnpm dev

# 新开终端，启动前端服务 (端口: 5173)
cd frontend
pnpm dev
```

### 访问应用

- 前端地址: http://localhost:5173
- 后端API: http://localhost:3000/api
- WebSocket: ws://localhost:3000/ws

## 📖 核心模块

### 算法模块

#### A*路径规划
```typescript
const pathfinder = new AStarPathfinder(width, height, racks);
const path = pathfinder.findPath(startX, startY, endX, endY);
```

#### 波次生成器
```typescript
const generator = new WaveGenerator(options);
const waves = generator.generateWaves(orders, skus, locations);
```

#### 冲突检测
```typescript
const detector = new CollisionDetector();
const hasCollision = detector.checkCollision(robotId, nextX, nextY);
```

### API接口

#### 仓库管理
- `GET /api/floors` - 获取楼层列表
- `GET /api/racks` - 获取货架列表
- `GET /api/locations` - 获取库位列表

#### 波次调度
- `POST /api/waves/generate` - 智能生成波次
- `POST /api/waves/:id/execute` - 执行波次
- `POST /api/scheduling/path` - 路径规划

#### 实时通信
WebSocket推送机器人、任务、波次和异常更新。

完整的API文档请查看 [docs/api-documentation.md](docs/api-documentation.md)

## 📊 性能指标

- 前端渲染: 支持50+机器人同时流畅运行
- API响应: 平均响应时间 ≤ 300ms
- 测试覆盖: 核心算法模块覆盖率 ≥ 70%

## 🧪 测试

```bash
# 运行单元测试（后端）
cd backend
pnpm test

# 运行测试并查看覆盖率
pnpm test -- --coverage
```

## 📚 文档

- [数据库设计文档](docs/database-design.md)
- [API接口文档](docs/api-documentation.md)
- [测试用例与操作手册](docs/test-cases.md)
- [项目构建与部署指南](docs/deployment-guide.md)

## 🔧 构建

```bash
# 构建后端
cd backend
pnpm build

# 构建前端
cd frontend
pnpm build
```

## 🐳 Docker部署

```bash
# 使用docker-compose启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

## 🤝 贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

MIT License

## 📧 联系方式

如有问题或建议，请提交Issue。

---

**Made with ❤️ by Intelligent Warehouse Team**
