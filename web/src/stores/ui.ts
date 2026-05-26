import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ToastType } from '@/types'

export const useUiStore = defineStore('ui', () => {
  // State
  const toastMessage = ref('')
  const toastType = ref<ToastType>('success')
  const showLoginModal = ref(false)
  let toastTimer: number | null = null

  // Actions
  function showToast(message: string, type: ToastType = 'success') {
    toastMessage.value = message
    toastType.value = type
    
    // 清除之前的定时器
    if (toastTimer !== null) {
      clearTimeout(toastTimer)
    }
    
    // 3秒后自动隐藏
    toastTimer = window.setTimeout(() => {
      toastMessage.value = ''
    }, 3000)
  }

  function hideToast() {
    toastMessage.value = ''
    if (toastTimer !== null) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
  }

  function openLoginModal() {
    showLoginModal.value = true
  }

  function closeLoginModal() {
    showLoginModal.value = false
  }

  return {
    toastMessage,
    toastType,
    showLoginModal,
    showToast,
    hideToast,
    openLoginModal,
    closeLoginModal
  }
})
