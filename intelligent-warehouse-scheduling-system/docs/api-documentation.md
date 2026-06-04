# API接口文档

## 1. 概述

本文档描述智能仓库调度系统的RESTful API接口，所有接口遵循REST规范，使用JSON数据格式。

## 2. 基础信息

- **Base URL**: `http://localhost:3000/api`
- **数据格式**: JSON
- **字符编码**: UTF-8

## 3. 接口列表

### 3.1 楼层管理

#### 3.1.1 获取所有楼层

```http
GET /api/floors
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "floor_1",
      "name": "一层仓库",
      "level": 1,
      "width": 50,
      "height": 40,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 3.1.2 获取单个楼层

```http
GET /api/floors/:id
```

#### 3.1.3 创建楼层

```http
POST /api/floors
Content-Type: application/json

{
  "name": "二层仓库",
  "level": 2,
  "width": 50,
  "height": 40
}
```

#### 3.1.4 更新楼层

```http
PUT /api/floors/:id
Content-Type: application/json

{
  "name": "一层仓库（更新）"
}
```

#### 3.1.5 删除楼层

```http
DELETE /api/floors/:id
```

### 3.2 货架管理

#### 3.2.1 获取所有货架

```http
GET /api/racks
```

**查询参数：**
- `floorId`: 按楼层筛选

#### 3.2.2 获取单个货架

```http
GET /api/racks/:id
```

#### 3.2.3 创建货架

```http
POST /api/racks
Content-Type: application/json

{
  "floorId": "floor_1",
  "name": "货架A",
  "x": 10,
  "y": 10,
  "width": 4,
  "height": 6,
  "rows": 4,
  "columns": 3
}
```

#### 3.2.4 更新货架

```http
PUT /api/racks/:id
```

#### 3.2.5 删除货架

```http
DELETE /api/racks/:id
```

### 3.3 库位管理

#### 3.3.1 获取所有库位

```http
GET /api/locations
```

**查询参数：**
- `rackId`: 按货架筛选
- `status`: 按状态筛选

#### 3.3.2 获取单个库位

```http
GET /api/locations/:id
```

#### 3.3.3 创建库位

```http
POST /api/locations
Content-Type: application/json

{
  "rackId": "rack_1",
  "code": "A-01-01",
  "row": 1,
  "column": 1,
  "level": 1,
  "status": "empty",
  "maxQuantity": 20
}
```

#### 3.3.4 更新库位

```http
PUT /api/locations/:id
```

#### 3.3.5 删除库位

```http
DELETE /api/locations/:id
```

### 3.4 商品管理

#### 3.4.1 获取所有商品

```http
GET /api/skus
```

#### 3.4.2 获取单个商品

```http
GET /api/skus/:id
```

#### 3.4.3 创建商品

```http
POST /api/skus
Content-Type: application/json

{
  "code": "SKU001",
  "name": "商品名称",
  "category": "分类A",
  "weight": 0.5,
  "volume": 0.1
}
```

#### 3.4.4 更新商品

```http
PUT /api/skus/:id
```

#### 3.4.5 删除商品

```http
DELETE /api/skus/:id
```

### 3.5 订单管理

#### 3.5.1 获取所有订单

```http
GET /api/orders
```

**查询参数：**
- `status`: 按状态筛选
- `priority`: 按优先级筛选

#### 3.5.2 获取单个订单

```http
GET /api/orders/:id
```

#### 3.5.3 创建订单

```http
POST /api/orders
Content-Type: application/json

{
  "orderNo": "ORD20240101001",
  "priority": "high",
  "items": [
    {
      "skuId": "sku_1",
      "skuName": "商品A",
      "quantity": 5
    }
  ]
}
```

#### 3.5.4 更新订单

```http
PUT /api/orders/:id
```

#### 3.5.5 删除订单

```http
DELETE /api/orders/:id
```

### 3.6 波次管理

#### 3.6.1 获取所有波次

```http
GET /api/waves
```

#### 3.6.2 获取单个波次

```http
GET /api/waves/:id
```

#### 3.6.3 生成波次

```http
POST /api/waves/generate
Content-Type: application/json

{
  "maxOrdersPerWave": 10,
  "maxItemsPerWave": 100
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "waves": [
      {
        "orderIds": ["order_1", "order_2"],
        "reason": "紧急订单，共2个订单"
      }
    ]
  }
}
```

#### 3.6.4 创建波次

```http
POST /api/waves
Content-Type: application/json

{
  "waveNo": "WAVE001",
  "orderIds": ["order_1", "order_2"],
  "priority": "high"
}
```

#### 3.6.5 执行波次

```http
POST /api/waves/:id/execute
```

**响应：**
```json
{
  "success": true,
  "data": {
    "message": "波次执行中",
    "taskCount": 10,
    "robotIds": ["robot_1", "robot_2"]
  }
}
```

#### 3.6.6 取消波次

```http
POST /api/waves/:id/cancel
```

#### 3.6.7 删除波次

```http
DELETE /api/waves/:id
```

### 3.7 机器人管理

#### 3.7.1 获取所有机器人

```http
GET /api/robots
```

**查询参数：**
- `status`: 按状态筛选
- `floorId`: 按楼层筛选

#### 3.7.2 获取单个机器人

```http
GET /api/robots/:id
```

#### 3.7.3 创建机器人

```http
POST /api/robots
Content-Type: application/json

{
  "name": "AGV-001",
  "floorId": "floor_1",
  "status": "idle",
  "x": 0,
  "y": 0,
  "battery": 100,
  "speed": 1.0,
  "capacity": 50
}
```

#### 3.7.4 更新机器人

```http
PUT /api/robots/:id
```

#### 3.7.5 删除机器人

```http
DELETE /api/robots/:id
```

### 3.8 任务管理

#### 3.8.1 获取所有任务

```http
GET /api/tasks
```

**查询参数：**
- `status`: 按状态筛选
- `robotId`: 按机器人筛选
- `waveId`: 按波次筛选

#### 3.8.2 获取单个任务

```http
GET /api/tasks/:id
```

#### 3.8.3 创建任务

```http
POST /api/tasks
Content-Type: application/json

{
  "type": "pick",
  "status": "pending",
  "fromLocationId": "loc_1",
  "toLocationId": "loc_2",
  "skuId": "sku_1",
  "quantity": 5,
  "priority": 1
}
```

#### 3.8.4 分配任务

```http
POST /api/tasks/:id/assign
Content-Type: application/json

{
  "robotId": "robot_1"
}
```

#### 3.8.5 取消任务

```http
POST /api/tasks/:id/cancel
```

#### 3.8.6 删除任务

```http
DELETE /api/tasks/:id
```

### 3.9 异常管理

#### 3.9.1 获取所有异常

```http
GET /api/exceptions
```

**查询参数：**
- `status`: 按状态筛选
- `severity`: 按严重程度筛选

#### 3.9.2 获取单个异常

```http
GET /api/exceptions/:id
```

#### 3.9.3 创建异常

```http
POST /api/exceptions
Content-Type: application/json

{
  "type": "collision",
  "severity": "high",
  "message": "机器人路径冲突",
  "relatedId": "robot_1",
  "relatedType": "robot"
}
```

#### 3.9.4 处理异常

```http
POST /api/exceptions/:id/handle
Content-Type: application/json

{
  "handledBy": "admin",
  "resolution": "重新规划路径"
}
```

#### 3.9.5 删除异常

```http
DELETE /api/exceptions/:id
```

### 3.10 调度日志

#### 3.10.1 获取日志

```http
GET /api/logs
```

**查询参数：**
- `type`: 按类型筛选
- `level`: 按级别筛选
- `limit`: 限制数量
- `offset`: 偏移量

#### 3.10.2 创建日志

```http
POST /api/logs
Content-Type: application/json

{
  "type": "system",
  "level": "info",
  "message": "系统启动",
  "details": {}
}
```

### 3.11 调度服务

#### 3.11.1 路径规划

```http
POST /api/scheduling/path
Content-Type: application/json

{
  "floorId": "floor_1",
  "startX": 0,
  "startY": 0,
  "endX": 20,
  "endY": 15
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "path": [
      {"x": 0, "y": 0},
      {"x": 1, "y": 0},
      {"x": 2, "y": 0}
    ],
    "distance": 35
  }
}
```

#### 3.11.2 任务重分配

```http
POST /api/scheduling/reassign
Content-Type: application/json

{
  "taskId": "task_1",
  "reason": "机器人故障"
}
```

#### 3.11.3 标记拥堵点

```http
POST /api/scheduling/congestion
Content-Type: application/json

{
  "floorId": "floor_1",
  "x": 10,
  "y": 10,
  "severity": "high"
}
```

#### 3.11.4 获取统计数据

```http
GET /api/scheduling/stats
```

**响应：**
```json
{
  "success": true,
  "data": {
    "totalOrders": 100,
    "pendingOrders": 10,
    "completedOrders": 85,
    "totalTasks": 500,
    "activeRobots": 8,
    "idleRobots": 2,
    "exceptions": 5
  }
}
```

### 3.12 WebSocket接口

#### 3.12.1 连接地址

```
ws://localhost:3000/ws
```

#### 3.12.2 消息格式

所有消息采用JSON格式：

```json
{
  "type": "message_type",
  "data": {}
}
```

#### 3.12.3 服务端推送消息

**机器人位置更新：**
```json
{
  "type": "robot_update",
  "data": {
    "id": "robot_1",
    "x": 10,
    "y": 15,
    "status": "busy"
  }
}
```

**任务状态更新：**
```json
{
  "type": "task_update",
  "data": {
    "id": "task_1",
    "status": "in_progress",
    "progress": 50
  }
}
```

**波次状态更新：**
```json
{
  "type": "wave_update",
  "data": {
    "id": "wave_1",
    "status": "processing"
  }
}
```

**异常告警：**
```json
{
  "type": "exception_alert",
  "data": {
    "id": "exc_1",
    "type": "collision",
    "severity": "high",
    "message": "机器人路径冲突"
  }
}
```

## 4. 错误响应

### 4.1 通用错误格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

### 4.2 常见错误码

| 错误码 | 说明 |
|--------|------|
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | 参数验证失败 |
| `DUPLICATE_ERROR` | 唯一约束冲突 |
| `BUSINESS_ERROR` | 业务逻辑错误 |
| `INTERNAL_ERROR` | 服务器内部错误 |

## 5. 状态枚举值

### 5.1 订单状态
- `pending`: 待处理
- `processing`: 处理中
- `completed`: 已完成
- `cancelled`: 已取消

### 5.2 任务状态
- `pending`: 待分配
- `assigned`: 已分配
- `in_progress`: 执行中
- `completed`: 已完成
- `cancelled`: 已取消
- `failed`: 执行失败

### 5.3 机器人状态
- `idle`: 空闲
- `busy`: 忙碌
- `charging`: 充电中
- `error`: 故障
- `maintenance`: 维护中

### 5.4 库位状态
- `empty`: 空闲
- `occupied`: 已占用
- `reserved`: 已预留
- `blocked`: 禁用

## 6. 分页查询

对于支持分页的接口，使用以下参数：

```http
GET /api/resource?page=1&pageSize=20
```

**响应：**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```
