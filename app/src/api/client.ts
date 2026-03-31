import axios from 'axios'

const TOKEN_KEY = 'operator_jwt_token'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_OPERATOR_API_URL || 'http://localhost:7100',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    // Raw JWT without "Bearer " prefix, matching operator-portal convention
    config.headers.Authorization = token
  }
  return config
})

// Skip the 401 auto-redirect for auth endpoints (login, token validation)
const AUTH_PATHS = ['/authentications/']

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthRequest = AUTH_PATHS.some((p) => url.includes(p))

    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
