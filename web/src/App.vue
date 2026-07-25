<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
const route = useRoute()

// Store refs
const { currentUser } = storeToRefs(userStore)
const { currentInstanceId, instances } = storeToRefs(instanceStore)
const { connectionStatus } = storeToRefs(variableStore)
const { toastMessage, toastType, showLoginModal } = storeToRefs(uiStore)

// 初始化就绪标记
const ready = ref(false)

// 是否从 URL 指定了 instanceId
const hasUrlInstanceId = computed(() => !!route.query.instanceId)

// 是否为管理员
const isAdmin = computed(() => currentUser.value?.role === 'ADMIN')

// 是否显示实例选择器：管理员 + URL 未指定 instanceId
const showInstanceSelector = computed(() => isAdmin.value)

// 是否显示实例管理按钮：管理员 + URL 未指定 instanceId
const showManagementBtn = computed(() => isAdmin.value)

// 是否没有可用实例：非管理员 + URL 未指定 instanceId + 实例 '0' 不存在
const noAvailableInstance = computed(() =>
  !isAdmin.value && !hasUrlInstanceId.value && !instances.value.some(i => i.instanceId === '0')
)

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

// 加载实例数据并启动实时更新
async function initInstanceData() {
  variableStore.stopRealtimeUpdate()
  await variableStore.loadConfig()
  await variableStore.loadDeviceInstance()
  variableStore.startRealtimeUpdate()
}

// Lifecycle
onMounted(async () => {
  // 1. 恢复用户登录态
  userStore.restoreFromStorage()
  if (!userStore.isLoggedIn) {
    await userStore.autoLoginAsGuest()
  }

  // 2. 加载实例列表
  await instanceStore.loadInstances()

  // 3. 根据 URL 参数和角色决定目标实例
  const urlInstanceId = route.query.instanceId as string | undefined

  if (urlInstanceId) {
    // URL 指定了 instanceId：直接打开该实例
    await instanceStore.switchInstance(urlInstanceId)
    await initInstanceData()
  } else if (isAdmin.value) {
    // 管理员 + 无 URL 参数：使用默认实例 '0'
    await instanceStore.switchInstance('0')
    await initInstanceData()
  } else {
    // 非管理员：检查实例 '0' 是否存在
    if (instances.value.some(i => i.instanceId === '0')) {
      await instanceStore.switchInstance('0')
      await initInstanceData()
    }
    // 否则 noAvailableInstance 为 true，不加载任何实例
  }

  ready.value = true
})

// 监听 URL instanceId 参数变化（用于运行时 URL 变更，如点击 logo 回到首页）
watch(
  () => route.query.instanceId,
  async (newId) => {
    if (!ready.value) return

    const id = newId as string | undefined
    if (id) {
      // URL 新增了 instanceId，切换到指定实例
      await instanceStore.switchInstance(id)
      await initInstanceData()
    } else if (!hasUrlInstanceId.value) {
      // URL 移除了 instanceId，根据角色重新决定目标实例
      if (isAdmin.value) {
        await instanceStore.switchInstance('0')
        await initInstanceData()
      } else if (instances.value.some(i => i.instanceId === '0')) {
        await instanceStore.switchInstance('0')
        await initInstanceData()
      }
    }
  }
)
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
        <!-- 实例选择器：仅管理员且 URL 未指定 instanceId 时显示 -->
        <select
          v-if="showInstanceSelector"
          class="instance-select"
          :value="currentInstanceId"
          @change="handleInstanceChange"
        >
          <option v-for="inst in instances" :key="inst.instanceId" :value="inst.instanceId">
            {{ inst.instanceId === '0' ? '🏠 默认' : inst.name || inst.instanceId }}
            {{ inst.status === 'running' ? '🟢' : '🔴' }}
          </option>
        </select>
        <!-- 实例管理按钮：仅管理员且 URL 未指定 instanceId 时显示 -->
        <button
          v-if="showManagementBtn"
          class="nav-btn"
          @click="goToInstanceManager"
          title="实例管理"
        >
          ⚙️ 实例管理
        </button>
      </div>

      <div class="header-right">
        <span v-if="currentUser" class="user-info">
          {{ currentUser.role === 'ADMIN' ? '👑' : '👤' }} {{ currentUser.name }}
        </span>
        <button class="login-btn" @click="handleSwitchUser">切换用户</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="!ready" class="loading-state">
      <div class="spinner"></div>
      <span>初始化中...</span>
    </div>

    <!-- 无可用实例提示 -->
    <div v-else-if="noAvailableInstance" class="no-instance-message">
      <div class="no-instance-card">
        <span class="no-instance-icon">📭</span>
        <p>没有可用的模拟器实例</p>
        <span class="no-instance-hint">请联系管理员创建或分配实例</span>
      </div>
    </div>

    <!-- 页面内容 -->
    <router-view v-if="ready && !noAvailableInstance" />

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

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* No Instance Message */
.no-instance-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-instance-card {
  text-align: center;
  background: white;
  padding: 48px 64px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.no-instance-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.no-instance-card p {
  font-size: 18px;
  color: #1e293b;
  font-weight: 600;
  margin-bottom: 8px;
}

.no-instance-hint {
  font-size: 13px;
  color: #94a3b8;
}

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
