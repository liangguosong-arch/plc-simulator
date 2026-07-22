import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { variableApi, deviceInstanceApi, instancesApi } from '@/api'
import { useInstanceStore } from './instances'
import type { Variable, VariableGroup, DeviceInstance } from '@/types'

export const useVariableStore = defineStore('variables', () => {
  // State
  const variables = ref<Variable[]>([])
  const deviceInstance = ref<DeviceInstance | null>(null)
  const loading = ref(false)
  const connectionStatus = ref('Connecting...')
  const lastUpdate = ref('-')
  let updateTimer: number | null = null

  // 获取当前实例ID
  function getCurrentInstanceId(): string {
    try {
      return useInstanceStore().currentInstanceId
    } catch {
      return '0'
    }
  }

  // Computed - 按变量类型分组（VariablesPanel 依赖）
  const variableGroups = computed<VariableGroup[]>(() => {
    const groupsMap = new Map<string, Variable[]>()
    const groupMeta: Record<string, { title: string; icon: string }> = {
      input: { title: 'Input Variables', icon: '📥' },
      output: { title: 'Output Variables', icon: '📤' },
      memory: { title: 'Memory Variables', icon: '💾' },
    }

    groupsMap.set('input', [])
    groupsMap.set('output', [])
    groupsMap.set('memory', [])

    variables.value.forEach(v => {
      const t = v.type || 'memory'
      if (!groupsMap.has(t)) groupsMap.set(t, [])
      groupsMap.get(t)!.push(v)
    })

    return Array.from(groupsMap.entries()).map(([type, vars]) => ({
      type,
      title: groupMeta[type]?.title || type,
      icon: groupMeta[type]?.icon || '📌',
      variables: vars,
    }))
  })

  const variablesByGroup = computed<{ groupName: string; variables: Variable[] }[]>(() => {
    const groups = new Map<string, Variable[]>()
    variables.value.forEach(v => {
      const groupName = v.type || 'Default'
      if (!groups.has(groupName)) {
        groups.set(groupName, [])
      }
      groups.get(groupName)!.push(v)
    })
    return Array.from(groups.entries()).map(([groupName, items]) => ({
      groupName,
      variables: items
    }))
  })

  const alarmCount = computed(() => {
    return variables.value.filter(v => (v as any).alarmStatus !== 'normal').length
  })

  // 工具函数
  function isNumericType(dataType: string): boolean {
    return ['INT', 'UINT', 'DINT', 'REAL'].includes(dataType)
  }

  function formatValue(variable: Variable): string {
    const val = variable.currentValue
    if (val === undefined || val === null) return '-'
    if (variable.dataType === 'BOOL') return val ? 'TRUE' : 'FALSE'
    if (variable.dataType === 'REAL') return Number(val).toFixed(2)
    return String(val)
  }

  // 切换 Auto/Manual 模式
  function toggleMode(variable: Variable) {
    variable.simulationMode = variable.simulationMode === 'auto' ? 'manual' : 'auto'
  }

  // 添加变量
  function addVariable(variable: Variable) {
    variables.value.push(variable)
  }

  // 删除变量
  function deleteVariable(id: string) {
    variables.value = variables.value.filter(v => v.id !== id)
  }

  // 从实例配置加载变量
  async function loadConfig() {
    try {
      loading.value = true
      const instanceId = getCurrentInstanceId()
      const result = await instancesApi.getInstanceConfig(instanceId)
      if (result.code === 200 && result.data) {
        variables.value = result.data.variables || []
      }
    } catch (error: any) {
      console.error('Failed to load instance config:', error)
    } finally {
      loading.value = false
    }
  }

  // 加载设备实例
  async function loadDeviceInstance() {
    try {
      const instanceId = getCurrentInstanceId()
      const result = await deviceInstanceApi.getInstance(instanceId)
      if (result.code === 200 && result.data) {
        deviceInstance.value = result.data
      }
    } catch (error: any) {
      console.error('Failed to load device instance:', error)
    }
  }

  // 更新手动写入值
  async function updateManualValue(variable: Variable) {
    try {
      const instanceId = getCurrentInstanceId()
      await variableApi.writeVariableValue(variable.address, variable.manualValue, instanceId)
      variable.currentValue = variable.manualValue
    } catch (error: any) {
      console.error('Failed to update value:', error)
      throw error
    }
  }

  // 保存变量配置（VariablesPanel 依赖）
  async function saveConfig() {
    await saveVariables()
  }

  // 保存变量配置到服务器
  async function saveVariables() {
    try {
      const instanceId = getCurrentInstanceId()
      await instancesApi.updateInstanceVariables(instanceId, variables.value)
    } catch (error: any) {
      console.error('Failed to save variables:', error)
      throw error
    }
  }

  // 启动实时轮询
  function startRealtimeUpdate() {
    updateTimer = window.setInterval(async () => {
      try {
        const addresses = variables.value.map((v: Variable) => v.address)
        if (addresses.length === 0) return

        const instanceId = getCurrentInstanceId()
        const result = await variableApi.getVariableValues(addresses, instanceId)

        if (result.code === 200 && result.data) {
          const values = result.data
          variables.value.forEach(v => {
            const newVal = values[v.address]
            if (newVal !== undefined) {
              v.currentValue = newVal.value ?? newVal
              ;(v as any).quality = newVal.quality ?? 'good'
              ;(v as any).lastUpdate = newVal.timestamp ?? new Date().toISOString()
            }
          })
          lastUpdate.value = new Date().toLocaleTimeString()
          connectionStatus.value = 'Connected'
        }
      } catch (error: any) {
        connectionStatus.value = 'Disconnected'
      }
    }, 1000)
  }

  // 停止轮询
  function stopRealtimeUpdate() {
    if (updateTimer !== null) {
      clearInterval(updateTimer)
      updateTimer = null
    }
  }

  // 更新设备实例（SettingsPanel 依赖）
  async function updateDeviceInstance(updates: Partial<DeviceInstance>) {
    try {
      const instanceId = getCurrentInstanceId()
      await deviceInstanceApi.updateInstance(instanceId, updates)
      await loadDeviceInstance()
    } catch (error: any) {
      console.error('Failed to update device instance:', error)
      throw error
    }
  }

  return {
    variables,
    deviceInstance,
    loading,
    connectionStatus,
    lastUpdate,
    variableGroups,
    variablesByGroup,
    alarmCount,
    isNumericType,
    formatValue,
    toggleMode,
    addVariable,
    deleteVariable,
    loadConfig,
    loadDeviceInstance,
    updateManualValue,
    saveConfig,
    saveVariables,
    updateDeviceInstance,
    startRealtimeUpdate,
    stopRealtimeUpdate,
  }
})
