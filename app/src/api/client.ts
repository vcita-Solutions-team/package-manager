import axios from 'axios'

const TOKEN_KEY = 'operator_jwt_token'
const ENV_KEY = 'pm_environment'

export type AppEnvironment = 'integration' | 'production'

export const ENVIRONMENTS: Record<AppEnvironment, { label: string; apiUrl: string; proxyPrefix: string }> = {
  integration: { label: 'Integration', apiUrl: 'https://api2.meet2know.com', proxyPrefix: '/proxy-int' },
  production: { label: 'Production', apiUrl: 'https://api2.myclients.io', proxyPrefix: '/proxy-prod' },
}

export function getEnvironment(): AppEnvironment {
  const stored = localStorage.getItem(ENV_KEY) as AppEnvironment | null
  return stored && stored in ENVIRONMENTS ? stored : 'integration'
}

export function updateFavicon(env: AppEnvironment) {
  const link = document.getElementById('app-favicon') as HTMLLinkElement | null
  if (link) link.href = `/favicon-${env}.png`
}

export function setEnvironment(env: AppEnvironment) {
  localStorage.setItem(ENV_KEY, env)
  updateFavicon(env)
}

function currentProxyPrefix(): string {
  return ENVIRONMENTS[getEnvironment()].proxyPrefix
}

const apiClient = axios.create()

apiClient.interceptors.request.use((config) => {
  const prefix = currentProxyPrefix()
  if (config.url && !config.url.startsWith(prefix)) {
    config.url = prefix + config.url
  }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

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
