<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useVariableStore } from '@/stores/variables'
import { useUiStore } from '@/stores/ui'
import VariablesPanel from '@/components/VariablesPanel.vue'
import DeviceStatusPanel from '@/components/DeviceStatusPanel.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import LoginModal from '@/components/LoginModal.vue'

// Stores
const userStore = useUserStore()
const variableStore = useVariableStore()
const uiStore = useUiStore()

// Store refs
const { currentUser } = storeToRefs(userStore)
const { deviceInstance, connectionStatus, lastUpdate } = storeToRefs(variableStore)
const { toastMessage, toastType, showLoginModal } = storeToRefs(uiStore)

// 当前激活的标签页
const activeTab = ref('variables')

// Computed - 设备显示信息
const deviceDisplayName = ref('Loading...')
const deviceModelInfo = ref('')

const updateDeviceInfo = () => {
  if (deviceInstance.value) {
    deviceDisplayName.value = deviceInstance.value.instanceName
    deviceModelInfo.value = `${deviceInstance.value.manufacturer} | ${deviceInstance.value.series} | ${deviceInstance.value.deviceModel}`
  } else {
    deviceDisplayName.value = 'Loading...'
    deviceModelInfo.value = ''
  }
}

// Methods
const handleSwitchUser = () => {
  uiStore.openLoginModal()
}

const handleCloseLogin = () => {
  uiStore.closeLoginModal()
}

const switchTab = (tab: string) => {
  activeTab.value = tab
}

// Watch for deviceInstance changes
import { watch } from 'vue'
watch(deviceInstance, () => {
  updateDeviceInfo()
})

// Lifecycle
onMounted(async () => {
  // 恢复登录状态
  userStore.restoreFromStorage()
  
  // 如果未登录，自动以 guest 身份登录
  if (!userStore.isLoggedIn) {
    await userStore.autoLoginAsGuest()
  }
  
  // 初始化设备信息显示
  updateDeviceInfo()
})
</script>

<template>
  <div id="app">
    <div class="container">
      <!-- 头部 -->
      <div class="header">
        <div class="header-left">
          <h1>🔧 PLC Simulator - Variable Configuration</h1>
          <p>Device: {{ deviceDisplayName }} | Model: {{ deviceModelInfo }}</p>
        </div>
        
        <!-- 用户信息区域 -->
        <div class="user-section">
          <div class="user-info">
            <div class="user-name">{{ currentUser.name }}</div>
            <div class="user-role">{{ currentUser.role }}</div>
          </div>
          <button class="switch-user-btn" @click="handleSwitchUser">
            👤 Switch User
          </button>
        </div>
      </div>
      
      <!-- 标签页 -->
      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'variables' }"
          @click="switchTab('variables')"
        >
          Variables
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'deviceStatus' }"
          @click="switchTab('deviceStatus')"
        >
          Device Status
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'settings' }"
          @click="switchTab('settings')"
        >
          Settings
        </div>
      </div>
          <!-- 根据激活的标签页显示对应组件 -->
      <VariablesPanel v-if="activeTab === 'variables'" />
      <DeviceStatusPanel v-if="activeTab === 'deviceStatus'" />
      <SettingsPanel v-if="activeTab === 'settings'" />
    </div>
    
    <!-- 状态栏 -->
    <div class="status-bar">
      <div>
        <span class="status-indicator" :class="connectionStatus === 'Connected' ? 'connected' : 'disconnected'"></span>
        Status: {{ connectionStatus }}
      </div>
      <span>Last Update: {{ lastUpdate }}</span>
    </div>

    <!-- Toast提示 -->
    <Teleport to="body">
      <div v-if="toastMessage" class="toast" :class="{ error: toastType === 'error' }">
        {{ toastMessage }}
      </div>
    </Teleport>

    <!-- 登录模态框 -->
    <LoginModal 
      v-if="showLoginModal"
      @close="handleCloseLogin"
    />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

#app {
  width: 100%;
}

.container {
  max-width: 1600px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h1 {
  font-size: 22px;
  margin-bottom: 6px;
}

.header-left p {
  opacity: 0.9;
  font-size: 12px;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
  text-align: right;
}

.user-name {
  font-weight: bold;
  font-size: 16px;
}

.user-role {
  font-size: 12px;
  opacity: 0.8;
}

.switch-user-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid white;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.switch-user-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.tabs {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background: #fafafa;
}

.tab {
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  font-weight: 500;
  font-size: 14px;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.tab:hover {
  background: #f0f0f0;
}

.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  color: white;
  padding: 12px 25px;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
}

.status-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background: #48bb78;
}

.status-indicator.disconnected {
  background: #f56565;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
  border-left: 4px solid #48bb78;
}

.toast.error {
  border-left-color: #f56565;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
