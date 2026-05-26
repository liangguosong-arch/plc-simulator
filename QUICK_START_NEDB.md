# PLC Simulator - NeDB 集成快速开始指南

## 🎯 功能概述

PLC Simulator 现已支持 NeDB 数据库，提供完整的 PLC 设备品牌、系列、型号和变量模板的枚举查询功能。

## ✅ 已实现的功能

### 后端 API（9个接口）

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/v1/devices/manufacturers` | GET | 获取品牌列表 |
| `/api/v1/devices/manufacturers/:id` | GET | 获取品牌详情 |
| `/api/v1/devices/series` | GET | 获取系列列表 |
| `/api/v1/devices/series/:id` | GET | 获取系列详情 |
| `/api/v1/devices/plc` | GET | 获取PLC设备列表 |
| `/api/v1/devices/plc/:id` | GET | 根据ID获取设备详情 |
| `/api/v1/devices/plc/model/:model` | GET | 根据型号获取设备 |
| `/api/v1/devices/variables/templates` | GET | 获取变量模板列表 |
| `/api/v1/devices/variables/templates/:id` | GET | 获取变量模板详情 |

### 前端支持

- ✅ TypeScript 类型定义
- ✅ Axios API 封装
- ✅ SettingsPanel 级联选择器示例

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

已安装的依赖：
- `nedb` - NeDB 数据库引擎
- `@types/nedb` - TypeScript 类型定义
- `fs-extra` - 文件系统工具
- `@types/fs-extra` - TypeScript 类型定义

### 2. 启动服务器

```bash
npm run dev
```

或单独启动后端：

```bash
npm run dev:backend
```

### 3. 测试 API

#### 使用 curl（PowerShell）

```powershell
# 获取所有品牌
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/devices/manufacturers" -UseBasicParsing

# 获取系列列表
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/devices/series" -UseBasicParsing

# 获取PLC设备列表
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/devices/plc" -UseBasicParsing

# 获取变量模板
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/devices/variables/templates" -UseBasicParsing
```

#### 使用测试脚本

```bash
npx ts-node test-device-catalog.ts
```

### 4. 前端调用示例

```typescript
import { deviceCatalogApi } from '@/api'

// 获取所有品牌
const response = await deviceCatalogApi.getManufacturers({
  deviceType: 'plc',
  isActive: true
})
console.log(response.data) // Manufacturer[]

// 获取指定品牌的系列
const series = await deviceCatalogApi.getSeries({
  manufacturerId: 'siemens'
})

// 获取指定系列的设备
const devices = await deviceCatalogApi.getPLCDevices({
  seriesId: 's7-200-smart'
})

// 获取设备的变量模板
const templates = await deviceCatalogApi.getVariableTemplates({
  deviceModelId: 'cpu-sr40'
})
```

## 📊 数据库说明

### 数据存储位置

```
data/nedb/
├── manufacturers.db    # 品牌数据
├── series.db           # 系列数据
├── plc-devices.db      # PLC设备数据
├── hmi-devices.db      # HMI设备数据
└── variables.db        # 变量模板数据
```

### 当前状态

✅ 数据库已初始化  
✅ 索引已创建  
⚠️ 数据库为空（需要导入数据）

### 导入数据

目前数据库为空，需要从设计时程序导入数据：

1. **从设计时程序导出**
   - 找到设计时程序的 NeDB 数据库文件
   - 通常位于用户数据目录

2. **复制到 resources 目录**
   ```
   resources/nedb/
   ├── manufacturers.db
   ├── series.db
   ├── plc-devices.db
   ├── hmi-devices.db
   └── variables.db
   ```

3. **重启服务器**
   - 服务器启动时会自动从 resources 复制数据到 data/nedb

## 🔍 API 使用示例

### 1. 获取品牌列表

```bash
# 获取所有品牌
GET /api/v1/devices/manufacturers

# 过滤条件
GET /api/v1/devices/manufacturers?deviceType=plc&isActive=true
```

响应：
```json
{
  "code": 200,
  "data": [
    {
      "_id": "abc123",
      "id": "siemens",
      "name": "西门子",
      "code": "SIEMENS",
      "device_types": ["plc", "hmi"],
      "is_active": true,
      "sort_order": 1
    }
  ],
  "message": "success",
  "timestamp": 1776910853091
}
```

### 2. 获取系列列表

```bash
# 获取所有系列
GET /api/v1/devices/series

# 按品牌过滤
GET /api/v1/devices/series?manufacturerId=siemens

# 按类型过滤
GET /api/v1/devices/series?type=plc
```

### 3. 获取PLC设备

```bash
# 获取所有设备
GET /api/v1/devices/plc

# 按系列过滤
GET /api/v1/devices/plc?seriesId=s7-200-smart

# 根据型号查询
GET /api/v1/devices/plc/model/CPU%20SR40
```

### 4. 获取变量模板

```bash
# 获取所有模板
GET /api/v1/devices/variables/templates

# 按设备型号过滤
GET /api/v1/devices/variables/templates?deviceModelId=cpu-sr40

# 按变量类型过滤
GET /api/v1/devices/variables/templates?type=input
```

## 💻 前端集成

### SettingsPanel 组件

SettingsPanel 已更新，支持从数据库中选择品牌、系列和型号：

1. 点击 **Edit** 按钮进入编辑模式
2. 选择 **Manufacturer** - 自动加载该品牌的系列
3. 选择 **Series** - 自动加载该系列的设备型号
4. 选择 **Device Model** - 完成设备配置
5. 点击 **Save** 保存更改

### 自定义组件示例

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { deviceCatalogApi } from '@/api'
import type { Manufacturer, Series, PLCDevice } from '@/types'

const manufacturers = ref<Manufacturer[]>([])
const seriesList = ref<Series[]>([])
const devices = ref<PLCDevice[]>([])

const selectedMfr = ref('')
const selectedSeries = ref('')
const selectedDevice = ref('')

// 加载品牌
async function loadManufacturers() {
  const res = await deviceCatalogApi.getManufacturers({ deviceType: 'plc' })
  manufacturers.value = res.data
}

// 品牌改变时加载系列
watch(selectedMfr, async (mfrId) => {
  if (!mfrId) return
  const res = await deviceCatalogApi.getSeries({ manufacturerId: mfrId })
  seriesList.value = res.data
  selectedSeries.value = ''
  selectedDevice.value = ''
})

// 系列改变时加载设备
watch(selectedSeries, async (seriesId) => {
  if (!seriesId) return
  const res = await deviceCatalogApi.getPLCDevices({ seriesId })
  devices.value = res.data
  selectedDevice.value = ''
})

loadManufacturers()
</script>

<template>
  <div>
    <select v-model="selectedMfr">
      <option value="">选择品牌</option>
      <option v-for="m in manufacturers" :key="m.id" :value="m.id">
        {{ m.name }}
      </option>
    </select>
    
    <select v-model="selectedSeries" :disabled="!selectedMfr">
      <option value="">选择系列</option>
      <option v-for="s in seriesList" :key="s.id" :value="s.id">
        {{ s.name }}
      </option>
    </select>
    
    <select v-model="selectedDevice" :disabled="!selectedSeries">
      <option value="">选择型号</option>
      <option v-for="d in devices" :key="d.id" :value="d.model">
        {{ d.model }}
      </option>
    </select>
  </div>
</template>
```

## 📚 相关文档

- [API 测试文档](./API_TEST.md) - 详细的 API 测试示例
- [设备枚举功能文档](./DEVICE_CATALOG.md) - 完整的功能说明
- [实现总结](./IMPLEMENTATION_SUMMARY.md) - 技术实现细节

## ⚠️ 注意事项

### 1. 数据库为空

当前数据库中没有数据，API 会返回空数组。需要：
- 从设计时程序导入数据，或
- 手动插入测试数据

### 2. 权限问题

确保 `data/nedb/` 目录有写入权限：

```bash
# Windows - 以管理员身份运行
# Linux/Mac
chmod -R 755 data/nedb/
```

### 3. 预填充数据

生产环境建议提供预填充数据库：
1. 将 `.db` 文件放入 `resources/nedb/`
2. 重启服务器自动复制

### 4. 缓存优化

对于不常变化的枚举数据，建议在前端缓存：

```typescript
const cache = new Map()

async function getManufacturers() {
  if (!cache.has('manufacturers')) {
    const res = await deviceCatalogApi.getManufacturers()
    cache.set('manufacturers', res.data)
  }
  return cache.get('manufacturers')
}
```

## 🎉 总结

✅ NeDB 数据库已成功集成  
✅ 9个 RESTful API 接口已实现并测试通过  
✅ 前端 TypeScript 类型和 API 封装已完成  
✅ SettingsPanel 已更新支持级联选择  
✅ 完整的文档和示例已提供  

现在可以开始使用设备枚举功能了！如需导入实际数据，请参考设计时程序的数据库导出功能。
