# 数据库结构优化 - 业务字段关联方案

## 📋 概述

本次优化将 NeDB 数据库从使用无意义的 `_id` 关联改为使用具有业务含义的字段进行关联，提高数据的可读性、可移植性和查询效率。

## 🎯 优化目标

### 之前的问题
- ❌ 使用自动生成的 `_id` 作为外键（如 `manufacturer_id`, `series_id`）
- ❌ `_id` 在不同数据库实例中不相同，无法直接复制数据
- ❌ 缺乏业务含义，需要多次查询才能获取完整信息
- ❌ 数据迁移和备份困难

### 优化后的优势
- ✅ 使用业务字段关联（`manufacturer_name`, `series_name`, `device_model`）
- ✅ 数据具有自解释性，可直接阅读和理解
- ✅ 不同数据库实例间的数据可以无缝合并
- ✅ 简化查询逻辑，减少联表查询次数
- ✅ 便于数据导入导出和迁移

## 🔄 数据结构变更

### 1. Series 集合

**新增字段：**
```typescript
{
  manufacturer_name: string  // 品牌英文名（如 "Siemens"）
  name_en?: string          // 系列英文名（如 "S7-1200"）
}
```

**保留字段（兼容）：**
```typescript
{
  manufacturer_id?: string  // 旧版 ID，保留以兼容
}
```

**索引：**
- `manufacturer_name` - 加速按品牌查询
- `name_en` - 加速按系列英文名查询

### 2. PLC Devices 集合

**新增字段：**
```typescript
{
  manufacturer_name: string  // 品牌英文名（如 "Siemens"）
  series_name: string        // 系列英文名（如 "S7-1200"）
}
```

**保留字段（兼容）：**
```typescript
{
  series_id?: string  // 旧版 ID，保留以兼容
}
```

**索引：**
- `manufacturer_name` - 加速按品牌查询
- `series_name` - 加速按系列查询
- `model` (unique) - 确保型号唯一性

### 3. Variable Templates 集合

**新增字段：**
```typescript
{
  device_model: string       // 设备型号（如 "CPU SR40"）
  manufacturer_name: string  // 品牌英文名
  series_name: string        // 系列英文名
}
```

**保留字段（兼容）：**
```typescript
{
  device_model_id?: string  // 旧版 ID，保留以兼容
}
```

**索引：**
- `device_model` - 加速按设备型号查询
- `manufacturer_name` - 加速按品牌查询
- `series_name` - 加速按系列查询

## 🚀 执行迁移

### 方法1：使用 npm 脚本（推荐）

```bash
# 执行迁移
npm run db:migrate

# 如果需要回滚
npm run db:rollback
```

### 方法2：直接使用 ts-node

```bash
# 执行迁移
npx ts-node scripts/migrate-database.ts migrate

# 回滚迁移
npx ts-node scripts/migrate-database.ts rollback
```

### 迁移过程

1. **Step 1**: 遍历 Series 集合，为每个系列添加 `manufacturer_name`
2. **Step 2**: 遍历 PLC Devices 集合，为每个设备添加 `manufacturer_name` 和 `series_name`
3. **Step 3**: 遍历 Variable Templates 集合，为每个模板添加 `device_model`, `manufacturer_name`, `series_name`
4. **Step 4**: 创建新的索引以优化查询性能

### 注意事项

- ⚠️ 迁移前建议备份 `data/nedb/` 目录
- ⚠️ 迁移是幂等的，可以安全地多次执行
- ⚠️ 旧字段（`manufacturer_id`, `series_id` 等）会被保留以确保向后兼容
- ⚠️ 建议在低峰期执行迁移

## 💻 API 变更

### 后端 API

所有查询接口现在同时支持旧版 ID 和新版业务字段：

#### 1. 获取系列列表

```bash
# 旧版方式（仍支持）
GET /api/v1/devices/series?manufacturerId=OylFdwiF6SWyamyJ

# 新版方式（推荐）
GET /api/v1/devices/series?manufacturerName=Siemens
```

#### 2. 获取 PLC 设备列表

```bash
# 旧版方式（仍支持）
GET /api/v1/devices/plc?seriesId=IP4HRCdeionrL5wL

# 新版方式（推荐）
GET /api/v1/devices/plc?seriesName=S7-1200&manufacturerName=Siemens
```

#### 3. 获取变量模板列表

```bash
# 旧版方式（仍支持）
GET /api/v1/devices/variables/templates?deviceModelId=SjEGeb0ArktBAfup

# 新版方式（推荐）
GET /api/v1/devices/variables/templates?deviceModel=CPU%20SR40&manufacturerName=Siemens&seriesName=S7-1200
```

### 前端 API

前端 API 封装已更新，支持新的查询参数：

```typescript
import { deviceCatalogApi } from '@/api'

// 新版方式（推荐）
const series = await deviceCatalogApi.getSeries({
  manufacturerName: 'Siemens'
})

const devices = await deviceCatalogApi.getPLCDevices({
  seriesName: 'S7-1200',
  manufacturerName: 'Siemens'
})

const templates = await deviceCatalogApi.getVariableTemplates({
  deviceModel: 'CPU SR40',
  manufacturerName: 'Siemens',
  seriesName: 'S7-1200'
})
```

## 🔧 SettingsPanel 组件更新

SettingsPanel 组件已更新为使用业务字段进行级联查询：

### 数据流

1. **选择 Manufacturer** → 加载该品牌的 Series 列表
   ```typescript
   loadSeries(manufacturerName)  // 使用 name_en 或 name
   ```

2. **选择 Series** → 加载该系列的 Device Model 列表
   ```typescript
   loadDevices(seriesName, manufacturerName)
   ```

3. **选择 Device Model** → 自动填充 manufacturer 和 series
   ```typescript
   editingInstance.value.manufacturer = selectedDevice.manufacturer_name
   editingInstance.value.series = selectedDevice.series_name
   ```

### 优势

- ✅ 数据一致性：manufacturer 和 series 始终来自同一个设备对象
- ✅ 简化操作：用户只需选择设备型号，其他字段自动填充
- ✅ 可读性强：存储的是有意义的名称而非无意义的 ID

## 📊 数据示例

### 迁移前

```json
{
  "_id": "SjEGeb0ArktBAfup",
  "id": "plc-002",
  "series_id": "IP4HRCdeionrL5wL",  // 无意义的 ID
  "model": "Siemens S7-1200",
  "name": "西门子 S7-1200"
}
```

### 迁移后

```json
{
  "_id": "SjEGeb0ArktBAfup",
  "id": "plc-002",
  "series_id": "IP4HRCdeionrL5wL",      // 保留以兼容
  "series_name": "S7-1200",              // 新增：有业务含义
  "manufacturer_name": "Siemens",        // 新增：有业务含义
  "model": "Siemens S7-1200",
  "name": "西门子 S7-1200"
}
```

## 🔍 查询优化

### 索引策略

```typescript
// Series 集合
seriesDB.ensureIndex({ fieldName: 'manufacturer_name' })
seriesDB.ensureIndex({ fieldName: 'name_en' })

// PLC Devices 集合
plcDevicesDB.ensureIndex({ fieldName: 'manufacturer_name' })
plcDevicesDB.ensureIndex({ fieldName: 'series_name' })
plcDevicesDB.ensureIndex({ fieldName: 'model', unique: true })

// Variables 集合
variablesDB.ensureIndex({ fieldName: 'device_model' })
variablesDB.ensureIndex({ fieldName: 'manufacturer_name' })
variablesDB.ensureIndex({ fieldName: 'series_name' })
```

### 性能提升

- **单字段查询**：直接通过业务字段查询，无需联表
- **复合查询**：支持多条件组合过滤
- **唯一性约束**：`model` 字段设置唯一索引，防止重复

## 🛡️ 兼容性保证

### 向后兼容

- ✅ 所有旧版 API 仍然可用
- ✅ 旧字段（`manufacturer_id`, `series_id` 等）被保留
- ✅ 查询逻辑同时支持 ID 和业务字段
- ✅ 前端代码可以逐步迁移

### 迁移策略

1. **Phase 1**: 执行数据库迁移，添加新字段
2. **Phase 2**: 更新后端服务和路由，支持新查询方式
3. **Phase 3**: 更新前端 API 和组件，使用新查询方式
4. **Phase 4**: （可选）在未来版本中移除旧字段

## 📝 相关文件

### 后端文件
- `src/types/device.ts` - 类型定义更新
- `src/database/database-migration.ts` - 迁移工具
- `src/services/device-catalog-service.ts` - 服务层更新
- `src/routes/device-catalog.ts` - 路由更新
- `scripts/migrate-database.ts` - 迁移脚本入口

### 前端文件
- `web/src/types/index.ts` - 前端类型定义
- `web/src/api/index.ts` - API 封装更新
- `web/src/components/SettingsPanel.vue` - 组件更新

### 配置文件
- `package.json` - 添加迁移相关的 npm 脚本

## ⚠️ 注意事项

1. **数据备份**
   ```bash
   # 迁移前备份数据库
   cp -r data/nedb data/nedb.backup
   ```

2. **测试环境验证**
   - 先在测试环境执行迁移
   - 验证所有 API 接口正常工作
   - 确认前端功能无误后再应用到生产环境

3. **回滚方案**
   ```bash
   # 如果出现问题，可以回滚
   npm run db:rollback
   
   # 或者恢复备份
   rm -rf data/nedb
   cp -r data/nedb.backup data/nedb
   ```

4. **性能监控**
   - 迁移后监控 API 响应时间
   - 检查索引是否生效
   - 观察数据库文件大小变化

## 🎉 总结

本次数据库结构优化带来了以下好处：

✅ **数据可读性**：字段名具有明确的业务含义  
✅ **数据可移植性**：不同实例间的数据可以无缝合并  
✅ **查询简化**：减少联表查询，提高性能  
✅ **向后兼容**：旧版 API 和数据格式仍然可用  
✅ **易于维护**：代码逻辑更清晰，易于理解和扩展  

现在您可以使用更具业务意义的字段来管理和查询设备数据了！
