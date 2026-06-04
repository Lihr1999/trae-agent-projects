# 项目构建与部署指南

## 1. 系统要求

### 1.1 开发环境

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | ≥ 16.0.0 | JavaScript运行环境 |
| pnpm | ≥ 7.0.0 | 包管理工具 |
| Git | 最新版 | 版本控制 |
| 浏览器 | Chrome/Edge ≥ 100 | 推荐浏览器 |

### 1.2 生产环境

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | ≥ 16.0.0 | 后端运行环境 |
| Nginx | ≥ 1.20 | 反向代理（可选） |
| PM2 | ≥ 5.0 | 进程守护（可选） |
| SQLite | ≥ 3.30 | 数据库（内置） |

## 2. 项目结构

```
intelligent-warehouse-scheduling-system/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── algorithms/      # 核心算法
│   │   ├── database/        # 数据库相关
│   │   ├── routes/          # API路由
│   │   ├── services/        # 业务服务
│   │   ├── types/           # 类型定义
│   │   ├── index.ts         # 入口文件
│   │   └── seed.ts          # 种子数据
│   ├── data/                # 数据库文件（运行时生成）
│   ├── dist/                # 编译输出
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/      # 组件
│   │   ├── pages/           # 页面
│   │   ├── services/        # API服务
│   │   ├── stores/          # 状态管理
│   │   ├── styles/          # 样式
│   │   ├── types/           # 类型定义
│   │   ├── App.svelte       # 主组件
│   │   └── main.ts          # 入口文件
│   ├── dist/                # 编译输出
│   ├── package.json
│   ├── vite.config.ts
│   └── svelte.config.js
├── docs/                    # 文档目录
├── package.json             # 根项目配置
├── pnpm-workspace.yaml      # pnpm工作空间配置
└── .gitignore
```

## 3. 开发环境搭建

### 3.1 安装依赖

```bash
# 进入项目目录
cd intelligent-warehouse-scheduling-system

# 安装所有依赖
pnpm install
```

### 3.2 启动开发服务

#### 方式一：分别启动（推荐）

```bash
# 启动后端服务（端口：3000）
cd backend
pnpm dev

# 新开终端，启动前端服务（端口：5173）
cd frontend
pnpm dev
```

#### 方式二：使用根目录脚本（如果配置）

```bash
# 在根目录运行
pnpm dev:all
```

### 3.3 访问应用

- 前端地址：http://localhost:5173
- 后端API：http://localhost:3000/api
- WebSocket：ws://localhost:3000/ws

### 3.4 开发调试

#### 后端调试

使用VS Code调试：
1. 按 `F5` 启动调试
2. 断点调试TypeScript代码
3. 查看控制台输出

#### 前端调试

1. 打开浏览器开发者工具（F12）
2. 在Sources面板设置断点
3. 使用Console面板查看日志

## 4. 生产构建

### 4.1 构建命令

```bash
# 进入项目根目录
cd intelligent-warehouse-scheduling-system

# 构建所有项目
pnpm build:all

# 或者分别构建
cd backend && pnpm build
cd frontend && pnpm build
```

### 4.2 构建输出

#### 后端输出

```
backend/dist/
├── index.js          # 主入口
├── algorithms/       # 算法模块
├── database/         # 数据库模块
├── routes/           # 路由模块
├── services/         # 服务模块
└── types/            # 类型定义
```

#### 前端输出

```
frontend/dist/
├── index.html
├── assets/
│   ├── index-*.js   # JS资源
│   ├── index-*.css  # CSS资源
│   └── *.svg/png    # 静态资源
```

## 5. 生产部署

### 5.1 环境准备

```bash
# 安装Node.js (Ubuntu为例)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装pnpm
npm install -g pnpm

# 安装PM2（进程守护）
npm install -g pm2
```

### 5.2 部署文件准备

```bash
# 在服务器上创建项目目录
mkdir -p /opt/warehouse-system

# 上传构建产物
# 方式1：使用scp上传
scp -r backend/dist user@server:/opt/warehouse-system/backend
scp -r frontend/dist user@server:/opt/warehouse-system/frontend

# 方式2：使用Git部署
git clone <repository-url>
cd intelligent-warehouse-scheduling-system
pnpm install
pnpm build:all
```

### 5.3 后端部署

#### 方式一：使用PM2（推荐）

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'warehouse-backend',
    script: '/opt/warehouse-system/backend/dist/index.js',
    cwd: '/opt/warehouse-system/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

启动服务：

```bash
# 启动应用
pm2 start ecosystem.config.js

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

#### 方式二：使用Node直接运行

```bash
# 进入后端目录
cd /opt/warehouse-system/backend

# 安装生产依赖
pnpm install --prod

# 启动服务
NODE_ENV=production node dist/index.js
```

### 5.4 前端部署

#### 方式一：使用Nginx

创建Nginx配置文件 `/etc/nginx/conf.d/warehouse.conf`：

```nginx
server {
    listen 80;
    server_name warehouse.example.com;

    # 前端静态资源
    location / {
        root /opt/warehouse-system/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket代理
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1024;
}
```

重启Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 方式二：使用Vite预览（不推荐用于生产）

```bash
cd frontend
pnpm preview
```

### 5.5 数据库初始化

```bash
# 首次启动会自动创建数据库和表
# 如需重新初始化，删除数据库文件即可
rm -f /opt/warehouse-system/backend/data/warehouse.db

# 重启服务重新初始化
pm2 restart warehouse-backend
```

## 6. Docker部署（可选）

### 6.1 编写Dockerfile

#### 后端Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json .
COPY pnpm-lock.yaml .
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app/package.json .
COPY --from=builder /app/pnpm-lock.yaml .
COPY --from=builder /app/dist ./dist

RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### 前端Dockerfile (`frontend/Dockerfile`)

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json .
COPY pnpm-lock.yaml .
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 6.2 Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - ./backend/data:/app/data
    environment:
      - NODE_ENV=production

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
```

### 6.3 启动容器

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 7. 运维监控

### 7.1 日志管理

#### PM2日志

```bash
# 查看所有日志
pm2 logs

# 查看特定应用日志
pm2 logs warehouse-backend

# 清空日志
pm2 flush

# 日志轮转配置（PM2内置）
pm2 install pm2-logrotate
```

#### 系统日志

```bash
# 后端运行日志
tail -f /opt/warehouse-system/backend/logs/app.log

# Nginx访问日志
tail -f /var/log/nginx/access.log

# Nginx错误日志
tail -f /var/log/nginx/error.log
```

### 7.2 性能监控

#### PM2监控

```bash
# 查看实时监控
pm2 monit

# 查看应用状态
pm2 status

# 查看详细信息
pm2 show warehouse-backend
```

#### 系统资源监控

```bash
# CPU和内存使用
htop

# 磁盘使用
df -h

# 网络连接
netstat -tulnp
```

### 7.3 数据备份

#### 数据库备份

```bash
# 创建备份脚本 backup.sh
#!/bin/bash
BACKUP_DIR="/opt/warehouse-system/backups"
DB_FILE="/opt/warehouse-system/backend/data/warehouse.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_FILE $BACKUP_DIR/warehouse_$DATE.db

# 压缩备份
gzip $BACKUP_DIR/warehouse_$DATE.db

# 保留7天内的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

设置定时任务：

```bash
# 编辑crontab
crontab -e

# 添加每天凌晨2点备份
0 2 * * * /opt/warehouse-system/scripts/backup.sh
```

### 7.4 故障排查

#### 常见问题

**1. 服务无法启动**

```bash
# 检查端口占用
netstat -tulnp | grep 3000

# 查看错误日志
pm2 logs warehouse-backend --err

# 检查数据库文件权限
ls -la /opt/warehouse-system/backend/data/
```

**2. 前端无法连接后端**

```bash
# 检查后端服务状态
pm2 status

# 测试API接口
curl http://localhost:3000/api/floors

# 检查Nginx配置
nginx -t
```

**3. WebSocket连接失败**

```bash
# 检查Nginx WebSocket配置
# 确认Connection和Upgrade头已正确设置

# 测试WebSocket连接
wscat -c ws://localhost:3000/ws
```

## 8. 安全配置

### 8.1 HTTPS配置

使用Let's Encrypt免费证书：

```bash
# 安装Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d warehouse.example.com

# 自动续期
sudo certbot renew --dry-run
```

### 8.2 防火墙配置

```bash
# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 开发环境允许3000端口
sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable
```

### 8.3 访问控制

Nginx配置中添加：

```nginx
# 限制请求频率
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api {
    limit_req zone=api burst=20 nodelay;
    # ... 其他配置
}
```

## 9. 扩展指南

### 9.1 横向扩展

1. **数据库扩展**：数据量增大时考虑迁移到PostgreSQL/MySQL
2. **负载均衡**：使用Nginx/HAProxy做后端负载均衡
3. **缓存层**：添加Redis缓存热点数据

### 9.2 功能扩展

- 集成WMS/ERP系统
- 添加报表导出功能
- 实现移动端适配
- 添加数据大屏展示

## 10. 常用命令速查

```bash
# 开发环境
pnpm install              # 安装依赖
pnpm dev                  # 开发模式
pnpm build                # 构建
pnpm test                 # 运行测试

# PM2
pm2 start app.js          # 启动应用
pm2 stop app              # 停止应用
pm2 restart app           # 重启应用
pm2 logs app              # 查看日志
pm2 status                # 查看状态
pm2 monit                 # 实时监控

# Docker
docker-compose up -d      # 启动容器
docker-compose down       # 停止容器
docker-compose logs -f    # 查看日志
docker-compose build      # 重新构建
```
