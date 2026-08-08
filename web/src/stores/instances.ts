import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { instancesApi, deviceInstanceApi } from '@/api'
import type { InstanceSummary, Variable, DeviceInstance } from '@/types'

export const useInstanceStore = defineStore('instances', () => {
  // State
  const instances = ref<InstanceSummary[]>([])
  const currentInstanceId = ref('0')
  const loading = ref(false)
  const currentVariables = ref<Variable[]>([])
  const currentDeviceInstance = ref<DeviceInstance | null>(null)
  const loadError = ref<null | 'not_found' | 'error'>(null)
  const switchingInstance = ref(false)

  // Computed
  const currentInstanceName = computed(() =>
    currentDeviceInstance.value?.instanceName || currentInstanceId.value
  )

  // 从持久化加载实例列表
  async function loadInstances() {
    loading.value = true
    try {
      const result = await instancesApi.listInstances()
      if (result.code === 200 && result.data) {
        instances.value = result.data.instances
      }
    } catch (e) {
      console.error('[InstanceStore] Failed to load instances:', e)
    } finally {
      loading.value = false
    }
  }

  // 切换当前实例（统一加载入口，包含存在性检查 + 设备实例 + 变量）
  async function switchInstance(instanceId: string) {
    // 防止并发切换
    if (switchingInstance.value) return
    // 相同实例且已有数据则跳过
    if (instanceId === currentInstanceId.value && currentDeviceInstance.value) return

    switchingInstance.value = true
    console.log(`[InstanceStore] Switching from ${currentInstanceId.value} to instance: ${instanceId}`)

    // 立即清空旧实例所有内容（store 层面不再残留）
    currentInstanceId.value = instanceId
    currentDeviceInstance.value = null
    currentVariables.value = []
    loadError.value = null

    try {
      // 用 getInstanceConfig 的 404 作为实例是否存在的权威判断
      const configResult = await instancesApi.getInstanceConfig(instanceId)
      if (configResult.code === 200 && configResult.data) {
        currentVariables.value = configResult.data.variables || []
      }

      // 加载设备实例信息（非关键，可能不存在）
      try {
        const deviceResult = await deviceInstanceApi.getInstance(instanceId)
        if (deviceResult.code === 200 && deviceResult.data) {
          currentDeviceInstance.value = deviceResult.data
        }
      } catch (e: any) {
        console.warn(`[InstanceStore] No device instance for ${instanceId}:`, e?.response?.status)
      }
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 404) {
        loadError.value = 'not_found'
        console.warn(`[InstanceStore] Instance ${instanceId} not found (404)`)
      } else {
        loadError.value = 'error'
        console.error(`[InstanceStore] Failed to load instance ${instanceId}:`, e)
      }
      // 数据已在开头清空，此处无需额外处理
    } finally {
      switchingInstance.value = false
    }
  }

  // 创建实例
  async function createInstance(config: Record<string, unknown>) {
    const result = await instancesApi.createInstance(config)
    await loadInstances()
    return result
  }

  // 更新实例属性
  async function updateInstance(instanceId: string, updates: Record<string, unknown>) {
    const result = await instancesApi.updateInstanceConfig(instanceId, updates)
    await loadInstances()
    return result
  }

  // 保存实例变量
  async function saveVariables(instanceId: string, variables: Variable[]) {
    const result = await instancesApi.updateInstanceVariables(instanceId, variables)
    currentVariables.value = variables
    return result
  }

  // 删除实例
  async function deleteInstance(instanceId: string) {
    await instancesApi.deleteInstance(instanceId)
    if (currentInstanceId.value === instanceId) {
      currentInstanceId.value = '0'
      currentDeviceInstance.value = null
      currentVariables.value = []
      loadError.value = null
    }
    await loadInstances()
  }

  // 生成新实例ID
  async function generateId(): Promise<string> {
    const result = await instancesApi.generateInstanceId()
    return result.data!.instanceId
  }

  return {
    instances,
    currentInstanceId,
    loading,
    currentInstanceName,
    currentVariables,
    currentDeviceInstance,
    loadError,
    loadInstances,
    switchInstance,
    createInstance,
    updateInstance,
    saveVariables,
    deleteInstance,
    generateId
  }
})
