# PLC设备通信模拟器 - 项目交付说明

## ✅ 已完成功能

### 1. 核心架构
- ✅ Node.js + Express + TypeScript 服务器
- ✅ JWT认证与基于角色的访问控制
- ✅ WebSocket实时数据推送
- ✅ 多实例支持（InstanceRegistry + NeDB 持久化）
- ✅ 配置持久化（NeDB，`data/nedb/`）

### 2. API接口实现

#### 认证授权 (第1章)
- ✅ POST /api/v1/auth/login - 用户登录
- ✅ POST /api/v1/auth/refresh - 刷新Token
- ✅ 四种角色权限: GUEST, OPERATOR, ENGINEER, ADMIN

#### 通用规范 (第2章)
- ✅ 统一响应格式
- ✅ 错误处理机制
- ✅ CORS跨域支持

#### 设备状态监控 (第6章)
- ✅ GET /devices/instances/:id/status - 获取设备状态
- ✅ GET /devices/instances/:id/variables/values - 批量读取变量
- ✅ GET /devices/instances/:id/variables/history - 历史数据查询
- ✅ WS /ws/devices/instances/:id/subscribe - WebSocket订阅
- ✅ GET /devices/instances/:id/alarms - 报警管理
- ✅ POST /devices/instances/:id/alarms/:alarmId/acknowledge - 确认报警

#### 设备控制 (第7章)
- ✅ POST /devices/instances/:id/variables/:varId/write - 写入单个变量
- ✅ POST /devices/instances/:id/variables/batch-write - 批量写入
- ✅ POST /devices/instances/:id/commands/execute - 执行命令
- ✅ POST /devices/instances/:id/mode/switch - 切换模式
- ✅ POST /devices/instances/:id/restart - 重启设备

### 3. 模拟引擎
- ✅ 设备状态自动模拟（CPU、内存、温度等）
- ✅ 变量值自动模拟（4种策略：随机、正弦波、阶梯、固定）
- ✅ 自动/手动双模式切换
- ✅ 历史数据缓存（最近1000条）
- ✅ 报警自动生成

### 4. Web管理界面
- ✅ 直观的可视化配置界面（Vue.js 3）
- ✅ 变量按类别分组显示（输入/输出/内存）
- ✅ 实时变量值显示
- ✅ 在线配置修改和保存
- ✅ 自动/手动模式切换
- ✅ 模拟参数配置

### 5. 默认设备配置
- ✅ 8个预定义变量
  - 2个输入变量 (BOOL, 自动模式)
  - 2个输出变量 (BOOL, 手动模式)
  - 4个内存变量 (INT/DINT/REAL, 自动模式)

## 📁 项目结构

```
plc-simulator/
├── src/                          # TypeScript源代码
│   ├── index.ts                  # 入口文件
│   ├── server.ts                 # 主服务器类
│   ├── auth/                     # 认证模块
│   ├── core/                     # 多实例注册表（运行态）
│   ├── simulator/                # 模拟引擎
│   ├── variables/                # 变量管理
│   ├── websocket/                # WebSocket管理
│   ├── commands/                 # 命令执行
│   ├── database/                 # NeDB 数据库管理
│   ├── services/                 # 实例/变量存储服务
│   ├── routes/                   # API路由（auth/instances/monitoring/control 等）
│   ├── middleware/               # 中间件
│   └── types/                    # 类型定义
├── scripts/                      # 脚本
│   ├── migrate-database.ts       # 数据库迁移
│   └── seed.ts                   # 示例数据种子（npm run seed）
├── web/                          # Vue 3 前端（Vite）
├── data/                         # 运行时数据
│   ├── config.json               # 旧单实例配置（已废弃）
│   └── nedb/                     # NeDB 数据文件（含 instances.db / instance-variables.db）
├── docs/                         # 文档
├── package.json                  # 项目依赖
├── tsconfig.json                 # TypeScript配置
└── README.md                     # 项目说明
```

## 🚀 启动说明

### 开发模式
```bash
npm run dev
```
服务器将在 http://localhost:8080 启动

### 初始化示例数据（部署后）
```bash
npm run seed        # 插入默认实例（id=0）及示例变量，已存在则跳过
npm run seed:reset  # 先清空实例数据再重新插入
```
发行包中已包含生成好的 `data/nedb/instances.db` 与
`data/nedb/instance-variables.db`，正常部署无需手动执行。

### 生产模式
```bash
npm run build   # 编译TypeScript + 前端
npm start       # 运行编译后的代码
```

### 访问Web界面
浏览器打开: http://localhost:8080

### 默认账户
| 用户名   | 密码      | 角色       |
|---------|----------|-----------|
| admin   | admin123 | ADMIN     |
| engineer| eng123   | ENGINEER  |
| operator| op123    | OPERATOR  |
| guest   | guest123 | GUEST     |

## 🔧 配置说明

### 修改端口
编辑 `src/index.ts` 或设置环境变量:
```bash
PORT=9000 npm run dev
```

### 修改默认种子数据
编辑 `scripts/seed.ts` 中的 `DEFAULT_INSTANCE_CONFIG` / `DEFAULT_VARIABLES`，
然后执行 `npm run seed:reset` 重建。

### 运行时实例数据
实例与变量持久化在 `data/nedb/`（`instances.db` / `instance-variables.db`），
随发行包分发，运行时会随用户操作更新。

### 模拟策略配置
在Web界面中可以直接修改：
- **Random**: 设置波动范围 ±%
- **Sine Wave**: 自动周期性变化
- **Step**: 在最小值和最大值之间跳变
- **Fixed**: 保持固定值

## 📊 技术特性

### 性能
- 变量更新周期: 500ms
- WebSocket广播周期: 100ms
- 历史数据缓存: 1000条/变量
- 并发WebSocket连接: 无限制（取决于Node.js性能）

### 安全
- JWT Token认证
- 基于角色的访问控制
- 请求验证
- CORS支持

### 可靠性
- 优雅关闭处理
- 错误全局捕获
- 实例数据自动持久化（NeDB）
- 内存泄漏防护

## 🎯 使用场景

1. **HMI设计阶段** - 在设计HMI页面时进行功能测试
2. **集成测试** - 测试客户端与PLC设备的通信逻辑
3. **培训演示** - 展示PLC设备的工作原理
4. **原型开发** - 快速验证自动化控制算法

## 📝 API示例

详见 [API_TEST.md](API_TEST.md) 和 [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

## 🔍 已知限制

1. ✅ 支持多设备实例模拟（通过 `GET /api/v1/instances` 管理）
2. ✅ 实例与变量数据持久化（NeDB，`data/nedb/`）
3. 报警为随机生成（非基于真实阈值）
4. 无真实的PLC通信协议（仅HTTP/WebSocket）

## 🚧 未来扩展

- [ ] 真实PLC协议适配器（Modbus, S7等）
- [ ] Web管理界面增强
- [ ] 脚本化模拟逻辑
- [ ] Docker容器化

## 📄 License

MIT

---

**项目已成功部署并运行！** 🎉

访问 http://localhost:8080 查看Web管理界面。
