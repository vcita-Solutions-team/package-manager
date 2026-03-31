import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Package, AuditEntry } from '@/types'
import { listPackagesApi, getPackageApi, createPackageApi, updatePackageApi } from '@/api/packages'
import { getAllFeatures } from '@/data/featureCatalog'
export const usePackageStore = defineStore('packages', () => {
  const allCatalogFeatures = getAllFeatures()
  const knownFeatureFlags = new Set(allCatalogFeatures.map((f) => f.name.toLowerCase()))
  const canonicalFeatureNameByLower = new Map(
    allCatalogFeatures.map((f) => [f.name.toLowerCase(), f.name]),
  )

  const packages = ref<Package[]>([])
  const auditEntries = ref<AuditEntry[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const filterFeature = ref<string | null>(null)

  function parseCustomDateString(str: string): string {
    // Handles: "Wed, May 29, 2013 at 12:21pm" or "Mon, March 23 at 11:28am"
    const m = str.match(/(\w+)\s+(\d{1,2})(?:,\s*(\d{4}))?\s+at\s+(\d{1,2}):(\d{2})(am|pm)/i)
    if (!m) return ''
    const month = m[1]
    const day = parseInt(m[2], 10)
    const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear()
    let hours = parseInt(m[4], 10)
    const minutes = parseInt(m[5], 10)
    const ampm = m[6].toLowerCase()
    if (ampm === 'pm' && hours < 12) hours += 12
    if (ampm === 'am' && hours === 12) hours = 0
    const d = new Date(`${month} ${day}, ${year} ${hours}:${String(minutes).padStart(2, '0')}:00`)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
  }

  function parseDateValue(value: any): string {
    if (!value) return ''
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString()
    if (typeof value === 'number') {
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? '' : d.toISOString()
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return ''
      const custom = parseCustomDateString(trimmed)
      if (custom) return custom
      const d = new Date(trimmed)
      return Number.isNaN(d.getTime()) ? '' : d.toISOString()
    }
    if (typeof value === 'object') {
      return (
        parseDateValue(value?.date) ||
        parseDateValue(value?.value) ||
        parseDateValue(value?.iso8601) ||
        ''
      )
    }
    return ''
  }

  function pickDate(...values: any[]): string {
    for (const v of values) {
      const parsed = parseDateValue(v)
      if (parsed) return parsed
    }
    return ''
  }

  function toBoolean(value: any, fallback = false): boolean {
    if (value === undefined || value === null) return fallback
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'yes', 'y', 'on', 't'].includes(normalized)) return true
      if (['false', '0', 'no', 'n', 'off', '', 'f'].includes(normalized)) return false
    }
    return Boolean(value)
  }

  function toText(value: any): string {
    if (value == null) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object') {
      return (
        toText(value?.en) ||
        toText(value?.name) ||
        toText(value?.title) ||
        toText(value?.label) ||
        toText(value?.display_name) ||
        toText(value?.value) ||
        ''
      )
    }
    return ''
  }

  function isIdLikeName(value: string, id: string): boolean {
    const v = (value || '').trim()
    const i = (id || '').trim()
    if (!v) return false
    if (i && v === i) return true
    return /^[0-9]+$/.test(v)
  }

  function pickBestName(candidates: any[], id: string): string {
    const texts = candidates.map((c) => toText(c)).filter(Boolean)
    for (const t of texts) {
      if (!isIdLikeName(t, id)) return t
    }
    return texts[0] || ''
  }

  function toNumberOrNull(value: any): number | null {
    if (value === undefined || value === null || value === '') return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string') {
      const n = Number(value.trim())
      return Number.isFinite(n) ? n : null
    }
    if (typeof value === 'object') {
      return (
        toNumberOrNull(value?.value) ??
        toNumberOrNull(value?.amount) ??
        toNumberOrNull(value?.count) ??
        null
      )
    }
    return null
  }

  function findDeepValueByKeys(
    source: any,
    keys: string[],
    seen = new Set<any>(),
  ): any {
    if (!source || typeof source !== 'object') return undefined
    if (seen.has(source)) return undefined
    seen.add(source)

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
        return source[key]
      }
    }

    for (const value of Object.values(source)) {
      const nested = findDeepValueByKeys(value, keys, seen)
      if (nested !== undefined) return nested
    }
    return undefined
  }

  function toStringTokens(value: any): string[] {
    if (value == null) return []
    if (Array.isArray(value)) return value.flatMap((v) => toStringTokens(v))
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return []

      // Some APIs return serialized JSON arrays/objects as strings.
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          const parsed = JSON.parse(trimmed)
          const parsedTokens = toStringTokens(parsed)
          if (parsedTokens.length > 0) return parsedTokens
        } catch {
          // fall through to plain token parsing
        }
      }

      const splitTokens = trimmed
        .split(/[\n,;|]/g)
        .map((s) => s.trim().replace(/^["'\[\]\{\}]+|["'\[\]\{\}]+$/g, ''))
        .filter(Boolean)

      const regexTokens = trimmed
        .match(/[A-Za-z0-9_.-]+/g)
        ?.map((s) => s.trim())
        .filter(Boolean) ?? []

      return [...new Set([...splitTokens, ...regexTokens])]
    }
    if (typeof value === 'object') {
      // Common backend shapes for feature entries.
      const common = [
        value.name,
        value.feature_name,
        value.feature,
        value.ff,
        value.flag,
        value.code,
        value.key,
        value.id,
      ].flatMap((v) => toStringTokens(v))
      // Keep traversing nested values too; some payloads include both a
      // human-readable name and nested FF identifiers.
      const nested = Object.values(value).flatMap((v) => toStringTokens(v))
      const combined = [...common, ...nested]
      if (combined.length > 0) return [...new Set(combined)]

      // Handle map-like shapes such as { sms: true, reports: false }.
      const mapLikeTokens: string[] = []
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'boolean') {
          if (v) mapLikeTokens.push(k)
        } else if (typeof v === 'number') {
          if (v !== 0) mapLikeTokens.push(k)
        }
      }
      return mapLikeTokens
    }
    return []
  }

  function collectTokensDeep(value: any, out: string[]) {
    if (value == null) return
    if (typeof value === 'string') {
      for (const token of value.match(/[A-Za-z0-9_.-]+/g) || []) out.push(token)
      return
    }
    if (typeof value === 'number' || typeof value === 'boolean') return
    if (Array.isArray(value)) {
      for (const item of value) collectTokensDeep(item, out)
      return
    }
    if (typeof value === 'object') {
      for (const v of Object.values(value)) collectTokensDeep(v, out)
    }
  }

  function extractNamesFromObjectArray(arr: any): string[] | null {
    if (!Array.isArray(arr) || arr.length === 0) return null
    if (typeof arr[0] === 'string') return null
    if (typeof arr[0] !== 'object') return null
    const names = arr
      .map((f: any) => String(f?.name ?? f?.feature_name ?? f?.ff ?? f?.flag ?? '').trim())
      .filter(Boolean)
    return names.length > 0 ? names : null
  }

  function extractFeatureFlags(raw: any): string[] {
    const featuresField = raw?.features ?? raw?.package?.features ?? raw?.data?.features
    const objectNames = extractNamesFromObjectArray(featuresField)
    if (objectNames) return objectNames

    const candidates = [
      raw?.features,
      raw?.feature_flags,
      raw?.featureFlags,
      raw?.feature_flags_json,
      raw?.featureFlagsJson,
      raw?.package_features,
      raw?.packageFeatures,
      raw?.package_ffs,
      raw?.packageFfs,
      raw?.flags,
      raw?.features_json,
      raw?.featuresJson,
      raw?.configuration,
      raw?.config,
      raw?.package?.features,
      raw?.package?.feature_flags,
      raw?.package?.feature_flags_json,
      raw?.package?.features_json,
      raw?.data?.features,
      raw?.data?.feature_flags,
      raw?.data?.feature_flags_json,
      raw?.data?.features_json,
    ]
    const directFlags = candidates.flatMap((c) => toStringTokens(c))

    const deepTokens: string[] = []
    collectTokensDeep(raw, deepTokens)
    const knownDeepFlags = deepTokens.filter((t) => knownFeatureFlags.has(t.toLowerCase()))

    const flags = [...directFlags, ...knownDeepFlags]
    return [...new Set(flags.map((f) => f.trim()).filter(Boolean))]
  }

  function canonicalizeFeatureFlags(flags: string[]): string[] {
    return [
      ...new Set(
        flags
          .map((f) => f.trim())
          .filter(Boolean)
          .map((f) => canonicalFeatureNameByLower.get(f.toLowerCase()) || f),
      ),
    ]
  }

  function normalizePackage(raw: any): Package {
    const source = raw?.package ?? raw?.data?.package ?? raw?.data ?? raw ?? {}
    const quotas = source?.quotas ?? source ?? {}
    const settings = source?.settings ?? source ?? {}
    // IMPORTANT: Prefer package-root flags only. Some API payloads include
    // global metadata that can contain unrelated feature names.
    const sourceFeatures = extractFeatureFlags(source)
    const rawFeatures = source === raw ? [] : extractFeatureFlags(raw)
    // Merge both payload levels to avoid dropping categories when one shape is partial.
    const features = canonicalizeFeatureFlags([...sourceFeatures, ...rawFeatures])
    const disableAddStaffRaw =
      settings?.disable_add_staff_button ??
      settings?.disable_add_staff_checkbox ??
      source?.disable_add_staff_button ??
      source?.disable_add_staff_checkbox ??
      raw?.disable_add_staff_button ??
      raw?.disable_add_staff_checkbox ??
      findDeepValueByKeys(source, [
        'disable_add_staff_button',
        'disable_add_staff_checkbox',
        'disableAddStaffButton',
        'disableAddStaffCheckbox',
      ]) ??
      findDeepValueByKeys(raw, [
        'disable_add_staff_button',
        'disable_add_staff_checkbox',
        'disableAddStaffButton',
        'disableAddStaffCheckbox',
      ])
    const disableSmsRaw =
      settings?.disable_sms_purchase_button ??
      settings?.disable_add_sms_checkbox ??
      settings?.disable_sms_purchase_checkbox ??
      source?.disable_sms_purchase_button ??
      source?.disable_add_sms_checkbox ??
      source?.disable_sms_purchase_checkbox ??
      raw?.disable_sms_purchase_button ??
      raw?.disable_add_sms_checkbox ??
      raw?.disable_sms_purchase_checkbox ??
      findDeepValueByKeys(source, [
        'disable_sms_purchase_button',
        'disable_add_sms_checkbox',
        'disable_sms_purchase_checkbox',
        'disableSmsPurchaseButton',
        'disableAddSmsCheckbox',
        'disableSmsPurchaseCheckbox',
      ]) ??
      findDeepValueByKeys(raw, [
        'disable_sms_purchase_button',
        'disable_add_sms_checkbox',
        'disable_sms_purchase_checkbox',
        'disableSmsPurchaseButton',
        'disableAddSmsCheckbox',
        'disableSmsPurchaseCheckbox',
      ])

    const staffSlotsRaw =
      source?.staff_slots ??
      source?.staffSlots ??
      source?.staff?.slots ??
      findDeepValueByKeys(source, ['staff_slots', 'staffSlots']) ??
      raw?.staff_slots ??
      raw?.staffSlots ??
      findDeepValueByKeys(raw, ['staff_slots', 'staffSlots'])
    const staffSlots = toNumberOrNull(staffSlotsRaw) ?? 1

    const smsMonthlyQuotaObj =
      quotas?.sms_monthly_quota ??
      source?.sms_monthly_quota ??
      findDeepValueByKeys(source, ['sms_monthly_quota', 'smsMonthlyQuota']) ??
      raw?.sms_monthly_quota ??
      findDeepValueByKeys(raw, ['sms_monthly_quota', 'smsMonthlyQuota'])

    const smsUsCanada =
      toNumberOrNull(quotas?.sms_monthly_quota_us_canada) ??
      toNumberOrNull(quotas?.sms_monthly_quota?.us_canada) ??
      toNumberOrNull(smsMonthlyQuotaObj?.us_canada) ??
      toNumberOrNull(smsMonthlyQuotaObj?.usCanada) ??
      toNumberOrNull(findDeepValueByKeys(smsMonthlyQuotaObj, ['us_canada', 'usCanada'])) ??
      toNumberOrNull(source?.sms_monthly_quota_us_canada) ??
      toNumberOrNull(source?.sms_monthly_quota?.us_canada) ??
      toNumberOrNull(raw?.sms_monthly_quota_us_canada) ??
      toNumberOrNull(raw?.sms_monthly_quota?.us_canada)

    const smsOther =
      toNumberOrNull(quotas?.sms_monthly_quota_other) ??
      toNumberOrNull(quotas?.sms_monthly_quota?.other) ??
      toNumberOrNull(smsMonthlyQuotaObj?.other) ??
      toNumberOrNull(findDeepValueByKeys(smsMonthlyQuotaObj, ['other'])) ??
      toNumberOrNull(source?.sms_monthly_quota_other) ??
      toNumberOrNull(source?.sms_monthly_quota?.other) ??
      toNumberOrNull(raw?.sms_monthly_quota_other) ??
      toNumberOrNull(raw?.sms_monthly_quota?.other)

    const normalizedId = String(
      source?.id ??
      source?.package_id ??
      source?.packageId ??
      raw?.id ??
      raw?.package_id ??
      raw?.packageId ??
      '',
    )

    const resolvedName = pickBestName(
      [
        source?.name,
        source?.package_name,
        source?.packageName,
        raw?.data?.name,
        raw?.data?.package_name,
        raw?.data?.packageName,
        raw?.name,
        raw?.package_name,
        raw?.packageName,
        source?.title,
        source?.package_title,
        raw?.data?.title,
        raw?.title,
      ],
      normalizedId,
    )

    const resolvedDisplayName = pickBestName(
      [
        source?.display_name,
        source?.displayName,
        raw?.data?.display_name,
        raw?.data?.displayName,
        raw?.display_name,
        raw?.displayName,
        source?.package_title,
        raw?.data?.package_title,
        raw?.package_title,
        source?.title,
        raw?.data?.title,
        raw?.title,
        resolvedName,
      ],
      normalizedId,
    )

    return {
      id: normalizedId,
      name: resolvedName,
      display_name: resolvedDisplayName,
      staff_slots: staffSlots,
      free: toBoolean(source?.free ?? source?.is_free ?? raw?.free ?? raw?.is_free, false),
      created_at: pickDate(source?.created_at, source?.createdAt, raw?.created_at, raw?.createdAt),
      updated_at: pickDate(source?.updated_at, source?.updatedAt, raw?.updated_at, raw?.updatedAt),
      settings: {
        disable_staff_slots: toBoolean(
          settings?.disable_staff_slots ??
            source?.disable_staff_slots ??
            raw?.disable_staff_slots ??
            raw?.disableStaffSlots,
          false,
        ),
        disable_add_staff_button: toBoolean(disableAddStaffRaw, false),
        disable_sms_purchase_button: toBoolean(disableSmsRaw, false),
      },
      quotas: {
        invoice_monthly_quota: quotas?.invoice_monthly_quota ?? null,
        campaign_recipients_monthly_quota: quotas?.campaign_recipients_monthly_quota ?? null,
        estimate_monthly_quota: quotas?.estimate_monthly_quota ?? null,
        clients_credit: quotas?.clients_credit ?? null,
        campaigns_credit: quotas?.campaigns_credit ?? null,
        booking_credit: quotas?.booking_credit ?? null,
        sms_monthly_quota_us_canada: smsUsCanada,
        sms_monthly_quota_other: smsOther,
        storage_quota: toNumberOrNull(quotas?.storage_quota) ?? toNumberOrNull(quotas?.storage_quota_gb != null ? quotas.storage_quota_gb * 1073741824 : null) ?? toNumberOrNull(source?.storage_quota) ?? toNumberOrNull(raw?.storage_quota) ?? null,
      },
      features: [...new Set(features)],
    }
  }

  async function loadPackages(force = false) {
    if (loading.value) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null
    try {
      const result = await listPackagesApi()
      const normalized = result.map(normalizePackage).filter((p) => p.id)

      // Make list data available immediately so navigation to detail pages works.
      packages.value = normalized
      initialized.value = true

      // Enrich with full details in the background (settings/quotas/flags may be incomplete in list endpoint).
      const detailIds = normalized.map((p) => p.id).filter(Boolean)
      const BATCH_SIZE = 4
      for (let i = 0; i < detailIds.length; i += BATCH_SIZE) {
        const batch = detailIds.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map(async (id) => {
            try {
              const details = normalizePackage(await getPackageApi(id))
              const idx = packages.value.findIndex((p) => p.id === id)
              if (idx !== -1) {
                packages.value[idx] = {
                  ...packages.value[idx],
                  updated_at: details.updated_at || packages.value[idx].updated_at,
                  created_at: details.created_at || packages.value[idx].created_at,
                  features: details.features.length > 0 ? details.features : packages.value[idx].features,
                  settings: details.settings,
                  quotas: details.quotas,
                  staff_slots: details.staff_slots ?? packages.value[idx].staff_slots,
                }
              }
            } catch {
              // Keep list payload values if detail fetch fails for this package.
            }
          }),
        )
      }
    } catch (err: any) {
      error.value = err?.response?.data?.message || err?.message || 'Failed to load packages'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (initialized.value) return
    await loadPackages()
  }

  async function loadPackageById(id: string, force = false) {
    if (!id) return null
    const existing = packages.value.find((p) => p.id === id)
    if (existing && !force) return existing

    loading.value = true
    error.value = null
    try {
      const detailed = normalizePackage(await getPackageApi(id))
      const normalizedId = detailed.id || id
      const existingPkg = packages.value.find((p) => p.id === normalizedId)
      const mergedName =
        detailed.name && !isIdLikeName(detailed.name, normalizedId)
          ? detailed.name
          : (existingPkg?.name || '')
      const mergedDisplayName =
        detailed.display_name && !isIdLikeName(detailed.display_name, normalizedId)
          ? detailed.display_name
          : (existingPkg?.display_name || mergedName)
      const normalizedDetailed: Package = {
        ...(existingPkg ?? ({} as Package)),
        ...detailed,
        id: normalizedId,
        name: mergedName,
        display_name: mergedDisplayName,
        features: detailed.features.length > 0 ? detailed.features : (existingPkg?.features || []),
        settings: detailed.settings || existingPkg?.settings || {
          disable_staff_slots: false,
          disable_add_staff_button: false,
          disable_sms_purchase_button: false,
        },
        quotas: detailed.quotas || existingPkg?.quotas || {
          invoice_monthly_quota: null,
          campaign_recipients_monthly_quota: null,
          estimate_monthly_quota: null,
          clients_credit: null,
          campaigns_credit: null,
          booking_credit: null,
          sms_monthly_quota_us_canada: null,
          sms_monthly_quota_other: null,
          storage_quota: null,
        },
      }
      const idx = packages.value.findIndex((p) => p.id === normalizedId)
      if (idx === -1) {
        packages.value.push(normalizedDetailed)
      } else {
        packages.value[idx] = normalizedDetailed
      }
      return normalizedDetailed
    } catch (err: any) {
      error.value = err?.response?.data?.message || err?.message || 'Failed to load package'
      throw err
    } finally {
      loading.value = false
    }
  }

  const filteredPackages = computed(() => {
    let result = packages.value

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q),
      )
    }

    if (filterFeature.value) {
      const selected = filterFeature.value.toLowerCase().trim()
      result = result.filter((p) => p.features.some((f) => f.toLowerCase().trim() === selected))
    }

    return result
  })


  function getPackageById(id: string) {
    return packages.value.find((p) => p.id === id)
  }

  function getAuditForPackage(packageId: string) {
    return auditEntries.value
      .filter((e) => e.package_id === packageId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  async function createPackage(pkg: Omit<Package, 'id' | 'created_at' | 'updated_at'>) {
    loading.value = true
    error.value = null
    const newPkg: Package = {
      ...pkg,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      id: '',
    }
    try {
      const created = normalizePackage(await createPackageApi(newPkg))
      packages.value.push(created)

      auditEntries.value.unshift({
        id: `audit_${Date.now()}`,
        package_id: created.id,
        operator_name: 'Current Operator',
        timestamp: new Date().toISOString(),
        action: 'created',
        changes: [
          {
            field: 'package',
            from: null,
            to: 'Package created',
          },
        ],
      })

      return created
    } catch (err: any) {
      error.value = err?.response?.data?.message || err?.message || 'Failed to create package'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updatePackage(id: string, updates: Partial<Package>) {
    const idx = packages.value.findIndex((p) => p.id === id)
    if (idx === -1) return null

    const original = { ...packages.value[idx] }
    loading.value = true
    error.value = null
    try {
      const updated = normalizePackage(await updatePackageApi(id, updates, original.features))
      packages.value[idx] = updated

      const changes: AuditEntry['changes'] = []
      if (updates.features) {
        const added = updates.features.filter((f) => !original.features.includes(f))
        const removed = original.features.filter((f) => !updates.features!.includes(f))
        added.forEach((f) => changes.push({ field: 'features', from: null, to: f }))
        removed.forEach((f) => changes.push({ field: 'features', from: f, to: null }))
      }
      if (updates.staff_slots !== undefined && updates.staff_slots !== original.staff_slots) {
        changes.push({ field: 'staff_slots', from: original.staff_slots, to: updates.staff_slots })
      }

      if (changes.length > 0) {
        auditEntries.value.unshift({
          id: `audit_${Date.now()}`,
          package_id: id,
          operator_name: 'Current Operator',
          timestamp: new Date().toISOString(),
          action: 'updated',
          changes,
        })
      }

      return packages.value[idx]
    } catch (err: any) {
      error.value = err?.response?.data?.message || err?.message || 'Failed to update package'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function clonePackage(id: string, newName: string, newDisplayName: string) {
    const source = getPackageById(id)
    if (!source) return null
    const cloned = await createPackage({
      name: newName,
      display_name: newDisplayName,
      staff_slots: source.staff_slots,
      free: source.free,
      settings: { ...source.settings },
      quotas: { ...source.quotas },
      features: [...source.features],
    })
    if (!cloned) return null
    auditEntries.value.unshift({
      id: `audit_${Date.now()}_clone`,
      package_id: cloned.id,
      operator_name: 'Current Operator',
      timestamp: new Date().toISOString(),
      action: 'cloned',
      changes: [{ field: 'package', from: source.id, to: cloned.id }],
    })
    return cloned
  }

  return {
    packages,
    auditEntries,
    loading,
    initialized,
    error,
    searchQuery,
    filterFeature,
    filteredPackages,
    loadPackages,
    loadPackageById,
    ensureLoaded,
    getPackageById,
    getAuditForPackage,
    createPackage,
    updatePackage,
    clonePackage,
  }
})
