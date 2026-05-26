import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User>({
    name: 'Guest',
    role: 'GUEST',
    token: null
  })

  // Getters
  const isLoggedIn = computed(() => !!currentUser.value.token)

  const userName = computed(() => currentUser.value.name)

  const userRole = computed(() => currentUser.value.role)

  // Actions
  async function login(username: string, password: string) {
    try {
      const result = await authApi.login({ username, password })
      
      if (result.code === 200) {
        currentUser.value = result.data
        
        // 保存到 localStorage
        localStorage.setItem('plc_simulator_token', result.data.token || '')
        localStorage.setItem('plc_simulator_user', JSON.stringify(result.data))
        
        return { success: true, data: result.data }
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error('Login failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Login failed' 
      }
    }
  }

  function logout() {
    currentUser.value = {
      name: 'Guest',
      role: 'GUEST',
      token: null
    }
    
    localStorage.removeItem('plc_simulator_token')
    localStorage.removeItem('plc_simulator_user')
  }

  function restoreFromStorage() {
    const token = localStorage.getItem('plc_simulator_token')
    const userStr = localStorage.getItem('plc_simulator_user')
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        currentUser.value = { ...user, token }
        console.log('[UserStore] Restored user:', user.name)
      } catch (error) {
        console.error('[UserStore] Failed to restore user:', error)
        localStorage.removeItem('plc_simulator_token')
        localStorage.removeItem('plc_simulator_user')
      }
    }
  }

  async function autoLoginAsGuest() {
    try {
      const result = await login('guest', 'guest123')
      if (result.success) {
        console.log('[UserStore] Auto logged in as guest')
      }
      return result
    } catch (error) {
      console.error('[UserStore] Auto login failed:', error)
      return { success: false, error }
    }
  }

  return {
    currentUser,
    isLoggedIn,
    userName,
    userRole,
    login,
    logout,
    restoreFromStorage,
    autoLoginAsGuest
  }
})
