# PLC Device Communication Simulator

一个用于HMI设计时仿真的PLC设备通信模拟器，提供标准的RESTful API和WebSocket接口。

## 特性

- ✅ **标准API接口** - 完整的RESTful API，符合工业标准
- ✅ **JWT认证** - 基于角色的访问控制（GUEST/OPERATOR/ENGINEER/ADMIN）
- ✅ **实时WebSocket** - 支持变量值实时订阅推送
- ✅ **智能模拟引擎** - 自动/手动双模式变量模拟
- ✅ **Web管理界面** - 直观的可视化配置和管理
- ✅ **多实例支持** - 基于 NeDB 的持久化实例与变量管理
- ✅ **历史数据缓存** - 内存中保留最近1000条历史记录

## 技术栈

- **后端**: Node.js + Express + TypeScript
- **WebSocket**: ws
- **认证**: JWT (jsonwebtoken)
- **数据存储**: NeDB (`data/nedb/`)
- **前端**: Vue.js 3 (Vite)

## 快速开始

### 安装依赖

```bash
npm install
```

### 初始化示例数据（可选）

首次部署后执行，插入默认实例（id=`0`）及其示例变量，
用户即可在界面上看到示例性数据；发行包中已附带生成好的
`data/nedb/instances.db` 与 `data/nedb/instance-variables.db`，可跳过此步。

```bash
npm run seed        # 插入默认示例数据（已存在则跳过）
npm run seed:reset  # 先清空 instances.db / instance-variables.db 再重新插入
```

### 开发模式运行

```bash
npm run dev
```

### 编译TypeScript

```bash
npm run build
```

### 生产模式启动

```bash
npm start
```

## 默认账户

| 用户名   | 密码      | 角色       | 权限说明           |
|---------|----------|-----------|-------------------|
| admin   | admin123 | ADMIN     | 管理员，全部权限    |
| engineer| eng123   | ENGINEER  | 工程师，配置权限    |
| operator| op123    | OPERATOR  | 操作员，读写权限    |
| guest   | guest123 | GUEST     | 访客，只读权限      |

## API端点

### 认证
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/refresh` - 刷新Token

### 实例管理
- `GET /api/v1/instances` - 获取实例列表
- `POST /api/v1/instances` - 创建新实例
- `GET /api/v1/instances/:instanceId` - 获取实例详情
- `POST /api/v1/instances/:instanceId/start` - 启动实例
- `POST /api/v1/instances/:instanceId/stop` - 停止实例
- `DELETE /api/v1/instances/:instanceId` - 删除实例
- `GET /api/v1/instances/:instanceId/config` - 获取实例完整配置（含变量）
- `PUT /api/v1/instances/:instanceId/config` - 更新实例配置
- `GET /api/v1/instances/:instanceId/variables` - 获取实例变量
- `PUT /api/v1/instances/:instanceId/variables` - 更新实例变量

### 设备监控（以默认实例 `0` 为例）
- `GET /api/v1/devices/instances/0/status` - 获取设备状态
- `GET /api/v1/devices/instances/0/variables/values?addresses=I0.0,Q0.0` - 批量读取变量值
- `GET /api/v1/devices/instances/0/variables/history` - 获取历史数据
- `GET /api/v1/devices/instances/0/alarms` - 获取报警信息
- `WS /ws/devices/instances/0/subscribe` - WebSocket订阅

### 设备控制（以默认实例 `0` 为例）
- `POST /api/v1/devices/instances/0/variables/:address/write` - 写入变量
- `POST /api/v1/devices/instances/0/variables/batch-write` - 批量写入
- `POST /api/v1/devices/instances/0/commands/execute` - 执行命令
- `POST /api/v1/devices/instances/0/mode/switch` - 切换模式
- `POST /api/v1/devices/instances/0/restart` - 重启设备

## Web管理界面

浏览器访问: http://localhost:8080

功能：
- 查看所有变量按类别分组（输入/输出/内存）
- 切换变量的自动/手动模式
- 配置自动模拟策略（随机/正弦波/阶梯/固定）
- 设置变量范围和波动参数
- 手动修改变量值
- 实时查看变量当前值

## 配置说明

实例与变量数据持久化在 NeDB 文件 `data/nedb/` 下（`instances.db` / `instance-variables.db`）。
默认示例数据由 `npm run seed` 生成，也可通过实例管理 API 或 Web 界面创建新实例。
（旧单实例时代的 `data/config.json` / ConfigManager 已废弃并移除。）

### 变量模拟策略

1. **Random (随机)**
   - 在设定范围内随机波动
   - 可配置波动范围 ±%

2. **Sine Wave (正弦波)**
   - 按正弦函数周期性变化
   - 适合模拟温度、压力等连续量

3. **Step (阶梯波)**
   - 在最小值和最大值之间跳变
   - 每5秒切换一次

4. **Fixed (固定)**
   - 保持初始值不变

### 模拟模式

- **Auto (自动)**: 系统根据配置自动生成变量值
- **Manual (手动)**: 值保持不变，直到用户修改

## 项目结构

```
plc-simulator/
├── src/
│   ├── index.ts                    # 入口文件
│   ├── server.ts                   # 主服务器类
│   ├── auth/                       # 认证模块
│   ├── core/                       # 实例注册表（多实例运行态）
│   ├── simulator/                  # 模拟引擎
│   ├── variables/                  # 变量管理
│   ├── websocket/                  # WebSocket管理
│   ├── commands/                   # 命令执行
│   ├── database/                   # NeDB 数据库管理
│   ├── services/                   # 实例/变量存储服务
│   ├── routes/                     # API路由
│   ├── middleware/                 # 中间件
│   └── types/                      # 类型定义
├── scripts/
│   ├── migrate-database.ts         # 数据库迁移脚本
│   └── seed.ts                     # 示例数据种子脚本
├── web/                            # Vue 3 前端（Vite）
├── data/
│   ├── config.json                 # 遗留的旧单实例配置（已废弃）
│   └── nedb/                       # NeDB 数据文件（含 instances.db / instance-variables.db）
└── package.json
```

## 环境变量

| 变量名   | 说明        | 默认值      |
|---------|------------|------------|
| PORT    | 服务器端口   | 8080       |
| HOST    | 监听地址     | 0.0.0.0    |
| NODE_ENV| 运行环境     | production |

## 开发指南

### 添加新变量

在 Web 界面的实例管理/变量面板中添加，或调用实例变量 API：

```bash
# 更新实例变量（数组传 JSON）
curl -X PUT http://localhost:8080/api/v1/instances/0/variables \
  -H "Content-Type: application/json" \
  -d '{"variables":[{"id":"var-new","label":"新变量","type":"memory","address":"MW100","dataType":"REAL","unit":"°C","minValue":0,"maxValue":100,"accessLevel":"read-write","simulationMode":"auto","simulationConfig":{"strategy":"random","fluctuationRange":10,"minValue":20,"maxValue":80}}]}'
```

若要修改默认种子数据，编辑 `scripts/seed.ts` 中的 `DEFAULT_VARIABLES`，
然后执行 `npm run seed --reset` 重建。

### 自定义模拟策略

在 `src/variables/value-simulator.ts` 中添加新的策略实现。

## License

MIT

## 更新日志

### v1.0.0 (2024-04-09)
- 初始版本发布
- 实现核心API接口
- Web管理界面
- 变量自动/手动模拟
- WebSocket实时推送
