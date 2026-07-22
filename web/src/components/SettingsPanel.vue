<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useVariableStore } from '@/stores/variables'
import { useUiStore } from '@/stores/ui'
import { deviceCatalogApi } from '@/api'
import type { DeviceInstance, Manufacturer, Series, PLCDevice } from '@/types'

// Stores
const variableStore = useVariableStore()
const uiStore = useUiStore()

// Store refs
const { deviceInstance } = storeToRefs(variableStore)

// Local state
const editingInstance = ref<Partial<DeviceInstance>>({})
const isEditing = ref(false)
const saving = ref(false)

// Device catalog data
const manufacturers = ref<Manufacturer[]>([])
const seriesList = ref<Series[]>([])
const devices = ref<PLCDevice[]>([])
const loadingCatalog = ref(false)

// Methods
const loadManufacturers = async () => {
  try {
    const response = await deviceCatalogApi.getManufacturers({
      deviceType: 'plc',
    })
    manufacturers.value = response.data || []
    console.log('manufacturers: ', manufacturers.value)
  } catch (error: any) {
    console.error('Failed to load manufacturers:', error)
  }
}

const loadSeries = async (manufacturerName: string) => {
  if (!manufacturerName) {
    seriesList.value = []
    return
  }
  
  try {
    // 使用 manufacturerName 查询（新版方式）
    const response = await deviceCatalogApi.getSeries({
      manufacturerName,
    })
    seriesList.value = response.data || []
  } catch (error: any) {
    console.error('Failed to load series:', error)
  }
}

const loadDevices = async (seriesName: string, manufacturerName?: string) => {
  if (!seriesName) {
    devices.value = []
    return
  }
  
  try {
    // 使用 seriesName 和 manufacturerName 查询（新版方式）
    const response = await deviceCatalogApi.getPLCDevices({
      seriesName,
      manufacturerName
    })
    devices.value = response.data || []
  } catch (error: any) {
    console.error('Failed to load devices:', error)
  }
}

const startEdit = async () => {
  if (deviceInstance.value) {
    editingInstance.value = { ...deviceInstance.value }
    isEditing.value = true
    
    // Load catalog data when starting edit
    loadingCatalog.value = true
    try {
      await loadManufacturers()
      console.log('manufacturers: ', manufacturers.value)
      // If we have a manufacturer, load its series
      if (editingInstance.value.manufacturer) {
        await loadSeries(editingInstance.value.manufacturer)
      }
      
      // If we have a series, load its devices
      if (editingInstance.value.series) {
        await loadDevices(editingInstance.value.series)
      }
    } finally {
      loadingCatalog.value = false
    }
  }
}

const cancelEdit = () => {
  isEditing.value = false
  editingInstance.value = {}
  seriesList.value = []
  devices.value = []
}

const saveEdit = async () => {
  try {
    saving.value = true
    
    // 过滤掉不允许修改的字段
    const updates: Partial<DeviceInstance> = {
      instanceName: editingInstance.value.instanceName,
      manufacturer: editingInstance.value.manufacturer,
      series: editingInstance.value.series,
      deviceModel: editingInstance.value.deviceModel,
      ipAddress: editingInstance.value.ipAddress,
      port: editingInstance.value.port,
      status: editingInstance.value.status
    }
    
    await variableStore.updateDeviceInstance(updates)
    uiStore.showToast('设备实例信息已更新', 'success')
    isEditing.value = false
  } catch (error: any) {
    console.error('Failed to save:', error)
    uiStore.showToast(error.message || '更新失败', 'error')
  } finally {
    saving.value = false
  }
}

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
    
    // Load devices for new series with manufacturer context
    await loadDevices(newSeries, editingInstance.value.manufacturer)
  }
})

// Watch for device model change - 自动填充 manufacturer 和 series
watch(() => editingInstance.value.deviceModel, async (newModel) => {
  if (newModel) {
    // Find the selected device
    const selectedDevice = devices.value.find(d => d.model === newModel)
    
    if (selectedDevice) {
      console.log('Selected device:', selectedDevice)
      
      // Automatically set manufacturer and series from the selected device
      // Use manufacturer_name and series_name fields (new business field approach)
      editingInstance.value.manufacturer = selectedDevice.manufacturer_name || 
                                          selectedDevice.manufacturer ||
                                          ''
      
      editingInstance.value.series = selectedDevice.series_name || 
                                    selectedDevice.series ||
                                    ''
      
      console.log('Auto-filled manufacturer:', editingInstance.value.manufacturer)
      console.log('Auto-filled series:', editingInstance.value.series)
    }
  }
})

// Watch for deviceInstance changes
watch(deviceInstance, (newInstance) => {
  if (newInstance && !isEditing.value) {
    editingInstance.value = { ...newInstance }
  }
}, { immediate: true })
</script>

<template>
  <div class="settings-panel">
    <div class="panel-header">
      <h2>⚙️ Device Instance Settings</h2>
      <button 
        v-if="!isEditing" 
        class="btn-edit" 
        @click="startEdit"
      >
        ✏️ Edit
      </button>
      <div v-else class="edit-actions">
        <button class="btn-cancel" @click="cancelEdit" :disabled="saving">
          Cancel
        </button>
        <button class="btn-save" @click="saveEdit" :disabled="saving">
          {{ saving ? 'Saving...' : '💾 Save' }}
        </button>
      </div>
    </div>

    <div class="panel-content" v-if="deviceInstance">
      <div class="form-grid">
        <!-- Instance Name -->
        <div class="form-group">
          <label>Instance Name</label>
          <input 
            v-if="isEditing"
            v-model="editingInstance.instanceName"
            type="text"
            class="form-input"
            placeholder="e.g., Production PLC"
          />
          <div v-else class="form-value">{{ deviceInstance.instanceName }}</div>
        </div>

        <!-- Manufacturer -->
        <div class="form-group">
          <label>Manufacturer</label>
          <select 
            v-if="isEditing"
            v-model="editingInstance.manufacturer"
            class="form-input"
            :disabled="loadingCatalog"
          >
            <option value="">Select Manufacturer</option>
            <option v-for="mfr in manufacturers" :key="mfr._id" :value="mfr.name_en || mfr.name">
              {{ mfr.name_en || mfr.name }}
            </option>
          </select>
          <div v-else class="form-value">{{ deviceInstance.manufacturer }}</div>
        </div>

        <!-- Series -->
        <div class="form-group">
          <label>Series</label>
          <select 
            v-if="isEditing"
            v-model="editingInstance.series"
            class="form-input"
            :disabled="!editingInstance.manufacturer || loadingCatalog"
          >
            <option value="">Select Series</option>
            <option v-for="series in seriesList" :key="series._id" :value="series.name">
              {{series.name }}
            </option>
          </select>
          <div v-else class="form-value">{{ deviceInstance.series }}</div>
        </div>

        <!-- Device Model -->
        <div class="form-group">
          <label>Device Model</label>
          <select 
            v-if="isEditing"
            v-model="editingInstance.deviceModel"
            class="form-input"
            :disabled="!editingInstance.series || loadingCatalog"
          >
            <option value="">Select Model</option>
            <option v-for="device in devices" :key="device._id" :value="device.model">
              {{ device.model }}
            </option>
          </select>
          <div v-else class="form-value">{{ deviceInstance.deviceModel }}</div>
        </div>

        <!-- Status -->
        <div class="form-group">
          <label>Status</label>
          <select 
            v-if="isEditing"
            v-model="editingInstance.status"
            class="form-input"
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="error">Error</option>
          </select>
          <div v-else class="form-value">
            <span :class="['status-badge', deviceInstance.status]">
              {{ deviceInstance.status }}
            </span>
          </div>
        </div>


        <!-- ID (Read-only) -->
        <div class="form-group">
          <label>Instance ID</label>
          <div class="form-value readonly">{{ deviceInstance.id }}</div>
        </div>

        <!-- Created At (Read-only) -->
        <div class="form-group">
          <label>Created At</label>
          <div class="form-value readonly">
            {{ new Date(deviceInstance.createdAt).toLocaleString() }}
          </div>
        </div>

        <!-- Updated At (Read-only) -->
        <div class="form-group full-width">
          <label>Last Updated</label>
          <div class="form-value readonly">
            {{ new Date(deviceInstance.updatedAt).toLocaleString() }}
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading-state">
      <p>Loading device instance information...</p>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  padding: 20px;
  min-height: 400px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.panel-header h2 {
  color: #333;
  font-size: 20px;
  margin: 0;
}

.btn-edit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-edit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.edit-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel, .btn-save {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  border: none;
  transition: all 0.3s;
}

.btn-cancel {
  background: #e0e0e0;
  color: #333;
}

.btn-cancel:hover:not(:disabled) {
  background: #d0d0d0;
}

.btn-save {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
}

.btn-cancel:disabled, .btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.panel-content {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 600;
  color: #555;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input:disabled {
  background: #f0f0f0;
  cursor: not-allowed;
  opacity: 0.6;
}

.form-value {
  padding: 10px 12px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  min-height: 40px;
  display: flex;
  align-items: center;
}

.form-value.readonly {
  background: #f0f0f0;
  color: #666;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.online {
  background: #c6f6d5;
  color: #22543d;
}

.status-badge.offline {
  background: #fed7d7;
  color: #742a2a;
}

.status-badge.error {
  background: #feebc8;
  color: #7c2d12;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
