<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useVariableStore } from '@/stores/variables'
import { useInstanceStore } from '@/stores/instances'
import { useUiStore } from '@/stores/ui'
import VariablesPanel from '@/components/VariablesPanel.vue'
import DeviceStatusPanel from '@/components/DeviceStatusPanel.vue'

const variableStore = useVariableStore()
const instanceStore = useInstanceStore()
const uiStore = useUiStore()

const { deviceInstance, connectionStatus, lastUpdate } = storeToRefs(variableStore)
const { currentInstanceId } = storeToRefs(instanceStore)

const activeTab = ref('variables')
const deviceDisplayName = ref('Loading...')
const deviceModelInfo = ref('')

function updateDeviceInfo() {
  if (deviceInstance.value) {
    deviceDisplayName.value = deviceInstance.value.instanceName
    deviceModelInfo.value = `${deviceInstance.value.manufacturer} | ${deviceInstance.value.series} | ${deviceInstance.value.deviceModel}`
  } else {
    deviceDisplayName.value = 'Loading...'
    deviceModelInfo.value = ''
  }
}

watch(deviceInstance, updateDeviceInfo)
watch(currentInstanceId, async (newId, oldId) => {
  if (newId === oldId) return
  variableStore.stopRealtimeUpdate()
  await variableStore.loadConfig()
  await variableStore.loadDeviceInstance()
  variableStore.startRealtimeUpdate()
  updateDeviceInfo()
})

onMounted(async () => {
  try {
    await variableStore.loadConfig()
    await variableStore.loadDeviceInstance()
    variableStore.startRealtimeUpdate()
    updateDeviceInfo()
  } catch (e) {
    uiStore.showToast('Failed to load instance data', 'error')
  }
})

onBeforeUnmount(() => {
  variableStore.stopRealtimeUpdate()
})
</script>

<template>
  <div class="home-page">
    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <span class="label">实例:</span>
        <span class="value">{{ instanceStore.currentInstanceName }}</span>
      </div>
      <div class="status-item">
        <span class="label">设备:</span>
        <span class="value">{{ deviceDisplayName }}</span>
      </div>
      <div class="status-item">
        <span class="label">型号:</span>
        <span class="value">{{ deviceModelInfo }}</span>
      </div>
      <div class="status-item">
        <span class="label">连接:</span>
        <span class="value" :class="{ 'connected': connectionStatus === 'Connected' }">
          {{ connectionStatus }}
        </span>
      </div>
      <div class="status-item">
        <span class="label">更新:</span>
        <span class="value">{{ lastUpdate }}</span>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'variables' }"
        @click="activeTab = 'variables'"
      >
        📊 Variables
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'status' }"
        @click="activeTab = 'status'"
      >
        📈 Device Status
      </button>
    </div>

    <!-- 内容区 -->
    <div class="tab-content">
      <VariablesPanel v-if="activeTab === 'variables'" />
      <DeviceStatusPanel v-if="activeTab === 'status'" />
    </div>
  </div>
</template>

<style scoped>
.home-page {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 状态栏 */
.status-bar {
  display: flex;
  gap: 20px;
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.status-item .label {
  color: #64748b;
  font-weight: 500;
}

.status-item .value {
  color: #1e293b;
  font-weight: 600;
}

.status-item .value.connected {
  color: #22c55e;
}

/* 标签页 */
.tabs {
  display: flex;
  background: white;
  padding: 0 20px;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #667eea;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

/* 内容区 */
.tab-content {
  flex: 1;
  overflow-y: auto;
}
</style>
