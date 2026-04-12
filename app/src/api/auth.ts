import apiClient from './client'

export interface LoginResponse {
  status: string
  login_handler?: string
  data: any
  message?: string
}

export interface MfaChallengeResponse {
  success: string
  token?: string
  error?: string
  sent_via?: string
  sent_to?: string
  support_link?: string
}

export async function loginApi(email: string, password: string, captchaToken?: string | null): Promise<LoginResponse> {
  const response = await apiClient.post('/operator_api/v1/authentications/login', {
    email,
    password,
    captcha_token: captchaToken ?? undefined,
  })
  return response.data
}

export async function validateTokenApi(): Promise<boolean> {
  const response = await apiClient.get('/operator_api/v1/authentications/is_valid_token')
  return response.data?.data?.is_valid === true
}

export async function fetchOperatorApi(): Promise<any> {
  const response = await apiClient.get('/operator_api/v1/operators/self')
  if (response.data?.status === 'OK') {
    return response.data.data
  }
  throw new Error(response.data?.message || 'Failed to fetch operator')
}

export async function mfaChallengeApi(loginCode: string): Promise<MfaChallengeResponse> {
  const response = await apiClient.post('/operator_api/v1/authentications/mfa_challenge', {
    login_code: loginCode,
  })
  return response.data.data
}
