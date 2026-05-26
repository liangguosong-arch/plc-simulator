# NeDB util.isDate 错误修复说明

## 问题描述

在较新版本的 Node.js 中运行 PLC Simulator 时，访问设备枚举 API 会出现以下错误：

```
[Device Catalog Router] Error fetching manufacturers: util.isDate is not a function
[Device Catalog Router] Error fetching series: util.isRegExp is not a function
```

## 原因分析

NeDB v1.8.0 使用了 Node.js `util` 模块中已弃用的函数：
- `util.isDate()` - 已弃用
- `util.isRegExp()` - 已弃用  
- `util.isArray()` - 已弃用（建议使用 `Array.isArray()`）

这些函数在新版本的 Node.js 中已被移除或标记为弃用警告。

## 解决方案

在 `src/database/database-manager.ts` 文件开头添加了 polyfill，为这些已弃用的函数提供兼容实现：

```typescript
import util from 'util'

// Polyfill for deprecated util functions in newer Node.js versions
if (!(util as any).isDate) {
  (util as any).isDate = function(obj: any): obj is Date {
    return Object.prototype.toString.call(obj) === '[object Date]'
  }
}

if (!(util as any).isRegExp) {
  (util as any).isRegExp = function(obj: any): obj is RegExp {
    return Object.prototype.toString.call(obj) === '[object RegExp]'
  }
}

if (!(util as any).isArray) {
  (util as any).isArray = Array.isArray
}
```

## 测试验证

修复后，所有 API 接口均正常工作：

✅ GET `/api/v1/devices/manufacturers` - 返回品牌列表  
✅ GET `/api/v1/devices/series?manufacturerId=xxx` - 返回系列列表  
✅ GET `/api/v1/devices/plc?seriesId=xxx` - 返回设备列表  
✅ GET `/api/v1/devices/variables/templates` - 返回变量模板列表  

## 长期解决方案建议

虽然当前的 polyfill 方案可以解决问题，但建议考虑以下长期方案：

### 方案1：迁移到 nedb-promises（推荐）

使用维护更好的 NeDB 封装库：

```bash
npm uninstall nedb @types/nedb
npm install nedb-promises
```

### 方案2：迁移到现代数据库

考虑迁移到更现代的嵌入式数据库：
- **better-sqlite3** - 性能更好，TypeScript 支持完善
- **lowdb** (v7+) - 项目已在使用的轻量级 JSON 数据库
- **SQLite** - 功能完整的关系型数据库

### 方案3：等待 NeDB 更新

关注 NeDB 的官方更新，如果有新版本修复了这个问题，可以直接升级。

## 注意事项

1. **弃用警告**：启动时仍会看到 `util.isArray` 的弃用警告，这是正常的，不影响功能
2. **兼容性**：polyfill 方案确保了与新旧版本 Node.js 的兼容性
3. **性能影响**：polyfill 的性能影响可以忽略不计

## 相关文件

- 修复文件：`src/database/database-manager.ts`
- 测试脚本：`test-device-catalog.ts`
- API 文档：`API_TEST.md`, `DEVICE_CATALOG.md`
