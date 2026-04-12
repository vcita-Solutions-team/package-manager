import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, validateTokenApi, fetchOperatorApi, mfaChallengeApi } from '@/api/auth'
import type { MfaChallengeResponse } from '@/api/auth'

const TOKEN_KEY = 'operator_jwt_token'
const READ_ONLY_KEY = 'pm_read_only'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const operator = ref<any>(null)
  const mfaPending = ref(false)
  const readOnly = ref(localStorage.getItem(READ_ONLY_KEY) === 'true')

  const isAuthenticated = computed(() => token.value !== null)

  function setReadOnly(value: boolean) {
    readOnly.value = value
    localStorage.setItem(READ_ONLY_KEY, String(value))
  }

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  function clearToken() {
    token.value = null
    operator.value = null
    mfaPending.value = false
    localStorage.removeItem(TOKEN_KEY)
  }

  async function login(email: string, password: string): Promise<{ success: boolean; mfa?: boolean; mfaData?: any; error?: string }> {
    try {
      const response = await loginApi(email, password)

      if (response.login_handler === 'MFA') {
        setToken(response.data.token)
        mfaPending.value = true
        return { success: false, mfa: true, mfaData: response.data }
      }

      setToken(response.data)
      mfaPending.value = false
      return { success: true }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed'
      return { success: false, error: message }
    }
  }

  async function submitMfaCode(loginCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result: MfaChallengeResponse = await mfaChallengeApi(loginCode)

      if (result.success === 'true' || result.success === true as any) {
        if (result.token) setToken(result.token)
        mfaPending.value = false
        return { success: true }
      }

      return { success: false, error: result.error || 'Invalid code' }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'MFA verification failed' }
    }
  }

  async function validateToken(): Promise<boolean> {
    if (!token.value) return false
    try {
      return await validateTokenApi()
    } catch {
      clearToken()
      return false
    }
  }

  async function fetchOperator(): Promise<void> {
    try {
      operator.value = await fetchOperatorApi()
    } catch {
      operator.value = null
    }
  }

  function logout() {
    clearToken()
    window.location.href = '/login'
  }

  return {
    token,
    operator,
    mfaPending,
    readOnly,
    isAuthenticated,
    login,
    submitMfaCode,
    validateToken,
    fetchOperator,
    logout,
    clearToken,
    setToken,
    setReadOnly,
  }
})
