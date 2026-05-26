# 🚀 PLC Simulator 快速启动指南

## ⚡ 最快速的方式（一行命令）

```bash
npm run dev
```

这会自动启动：
- ✅ 后端服务器 (http://localhost:8080)
- ✅ 前端开发服务器 (http://localhost:3000)

**推荐使用 http://localhost:3000 进行开发**（带热更新）

---

## 📋 详细步骤

### 1️⃣ 首次使用（仅第一次需要）

```bash
# 安装所有依赖
npm install

# 进入新前端目录并安装依赖
cd web
npm install
cd ..
```

### 2️⃣ 开发模式

**选项 A：并行启动（推荐）**
```bash
npm run dev
```

**选项 B：分别启动**
```bash
# 终端 1 - 后端
npm run dev:backend

# 终端 2 - 前端
cd web && npm run dev
```

### 3️⃣ 访问应用

- **开发环境**: http://localhost:3000 （推荐，带热更新）
- **生产模拟**: http://localhost:8080 （使用构建后的文件）

### 4️⃣ 默认登录账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 工程师 | engineer | eng123 |
| 操作员 | operator | op123 |
| 访客 | guest | guest123 |

---

## 🏗️ 构建生产版本

```bash
# 一键构建（前端 + 后端）
npm run build

# 运行生产版本
npm start
```

访问 http://localhost:8080

---

## 🔧 常用命令

```bash
# 开发
npm run dev              # 并行启动前后端
npm run dev:frontend     # 仅前端（web）
npm run dev:backend      # 仅后端

# 构建
npm run build            # 构建前端 + 编译后端
npm run build:frontend   # 仅构建前端

# 运行
npm start                # 运行生产版本

# 清理
npm run clean            # 删除 dist 目录
```

---

## 📁 项目结构速览

```
plc-simulator/
├── web/              # ✨ 新前端（Vite + Vue 3）
│   ├── src/
│   │   ├── components/   # Vue 组件
│   │   ├── stores/       # Pinia 状态管理
│   │   ├── api/          # API 封装
│   │   └── types/        # TypeScript 类型
│   └── vite.config.ts    # Vite 配置
├── src/                  # 后端代码（TypeScript）
├── dist/                 # 构建输出
│   └── web/              # 前端构建结果
└── data/                 # 运行时数据
    └── config.json       # 用户配置
```

---

## 🐛 常见问题

### Q: 端口被占用？
**A**: 修改端口
```typescript
// vite.config.ts
server: {
  port: 3001  // 改成其他端口
}
```

### Q: 前端无法连接后端？
**A**: 检查：
1. 后端是否运行在 8080 端口
2. 查看浏览器控制台是否有 CORS 错误
3. 确认 `web/vite.config.ts` 中的代理配置

### Q: 如何清除缓存重新构建？
**A**: 
```bash
npm run clean
npm run build
```

### Q: 想回到旧前端？
**A**: 
```bash
# 删除新前端构建
rm -rf dist/web

# 后端会自动使用 web/ 目录
npm run dev:backend
```

---

## 💡 开发提示

1. **前端开发时**使用 http://localhost:3000（热更新快）
2. **测试生产构建**使用 http://localhost:8080
3. **修改后端代码**会自动重启（nodemon）
4. **修改前端代码**会热更新（无需刷新）
5. **TypeScript 错误**会在保存时显示，但不会阻止运行

---

## 📖 更多文档

- [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) - 完整迁移报告
- [VITE_MIGRATION.md](./VITE_MIGRATION.md) - 详细迁移指南

---

## 🎉 开始使用

```bash
# 现在就试试！
npm run dev
```

然后打开浏览器访问 http://localhost:3000 🚀
