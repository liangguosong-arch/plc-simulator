## 10. 切换模式

---

# 设备枚举接口 (Device Catalog APIs)

以下接口用于查询 PLC 设备的品牌、系列、型号和变量模板信息。所有接口均支持公开访问（无需认证）。

**基础路径**: `/api/v1/devices`

## 1. 获取所有品牌列表

```bash
curl http://localhost:8080/api/v1/devices/manufacturers
```

**查询参数**:
- `deviceType`: 设备类型过滤 (`plc` | `hmi`)
- `isActive`: 是否激活 (`true` | `false`)

示例:
```bash
curl "http://localhost:8080/api/v1/devices/manufacturers?deviceType=plc&isActive=true"
```

响应示例:
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
      "sort_order": 1,
      "logo_url": "https://example.com/siemens.png",
      "description": "德国西门子自动化产品"
    },
    {
      "_id": "def456",
      "id": "mitsubishi",
      "name": "三菱电机",
      "code": "MITSUBISHI",
      "device_types": ["plc"],
      "is_active": true,
      "sort_order": 2,
      "description": "日本三菱自动化产品"
    }
  ],
  "message": "success",
  "timestamp": 1712649600000
}
```

## 2. 根据ID获取品牌详情

```bash
curl http://localhost:8080/api/v1/devices/manufacturers/siemens
```

响应示例:
```json
{
  "code": 200,
  "data": {
    "_id": "abc123",
    "id": "siemens",
    "name": "西门子",
    "code": "SIEMENS",
    "device_types": ["plc", "hmi"],
    "is_active": true,
    "sort_order": 1,
    "logo_url": "https://example.com/siemens.png",
    "description": "德国西门子自动化产品"
  },
  "message": "success",
  "timestamp": 1712649600000
}
```

## 3. 获取系列列表

```bash
curl http://localhost:8080/api/v1/devices/series
```

**查询参数**:
- `manufacturerId`: 品牌ID过滤
- `type`: 设备类型过滤 (`plc` | `hmi`)
- `isActive`: 是否激活 (`true` | `false`)

示例 - 获取西门子的PLC系列:
```bash
curl "http://localhost:8080/api/v1/devices/series?manufacturerId=siemens&type=plc"
```

响应示例:
```json
{
  "code": 200,
  "data": [
    {
      "_id": "series001",
      "id": "s7-200-smart",
      "manufacturer_id": "siemens",
      "name": "S7-200 SMART",
      "code": "S7-200-SMART",
      "type": "plc",
      "is_active": true,
      "sort_order": 1,
      "description": "西门子 S7-200 SMART 系列"
    },
    {
      "_id": "series002",
      "id": "s7-1200",
      "manufacturer_id": "siemens",
      "name": "S7-1200",
      "code": "S7-1200",
      "type": "plc",
      "is_active": true,
      "sort_order": 2,
      "description": "西门子 S7-1200 系列"
    }
  ],
  "message": "success",
  "timestamp": 1712649600000
}
```

## 4. 根据ID获取系列详情

```bash
curl http://localhost:8080/api/v1/devices/series/s7-200-smart
```

## 5. 获取PLC设备型号列表

```bash
curl http://localhost:8080/api/v1/devices/plc
```

**查询参数**:
- `seriesId`: 系列ID过滤
- `isActive`: 是否激活 (`true` | `false`)

示例 - 获取 S7-200 SMART 系列的设备:
```bash
curl "http://localhost:8080/api/v1/devices/plc?seriesId=s7-200-smart"
```

响应示例:
```json
{
  "code": 200,
  "data": [
    {
      "_id": "plc001",
      "id": "cpu-sr20",
      "series_id": "s7-200-smart",
      "model": "CPU SR20",
      "name": "S7-200 SMART CPU SR20",
      "cpu_type": "ARM Cortex-M4",
      "memory_size": 24,
      "io_points": {
        "digital_input": 12,
        "digital_output": 8,
        "analog_input": 0,
        "analog_output": 0
      },
      "communication_protocols": ["Modbus RTU", "Modbus TCP", "PPI"],
      "is_active": true,
      "sort_order": 1,
      "description": "12DI/8DO，无模拟量"
    },
    {
      "_id": "plc002",
      "id": "cpu-sr40",
      "series_id": "s7-200-smart",
      "model": "CPU SR40",
      "name": "S7-200 SMART CPU SR40",
      "cpu_type": "ARM Cortex-M4",
      "memory_size": 40,
      "io_points": {
        "digital_input": 24,
        "digital_output": 16,
        "analog_input": 0,
        "analog_output": 0
      },
      "communication_protocols": ["Modbus RTU", "Modbus TCP", "PPI"],
      "is_active": true,
      "sort_order": 2,
      "description": "24DI/16DO，无模拟量"
    }
  ],
  "message": "success",
  "timestamp": 1712649600000
}
```

## 6. 根据ID获取PLC设备详情

```bash
curl http://localhost:8080/api/v1/devices/plc/cpu-sr40
```

## 7. 根据型号获取PLC设备

```bash
curl http://localhost:8080/api/v1/devices/plc/model/CPU%20SR40
```

**注意**: 型号名称包含空格等特殊字符时需要 URL 编码。

## 8. 获取变量模板列表

```bash
curl http://localhost:8080/api/v1/devices/variables/templates
```

**查询参数**:
- `deviceModelId`: 设备型号ID过滤
- `type`: 变量类型过滤 (`input` | `output` | `memory`)

示例 - 获取 CPU SR40 的输入变量模板:
```bash
curl "http://localhost:8080/api/v1/devices/variables/templates?deviceModelId=cpu-sr40&type=input"
```

响应示例:
```json
{
  "code": 200,
  "data": [
    {
      "_id": "var-template-001",
      "id": "template-i0",
      "device_model_id": "cpu-sr40",
      "name": "输入点 I0.0",
      "address": "I0.0",
      "type": "input",
      "data_type": "BOOL",
      "description": "数字量输入点 0",
      "default_value": false,
      "access_level": "read",
      "is_system_variable": true,
      "sort_order": 1
    },
    {
      "_id": "var-template-002",
      "id": "template-mw10",
      "device_model_id": "cpu-sr40",
      "name": "内存字 MW10",
      "address": "MW10",
      "type": "memory",
      "data_type": "REAL",
      "description": "模拟量存储区",
      "unit": "°C",
      "min_value": 0,
      "max_value": 100,
      "default_value": 25.0,
      "access_level": "read-write",
      "is_system_variable": false,
      "sort_order": 10
    }
  ],
  "message": "success",
  "timestamp": 1712649600000
}
```

## 9. 根据ID获取变量模板详情

```bash
curl http://localhost:8080/api/v1/devices/variables/templates/template-mw10
```

---

## 数据库说明

### NeDB 数据库位置

设备枚举数据存储在 NeDB 数据库中，默认位置为:
```
data/nedb/
├── manufacturers.db
├── series.db
├── plc-devices.db
├── hmi-devices.db
└── variables.db
```

### 预填充数据库

首次运行时，系统会尝试从 `resources/nedb/` 目录复制预填充的数据库文件。如果没有找到预填充数据，数据库将为空。

如需导入初始数据，请参考设计时程序的数据库导入工具。

### 索引优化

系统自动为常用查询字段创建索引以提升性能:
- **manufacturers**: `device_types`, `is_active`, `sort_order`
- **series**: `manufacturer_id`, `type`, `is_active`
- **plc_devices**: `series_id`, `model` (唯一), `is_active`
- **hmi_devices**: `manufacturer_id`, `model` (唯一), `is_active`
- **variables**: `device_model_id`, `type`, `value`
