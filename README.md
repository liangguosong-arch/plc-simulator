# PLC Device Communication Simulator

一个用于HMI设计时仿真的PLC设备通信模拟器，提供标准的RESTful API和WebSocket接口。

## 特性

- ✅ **标准API接口** - 完整的RESTful API，符合工业标准
- ✅ **JWT认证** - 基于角色的访问控制（GUEST/OPERATOR/ENGINEER/ADMIN）
- ✅ **实时WebSocket** - 支持变量值实时订阅推送
- ✅ **智能模拟引擎** - 自动/手动双模式变量模拟
- ✅ **Web管理界面** - 直观的可视化配置和管理
- ✅ **配置持久化** - JSON文件存储用户配置
- ✅ **历史数据缓存** - 内存中保留最近1000条历史记录

## 技术栈

- **后端**: Node.js + Express + TypeScript
- **WebSocket**: ws
- **认证**: JWT (jsonwebtoken)
- **数据存储**: lowdb (JSON文件)
- **前端**: Vue.js 3 (CDN)

## 快速开始

### 安装依赖

```bash
npm install
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

### 配置管理
- `GET /api/v1/config` - 获取配置
- `PUT /api/v1/config` - 更新配置

### 设备监控
- `GET /api/v1/devices/instances/sim-device-001/status` - 获取设备状态
- `GET /api/v1/devices/instances/sim-device-001/variables/values?variableIds=var-i0,var-q0` - 批量读取变量
- `GET /api/v1/devices/instances/sim-device-001/variables/history` - 获取历史数据
- `GET /api/v1/devices/instances/sim-device-001/alarms` - 获取报警信息
- `WS /ws/devices/instances/sim-device-001/subscribe` - WebSocket订阅

### 设备控制
- `POST /api/v1/devices/instances/sim-device-001/variables/:varId/write` - 写入变量
- `POST /api/v1/devices/instances/sim-device-001/variables/batch-write` - 批量写入
- `POST /api/v1/devices/instances/sim-device-001/commands/execute` - 执行命令
- `POST /api/v1/devices/instances/sim-device-001/mode/switch` - 切换模式
- `POST /api/v1/devices/instances/sim-device-001/restart` - 重启设备

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

配置文件位置: `data/config.json`

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
│   ├── simulator/                  # 模拟引擎
│   ├── variables/                  # 变量管理
│   ├── websocket/                  # WebSocket管理
│   ├── commands/                   # 命令执行
│   ├── config/                     # 配置管理
│   ├── routes/                     # API路由
│   ├── middleware/                 # 中间件
│   └── types/                      # 类型定义
├── web/
│   └── index.html                  # Web管理界面
├── data/
│   └── config.json                 # 用户配置(自动生成)
├── config/
│   └── default.json                # 默认配置
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

编辑 `src/config/config-manager.ts` 中的 `getDefaultVariables()` 方法：

```typescript
{
  id: 'var-new',
  label: '新变量',
  value: 'MW100',
  type: 'memory',
  address: 'MW100',
  dataType: 'REAL',
  unit: '°C',
  minValue: 0,
  maxValue: 100,
  accessLevel: 'read-write',
  simulationMode: 'auto',
  simulationConfig: {
    strategy: 'random',
    fluctuationRange: 10,
    minValue: 20,
    maxValue: 80
  }
}
```

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
