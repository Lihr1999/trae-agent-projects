# 🎮 游戏物理引擎可视化系统

一个基于 React + Canvas + Express + SQLite 的游戏物理引擎可视化系统，用于演示和研究二维多体动力学与关节约束迭代求解。

## ✨ 核心功能

### 🛠️ 画布交互
- 创建多种刚体（圆形、多边形/矩形）
- 鼠标选择和操作物体
- 施加冲量模拟爆炸效果

### 🔗 关节约束系统
- **距离约束** - 保持两个物体间固定距离
- **铰链约束** - 模拟转动关节
- **滑动约束** - 限制相对运动方向
- **弹簧阻尼约束** - 弹性连接

### ⚙️ 物理环境控制
- 全局重力场调节
- 迭代次数控制
- 休眠阈值设置

### 🎬 预设场景
1. **🤸 十五个肢体组成的复杂布娃娃自由落体**
   - 展示完整人体结构的物理模拟
   - 15个肢体部件 + 14个铰链关节
   - 观测关节断裂效果

2. **🌉 高频震荡的刚性弹簧连杆桥**
   - 12节刚性弹簧连杆组成的悬索桥
   - 展示高频振荡现象
   - 观测数值发散导致的爆炸效果

3. **🏰 多物体堆叠形成的休眠塔结构**
   - 10层金字塔结构堆叠
   - 展示 Gauss-Seidel 迭代收敛问题
   - 观测物体休眠和唤醒机制

4. **💔 极小时间步长下的关节约束撕裂**
   - 重锤拉扯链条演示
   - 展示关节断裂和粒子爆裂效果
   - 观测约束求解稳定性

## 🎨 可视化效果

- **轨迹拖尾动画** - 显示刚体运动轨迹
- **应力动画** - 彩色箭头显示关节约束力大小和方向
- **几何辅助线** - 碰撞接触点法线和切线可视化
- **粒子爆裂** - 关节断裂时的粒子效果
- **状态切换** - 休眠物体灰暗显示，唤醒时高亮

## 🔬 物理现象观测

### Gauss-Seidel 迭代收敛问题
多个刚体在狭小空间内紧密堆叠时，因收敛速度过慢导致物体在接触面发生高频抖动与穿透。

### 数值发散现象
刚性弹簧的刚度系数设置过大且时间步长不够小时，积分器发生数值发散导致连杆机构瞬间爆炸飞出屏幕。

### 隧道效应
布娃娃的肢体以极高速度撞击墙壁时，连续碰撞检测（CCD）失效发生直接穿墙而过的现象。

### 冗余约束矛盾
迭代求解器在处理包含闭环连杆的冗余约束时，产生矛盾的位置修正量导致整个机械结构扭曲变形。

## 🚀 快速开始

### 安装依赖
```bash
cd physics-engine-visualizer
npm run install:all
```

### 启动后端服务
```bash
cd server
npm run dev
```

### 启动前端开发服务器
```bash
cd client
npm run dev
```

### 访问应用
前端: http://localhost:3000
后端: http://localhost:3001

## 📁 项目结构

```
physics-engine-visualizer/
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── types/          # 类型定义
│   │   ├── utils/          # 工具函数
│   │   ├── styles/         # 样式文件
│   │   ├── App.tsx         # 主应用
│   │   └── main.tsx        # 入口
│   ├── index.html
│   └── package.json
├── server/                 # Express 后端
│   ├── src/
│   │   ├── physics/        # 物理引擎核心
│   │   │   ├── types.ts    # 物理类型定义
│   │   │   ├── math.ts     # 向量数学
│   │   │   ├── body.ts     # 刚体动力学
│   │   │   ├── collision.ts# SAT 碰撞检测
│   │   │   ├── constraints.ts # 约束求解器
│   │   │   └── world.ts    # 物理世界
│   │   ├── presets/        # 预设场景
│   │   ├── db/             # 数据库
│   │   ├── routes/         # API 路由
│   │   └── index.ts        # 服务器入口
│   ├── data/               # 数据库文件
│   └── package.json
└── package.json
```

## 🔧 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式
- Canvas 2D 渲染

### 后端
- Express.js
- TypeScript
- SQLite 数据库
- 自定义物理引擎

## 🧪 物理引擎特性

### 运动积分器
- 半隐式欧拉法 (Semi-implicit Euler)
- 能量阻尼稳定

### 约束求解器
- Gauss-Seidel 迭代法
- 位置修正 (Position Correction)
- 速度反弹 (Velocity Bias)

### 碰撞检测
- 分离轴定理 (SAT)
- 连续碰撞检测 (CCD)
- 接触流形 (Contact Manifold)

### 关节类型
- 距离约束 (Distance Joint)
- 铰链约束 (Hinge Joint)
- 滑动约束 (Slider Joint)
- 弹簧阻尼 (Spring Damper)

## 📝 开发说明

### 创建自定义刚体
```typescript
const circle = createRigidBody(
  { type: 'circle', radius: 25 },
  { x: 400, y: 300 },
  { friction: 0.3, restitution: 0.2, density: 1 },
  false
);
```

### 创建关节约束
```typescript
const joint = createJoint(
  'distance',
  bodyA, bodyB,
  { x: 0, y: 0 }, { x: 0, y: 0 },
  { distance: 100, breakingThreshold: 1000 }
);
```

## 📄 许可证

MIT License
