# 数据流图与拓扑依赖编排器

基于 DAG 的数据流图与拓扑编排系统。

## 目录结构

- `server/` — Fastify + better-sqlite3 后端
- `client/` — SolidJS + Vite 前端

## 启动

### 后端

```bash
cd server
npm install
npm run dev
# 监听 http://localhost:4280
```

### 前端

```bash
cd client
npm install
npm run dev
# 访问 http://localhost:4281
```

## 功能

- 无限画布（平移 / 缩放 / 节点拖拽）
- 基于 DAG 的节点图与端口连线
- 拓扑排序、循环依赖检测
- 数据流推导、缓存与版本分支
- 动画：连线流动、节点脉冲、拓扑遍历高亮、错误波纹、粒子数据
- 四个预设场景：线性管道 / 环形依赖 / 深度嵌套 / 并发脏读
- 异常演示：死循环、栈溢出、脏读、幽灵数据流
