import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { instancesApi } from '@/api'
import type { InstanceSummary, Variable } from '@/types'

export const useInstanceStore = defineStore('instances', () => {
  // State
  const instances = ref<InstanceSummary[]>([])
  const currentInstanceId = ref('0')
  const loading = ref(false)
  const currentVariables = ref<Variable[]>([])

  // Computed
  const currentInstance = computed(() =>
    instances.value.find(i => i.instanceId === currentInstanceId.value)
  )

  const currentInstanceName = computed(() =>
    currentInstance.value?.name || currentInstanceId.value
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

  // 切换当前实例
  async function switchInstance(instanceId: string) {
    if (instanceId === currentInstanceId.value) return
    currentInstanceId.value = instanceId
    // 加载新实例的变量
    try {
      const result = await instancesApi.getInstanceVariables(instanceId)
      if (result.code === 200 && result.data) {
        currentVariables.value = result.data.variables || []
      }
    } catch (e) {
      currentVariables.value = []
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
    currentInstance,
    currentInstanceName,
    currentVariables,
    loadInstances,
    switchInstance,
    createInstance,
    updateInstance,
    saveVariables,
    deleteInstance,
    generateId
  }
})
