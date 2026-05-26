# SettingsPanel 级联选择逻辑优化

## 修改说明

优化了 SettingsPanel 组件中的设备选择逻辑，确保数据的一致性和完整性。

## 核心改进

### 之前的行为
- 选择 Manufacturer 时，直接修改 `editingInstance.manufacturer`
- 选择 Series 时，直接修改 `editingInstance.series`
- 可能导致 manufacturer/series/deviceModel 之间的数据不一致

### 现在的行为
1. **选择 Manufacturer**：仅加载对应的 Series 列表，**不修改** `editingInstance`
2. **选择 Series**：仅加载对应的 Device Model 列表，**不修改** `editingInstance`
3. **选择 Device Model**：自动从选中的设备对象中提取 `manufacturer` 和 `series` 信息，并填充到 `editingInstance`

## 实现细节

### 1. Watch 逻辑优化

```typescript
// Watch for manufacturer change - 只加载系列，不修改 editingInstance
watch(() => editingInstance.value.manufacturer, async (newManufacturer) => {
  if (newManufacturer) {
    // Reset dependent fields
    editingInstance.value.series = ''
    editingInstance.value.deviceModel = ''
    seriesList.value = []
    devices.value = []
    
    // Load series for new manufacturer
    await loadSeries(newManufacturer)
  }
})

// Watch for series change - 只加载设备，不修改 editingInstance
watch(() => editingInstance.value.series, async (newSeries) => {
  if (newSeries) {
    // Reset device model
    editingInstance.value.deviceModel = ''
    devices.value = []
    
    // Load devices for new series
    await loadDevices(newSeries)
  }
})

// Watch for device model change - 自动填充 manufacturer 和 series
watch(() => editingInstance.value.deviceModel, async (newModel) => {
  if (newModel) {
    const selectedDevice = devices.value.find(d => d.model === newModel)
    
    if (selectedDevice) {
      // Automatically set manufacturer and series from the selected device
      editingInstance.value.manufacturer = selectedDevice.manufacturer || 
                                          manufacturers.value.find(m => m._id === selectedDevice.series_id)?.name_en ||
                                          selectedDevice.series_id
      
      editingInstance.value.series = selectedDevice.series || 
                                    seriesList.value.find(s => s._id === selectedDevice.series_id)?.name_en ||
                                    selectedDevice.series_id
    }
  }
})
```

### 2. 模板绑定优化

使用 `name_en` 或 `name` 作为 select 的值，确保与后端返回的数据格式一致：

```vue
<!-- Manufacturer -->
<select v-model="editingInstance.manufacturer">
  <option value="">Select Manufacturer</option>
  <option v-for="mfr in manufacturers" :key="mfr._id" :value="mfr.name_en || mfr.name">
    {{ mfr.name }}
  </option>
</select>

<!-- Series -->
<select v-model="editingInstance.series">
  <option value="">Select Series</option>
  <option v-for="series in seriesList" :key="series._id" :value="series.name_en || series.name">
    {{ series.name }}
  </option>
</select>

<!-- Device Model -->
<select v-model="editingInstance.deviceModel">
  <option value="">Select Model</option>
  <option v-for="device in devices" :key="device._id" :value="device.model">
    {{ device.model }}
  </option>
</select>
```

### 3. 类型定义更新

更新了前端类型定义以匹配后端实际返回的数据结构：

```typescript
export interface Manufacturer {
  _id?: string
  id?: string
  name: string
  name_en?: string  // 新增
  // ...
}

export interface Series {
  _id?: string
  id?: string
  manufacturer_id: string
  name: string
  name_en?: string  // 新增
  // ...
}

export interface PLCDevice {
  _id?: string
  id?: string
  series_id: string
  model: string
  name: string
  manufacturer?: string  // 新增
  series?: string        // 新增
  // ...
}
```

## 用户体验

### 操作流程

1. 点击 **Edit** 按钮进入编辑模式
2. （可选）选择 Manufacturer - 自动加载该品牌的 Series 列表
3. （可选）选择 Series - 自动加载该系列的 Device Model 列表
4. **选择 Device Model** - 自动填充 Manufacturer 和 Series 字段
5. 点击 **Save** 保存更改

### 数据一致性保证

- ✅ 无论用户如何选择，最终保存的 `manufacturer`、`series`、`deviceModel` 始终来自同一个设备对象
- ✅ 避免了手动选择导致的数据不一致问题
- ✅ 简化了用户操作，只需选择设备型号即可

## 示例场景

### 场景1：直接选择设备型号

用户打开编辑界面，直接在 Device Model 下拉框中选择 "Siemens S7-1200"：

**结果：**
- `deviceModel`: "Siemens S7-1200"
- `manufacturer`: "Siemens" (自动填充)
- `series`: "S7-1200" (自动填充)

### 场景2：逐级选择

用户先选择 Manufacturer "西门子"，再选择 Series "S7-1200"，最后选择 Device Model "Siemens S7-1200"：

**结果：**
- 与场景1相同，数据保持一致

### 场景3：切换设备型号

用户先选择了 "S7-1200"，然后切换到 "S7-1500"：

**结果：**
- `deviceModel`: "Siemens S7-1500"
- `manufacturer`: "Siemens" (保持不变或更新)
- `series`: "S7-1500" (自动更新)

## 技术优势

1. **单一数据源**：设备型号是权威数据源，manufacturer 和 series 都从它派生
2. **减少错误**：用户无法选择不匹配的组合
3. **代码简洁**：watch 逻辑清晰，易于维护
4. **类型安全**：完整的 TypeScript 类型定义

## 相关文件

- 组件文件：`web/src/components/SettingsPanel.vue`
- 类型定义：`web/src/types/index.ts`
- API 封装：`web/src/api/index.ts`

## 注意事项

1. **后端数据格式**：确保后端返回的设备对象包含 `manufacturer` 和 `series` 字段
2. **名称匹配**：使用 `name_en` 或 `name` 进行匹配，需要确保前后端命名一致
3. **空值处理**：当找不到匹配的设备时，不会自动填充，保持用户的选择
