<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useVariableStore } from '@/stores/variables'
import { useInstanceStore } from '@/stores/instances'
import VariablesPanel from '@/components/VariablesPanel.vue'
import DeviceStatusPanel from '@/components/DeviceStatusPanel.vue'

const variableStore = useVariableStore()
const instanceStore = useInstanceStore()

const { deviceInstance, connectionStatus, lastUpdate } = storeToRefs(variableStore)
const { loadError } = storeToRefs(instanceStore)

const activeTab = ref('variables')

// 从 instanceStore.currentDeviceInstance 派生（单一真相源）
const deviceDisplayName = computed(() =>
  deviceInstance.value?.instanceName || 'Loading...'
)
const deviceModelInfo = computed(() => {
  if (deviceInstance.value) {
    return `${deviceInstance.value.manufacturer} | ${deviceInstance.value.series} | ${deviceInstance.value.deviceModel}`
  }
  return ''
})

watch(() => deviceInstance.value?.instanceName, (newValue, oldValue) => {
  console.log('deviceInstance changed:', newValue, oldValue)
})

// 实例不存在标志
const instanceNotFound = computed(() => loadError.value === 'not_found')

// App.vue 已通过 switchInstance 统一加载实例数据，
// HomePage 仅负责启动/停止实时轮询
onMounted(() => {
  variableStore.startRealtimeUpdate()
})

onBeforeUnmount(() => {
  variableStore.stopRealtimeUpdate()
})
</script>

<template>
  <div class="home-page">
    <!-- 状态栏 -->
    <div v-if="!instanceNotFound" class="status-bar">
      <div class="status-item">
        <span class="label">实例:</span>
        <span class="value">{{ instanceStore.currentInstanceName }}</span>
      </div>
      <div class="status-item">
        <span class="label">ID:</span>
        <span class="value">{{ deviceInstance?.id }}</span>
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

    <!-- 实例不存在提示 -->
    <div v-if="instanceNotFound" class="not-found">
      <div class="not-found-card">
        <span class="not-found-icon">⚠️</span>
        <span class="not-found-title">实例不存在</span>
        <p class="not-found-hint">请检查 URL 或从左侧选择其他实例</p>
      </div>
    </div>

    <template v-else>
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
    </template>
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
