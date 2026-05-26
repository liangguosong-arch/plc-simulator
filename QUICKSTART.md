# 🚀 PLC模拟器快速启动指南

## 5分钟快速开始

### 1️⃣ 安装依赖 (已完成)
```bash
npm install
```

### 2️⃣ 启动服务器
```bash
npm run dev
```

你会看到类似输出：
```
┌─────────────────────────────────────────────────────┐
│  Server listening on http://0.0.0.0:8080       │
├─────────────────────────────────────────────────────┤
│  Web Interface: http://localhost:8080/             │
│  API Base: http://localhost:8080/api/v1           │
│  WebSocket: ws://localhost:8080/ws/...           │
├─────────────────────────────────────────────────────┤
│  Default Users:                                        │
│    admin / admin123                                    │
│    engineer / eng123                                   │
│    operator / op123                                    │
│    guest / guest123                                    │
└─────────────────────────────────────────────────────┘
```

### 3️⃣ 访问Web管理界面

打开浏览器访问: **http://localhost:8080**

你将看到：
- 📥 输入变量 (Input Variables)
- 📤 输出变量 (Output Variables)  
- 💾 内存变量 (Memory Variables)

每个变量显示：
- 变量名称和描述
- 当前值（实时更新）
- 模式切换按钮（Auto/Manual）
- 配置面板（自动模式下）

### 4️⃣ 测试API接口

#### 登录获取Token
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

复制返回的token，用于后续请求。

#### 查看设备状态
```bash
curl http://localhost:8080/api/v1/devices/instances/sim-device-001/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 读取变量值
```bash
curl "http://localhost:8080/api/v1/devices/instances/sim-device-001/variables/values?variableIds=var-i0,var-m0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5️⃣ 在Web界面操作

#### 切换变量模式
1. 找到任意变量卡片
2. 点击 "Auto" 或 "Manual" 按钮
3. 配置会自动保存

#### 自动模式配置
- **Strategy**: 选择模拟策略
  - Random: 随机波动
  - Sine Wave: 正弦波变化
  - Step: 阶梯跳变
  - Fixed: 固定值
- **Range ±%**: 波动范围（仅Random策略）
- **Min/Max**: 数值范围

#### 手动模式设置
1. 切换到Manual模式
2. 在Value输入框中输入新值
3. BOOL类型使用复选框
4. 数值类型直接输入

### 6️⃣ WebSocket实时订阅（JavaScript示例）

```javascript
// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:8080/ws/devices/instances/sim-device-001/subscribe')

ws.onopen = () => {
  console.log('✅ 已连接')
  
  // 订阅变量
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: {
      variableIds: ['var-i0', 'var-q0', 'var-m0'],
      samplingRate: 1000  // 每秒推送
    }
  }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'variable_update') {
    console.log(`📊 ${data.data.variableId} = ${data.data.value}`)
  }
}

ws.onerror = (error) => {
  console.error('❌ WebSocket错误:', error)
}
```

## 🎯 常见操作

### 修改温度变量的模拟方式
1. 找到 "温度设定" 变量 (var-m0)
2. 确保处于 Auto 模式
3. 将 Strategy 改为 "random"
4. 设置 Min=20, Max=80
5. 设置 Range ±% = 10
6. 点击 "Save All Configuration"

### 手动控制输出
1. 找到 "输出点 Q0" 变量 (var-q0)
2. 切换到 Manual 模式
3. 勾选或取消勾选复选框
4. 值会立即写入

### 查看所有变量当前值
Web界面每秒自动刷新显示最新值，无需手动操作。

## 🔍 故障排查

### 端口被占用
如果8080端口被占用，修改 `src/index.ts`:
```typescript
const server = new PLCSimulatorServer(9000) // 改用9000端口
```

### Token过期
Token有效期24小时，过期后重新登录获取新Token。

### 变量值不更新
1. 检查是否处于Auto模式
2. 查看控制台是否有错误
3. 重启服务器

### Web界面无法访问
1. 确认服务器已启动（查看控制台输出）
2. 检查防火墙设置
3. 尝试访问 http://127.0.0.1:8080

## 📚 更多资源

- [README.md](README.md) - 完整项目说明
- [API_TEST.md](API_TEST.md) - 详细API测试脚本
- [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) - 完整API文档
- [DELIVERY.md](DELIVERY.md) - 项目交付说明

## 🎉 开始使用

现在你已经准备好了！访问 http://localhost:8080 开始体验PLC模拟器吧！

如有问题，请查看控制台日志或参考相关文档。
