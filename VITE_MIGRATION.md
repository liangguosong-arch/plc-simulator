# PLC Simulator - Vite Frontend Migration Guide

## 📦 项目结构

本项目已完成前端迁移，现在使用 **Vite + Vue 3 + TypeScript** 标准项目结构。

```
plc-simulator/
├── web/                    # 旧的前端（CDN方式，保留作为备份）
├── web/                # ✨ 新的前端（Vite + Vue 3）
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── api/            # API 封装
│   │   ├── types/          # TypeScript 类型
│   │   ├── App.vue         # 根组件
│   │   └── main.ts         # 入口文件
│   ├── vite.config.ts      # Vite 配置
│   └── package.json
├── src/                    # 后端代码（保持不变）
└── package.json            # 根目录脚本
```

## 🚀 开发模式

### 方式一：并行启动（推荐）

```bash
npm run dev
```

这会同时启动：
- 后端服务器：http://localhost:8080
- 前端开发服务器：http://localhost:3000（带热更新）

### 方式二：分别启动

**启动后端：**
```bash
npm run dev:backend
```

**启动前端（新终端）：**
```bash
cd web
npm run dev
```

## 🏗️ 构建生产版本

```bash
npm run build
```

这会：
1. 构建前端到 `dist/web/` 目录
2. 编译后端 TypeScript 到 `dist/` 目录

## ▶️ 运行生产版本

```bash
npm start
```

访问 http://localhost:8080

## ✨ 新前端特性

### 技术栈
- ⚡ **Vite 6** - 极速开发体验
- 🎯 **Vue 3.5** - Composition API + `<script setup>`
- 🔷 **TypeScript 5.9** - 完整的类型支持
- 🗃️ **Pinia 3** - 直观的状态管理
- 🌐 **Vue Router 4** - 客户端路由（预留）
- 📡 **Axios 1.13** - HTTP 客户端

### 优势对比

| 特性 | 旧前端 (CDN) | 新前端 (Vite) |
|------|-------------|--------------|
| **热更新速度** | 慢（整页刷新） | ⚡ 毫秒级 |
| **TypeScript** | ❌ IDE 误报 | ✅ 完美支持 |
| **组件格式** | x-template | ✅ 标准 SFC |
| **代码分割** | ❌ 无 | ✅ 自动优化 |
| **Tree Shaking** | ❌ 无 | ✅ 减少体积 |
| **开发体验** | 一般 | 🚀 优秀 |
| **生态工具** | 有限 | ✅ 丰富 |

## 📁 核心模块说明

### Stores (Pinia)

- **user.ts** - 用户认证和会话管理
- **variables.ts** - 变量数据和设备状态
- **ui.ts** - UI 状态（Toast、模态框等）

### Components

- **VariablesPanel.vue** - 变量配置面板（主功能）
- **LoginModal.vue** - 登录模态框

### API

- **index.ts** - 统一的 API 封装，包含请求/响应拦截器

## 🔄 迁移清单

- [x] 创建 Vite 项目结构
- [x] 配置 Vite（代理、别名、构建优化）
- [x] 安装依赖（vue-router, pinia, axios）
- [x] 创建 TypeScript 类型定义
- [x] 封装 API 模块
- [x] 创建 Pinia stores
- [x] 迁移 VariablesPanel 组件为标准 SFC
- [x] 创建 LoginModal 组件
- [x] 更新 App.vue 主组件
- [x] 配置后端支持新前端
- [x] 更新 package.json 脚本
- [ ] 添加单元测试（可选）
- [ ] 添加 E2E 测试（可选）
- [ ] 性能优化（可选）

## 🐛 常见问题

### Q: 前端无法连接后端 API？
A: 确保后端运行在 8080 端口，Vite 已配置代理 `/api` -> `http://localhost:8080`

### Q: 构建后访问页面白屏？
A: 检查 `dist/web/` 目录是否存在，以及后端是否正确提供静态文件

### Q: TypeScript 报错？
A: 运行 `npm run build` 检查类型错误，新前端有完整的类型检查

### Q: 如何回退到旧前端？
A: 删除 `dist/web/` 目录，后端会自动 fallback 到 `web/` 目录

## 📝 开发规范

1. **组件命名**: PascalCase（如 `VariablesPanel.vue`）
2. **使用 `<script setup>`**: 更简洁的 Composition API 语法
3. **类型安全**: 所有 props、emits、API 响应都要有类型定义
4. **状态管理**: 全局状态用 Pinia，局部状态用 `ref/reactive`
5. **样式作用域**: 组件样式使用 `<style scoped>`

## 🎯 下一步计划

1. 添加更多页面组件（Device Status, Settings）
2. 实现 WebSocket 实时通信
3. 添加路由守卫和权限控制
4. 集成图表库（如 ECharts）
5. 添加国际化支持
6. 编写单元测试和 E2E 测试

## 📞 技术支持

如有问题，请查看：
- [Vite 官方文档](https://vitejs.dev/)
- [Vue 3 官方文档](https://vuejs.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
