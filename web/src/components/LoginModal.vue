<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="login-modal">
        <h2>🔐 User Login</h2>
        <p>Enter your credentials to switch user</p>
        
        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              id="username"
              v-model="loginForm.username" 
              type="text" 
              placeholder="Enter username"
              required
              autocomplete="username"
              ref="usernameInput"
            >
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              id="password"
              v-model="loginForm.password" 
              type="password" 
              placeholder="Enter password"
              required
              autocomplete="current-password"
            >
          </div>

          <button type="submit" class="login-btn" :disabled="loggingIn">
            {{ loggingIn ? 'Logging in...' : 'Login' }}
          </button>
          
          <button type="button" class="cancel-btn" @click="$emit('close')">
            Cancel
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'

// Emits
const emit = defineEmits<{
  close: []
}>()

// Stores
const userStore = useUserStore()
const uiStore = useUiStore()

// State
const loginForm = ref({
  username: '',
  password: ''
})
const loginError = ref('')
const loggingIn = ref(false)
const usernameInput = ref<HTMLInputElement | null>(null)

// Methods
const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    loginError.value = 'Please enter both username and password'
    return
  }

  loggingIn.value = true
  loginError.value = ''

  try {
    const result = await userStore.login(loginForm.value.username, loginForm.value.password)
    
    if (result.success) {
      uiStore.showToast(`Logged in as ${userStore.currentUser.name} (${userStore.currentUser.role})`)
      emit('close')
    } else {
      loginError.value = result.error || 'Login failed'
    }
  } catch (error: any) {
    loginError.value = 'Login failed. Please check your credentials.'
  } finally {
    loggingIn.value = false
  }
}

// Lifecycle
onMounted(() => {
  // 聚焦到用户名输入框
  if (usernameInput.value) {
    usernameInput.value.focus()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.login-modal {
  background: white;
  border-radius: 12px;
  padding: 40px;
  width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.login-modal h2 {
  color: #333;
  margin-bottom: 10px;
  text-align: center;
}

.login-modal p {
  color: #666;
  text-align: center;
  margin-bottom: 30px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.login-btn {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s;
  margin-top: 10px;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.cancel-btn {
  width: 100%;
  background: white;
  color: #666;
  border: 2px solid #ddd;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
  transition: all 0.3s;
}

.cancel-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 14px;
  text-align: center;
}
</style>
