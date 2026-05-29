# Stained Glass Kaleidoscope Workbench

一个基于计算几何、非欧几何与物理光学原理的三维交互可视化系统。

## 功能特性

### 前端交互与渲染系统
- 基础晶胞画布，支持贝塞尔曲线工具勾勒玻璃碎片轮廓
- 材质属性编辑面板，支持各向异性折射率、色散系数与次表面散射材质参数
- 万花筒配置界面，支持设置镜面拓扑夹角与三维空间群类型
- 3D视口实时渲染引擎，利用GPGPU技术计算并可视化经过群生成元矩阵无限作用后的多介质焦散与干涉图案
- 光源控制功能，支持调节多光源的光谱分布与偏振态参数

### 后端核心计算服务
- 基于受限Delaunay三角剖分的流形网格重构算法
- 基于CSG布尔运算的玻璃碎片无缝切割与拼合逻辑
- 利用四元数球面线性插值计算空间群连续变换的半边数据结构维护系统
- 求解包含色散效应的斯涅尔定律与菲涅尔方程的蒙特卡洛光子追踪近似算法

### 数据持久化系统
- 使用SQLite数据库存储：
  - 包含CSG操作树的万花筒工程文件
  - 操作日志链式哈希（支持基于事件溯源的无限撤销/重做功能）
  - 材质图节点网络结构数据
  - 光源光谱参数配置

### 预设场景功能
- "经典三面镜六重对称花朵"
- "双曲几何 {5,4} 非欧几里得无限镶嵌"
- "高色散率火石玻璃产生剧烈光谱分离"
- "极小夹角镜面引发光线囚禁与焦散能量聚焦"

### 动画效果实现
- 基于李群代数插值的万花筒连续拓扑形变动画系统
- 光子映射近似下的焦散能量池在曲面游走并随距离衰减的流光动画
- 拖拽锚点触发Delaunay边翻转与Voronoi细胞弹性松弛的拓扑动画
- 对称群参数改变时整个图案执行四元数空间旋转咬合的矩阵变换动画
- 光线穿透高色散介质时波长分离产生的彩虹色散动画
- CSG切割面实时布尔求差的剖面扫描动画

## 技术栈

### 前端
- React 18
- Three.js (Custom Shader/GPGPU
- TypeScript
- Zustand (状态管理)
- Tailwind CSS
- Vite

### 后端
- Node.js
- Fastify
- SQLite (sql.js)

## 安装与运行

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装客户端依赖
cd client
npm install

# 安装服务器依赖
cd ../server
npm install
```

### 开发模式

```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
cd server
npm run dev

# 另一个终端
cd client
npm run dev
```

### 生产构建

```bash
npm run build
npm start
```

## 项目结构

```
stained-glass-kaleidoscope/
├── client/                 # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── shaders/        # GLSL着色器
│   │   ├── stores/         # 状态管理
│   │   ├── types/          # TypeScript类型
│   │   ├── utils/          # 工具函数
│   │   └── styles/         # 样式
│   └── package.json
│   └── vite.config.ts
│   └── tsconfig.json
├── server/                 # 后端服务
│   ├── src/
│   │   ├── algorithms/     # 核心算法
│   │   ├── db/           # 数据库服务
│   │   ├── routes/       # API路由
│   │   └── types/        # TypeScript类型
│   │   └── presets/      # 预设场景
│   └── data/             # 数据库文件
│   └── package.json
│   └── tsconfig.json
└── package.json
└── README.md
```

## 使用说明

1. **玻璃碎片绘制**: 使用贝塞尔曲线工具在左侧画布上绘制玻璃碎片轮廓
2. **材质编辑**: 为每个玻璃碎片设置材质属性（折射率、色散系数等
3. **空间群配置**: 选择不同的几何类型和Schläfli符号配置万花筒对称群
4. **光源控制**: 调节光源参数并运行光子追踪计算
5. **预设场景**: 点击右侧面板加载预设场景快速体验

## 核心算法

### Delaunay三角剖分
实现了基于Bowyer-Watson算法的Delaunay三角剖分，支持边翻转操作。

### CSG布尔运算
支持并集、交集、差集三种布尔运算，用于玻璃碎片的无缝切割与拼合。

### 蒙特卡洛光子追踪
基于菲涅尔方程和斯涅尔定律的光子追踪算法，计算焦散图案。

### 空间群生成
支持二维晶体群、球面点群与双曲镶嵌群的Schläfli符号表示法。

## 许可证

MIT License
