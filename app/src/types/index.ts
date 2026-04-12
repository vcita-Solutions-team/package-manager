export interface Feature {
  id: string
  name: string
  business_name: string
  description: string
  domain: string
  packageable: boolean
  value_type: 'boolean' | 'enum' | 'number'
  options?: string[]
  sort_order: number
}

export interface Domain {
  id: string
  name: string
  icon: string
  color: string
  description: string
  features: Feature[]
}

export interface PackageQuotas {
  invoice_monthly_quota: number | null
  campaign_recipients_monthly_quota: number | null
  estimate_monthly_quota: number | null
  clients_credit: number | null
  campaigns_credit: number | null
  booking_credit: number | null
  sms_monthly_quota_us_canada: number | null
  sms_monthly_quota_other: number | null
  storage_quota: number | null
}

export interface PackageSettings {
  disable_staff_slots: boolean
  disable_add_staff_button: boolean
  disable_sms_purchase_button: boolean
}

export interface Package {
  id: string
  name: string
  display_name: string
  staff_slots: number
  free: boolean
  deprecated: boolean
  is_template: boolean
  created_at: string
  updated_at: string
  settings: PackageSettings
  quotas: PackageQuotas
  features: string[]
}

export interface App {
  name: string
  category: string
  price_usd: string
  price_eur: string
  price_gbp: string
  price_chf: string
}

export interface AppCategory {
  id: string
  name: string
  icon: string
  color: string
  apps: App[]
}

export interface AuditEntry {
  id: string
  package_id: string
  operator_name: string
  timestamp: string
  action: 'created' | 'updated' | 'cloned'
  changes: { field: string; from: any; to: any }[]
}
