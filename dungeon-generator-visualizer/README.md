# 🏰 程序化地牢生成与寻路可视化器

Procedural Dungeon Generator & Pathfinder Visualizer

一个面向Roguelike游戏开发的程序化地牢地图生成与多算法寻路对比可视化系统。

## ✨ 功能特性

### 🎮 地牢生成
- **BSP树分割法**: 生成规则的房间布局，支持自定义房间数量、尺寸范围
- **Drunkard Walker算法**: 生成自然的洞穴地形，支持平滑迭代和填充概率调整
- **Prim算法走廊**: 基于最小生成树构建走廊网络，支持弯曲度调整
- **丰富的地图元素**: 自动放置门、宝箱、怪物、陷阱

### 🗺️ 寻路算法
- **A*算法**: 使用启发式函数的最优路径搜索
- **Dijkstra算法**: 保证最短路径的广度优先算法
- **JPS (Jump Point Search)**: A*的优化版本，通过跳点剪枝大幅减少节点展开
- **BFS (广度优先搜索)**: 基础的无权图最短路径算法

### 📊 对比与可视化
- 四种算法同时运行，实时对比性能指标
- 节点展开波纹动画，直观展示算法探索过程
- 路径高亮描线动画，从终点回溯到起点
- 详细的性能统计：耗时、节点展开数、路径长度、最大OpenSet大小

### 🎨 预设场景
- **小型规则地牢十房间**: 经典BSP生成的小型地牢
- **巨型洞穴地图五百格**: 大型洞穴地形，展示算法性能瓶颈
- **窄走廊迷宫死胡同**: 高弯曲度走廊的复杂迷宫
- **起点终点不可达孤岛**: 边界情况展示

### 💾 数据存储
- SQLite数据库存储地牢种子与参数配置
- 生成结果快照保存
- 寻路统计数据持久化

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖
```bash
cd dungeon-generator-visualizer
npm run install:all
```

### 启动开发服务器
```bash
npm run dev
```

- 前端: http://localhost:3000
- 后端API: http://localhost:3001

### 构建生产版本
```bash
npm run build
```

## 📖 使用说明

### 基本操作
1. **生成地牢**: 在左侧面板调整参数，点击"生成地牢"按钮
2. **设置起点**: 点击"设置起点"按钮，然后点击地图上的可行走区域
3. **设置终点**: 点击"设置终点"按钮，然后点击地图上的可行走区域
4. **开始寻路**: 选择算法，点击"开始寻路"
5. **对比算法**: 点击"对比所有算法"查看四种算法的性能对比

### 地图交互
- **滚轮缩放**: 使用鼠标滚轮缩放地图
- **平移视图**: 按住Shift+左键或中键拖动平移
- **查看信息**: 鼠标悬停查看格子信息

### 动画控制
- **播放/暂停**: 控制寻路动画播放
- **重置**: 重置动画到开始状态
- **步进**: 单步前进动画
- **速度调节**: 调整动画播放速度
- **动画类型**: 切换节点展开动画或路径绘制动画

## 🏗️ 项目结构

```
dungeon-generator-visualizer/
├── client/                    # Nuxt 3 前端
│   ├── assets/
│   │   └── css/
│   │       └── main.css       # 全局样式
│   ├── components/
│   │   ├── DungeonCanvas.vue  # Canvas渲染组件
│   │   ├── ConfigPanel.vue    # 参数配置面板
│   │   └── AnimationControls.vue  # 动画控制组件
│   ├── composables/
│   │   ├── useApi.ts          # API调用封装
│   │   └── useDungeonStore.ts # 状态管理
│   ├── types/
│   │   └── index.ts           # TypeScript类型定义
│   ├── app.vue                # 主应用组件
│   ├── nuxt.config.ts         # Nuxt配置
│   └── package.json
├── server/                    # Fastify 后端
│   ├── src/
│   │   ├── generators/
│   │   │   ├── bsp-generator.ts    # BSP地牢生成器
│   │   │   └── cave-generator.ts   # 洞穴生成器
│   │   ├── pathfinding/
│   │   │   ├── a-star.ts      # A*算法
│   │   │   ├── dijkstra.ts    # Dijkstra算法
│   │   │   ├── jps.ts         # JPS算法
│   │   │   └── bfs.ts         # BFS算法
│   │   ├── database.ts        # SQLite数据库
│   │   ├── types.ts           # 类型定义
│   │   └── index.ts           # 服务器入口
│   ├── tsconfig.json
│   └── package.json
├── package.json               # 根配置
└── README.md
```

## 🔧 API 接口

### 生成地牢
```
POST /api/generate
Content-Type: application/json

{
  "width": 50,
  "height": 50,
  "minRoomSize": 4,
  "maxRoomSize": 10,
  "minRooms": 8,
  "maxRooms": 12,
  "bspDepth": 4,
  "corridorBendiness": 0.1,
  "doorDensity": 0.3,
  "chestDensity": 0.5,
  "monsterDensity": 0.3,
  "trapDensity": 0.05,
  "seed": 12345,
  "generatorType": "bsp"
}
```

### 寻路
```
POST /api/pathfind
Content-Type: application/json

{
  "tiles": [...],
  "start": { "x": 10, "y": 10 },
  "end": { "x": 40, "y": 40 },
  "algorithm": "astar",
  "allowDiagonal": false
}
```

### 批量寻路对比
```
POST /api/pathfind/all
Content-Type: application/json

{
  "tiles": [...],
  "start": { "x": 10, "y": 10 },
  "end": { "x": 40, "y": 40 },
  "snapshotId": 1
}
```

### 获取预设场景
```
GET /api/presets
```

### 快照管理
```
GET    /api/snapshots          # 获取快照列表
GET    /api/snapshots/:id      # 获取单个快照
DELETE /api/snapshots/:id      # 删除快照
```

## 🎯 边界情况展示

系统专门设计了以下边界情况的可视化展示：

1. **巨型地图性能瓶颈**: 100×100格地图下A*算法open set超过五千节点时优先队列操作的性能瓶颈
2. **JPS退化场景**: 含大量对角障碍的地图上JPS退化为接近BFS展开量的可视化效果
3. **BSP深度异常**: BSP深度设置过大时生成的房间面积趋近于一像素的异常情况
4. **孤岛场景**: 两个房间被走廊连接后又因洞穴算法侵蚀导致走廊消失形成孤岛

## 📚 技术栈

### 前端
- **Nuxt 3**: Vue 3 全栈框架
- **TypeScript**: 类型安全
- **Canvas API**: 高性能地图渲染
- **VueUse**: 组合式工具集

### 后端
- **Fastify**: 高性能Web框架
- **TypeScript**: 类型安全
- **better-sqlite3**: SQLite数据库驱动
- **seedrandom**: 可复现随机数生成

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
