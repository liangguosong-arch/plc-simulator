<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useInstanceStore } from '@/stores/instances'
import { useVariableStore } from '@/stores/variables'
import { useUiStore } from '@/stores/ui'
import LoginModal from '@/components/LoginModal.vue'

// Stores
const userStore = useUserStore()
const instanceStore = useInstanceStore()
const variableStore = useVariableStore()
const uiStore = useUiStore()
const router = useRouter()

// Store refs
const { currentUser } = storeToRefs(userStore)
const { currentInstanceId, instances } = storeToRefs(instanceStore)
const { connectionStatus } = storeToRefs(variableStore)
const { toastMessage, toastType, showLoginModal } = storeToRefs(uiStore)

// 导航到实例管理
function goToInstanceManager() {
  router.push('/instances')
}

// 切换实例
async function handleInstanceChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const newId = target.value
  if (newId !== currentInstanceId.value) {
    await instanceStore.switchInstance(newId)
    variableStore.stopRealtimeUpdate()
    await variableStore.loadConfig()
    variableStore.startRealtimeUpdate()
  }
}

function handleSwitchUser() {
  uiStore.openLoginModal()
}

function handleCloseLogin() {
  uiStore.closeLoginModal()
}

// Lifecycle
onMounted(async () => {
  userStore.restoreFromStorage()
  if (!userStore.isLoggedIn) {
    await userStore.autoLoginAsGuest()
  }
  await instanceStore.loadInstances()
})
</script>

<template>
  <div class="app-container">
    <!-- 头部 -->
    <div class="header">
      <div class="header-left">
        <h1 class="logo" @click="router.push('/')">PLC Simulator</h1>
        <span class="status-indicator" :class="{ connected: connectionStatus === 'Connected' }">
          {{ connectionStatus === 'Connected' ? '●' : '○' }}
        </span>
      </div>

      <div class="header-center">
        <!-- 实例选择器 -->
        <select class="instance-select" :value="currentInstanceId" @change="handleInstanceChange">
          <option v-for="inst in instances" :key="inst.instanceId" :value="inst.instanceId">
            {{ inst.instanceId === '0' ? '🏠 默认' : inst.name || inst.instanceId }}
            {{ inst.status === 'running' ? '🟢' : '🔴' }}
          </option>
        </select>
        <button class="nav-btn" @click="goToInstanceManager" title="实例管理">⚙️ 实例管理</button>
      </div>

      <div class="header-right">
        <span v-if="currentUser" class="user-info">
          {{ currentUser.role === 'admin' ? '👑' : '👤' }} {{ currentUser.name }}
        </span>
        <button class="login-btn" @click="handleSwitchUser">切换用户</button>
      </div>
    </div>

    <!-- 页面内容 -->
    <router-view />

    <!-- 登录弹窗 -->
    <LoginModal v-if="showLoginModal" @close="handleCloseLogin" />

    <!-- Toast -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style>
/* Reset */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; }

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 100;
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 12px; }
.logo { font-size: 18px; cursor: pointer; user-select: none; }
.status-indicator { font-size: 11px; color: #ef4444; }
.status-indicator.connected { color: #22c55e; }

.header-center { display: flex; align-items: center; gap: 10px; }

.instance-select {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  min-width: 140px;
  cursor: pointer;
}
.instance-select option { color: #333; background: white; }

.nav-btn {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}
.nav-btn:hover { background: rgba(255,255,255,0.2); }

.header-right { display: flex; align-items: center; gap: 12px; }
.user-info { font-size: 13px; opacity: 0.9; }
.login-btn {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.login-btn:hover { background: rgba(255,255,255,0.25); }

/* Toast */
.toast {
  position: fixed;
  top: 70px;
  right: 24px;
  padding: 10px 20px;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}
.toast.success { background: #22c55e; }
.toast.error { background: #ef4444; }
.toast.info { background: #3b82f6; }

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
