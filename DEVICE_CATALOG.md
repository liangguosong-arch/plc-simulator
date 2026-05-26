# PLC Simulator - 设备枚举功能

## 概述

PLC Simulator 现已支持 NeDB 数据库，提供完整的 PLC 设备品牌、系列、型号和变量模板的枚举查询功能。这些接口可以复用设计时程序建立的数据库，为前端提供丰富的设备选择能力。

## 功能特性

- ✅ **NeDB 数据库集成** - 自动初始化和索引优化
- ✅ **品牌管理** - 查询 PLC/HMI 设备品牌信息
- ✅ **系列管理** - 按品牌和设备类型查询系列
- ✅ **型号管理** - 查询详细的 PLC 设备型号规格
- ✅ **变量模板** - 获取设备预定义的变量模板
- ✅ **RESTful API** - 标准化的 HTTP 接口
- ✅ **前端 SDK** - 完整的 TypeScript API 封装
- ✅ **公开访问** - 所有枚举接口无需认证即可调用

## 快速开始

### 1. 启动服务器

```bash
npm run dev
```

服务器启动时会自动初始化 NeDB 数据库。

### 2. 测试 API

#### 使用 curl 测试

```bash
# 获取所有品牌
curl http://localhost:8080/api/v1/devices/manufacturers

# 获取西门子系列
curl "http://localhost:8080/api/v1/devices/series?manufacturerId=siemens"

# 获取 S7-200 SMART 设备
curl "http://localhost:8080/api/v1/devices/plc?seriesId=s7-200-smart"

# 获取变量模板
curl "http://localhost:8080/api/v1/devices/variables/templates?deviceModelId=cpu-sr40"
```

#### 使用测试脚本

```bash
npx ts-node test-device-catalog.ts
```

### 3. 前端调用示例

```typescript
import { deviceCatalogApi } from '@/api'

// 获取所有品牌
const manufacturers = await deviceCatalogApi.getManufacturers({
  deviceType: 'plc',
  isActive: true
})

// 获取指定品牌的系列
const series = await deviceCatalogApi.getSeries({
  manufacturerId: 'siemens',
  type: 'plc'
})

// 获取指定系列的设备
const devices = await deviceCatalogApi.getPLCDevices({
  seriesId: 's7-200-smart'
})

// 获取设备的变量模板
const templates = await deviceCatalogApi.getVariableTemplates({
  deviceModelId: 'cpu-sr40',
  type: 'input'
})
```

## 数据库结构

### 文件位置

```
data/nedb/
├── manufacturers.db    # 品牌数据
├── series.db           # 系列数据
├── plc-devices.db      # PLC设备数据
├── hmi-devices.db      # HMI设备数据
└── variables.db        # 变量模板数据
```

### 预填充数据

首次运行时，系统会尝试从 `resources/nedb/` 目录复制预填充的数据库文件。如果该目录不存在或为空，数据库将为空。

**导入初始数据的方法：**

1. 从设计时程序导出数据库文件
2. 将 `.db` 文件放入 `resources/nedb/` 目录
3. 重启 PLC Simulator 服务器

## API 接口详情

所有接口的基础路径为 `/api/v1/devices`

### 品牌接口

| 方法 | 路径 | 描述 | 参数 |
|------|------|------|------|
| GET | `/manufacturers` | 获取品牌列表 | `deviceType`, `isActive` |
| GET | `/manufacturers/:id` | 获取品牌详情 | - |

### 系列接口

| 方法 | 路径 | 描述 | 参数 |
|------|------|------|------|
| GET | `/series` | 获取系列列表 | `manufacturerId`, `type`, `isActive` |
| GET | `/series/:id` | 获取系列详情 | - |

### PLC设备接口

| 方法 | 路径 | 描述 | 参数 |
|------|------|------|------|
| GET | `/plc` | 获取PLC设备列表 | `seriesId`, `isActive` |
| GET | `/plc/:id` | 根据ID获取设备详情 | - |
| GET | `/plc/model/:model` | 根据型号获取设备 | - |

### 变量模板接口

| 方法 | 路径 | 描述 | 参数 |
|------|------|------|------|
| GET | `/variables/templates` | 获取变量模板列表 | `deviceModelId`, `type` |
| GET | `/variables/templates/:id` | 获取变量模板详情 | - |

## 前端集成指南

### 1. 类型定义

已在 `web/src/types/index.ts` 中定义了以下类型：

- `Manufacturer` - 品牌
- `Series` - 系列
- `PLCDevice` - PLC设备
- `VariableTemplate` - 变量模板

### 2. API 调用

在 `web/src/api/index.ts` 中已封装 `deviceCatalogApi` 对象，包含所有枚举接口方法。

### 3. 使用示例

创建一个设备选择组件：

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { deviceCatalogApi } from '@/api'
import type { Manufacturer, Series, PLCDevice } from '@/types'

const manufacturers = ref<Manufacturer[]>([])
const seriesList = ref<Series[]>([])
const devices = ref<PLCDevice[]>([])

const selectedManufacturer = ref('')
const selectedSeries = ref('')
const selectedDevice = ref('')

// 加载品牌列表
async function loadManufacturers() {
  const response = await deviceCatalogApi.getManufacturers({
    deviceType: 'plc',
    isActive: true
  })
  manufacturers.value = response.data
}

// 当品牌改变时加载系列
watch(selectedManufacturer, async (manufacturerId) => {
  if (!manufacturerId) return
  
  const response = await deviceCatalogApi.getSeries({
    manufacturerId,
    type: 'plc'
  })
  seriesList.value = response.data
  selectedSeries.value = ''
  selectedDevice.value = ''
})

// 当系列改变时加载设备
watch(selectedSeries, async (seriesId) => {
  if (!seriesId) return
  
  const response = await deviceCatalogApi.getPLCDevices({
    seriesId
  })
  devices.value = response.data
  selectedDevice.value = ''
})

// 初始化
loadManufacturers()
</script>

<template>
  <div class="device-selector">
    <!-- 品牌选择 -->
    <select v-model="selectedManufacturer">
      <option value="">请选择品牌</option>
      <option v-for="mfr in manufacturers" :key="mfr.id" :value="mfr.id">
        {{ mfr.name }}
      </option>
    </select>

    <!-- 系列选择 -->
    <select v-model="selectedSeries" :disabled="!selectedManufacturer">
      <option value="">请选择系列</option>
      <option v-for="series in seriesList" :key="series.id" :value="series.id">
        {{ series.name }}
      </option>
    </select>

    <!-- 设备选择 -->
    <select v-model="selectedDevice" :disabled="!selectedSeries">
      <option value="">请选择设备型号</option>
      <option v-for="device in devices" :key="device.id" :value="device.id">
        {{ device.model }}
      </option>
    </select>
  </div>
</template>
```

## 性能优化

### 索引策略

系统自动为常用查询字段创建索引：

- **manufacturers**: `device_types`, `is_active`, `sort_order`
- **series**: `manufacturer_id`, `type`, `is_active`
- **plc_devices**: `series_id`, `model` (唯一), `is_active`
- **variables**: `device_model_id`, `type`, `value`

### 缓存建议

对于不经常变化的枚举数据，建议在前端进行缓存：

```typescript
import { ref } from 'vue'
import { deviceCatalogApi } from '@/api'

// 全局缓存
const manufacturersCache = ref<Manufacturer[] | null>(null)

async function getManufacturers() {
  if (!manufacturersCache.value) {
    const response = await deviceCatalogApi.getManufacturers()
    manufacturersCache.value = response.data
  }
  return manufacturersCache.value
}
```

## 故障排查

### 数据库为空

如果启动后查询返回空列表，说明数据库中没有数据。

**解决方案：**
1. 检查 `resources/nedb/` 目录是否存在预填充数据
2. 从设计时程序导出数据库并复制到 `resources/nedb/`
3. 或者手动插入测试数据

### 索引错误

如果出现索引相关错误，可以尝试删除 `data/nedb/` 目录后重启服务器，系统会自动重建索引。

### 权限问题

确保 `data/nedb/` 目录有写入权限：

```bash
# Linux/Mac
chmod -R 755 data/nedb/

# Windows - 以管理员身份运行
```

## 扩展开发

### 添加新的集合

如果需要添加新的数据集合，可以参考 `database-manager.ts` 的实现：

```typescript
// 1. 在 DatabaseManager 中添加新的 DB 实例
private newCollectionDB: Datastore<any>

// 2. 在构造函数中初始化
this.newCollectionDB = this.createCollection('new-collection')

// 3. 创建索引
this.newCollectionDB.ensureIndex({ fieldName: 'some_field' })

// 4. 提供 getter
getNewCollectionDB(): Datastore<any> {
  return this.newCollectionDB
}
```

### 添加新的查询方法

在 `device-catalog-service.ts` 中添加新的服务方法，然后在 `device-catalog.ts` 路由中暴露对应的 API 端点。

## 参考资料

- [NeDB 官方文档](https://github.com/louischatriot/nedb)
- [API 测试文档](./API_TEST.md)
- [快速开始指南](./QUICKSTART.md)
