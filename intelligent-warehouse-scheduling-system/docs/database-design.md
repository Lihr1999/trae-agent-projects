# 数据库设计文档

## 1. 概述

本文档描述智能仓库调度系统的数据库设计，采用SQLite数据库存储，支持数据持久化和复杂查询。

## 2. ER图（实体关系图）

```
floors (楼层)
  ├─ id (PK)
  ├─ name
  ├─ level
  ├─ width
  ├─ height
  └─ timestamps
      │
      │ 1:N
      ▼
racks (货架)
  ├─ id (PK)
  ├─ floor_id (FK)
  ├─ name
  ├─ x, y, width, height
  ├─ rows, columns
  └─ timestamps
      │
      │ 1:N
      ▼
locations (库位)
  ├─ id (PK)
  ├─ rack_id (FK)
  ├─ code
  ├─ row, column, level
  ├─ status
  ├─ sku_id (FK)
  ├─ quantity, max_quantity
  └─ timestamps
      │
      │ N:1
      ▼
skus (商品)
  ├─ id (PK)
  ├─ code (UK)
  ├─ name
  ├─ category
  ├─ weight, volume
  └─ timestamps

orders (订单)
  ├─ id (PK)
  ├─ order_no (UK)
  ├─ priority
  ├─ status
  ├─ items (JSON)
  ├─ wave_id (FK)
  └─ timestamps
      │
      │ N:1
      ▼
waves (波次)
  ├─ id (PK)
  ├─ wave_no (UK)
  ├─ status
  ├─ order_ids (JSON)
  ├─ robot_ids (JSON)
  ├─ priority
  └─ timestamps

robots (机器人)
  ├─ id (PK)
  ├─ name
  ├─ floor_id (FK)
  ├─ status
  ├─ x, y, target_x, target_y
  ├─ battery
  ├─ current_task_id (FK)
  ├─ speed, capacity
  └─ timestamps
      │
      │ 1:N
      ▼
tasks (任务)
  ├─ id (PK)
  ├─ wave_id (FK)
  ├─ order_id (FK)
  ├─ robot_id (FK)
  ├─ type
  ├─ status
  ├─ from_location_id, to_location_id
  ├─ sku_id, quantity, priority
  ├─ path (JSON)
  └─ timestamps

exceptions (异常事件)
  ├─ id (PK)
  ├─ type
  ├─ severity
  ├─ status
  ├─ message, details
  ├─ related_id, related_type
  ├─ handled_by, resolution
  └─ timestamps

logs (调度日志)
  ├─ id (PK)
  ├─ type
  ├─ level
  ├─ message, details
  ├─ related_id
  └─ created_at

congestion_points (拥堵点)
  ├─ id (PK)
  ├─ x, y
  ├─ floor_id (FK)
  ├─ severity
  ├─ robot_count
  └─ created_at
```

## 3. 数据表详细设计

### 3.1 floors (楼层表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 楼层唯一标识 |
| name | TEXT | NOT NULL | 楼层名称 |
| level | INTEGER | NOT NULL | 楼层编号（1, 2, 3...） |
| width | INTEGER | NOT NULL | 楼层宽度（网格数） |
| height | INTEGER | NOT NULL | 楼层高度（网格数） |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

### 3.2 racks (货架表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 货架唯一标识 |
| floor_id | TEXT | NOT NULL, FK | 所属楼层ID |
| name | TEXT | NOT NULL | 货架名称 |
| x | INTEGER | NOT NULL | X坐标 |
| y | INTEGER | NOT NULL | Y坐标 |
| width | INTEGER | NOT NULL | 宽度（网格数） |
| height | INTEGER | NOT NULL | 高度（网格数） |
| rows | INTEGER | NOT NULL | 行数 |
| columns | INTEGER | NOT NULL | 列数 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

**索引：** `idx_racks_floor` (floor_id)

### 3.3 locations (库位表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 库位唯一标识 |
| rack_id | TEXT | NOT NULL, FK | 所属货架ID |
| code | TEXT | NOT NULL | 库位编码 |
| row | INTEGER | NOT NULL | 所在行 |
| column | INTEGER | NOT NULL | 所在列 |
| level | INTEGER | NOT NULL | 所在层 |
| status | TEXT | NOT NULL | 状态：empty/occupied/reserved/blocked |
| sku_id | TEXT | FK | 存放商品ID |
| quantity | INTEGER | NOT NULL | 当前数量 |
| max_quantity | INTEGER | NOT NULL | 最大容量 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

**索引：**
- `idx_locations_rack` (rack_id)
- `idx_locations_sku` (sku_id)

### 3.4 skus (商品表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 商品唯一标识 |
| code | TEXT | NOT NULL, UNIQUE | 商品编码 |
| name | TEXT | NOT NULL | 商品名称 |
| category | TEXT | NOT NULL | 商品分类 |
| weight | REAL | NOT NULL | 重量 |
| volume | REAL | NOT NULL | 体积 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

### 3.5 orders (订单表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 订单唯一标识 |
| order_no | TEXT | NOT NULL, UNIQUE | 订单编号 |
| priority | TEXT | NOT NULL | 优先级：low/medium/high/urgent |
| status | TEXT | NOT NULL | 状态：pending/processing/completed/cancelled |
| items | TEXT | NOT NULL | 订单项（JSON数组） |
| wave_id | TEXT | FK | 所属波次ID |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

**索引：** `idx_orders_status` (status)

### 3.6 waves (波次表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 波次唯一标识 |
| wave_no | TEXT | NOT NULL, UNIQUE | 波次编号 |
| status | TEXT | NOT NULL | 状态：pending/processing/completed/cancelled |
| order_ids | TEXT | NOT NULL | 订单ID列表（JSON数组） |
| robot_ids | TEXT | NOT NULL | 机器人ID列表（JSON数组） |
| priority | TEXT | NOT NULL | 优先级 |
| started_at | TEXT | 开始时间 |
| completed_at | TEXT | 完成时间 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

### 3.7 robots (机器人表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 机器人唯一标识 |
| name | TEXT | NOT NULL | 机器人名称 |
| floor_id | TEXT | NOT NULL, FK | 当前所在楼层 |
| status | TEXT | NOT NULL | 状态：idle/busy/charging/error/maintenance |
| x | INTEGER | NOT NULL | 当前X坐标 |
| y | INTEGER | NOT NULL | 当前Y坐标 |
| target_x | INTEGER | 目标X坐标 |
| target_y | INTEGER | 目标Y坐标 |
| battery | INTEGER | NOT NULL | 电量（0-100） |
| current_task_id | TEXT | FK | 当前任务ID |
| speed | REAL | NOT NULL | 移动速度 |
| capacity | INTEGER | NOT NULL | 承载能力 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

### 3.8 tasks (任务表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 任务唯一标识 |
| wave_id | TEXT | FK | 所属波次ID |
| order_id | TEXT | FK | 所属订单ID |
| robot_id | TEXT | FK | 执行机器人ID |
| type | TEXT | NOT NULL | 类型：pick/put/move/charge |
| status | TEXT | NOT NULL | 状态：pending/assigned/in_progress/completed/cancelled/failed |
| from_location_id | TEXT | FK | 起始库位ID |
| to_location_id | TEXT | FK | 目标库位ID |
| sku_id | TEXT | FK | 商品ID |
| quantity | INTEGER | NOT NULL | 数量 |
| priority | INTEGER | NOT NULL | 优先级 |
| path | TEXT | 路径节点（JSON数组） |
| started_at | TEXT | 开始时间 |
| completed_at | TEXT | 完成时间 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

**索引：**
- `idx_tasks_robot` (robot_id)
- `idx_tasks_status` (status)

### 3.9 exceptions (异常事件表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 异常唯一标识 |
| type | TEXT | NOT NULL | 异常类型 |
| severity | TEXT | NOT NULL | 严重程度：low/medium/high/critical |
| status | TEXT | NOT NULL | 状态：open/in_progress/resolved/closed |
| message | TEXT | NOT NULL | 异常信息 |
| details | TEXT | 详细信息（JSON） |
| related_id | TEXT | 关联ID |
| related_type | TEXT | 关联类型 |
| handled_by | TEXT | 处理人 |
| resolution | TEXT | 解决方案 |
| resolved_at | TEXT | 解决时间 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

**索引：** `idx_exceptions_status` (status)

### 3.10 logs (调度日志表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 日志唯一标识 |
| type | TEXT | NOT NULL | 类型：system/task/robot/user/exception |
| level | TEXT | NOT NULL | 级别：info/warning/error/debug |
| message | TEXT | NOT NULL | 日志消息 |
| details | TEXT | 详细信息（JSON） |
| related_id | TEXT | 关联ID |
| created_at | TEXT | NOT NULL | 创建时间 |

**索引：** `idx_logs_created` (created_at)

### 3.11 congestion_points (拥堵点表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 唯一标识 |
| x | INTEGER | NOT NULL | X坐标 |
| y | INTEGER | NOT NULL | Y坐标 |
| floor_id | TEXT | NOT NULL, FK | 楼层ID |
| severity | TEXT | NOT NULL | 严重程度：low/medium/high |
| robot_count | INTEGER | NOT NULL | 机器人数量 |
| created_at | TEXT | NOT NULL | 创建时间 |

## 4. 数据一致性约束

1. **外键约束**：所有外键引用均启用级联删除或限制删除
2. **唯一约束**：order_no、wave_no、sku.code等字段保证唯一性
3. **状态约束**：状态字段使用枚举值限制合法状态
4. **时间戳**：所有记录自动维护created_at和updated_at

## 5. 性能优化

1. **索引优化**：为常用查询字段创建索引
2. **WAL模式**：启用SQLite WAL模式提高并发性能
3. **批量操作**：使用批量插入/更新优化大数据量操作
4. **查询优化**：使用EXPLAIN QUERY PLAN分析慢查询
