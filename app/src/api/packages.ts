import apiClient from './client'
import type { Package } from '@/types'

function unwrapData(body: any): any {
  if (!body) return body
  if (Array.isArray(body?.data)) return body.data
  if (body?.data !== undefined) return body.data
  return body
}

export async function listPackagesApi(): Promise<any[]> {
  const response = await apiClient.get('/operator_api/v1/packages')
  const data = unwrapData(response.data)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.packages)) return data.packages
  if (Array.isArray(data?.items)) return data.items
  return []
}

export async function getPackageApi(id: string): Promise<any> {
  // Matches operator-portal: response.data.data[0]
  const response = await apiClient.get(`/operator_api/v1/packages/${id}`)
  const data = unwrapData(response.data)
  return Array.isArray(data) ? data[0] ?? {} : data
}

function toApiPayload(payload: any, originalFeatures?: string[]): any {
  const { features, quotas, ...rest } = payload
  const apiPayload: any = { ...rest }

  if (Array.isArray(features)) {
    const original = originalFeatures ?? []
    const origLower = new Set(original.map((f: string) => f.toLowerCase()))
    const newLower = new Set(features.map((f: string) => f.toLowerCase()))
    const added = features.filter((f: string) => !origLower.has(f.toLowerCase()))
    const removed = original.filter((f: string) => !newLower.has(f.toLowerCase()))
    const featuresObj: any = {}
    if (added.length > 0) featuresObj.features_to_add = added
    if (removed.length > 0) featuresObj.features_to_remove = removed
    if (Object.keys(featuresObj).length > 0) apiPayload.features = featuresObj
  }

  if (quotas) {
    const { sms_monthly_quota_us_canada, sms_monthly_quota_other, ...otherQuotas } = quotas
    const apiQuotas: any = { ...otherQuotas }
    if (sms_monthly_quota_us_canada != null || sms_monthly_quota_other != null) {
      apiQuotas.sms_monthly_quota = {
        us_canada: sms_monthly_quota_us_canada ?? 0,
        other: sms_monthly_quota_other ?? 0,
      }
    }
    apiPayload.quotas = apiQuotas
  }

  return apiPayload
}

export async function createPackageApi(payload: Partial<Package>): Promise<any> {
  const response = await apiClient.post('/operator_api/v1/packages', toApiPayload(payload))
  const data = unwrapData(response.data)
  return Array.isArray(data) ? data[0] ?? {} : data
}

export async function updatePackageApi(id: string, payload: Partial<Package>, originalFeatures?: string[]): Promise<any> {
  const response = await apiClient.put(`/operator_api/v1/packages/${id}`, toApiPayload(payload, originalFeatures))
  const data = unwrapData(response.data)
  return Array.isArray(data) ? data[0] ?? {} : data
}
