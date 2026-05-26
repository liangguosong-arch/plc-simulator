import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { configApi, variableApi, deviceInstanceApi } from '@/api'
import type { Variable, VariableGroup, DeviceInstance } from '@/types'

export const useVariableStore = defineStore('variables', () => {
  // State
  const variables = ref<Variable[]>([])
  const deviceInstance = ref<DeviceInstance | null>(null)
  const loading = ref(false)
  const connectionStatus = ref('Connecting...')
  const lastUpdate = ref('-')
  let updateTimer: number | null = null

  // Getters
  const variableGroups = computed(() => {
    const groups: Record<string, VariableGroup> = {
      input: { type: 'input', title: 'Input Variables', icon: '📥', variables: [] },
      output: { type: 'output', title: 'Output Variables', icon: '📤', variables: [] },
      memory: { type: 'memory', title: 'Memory Variables', icon: '💾', variables: [] }
    }
    
    variables.value.forEach((v: Variable) => {
      if (groups[v.type]) {
        groups[v.type].variables.push(v)
      }
    })

    return Object.values(groups).filter(g => g.variables.length > 0)
  })

  const isNumericType = (dataType: string) => {
    return ['INT', 'UINT', 'DINT', 'REAL'].includes(dataType)
  }

  // Actions
  async function loadConfig() {
    try {
      loading.value = true
      
      const result = await configApi.getConfig()
      
      if (result.code === 200) {
        variables.value = result.data.variables.map((v: any) => {
          // 确保 simulationConfig 存在，如果缺失则创建默认值
          if (!v.simulationConfig) {
            v.simulationConfig = {
              strategy: 'random',
              fluctuationRange: 10,
              step: 1,
              updateInterval: 1000,
              minValue: v.minValue ?? (v.dataType === 'BOOL' ? 0 : 0),
              maxValue: v.maxValue ?? (v.dataType === 'BOOL' ? 1 : 100)
            }
          }
          
          return {
            ...v,
            manualValue: v.currentValue ?? (v.dataType === 'BOOL' ? false : 0)
          }
        })
        
        // 加载设备实例信息
        if (result.data.deviceInstance) {
          deviceInstance.value = result.data.deviceInstance
        } else {
          // 如果配置中没有，尝试从 API 获取
          await loadDeviceInstance()
        }
        
        connectionStatus.value = 'Connected'
        lastUpdate.value = new Date().toLocaleTimeString()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error('Failed to load config:', error)
      connectionStatus.value = 'Connection Failed'
      throw error
    } finally {
      loading.value = false
    }
  }

  async function loadDeviceInstance() {
    try {
      const result = await deviceInstanceApi.getInstance()
      if (result.code === 200 && result.data) {
        deviceInstance.value = result.data
      }
    } catch (error: any) {
      console.error('Failed to load device instance:', error)
    }
  }

  async function saveConfig() {
    try {
      await configApi.saveConfig(variables.value)
    } catch (error: any) {
      console.error('Failed to save config:', error)
      throw error
    }
  }

  async function updateDeviceInstance(updates: Partial<DeviceInstance>) {
    try {
      if (!deviceInstance.value) {
        throw new Error('Device instance not loaded')
      }
      
      const result = await deviceInstanceApi.updateInstance(deviceInstance.value.id, updates)
      
      if (result.code === 200 && result.data) {
        deviceInstance.value = result.data
      }
      
      return result
    } catch (error: any) {
      console.error('Failed to update device instance:', error)
      throw error
    }
  }

  function toggleMode(variable: Variable) {
    variable.simulationMode = variable.simulationMode === 'auto' ? 'manual' : 'auto'
    saveConfig()
  }

  async function updateManualValue(variable: Variable) {
    try {
      await variableApi.writeVariableValue(variable.address, variable.manualValue)
      variable.currentValue = variable.manualValue
    } catch (error: any) {
      console.error('Failed to update value:', error)
      throw error
    }
  }

  function formatValue(variable: Variable): string {
    if (variable.dataType === 'BOOL') {
      return variable.currentValue ? 'ON' : 'OFF'
    }
    
    let value = variable.currentValue
    if (variable.dataType === 'REAL') {
      value = parseFloat(value).toFixed(2)
    }
    
    if (variable.unit) {
      return `${value} ${variable.unit}`
    }
    
    return value
  }

  function startRealtimeUpdate() {
    updateTimer = window.setInterval(async () => {
      try {
        const addresses = variables.value.map((v: Variable) => v.address)
        if (addresses.length === 0) return
        
        const result = await variableApi.getVariableValues(addresses)
        
        if (result.code === 200) {
          result.data.forEach((item: any) => {
            const variable = variables.value.find((v: Variable) => v.address === item.address)
            if (variable) {
              variable.currentValue = item.value
            }
          })
          
          lastUpdate.value = new Date().toLocaleTimeString()
        }
      } catch (error) {
        console.error('Failed to update values:', error)
      }
    }, 1000)
  }

  function stopRealtimeUpdate() {
    if (updateTimer !== null) {
      clearInterval(updateTimer)
      updateTimer = null
    }
  }

  function addVariable(newVar: Variable) {
    variables.value.push(newVar)
    saveConfig()
  }

  function deleteVariable(varId: string) {
    variables.value = variables.value.filter((v: Variable) => v.id !== varId)
    saveConfig()
  }

  return {
    variables,
    deviceInstance,
    loading,
    connectionStatus,
    lastUpdate,
    variableGroups,
    isNumericType,
    loadConfig,
    loadDeviceInstance,
    saveConfig,
    updateDeviceInstance,
    toggleMode,
    updateManualValue,
    formatValue,
    startRealtimeUpdate,
    stopRealtimeUpdate,
    addVariable,
    deleteVariable
  }
})