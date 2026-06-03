import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('access_token') || '')
  const user = ref<User | null>(null)
  const isAuthenticated = ref<boolean>(!!localStorage.getItem('access_token'))

  const currentUser = computed(() => user.value)
  const isLoggedIn = computed(() => isAuthenticated.value)

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password)
    token.value = res.data.access_token
    isAuthenticated.value = true
    localStorage.setItem('access_token', res.data.access_token)
  }

  async function register(username: string, password: string) {
    const res = await authApi.register(username, password)
    user.value = res.data
  }

  function logout() {
    token.value = ''
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }

  async function checkAuth() {
    if (!token.value) {
      logout()
      return
    }
    try {
      isAuthenticated.value = true
    } catch {
      logout()
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    currentUser,
    isLoggedIn,
    login,
    register,
    logout,
    checkAuth
  }
})
