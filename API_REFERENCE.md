# PLC Simulator API 参考文档

> Base URL: `http://localhost:3000/api/v1`  
> 统一响应格式见 [通用约定](#通用约定)

---

## 通用约定

### 请求头

| Header | 说明 |
|--------|------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <token>`（可选，本地开发可不传） |

### 统一响应体

```json
{
  "code": 200,
  "message": "OK",
  "data": "<具体数据 | null>",
  "timestamp": 1753171200000
}
```

### 错误码速查

| code   | 含义 |
|--------|------|
| `200`  | 成功 |
| `201`  | 创建成功 |
| `40001`| 参数缺失或格式错误 |
| `40002`| 参数值无效 |
| `40301`| 禁止操作（如删除默认实例） |
| `40401`| 资源不存在 |
| `40901`| 资源冲突（如重复 ID） |
| `50000`| 服务端异常 |

---

## 一、Instances — 实例管理

### 1.1 生成实例 ID

```
POST /instances/generate-id
```

> 自动生成一个全局唯一的实例标识符。

**响应** `code=200`

```json
{
  "code": 200,
  "data": { "instanceId": "inst-m9k2x3r4-a1b2" }
}
```

---

### 1.2 列出所有实例

```
GET /instances
```

> 合并注册表（运行态）与持久化索引，展示全部实例摘要。

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "instances": [
      {
        "instanceId": "0",
        "name": "默认实例",
        "status": "running",
        "deviceType": "plc",
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `instanceId` | string | 实例唯一标识 |
| `name` | string | 实例友好名称 |
| `status` | `"running" \| "offline" \| "error"` | 当前运行状态 |
| `deviceType` | `"plc" \| "hmi"` | 设备类型 |
| `createdAt` | string(ISO 8601) | 创建时间 |

---

### 1.3 获取实例详情

```
GET /instances/:instanceId
```

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "instanceId": "0",
    "config": {
      "id": "0",
      "instanceName": "默认实例",
      "type": "plc",
      "manufacturer": "Siemens",
      "series": "S7-1200",
      "deviceModel": "CPU 1214C",
      "status": "online",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-07-22T10:00:00.000Z"
    },
    "status": "running",
    "variableCount": 12,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "startedAt": "2026-07-22T09:00:00.000Z"
  }
}
```

---

### 1.4 创建实例

```
POST /instances
```

> **门控规则**：`id` 重复时返回 `409`。

**请求体**

```json
{
  "id": "inst-m9k2x3r4-a1b2",
  "instanceName": "生产线A-PLC",
  "manufacturer": "Siemens",
  "series": "S7-1200",
  "deviceModel": "CPU 1214C",
  "type": "plc"
}
```

| 参数 | 必填 | 类型 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | ✔ | string | — | 实例 ID（先调用 `generate-id` 获取） |
| `instanceName` | ✔ | string | — | 实例友好名称 |
| `manufacturer` | — | string | `PLC-Sim` | 制造商（来源于设备目录） |
| `series` | — | string | `SIM` | 系列（来源于设备目录） |
| `deviceModel` | — | string | `SIM-Default` | 型号（来源于设备目录） |
| `type` | — | `"plc" \| "hmi"` | `plc` | 设备类型 |

**响应** `code=201`

```json
{
  "code": 201,
  "message": "实例创建成功",
  "data": {
    "id": "inst-m9k2x3r4-a1b2",
    "instanceName": "生产线A-PLC",
    "type": "plc",
    "manufacturer": "Siemens",
    "series": "S7-1200",
    "deviceModel": "CPU 1214C",
    "status": "offline",
    "createdAt": "2026-07-22T10:00:00.000Z",
    "updatedAt": "2026-07-22T10:00:00.000Z"
  }
}
```

> 注意：创建后实例处于 **离线** 状态，需调用 [1.8 启动实例](#18-启动实例)。

---

### 1.5 获取实例配置（含变量）

```
GET /instances/:instanceId/config
```

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "config": { "id": "0", "instanceName": "默认实例", "type": "plc", "..." },
    "variables": [
      { "id": "v1", "address": "%M0.0", "label": "急停按钮", "dataType": "BOOL", "..." }
    ]
  }
}
```

---

### 1.6 更新实例属性

```
PUT /instances/:instanceId/config
```

> 仅更新实例元属性（名称 / 制造商 / 系列 / 型号），**不触及**变量配置。  
> 若实例正在运行，配置会自动同步到内存注册表。

**请求体**（仅提交变更字段）

```json
{
  "instanceName": "生产线A-PLC-新名称",
  "manufacturer": "Rockwell",
  "series": "CompactLogix",
  "deviceModel": "1769-L33ER"
}
```

| 参数 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `instanceName` | — | string | 实例新名称 |
| `type` | — | `"plc" \| "hmi"` | 设备类型 |
| `manufacturer` | — | string | 制造商 |
| `series` | — | string | 系列 |
| `deviceModel` | — | string | 型号 |
| `status` | — | `"online" \| "offline" \| "error"` | 状态 |

**响应** `code=200`

```json
{ "code": 200, "message": "配置更新成功", "data": { "..." } }
```

---

### 1.7 获取实例变量配置

```
GET /instances/:instanceId/variables
```

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "variables": [
      {
        "id": "v1",
        "address": "%M0.0",
        "label": "急停按钮",
        "type": "memory",
        "dataType": "BOOL",
        "accessLevel": "read_write",
        "simulationMode": "static",
        "unit": "",
        "description": ""
      }
    ]
  }
}
```

---

### 1.8 保存实例变量配置

```
PUT /instances/:instanceId/variables
```

> 全量覆盖变量配置。若实例正在运行，变量会自动同步到内存中的 `VariableManager`。

**请求体**

```json
{
  "variables": [
    {
      "id": "v1",
      "address": "%I0.0",
      "label": "传感器1",
      "type": "input",
      "dataType": "BOOL",
      "accessLevel": "read_only",
      "simulationMode": "random",
      "simulationConfig": { "strategy": "random", "updateInterval": 1000 }
    }
  ]
}
```

**响应** `code=200`

```json
{
  "code": 200,
  "message": "变量配置更新成功",
  "data": { "variableCount": 1 }
}
```

---

### 1.9 启动实例

```
POST /instances/:instanceId/start
```

**响应** `code=200`

```json
{ "code": 200, "message": "实例 \"0\" 已启动", "data": { "status": "running" } }
```

---

### 1.10 停止实例

```
POST /instances/:instanceId/stop
```

**响应** `code=200`

```json
{ "code": 200, "message": "实例 \"0\" 已停止", "data": { "status": "offline" } }
```

---

### 1.11 删除实例

```
DELETE /instances/:instanceId
```

> 默认实例（`instanceId === "0"`）不可删除，返回 `403`。

**错误示例** `code=40301`

```json
{ "code": 40301, "message": "默认实例不可删除", "data": null }
```

**成功** `code=200`

```json
{ "code": 200, "message": "实例 \"inst-xxx\" 已删除", "data": null }
```

---

## 二、Monitoring — 运行监控

> 以下接口均带 `:instanceId` 路径参数以支持多实例。

### 2.1 获取设备实例信息

```
GET /devices/instances/:instanceId
```

> 优先从注册表返回运行态数据，回退到配置文件。

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "instanceId": "0",
    "instanceName": "默认实例",
    "manufacturer": "Siemens",
    "series": "S7-1200",
    "deviceModel": "CPU 1214C",
    "type": "plc",
    "status": "running",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "startedAt": "2026-07-22T09:00:00.000Z"
  }
}
```

---

### 2.2 获取设备状态

```
GET /devices/instances/:instanceId/status
```

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "instanceId": "0",
    "status": "running",
    "mode": "auto",
    "uptime": 3600,
    "cycleTime": 10,
    "cpuUsage": 35.2,
    "memoryUsage": 62.1,
    "temperature": 42.5,
    "lastUpdateAt": "2026-07-22T10:00:00.000Z"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | `"running" \| "stopped" \| "error" \| "maintenance" \| "offline"` | 运行状态 |
| `mode` | `"auto" \| "manual" \| "teach"` | 操作模式 |
| `uptime` | number | 运行时长（秒） |
| `cycleTime` | number | 扫描周期（毫秒） |
| `cpuUsage` | number | CPU 使用率（%） |
| `memoryUsage` | number | 内存使用率（%） |
| `temperature` | number | 温度（℃） |

---

### 2.3 获取运行时变量列表

```
GET /devices/instances/:instanceId/variables
```

> 返回当前内存中变量管理器维护的全量变量（含实时值）。

**响应** `code=200`

```json
{
  "code": 200,
  "data": [
    {
      "config": { "id": "v1", "address": "%I0.0", "dataType": "BOOL", "label": "传感器1", "..." },
      "currentValue": true,
      "quality": "good",
      "lastUpdate": "2026-07-22T10:00:00.100Z"
    }
  ]
}
```

---

### 2.4 批量获取变量实时值

```
GET /devices/instances/:instanceId/variables/values?addresses=%M0.0,%I0.1,%Q0.0
```

| 参数 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `addresses` | ✔ | string | 逗号分隔的变量地址列表 |

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "%M0.0": { "value": true, "quality": "good", "timestamp": "2026-07-22T10:00:00.500Z" },
    "%I0.1": { "value": 32767, "quality": "good", "timestamp": "2026-07-22T10:00:00.500Z" }
  }
}
```

---

### 2.5 获取历史数据

```
GET /devices/instances/:instanceId/variables/history
  ?addresses=%M0.0,%I0.1
  &startTime=2026-07-22T08:00:00.000Z
  &endTime=2026-07-22T10:00:00.000Z
  [&interval=5000]
```

| 参数 | 必填 | 类型 | 默认值 | 说明 |
|------|------|------|--------|------|
| `addresses` | ✔ | string | — | 逗号分隔的变量地址 |
| `startTime` | ✔ | string(ISO) | — | 起始时间 |
| `endTime` | ✔ | string(ISO) | — | 结束时间 |
| `interval` | — | number | `0`（不过滤） | 采样间隔（毫秒） |

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "data": [
      {
        "address": "%M0.0",
        "data": [
          { "variableId": "v1", "timestamp": "2026-07-22T09:00:00.000Z", "value": false },
          { "variableId": "v1", "timestamp": "2026-07-22T09:00:05.000Z", "value": true }
        ]
      }
    ],
    "total": 2,
    "startTime": "2026-07-22T08:00:00.000Z",
    "endTime": "2026-07-22T10:00:00.000Z",
    "interval": 5000
  }
}
```

---

### 2.6 获取报警信息

```
GET /devices/instances/:instanceId/alarms
  [?status=active]
  [&severity=high]
```

| 参数 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `status` | — | `"active" \| "acknowledged" \| "cleared"` | 按状态过滤 |
| `severity` | — | `"high" \| "medium" \| "low"` | 按严重性过滤 |

**响应** `code=200`

```json
{
  "code": 200,
  "data": [
    {
      "id": "alarm-001",
      "instanceId": "0",
      "alarmCode": "ERR_OVER_TEMP",
      "message": "CPU 温度过高",
      "severity": "high",
      "status": "active",
      "triggeredAt": "2026-07-22T09:55:00.000Z",
      "relatedVariableId": "v_temp"
    }
  ]
}
```

---

### 2.7 确认报警

```
POST /devices/instances/:instanceId/alarms/:alarmId/acknowledge
```

> 成功时返回 `200`；报警不存在或状态不正确时返回 `400`。

**响应** `code=200`

```json
{ "code": 200, "message": "报警已确认", "data": { "success": true } }
```

---

## 三、Control — 设备控制

### 3.1 写入单个变量

```
POST /devices/instances/:instanceId/variables/:address/write
```

**请求体**

```json
{ "value": true }
```

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `value` | ✔ | any | 写入值（类型取决于变量 dataType） |

**响应** `code=200`

```json
{
  "code": 200,
  "message": "写入成功",
  "data": { "success": true, "writtenAt": "2026-07-22T10:01:00.000Z" }
}
```

---

### 3.2 批量写入变量

```
POST /devices/instances/:instanceId/variables/batch-write
```

**请求体**

```json
{
  "writes": [
    { "address": "%M0.0", "value": true },
    { "address": "%MW10", "value": 12345 }
  ]
}
```

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `writes` | ✔ | Array | `{ address, value }` 数组 |

**响应** `code=200`

```json
{
  "code": 200,
  "message": "批量写入成功",
  "data": {
    "success": true,
    "results": [
      { "address": "%M0.0", "success": true },
      { "address": "%MW10", "success": true }
    ],
    "writtenAt": "2026-07-22T10:01:00.000Z"
  }
}
```

---

### 3.3 执行设备命令

```
POST /devices/instances/:instanceId/commands/execute
```

**请求体**

```json
{
  "command": "reset",
  "parameters": { "type": "soft" }
}
```

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `command` | ✔ | string | 命令名（`start` / `stop` / `reset` / `pause` / `resume` 等） |
| `parameters` | — | object | 命令参数（自由键值对） |

**响应** `code=200`

```json
{
  "code": 200,
  "data": {
    "success": true,
    "message": "命令已执行",
    "executedAt": "2026-07-22T10:01:00.000Z"
  }
}
```

---

### 3.4 切换运行模式

```
POST /devices/instances/:instanceId/mode/switch
```

**请求体**

```json
{ "mode": "manual" }
```

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `mode` | ✔ | `"auto" \| "manual" \| "teach"` | 目标模式 |

**响应** `code=200`

```json
{
  "code": 200,
  "message": "模式切换成功",
  "data": { "success": true, "mode": "manual", "switchedAt": "2026-07-22T10:01:00.000Z" }
}
```

---

### 3.5 重启设备

```
POST /devices/instances/:instanceId/restart
```

**请求体**

```json
{
  "type": "soft",
  "confirm": true
}
```

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `type` | ✔ | `"soft" \| "hard"` | 重启类型（soft=软重启，hard=硬复位） |
| `confirm` | ✔ | boolean | 必须为 `true`（二次确认） |

**响应** `code=200`

```json
{
  "code": 200,
  "message": "设备重启成功",
  "data": { "success": true, "type": "soft", "restartedAt": "2026-07-22T10:02:00.000Z" }
}
```

---

## 接口全景速查

```
┌─────────────────────────────────────────────────────────────────────┐
│  INSTANCES                                                          │
│  POST   /instances/generate-id             生成实例 ID               │
│  GET    /instances                         列出所有实例              │
│  GET    /instances/:id                     获取实例详情              │
│  POST   /instances                         创建实例                  │
│  GET    /instances/:id/config              获取实例配置（含变量）      │
│  PUT    /instances/:id/config              更新实例属性              │
│  GET    /instances/:id/variables           获取实例变量配置           │
│  PUT    /instances/:id/variables           保存实例变量配置           │
│  POST   /instances/:id/start               启动实例                  │
│  POST   /instances/:id/stop                停止实例                  │
│  DELETE /instances/:id                     删除实例                  │
├─────────────────────────────────────────────────────────────────────┤
│  MONITORING                                                         │
│  GET    /devices/instances/:id              获取设备信息             │
│  GET    /devices/instances/:id/status       获取设备状态             │
│  GET    /devices/instances/:id/variables    获取变量列表（含实时值）   │
│  GET    /devices/instances/:id/variables/values  批量获取变量值      │
│  GET    /devices/instances/:id/variables/history  获取历史数据       │
│  GET    /devices/instances/:id/alarms       获取报警信息             │
│  POST   /devices/instances/:id/alarms/:aid/acknowledge  确认报警     │
├─────────────────────────────────────────────────────────────────────┤
│  CONTROL                                                            │
│  POST   /devices/instances/:id/variables/:addr/write    写入单变量   │
│  POST   /devices/instances/:id/variables/batch-write    批量写入     │
│  POST   /devices/instances/:id/commands/execute         执行命令     │
│  POST   /devices/instances/:id/mode/switch              切换模式     │
│  POST   /devices/instances/:id/restart                  重启设备     │
└─────────────────────────────────────────────────────────────────────┘
```
