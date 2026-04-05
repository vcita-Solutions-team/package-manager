<template>
  <v-container fluid class="pa-6">
    <v-alert
      v-if="loadError || packageStore.error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="loadError = ''"
    >
      {{ loadError || packageStore.error }}
    </v-alert>

    <div class="d-flex align-center justify-space-between mb-4">
      <p class="text-body-2 text-medium-emphasis">
        Select packages to compare side by side. Differences are highlighted.
      </p>
      <v-btn
        v-if="selectedPackages.length >= 2"
        size="small"
        variant="tonal"
        prepend-icon="mdi-download"
        @click="exportCsv"
      >
        Export CSV
      </v-btn>
    </div>

    <!-- Package selector -->
    <v-card variant="flat" class="border rounded-lg mb-6">
      <v-card-text>
        <v-autocomplete
          v-model="selectedIds"
          :items="packageOptions"
          :search="searchText"
          item-title="label"
          item-value="value"
          :custom-filter="filterPackageOption"
          label="Search by display name or name"
          variant="outlined"
          density="compact"
          hide-details
          multiple
          chips
          closable-chips
          prepend-inner-icon="mdi-package-variant"
          @update:search="searchText = $event"
          @update:model-value="onSelectionChange"
        />
      </v-card-text>
    </v-card>

    <template v-if="selectedPackages.length >= 2">
      <!-- Settings -->
      <v-card variant="flat" class="border rounded-lg mb-4">
        <v-card-title
          class="text-subtitle-1 font-weight-bold d-flex align-center section-title"
          @click="collapsed.settings = !collapsed.settings"
        >
          <v-icon class="mr-2" size="small">mdi-cog-outline</v-icon>
          Settings
          <v-spacer />
          <v-icon size="small">{{ collapsed.settings ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </v-card-title>
        <div v-show="!collapsed.settings" class="comparison-table-wrapper">
          <v-table density="compact" class="comparison-table" :style="tableWidthStyle">
            <colgroup>
              <col class="label-col" />
              <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
            </colgroup>
            <thead>
              <tr>
                <th class="sticky-col"></th>
                <th v-for="pkg in selectedPackages" :key="pkg.id" class="text-center pkg-col">
                  <strong>{{ pkg.display_name }}</strong> <span class="text-medium-emphasis font-weight-regular">({{ pkg.name }})</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in settingsRows" :key="row.key" :class="{ 'bg-amber-lighten-5': row.different }">
                <td class="sticky-col font-weight-medium">{{ row.label }}</td>
                <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center">
                  <v-icon
                    size="small"
                    :color="row.values[pkg.id] ? 'success' : 'grey-lighten-1'"
                    :icon="row.values[pkg.id] ? 'mdi-check-circle' : 'mdi-close-circle'"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Bundles -->
      <v-card variant="flat" class="border rounded-lg mb-4">
        <v-card-title
          class="text-subtitle-1 font-weight-bold d-flex align-center section-title"
          @click="collapsed.bundles = !collapsed.bundles"
        >
          <v-icon class="mr-2" size="small">mdi-package-variant-closed</v-icon>
          Bundles
          <v-spacer />
          <v-icon size="small">{{ collapsed.bundles ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </v-card-title>
        <div v-show="!collapsed.bundles" class="comparison-table-wrapper">
          <v-table density="compact" class="comparison-table" :style="tableWidthStyle">
            <colgroup>
              <col class="label-col" />
              <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
            </colgroup>
            <thead>
              <tr>
                <th class="sticky-col"></th>
                <th v-for="pkg in selectedPackages" :key="pkg.id" class="text-center pkg-col">
                  <strong>{{ pkg.display_name }}</strong> <span class="text-medium-emphasis font-weight-regular">({{ pkg.name }})</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in bundleRows" :key="row.key" :class="{ 'bg-amber-lighten-5': row.different }">
                <td class="sticky-col font-weight-medium">{{ row.label }}</td>
                <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center">
                  {{ row.values[pkg.id] }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Quotas -->
      <v-card variant="flat" class="border rounded-lg mb-4">
        <v-card-title
          class="text-subtitle-1 font-weight-bold d-flex align-center section-title"
          @click="collapsed.quotas = !collapsed.quotas"
        >
          <v-icon class="mr-2" size="small">mdi-counter</v-icon>
          Quotas
          <v-spacer />
          <v-icon size="small">{{ collapsed.quotas ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </v-card-title>
        <div v-show="!collapsed.quotas" class="comparison-table-wrapper">
          <v-table density="compact" class="comparison-table" :style="tableWidthStyle">
            <colgroup>
              <col class="label-col" />
              <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
            </colgroup>
            <thead>
              <tr>
                <th class="sticky-col"></th>
                <th v-for="pkg in selectedPackages" :key="pkg.id" class="text-center pkg-col">
                  <strong>{{ pkg.display_name }}</strong> <span class="text-medium-emphasis font-weight-regular">({{ pkg.name }})</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in quotaRows" :key="q.key" :class="{ 'bg-amber-lighten-5': q.different }">
                <td class="sticky-col font-weight-medium">{{ q.label }}</td>
                <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center">
                  {{ q.values[pkg.id] }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Feature Comparison by Domain -->
      <v-card variant="flat" class="border rounded-lg mb-4">
        <v-card-title
          class="text-subtitle-1 font-weight-bold d-flex align-center section-title"
          @click="collapsed.features = !collapsed.features"
        >
          <v-icon class="mr-2" size="small">mdi-format-list-checks</v-icon>
          Feature Comparison by Domain
          <v-spacer />
          <div class="d-flex align-center" style="gap: 8px;">
            <v-switch
              v-model="showFFs"
              label="Show FFs"
              density="compact"
              hide-details
              class="ff-toggle"
              @click.stop
            />
            <v-icon size="small">{{ collapsed.features ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </div>
        </v-card-title>
        <v-card-text v-show="!collapsed.features" class="pa-0">
          <div v-for="domainDiff in comparisonDomains" :key="domainDiff.domain.id" class="mb-2">
            <div class="d-flex align-center pa-4 pb-2">
              <v-avatar :color="domainDiff.domain.color" variant="tonal" size="28" class="mr-2">
                <v-icon size="x-small">{{ domainDiff.domain.icon }}</v-icon>
              </v-avatar>
              <span class="text-subtitle-2 font-weight-bold">{{ domainDiff.domain.name }}</span>
            </div>

            <div class="comparison-table-wrapper">
              <v-table density="compact" class="comparison-table" :style="tableWidthStyle">
                <colgroup>
                  <col class="label-col" />
                  <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
                </colgroup>
                <thead>
                  <tr>
                    <th class="sticky-col">Feature</th>
                    <th v-for="pkg in selectedPackages" :key="pkg.id" class="text-center pkg-col">
                      <strong>{{ pkg.display_name }}</strong> <span class="text-medium-emphasis font-weight-regular">({{ pkg.name }})</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in domainDiff.features"
                    :key="row.featureKey"
                    :class="{ 'bg-amber-lighten-5': row.different }"
                  >
                    <td class="sticky-col">
                      <span class="font-weight-medium">{{ row.name }}</span>
                    </td>
                    <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center">
                      <div class="d-flex flex-column align-center">
                        <div class="d-flex align-center justify-center" style="gap: 4px;">
                          <template v-if="row.perPackage[pkg.id]">
                            <v-chip
                              v-if="row.perPackage[pkg.id].stateLabel"
                              size="x-small"
                              :color="row.perPackage[pkg.id].stateColor || 'info'"
                              variant="flat"
                            >{{ row.perPackage[pkg.id].stateLabel }}</v-chip>
                            <template v-else>
                              <v-icon
                                v-if="row.perPackage[pkg.id].denyIcon"
                                color="warning" size="small"
                              >mdi-eye-off</v-icon>
                              <v-icon v-else color="success" size="small">mdi-check-circle</v-icon>
                            </template>
                          </template>
                          <v-icon v-else color="grey-lighten-2" size="small">mdi-close-circle-outline</v-icon>
                        </div>
                        <div v-if="showFFs && row.perPackage[pkg.id]?.flags?.length" class="ff-names mt-1">
                          <code v-for="ff in row.perPackage[pkg.id].flags" :key="ff" class="ff-code">{{ ff }}</code>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </template>

    <!-- Empty / insufficient state -->
    <v-card
      v-else
      variant="flat"
      class="border rounded-lg pa-12 text-center"
    >
      <v-icon size="80" color="grey-lighten-1">mdi-compare-horizontal</v-icon>
      <h3 class="text-h6 mt-4 mb-2">
        {{ selectedPackages.length === 1 ? 'Select at least one more package' : 'Select packages to compare' }}
      </h3>
      <p class="text-body-2 text-medium-emphasis">
        Choose two or more packages above to see a detailed side-by-side comparison.
      </p>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePackageStore } from '@/stores/packages'
import { useFeatureStore } from '@/stores/features'
import { domainFeatureFFMappingRaw } from '@/data/domainFeatureFFMapping'
import type { Package } from '@/types'

const route = useRoute()
const router = useRouter()
const packageStore = usePackageStore()
const featureStore = useFeatureStore()
const loadError = ref('')

const collapsed = reactive({ settings: false, bundles: false, quotas: false, features: false })
const showFFs = ref(localStorage.getItem('pkg_compare_showFFs') === 'true')
watch(showFFs, (val) => localStorage.setItem('pkg_compare_showFFs', String(val)))

const selectedIds = ref<string[]>([])
const searchText = ref('')

const packageOptions = computed(() =>
  packageStore.packages.map((p) => ({
    label: `${p.display_name} (${p.name})`,
    value: p.id,
    name: p.name,
    displayName: p.display_name,
  })),
)

function filterPackageOption(_value: string, query: string, item?: { raw?: { name?: string; displayName?: string } }) {
  if (!query) return true
  const q = query.toLowerCase()
  const name = (item?.raw?.name ?? '').toLowerCase()
  const displayName = (item?.raw?.displayName ?? '').toLowerCase()
  return displayName.includes(q) || name.includes(q)
}

function onSelectionChange(ids: string[]) {
  selectedIds.value = ids
  if (!searchText.value) return
  const q = searchText.value.toLowerCase()
  const selectedSet = new Set(ids)
  const remainingMatches = packageOptions.value.filter(
    (opt) =>
      !selectedSet.has(opt.value) &&
      (opt.displayName.toLowerCase().includes(q) || opt.name.toLowerCase().includes(q)),
  )
  if (remainingMatches.length === 0) {
    searchText.value = ''
  }
}

const selectedPackages = computed<Package[]>(() =>
  selectedIds.value
    .map((id) => packageStore.getPackageById(id))
    .filter((p): p is Package => !!p),
)

watch(
  () => route.query,
  (q) => {
    if (q.ids) {
      selectedIds.value = (q.ids as string).split(',').filter(Boolean)
    } else if (q.a) {
      const ids = [q.a as string]
      if (q.b) ids.push(q.b as string)
      selectedIds.value = ids
    }
  },
  { immediate: true },
)

watch(selectedIds, (ids) => {
  if (ids.length > 0) {
    router.replace({ query: { ids: ids.join(',') } })
  }
})

// --- Settings comparison (matching view page) ---
interface SettingsRow {
  key: string
  label: string
  values: Record<string, boolean>
  different: boolean
}

const settingsRows = computed<SettingsRow[]>(() => {
  if (selectedPackages.value.length < 2) return []
  const defs: { key: string; label: string; valueFn: (pkg: Package) => boolean }[] = [
    { key: 'disable_add_staff_button', label: 'Additional Staff require upgrade', valueFn: (pkg) => pkg.settings.disable_add_staff_button },
    { key: 'disable_sms_purchase_button', label: 'Additional SMS require upgrade', valueFn: (pkg) => pkg.settings.disable_sms_purchase_button },
    { key: 'free', label: 'Free package', valueFn: (pkg) => pkg.free },
  ]
  return defs.map(({ key, label, valueFn }) => {
    const values: Record<string, boolean> = {}
    for (const pkg of selectedPackages.value) {
      values[pkg.id] = valueFn(pkg)
    }
    const vals = Object.values(values)
    return { key, label, values, different: vals.some((v) => v !== vals[0]) }
  })
})

// --- Bundles comparison (matching view page) ---
interface ComparisonRow {
  key: string
  label: string
  values: Record<string, string>
  different: boolean
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '--'
  if (Number.isNaN(Number(v))) return '--'
  return Number(v).toLocaleString()
}

function formatStorage(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(Number(bytes))) return '--'
  const b = Number(bytes)
  if (b === 0) return '0'
  if (b >= 1073741824) return `${+(b / 1073741824).toFixed(1)} GB`
  if (b >= 1048576) return `${+(b / 1048576).toFixed(0)} MB`
  return `${b} bytes`
}

function pkgFeatureSet(pkg: Package) {
  return new Set(pkg.features.map((f) => normFlag(f)))
}

const bundleRows = computed<ComparisonRow[]>(() => {
  if (selectedPackages.value.length < 2) return []
  const defs: { key: string; label: string; valueFn: (pkg: Package, fs: Set<string>) => string }[] = [
    { key: 'staff_seats', label: 'Staff Seats', valueFn: (pkg, fs) => fs.has('unlimited_seats') ? 'Unlimited' : (pkg.staff_slots?.toLocaleString?.() ?? '--') },
    { key: 'sms_us', label: 'SMS (US, Canada, IL)', valueFn: (pkg) => pkg.quotas.sms_monthly_quota_us_canada == null ? '--' : Number(pkg.quotas.sms_monthly_quota_us_canada).toLocaleString() },
    { key: 'sms_other', label: 'SMS (other)', valueFn: (pkg) => pkg.quotas.sms_monthly_quota_other == null ? '--' : Number(pkg.quotas.sms_monthly_quota_other).toLocaleString() },
  ]
  return defs.map(({ key, label, valueFn }) => {
    const values: Record<string, string> = {}
    for (const pkg of selectedPackages.value) {
      values[pkg.id] = valueFn(pkg, pkgFeatureSet(pkg))
    }
    const vals = Object.values(values)
    return { key, label, values, different: vals.some((v) => v !== vals[0]) }
  })
})

// --- Quota comparison (matching view page) ---
const quotaRows = computed<ComparisonRow[]>(() => {
  if (selectedPackages.value.length < 2) return []
  const defs: { key: string; label: string; valueFn: (pkg: Package, fs: Set<string>) => string }[] = [
    { key: 'clients_credit', label: 'Client Limit', valueFn: (pkg, fs) => fs.has('unlimited_clients') ? 'Unlimited' : fmt(pkg.quotas.clients_credit) },
    { key: 'booking_credit', label: 'Booking Credits', valueFn: (pkg) => fmt(pkg.quotas.booking_credit) },
    { key: 'storage_quota', label: 'Storage', valueFn: (pkg) => formatStorage(pkg.quotas.storage_quota) },
    { key: 'invoice_monthly_quota', label: 'Monthly Invoices', valueFn: (pkg, fs) => fs.has('invoices_monthly_unlimited') ? 'Unlimited' : fmt(pkg.quotas.invoice_monthly_quota) },
    { key: 'estimate_monthly_quota', label: 'Monthly Estimates', valueFn: (pkg, fs) => fs.has('estimates_monthly_unlimited') ? 'Unlimited' : fmt(pkg.quotas.estimate_monthly_quota) },
    { key: 'campaign_recipients', label: 'Campaign Recipients', valueFn: (pkg, fs) => fs.has('campaign_recipients_monthly_unlimited') ? 'Unlimited' : fmt(pkg.quotas.campaign_recipients_monthly_quota) },
    { key: 'campaigns_credit', label: 'Campaign Credits', valueFn: (pkg) => fmt(pkg.quotas.campaigns_credit) },
  ]
  return defs.map(({ key, label, valueFn }) => {
    const values: Record<string, string> = {}
    for (const pkg of selectedPackages.value) {
      values[pkg.id] = valueFn(pkg, pkgFeatureSet(pkg))
    }
    const vals = Object.values(values)
    return { key, label, values, different: vals.some((v) => v !== vals[0]) }
  })
})

// --- Feature comparison by domain (rich grouping, matching detail page) ---

function normFlag(value: string) {
  return (value || '').trim().toLowerCase()
}

const hiddenQuotaControlFlags = new Set([
  'unlimited_clients',
  'invoices_monthly_unlimited',
  'estimates_monthly_unlimited',
  'campaign_recipients_monthly_unlimited',
])

const invertedFlagFeatures: Record<string, { ff: string; domain: string; disabledName: string; disabledPositive?: boolean }> = {
  'SMS Campaigns': { ff: 'hide_sms_channel_from_marketing', domain: 'Communication', disabledName: 'Hide SMS Campaigns' },
  'Pendo': { ff: 'pkg.bus.pendo.deny', domain: 'Business Administration', disabledName: 'No Pendo' },
  'Block Links in Messages': { ff: 'allow_to_send_link', domain: 'Trial \\ Spam prevention', disabledName: 'Links in Messages Allowed', disabledPositive: true },
}

const cbDropdownFeatures: Record<string, { baseFlag?: string; domain?: string; defaultState?: { label: string; color: string }; options: { label: string; flags: string[]; color: string; hideTag?: boolean; denyIcon?: boolean; denyName?: string }[] }> = {
  'Email Templates Customization': {
    baseFlag: 'pkg.business_administration.email_templates',
    options: [
      { label: 'Upsell mode', flags: [], color: '#fab4cd' },
      { label: 'Client emails only', flags: ['cliche_client_features'], color: '#ffd250' },
      { label: 'Client & Business emails', flags: ['cliche_all_features'], color: '#a7eebe' },
    ],
  },
  'Documents \\ Storage': {
    options: [
      { label: 'Upsell mode', flags: ['pkg.documents.promote'], color: '#fab4cd' },
      { label: 'Available', flags: ['documents_enabled'], color: '#a7eebe', hideTag: true },
    ],
  },
  'Reviews': {
    options: [
      { label: 'Upsell mode', flags: ['collect_reviews'], color: '#fab4cd' },
      { label: 'Available', flags: ['enable_reviews_auto_publishing'], color: '#a7eebe', hideTag: true },
    ],
  },
  'Payment Module': {
    options: [
      { label: 'Upsell mode', flags: ['pkg.payments.promote'], color: '#fab4cd' },
      { label: 'Available', flags: ['payments_module'], color: '#a7eebe', hideTag: true },
    ],
  },
  'SMS Module': {
    baseFlag: 'sms_enabled',
    options: [
      { label: 'Available', flags: [], color: '#a7eebe', hideTag: true },
      { label: 'Deduct only marketing from quota', flags: ['purchase_sms_credits'], color: '#ffd250' },
      { label: 'Deduct all SMS from quota', flags: ['sms_deduct_all_chargeables'], color: '#a7eebe' },
    ],
  },
  'Marketing Module': {
    options: [
      { label: 'Upsell mode', flags: ['pkg.marketing.promote'], color: '#fab4cd' },
      { label: 'Available', flags: ['marketing_module'], color: '#a7eebe', hideTag: true },
    ],
  },
  'Onboarding wizard': {
    defaultState: { label: 'Full onboarding', color: '#a7eebe' },
    domain: 'Business Administration',
    options: [
      { label: 'Full onboarding', flags: [], color: '#a7eebe', hideTag: true },
      { label: 'Slim onboarding', flags: ['pkg.business_administration.slim_registration_wizard'], color: '#ffd250' },
      { label: 'No onboarding', flags: ['pkg.business_administration.registration_wizard.deny'], color: '#fab4cd', denyIcon: true, hideTag: true, denyName: 'No Onboarding wizard' },
    ],
  },
  'Getting Started wizard': {
    defaultState: { label: '', color: '#a7eebe' },
    domain: 'Business Administration',
    options: [
      { label: 'Getting Started', flags: [], color: '#a7eebe', hideTag: true },
      { label: 'Thryv - Setup wizard (instead of Getting Started)', flags: ['setup_wizard_menu_item'], color: '#a7eebe', hideTag: true, denyName: 'Thryv - Setup wizard (instead of Getting Started)' },
      { label: 'No Getting Started', flags: ['pkg.business_administration.getting_started.deny'], color: '#fab4cd', denyIcon: true, hideTag: true, denyName: 'No Getting Started wizard' },
    ],
  },
  'Reports': {
    options: [
      { label: 'Upsell mode', flags: ['reports'], color: '#fab4cd' },
      { label: 'Available', flags: ['reports', 'detailed_reports'], color: '#a7eebe', hideTag: true },
    ],
  },
  'Automated Campaigns': {
    options: [
      { label: 'Activate only', flags: ['activate_automatic_campaigns'], color: '#ffd250' },
      { label: 'Activate + Create/Delete', flags: ['activate_automatic_campaigns', 'create_delete_automatic_campaigns'], color: '#a7eebe', hideTag: true },
    ],
  },
  'Event Attendees': {
    domain: 'Scheduling',
    defaultState: { label: '5 Attendees', color: '#ffd250' },
    options: [
      { label: '5 Attendees', flags: [], color: '#ffd250' },
      { label: 'Unlimited Attendees', flags: ['event_attendees_limit_increased'], color: '#a7eebe' },
    ],
  },
  'Services': {
    domain: 'Scheduling',
    defaultState: { label: '5 Services limit', color: '#ffd250' },
    options: [
      { label: '1 Service limit', flags: ['single_service_booking'], color: '#ffd250' },
      { label: '3 Services limit', flags: ['3_services_limitation'], color: '#ffd250' },
      { label: '5 Services limit', flags: [], color: '#ffd250' },
      { label: '150 Services limit', flags: ['unlimited_services', 'remove_service_limit'], color: '#ffd250' },
      { label: 'Unlimited Services', flags: ['unlimited_services'], color: '#a7eebe' },
    ],
  },
}

// Build FF lookup from mapping
const ffLookup = new Map<string, { domainName: string; featureName: string }>()
const domainOrder = new Map<string, number>()
const featureOrderByDomain = new Map<string, Map<string, number>>()
let dIdx = 0
for (const [domainName, byFeature] of Object.entries(domainFeatureFFMappingRaw)) {
  domainOrder.set(normFlag(domainName), dIdx++)
  const fOrder = new Map<string, number>()
  let fIdx = 0
  for (const [featureName, flags] of Object.entries(byFeature)) {
    fOrder.set(normFlag(featureName), fIdx++)
    for (const flag of flags) {
      ffLookup.set(normFlag(flag), { domainName, featureName })
    }
  }
  featureOrderByDomain.set(normFlag(domainName), fOrder)
}

function domainMetaByName(domainName: string) {
  const existing = featureStore.allDomains.find((d) => normFlag(d.name) === normFlag(domainName))
  if (existing) return existing
  return {
    id: domainName.toLowerCase().replace(/[^\w]+/g, '_'),
    name: domainName,
    icon: 'mdi-shape-outline',
    color: '#9E9E9E',
    description: `${domainName} features`,
    features: [],
  }
}

function resolveMultiState(featureName: string, activeFlags: string[]): { label: string; color: string; denyIcon?: boolean; denyName?: string } | null {
  const cd = cbDropdownFeatures[featureName]
  if (!cd) return null
  const lowerActive = new Set(activeFlags.map((f) => f.toLowerCase()))
  const hasBase = cd.baseFlag ? lowerActive.has(cd.baseFlag.toLowerCase()) : false
  const hasAnyOption = cd.options.some((o) => o.flags.length > 0 && o.flags.every((f) => lowerActive.has(f.toLowerCase())))
  if (!hasBase && !hasAnyOption) {
    return cd.defaultState ?? null
  }
  const matched = [...cd.options]
    .filter((o) => o.flags.length > 0 && o.flags.every((f) => lowerActive.has(f.toLowerCase())))
    .sort((a, b) => b.flags.length - a.flags.length)[0]
  if (matched) {
    if (matched.hideTag && !matched.denyIcon && !matched.denyName) return null
    return { label: matched.hideTag ? '' : matched.label, color: matched.color, denyIcon: matched.denyIcon, denyName: matched.denyName }
  }
  const fallback = cd.options.find((o) => o.flags.length === 0)
  return fallback && !fallback.hideTag ? { label: fallback.label, color: fallback.color } : null
}

interface FeatureCellState {
  active: boolean
  stateLabel: string | null
  stateColor: string | null
  denyIcon: boolean
  disabledPositive: boolean
  flags: string[]
}

interface ComparisonFeatureRow {
  featureKey: string
  name: string
  perPackage: Record<string, FeatureCellState | null>
  different: boolean
}

interface ComparisonDomain {
  domain: { id: string; name: string; icon: string; color: string }
  features: ComparisonFeatureRow[]
}

function buildPackageFeatureState(pkg: Package): Map<string, { domainKey: string; domainName: string; featureName: string; flags: string[]; stateLabel: string | null; stateColor: string | null; denyIcon: boolean; disabledPositive: boolean }> {
  const result = new Map<string, { domainKey: string; domainName: string; featureName: string; flags: string[]; stateLabel: string | null; stateColor: string | null; denyIcon: boolean; disabledPositive: boolean }>()
  const activeNorms = new Set(pkg.features.map((f) => normFlag(f)))
  const invertedFFSet = new Set(Object.values(invertedFlagFeatures).map((v) => normFlag(v.ff)))

  const domainGroupMap = new Map<string, { domainName: string; featureMap: Map<string, string[]> }>()

  for (const rawFlag of pkg.features) {
    const flag = rawFlag.trim()
    const norm = normFlag(flag)
    if (!norm || hiddenQuotaControlFlags.has(norm) || norm === 'unlimited_seats') continue
    if (invertedFFSet.has(norm)) continue

    const mapped = ffLookup.get(norm)
    if (!mapped) continue

    const isBundles = normFlag(mapped.domainName) === 'bundles'
    const displayDomainName = isBundles ? 'Apps' : mapped.domainName
    const dKey = isBundles ? 'apps' : normFlag(mapped.domainName)
    if (!domainGroupMap.has(dKey)) {
      domainGroupMap.set(dKey, { domainName: displayDomainName, featureMap: new Map() })
    }
    const dGroup = domainGroupMap.get(dKey)!
    const fKey = normFlag(mapped.featureName)
    if (!dGroup.featureMap.has(fKey)) dGroup.featureMap.set(fKey, [])
    dGroup.featureMap.get(fKey)!.push(flag)
  }

  // Handle inverted flags
  for (const [featureName, inv] of Object.entries(invertedFlagFeatures)) {
    const isDisabled = activeNorms.has(normFlag(inv.ff))
    const displayName = isDisabled ? inv.disabledName : featureName
    const dKey = normFlag(inv.domain)
    if (!domainGroupMap.has(dKey)) {
      domainGroupMap.set(dKey, { domainName: inv.domain, featureMap: new Map() })
    }
    const fKey = normFlag(displayName)
    if (!domainGroupMap.get(dKey)!.featureMap.has(fKey)) {
      domainGroupMap.get(dKey)!.featureMap.set(fKey, isDisabled ? [inv.ff] : [])
    }
  }

  // Handle defaultState features that appear even without flags
  for (const [featureName, cd] of Object.entries(cbDropdownFeatures)) {
    if (!cd.defaultState || !cd.domain) continue
    const fKey = normFlag(featureName)
    const dKey = normFlag(cd.domain)
    const alreadyPresent = domainGroupMap.has(dKey) && domainGroupMap.get(dKey)!.featureMap.has(fKey)
    if (!alreadyPresent) {
      if (!domainGroupMap.has(dKey)) {
        domainGroupMap.set(dKey, { domainName: cd.domain, featureMap: new Map() })
      }
      domainGroupMap.get(dKey)!.featureMap.set(fKey, [])
    }
  }

  // Domain gate flags
  const domainGateFlags: Record<string, string> = { 'communication': 'sms_enabled' }
  for (const [dKey, requiredFlag] of Object.entries(domainGateFlags)) {
    if (!activeNorms.has(normFlag(requiredFlag)) && domainGroupMap.has(dKey)) {
      domainGroupMap.delete(dKey)
    }
  }

  // Build result map keyed by "domainKey::featureKey"
  for (const [dKey, dGroup] of domainGroupMap.entries()) {
    for (const [fKey, flags] of dGroup.featureMap.entries()) {
      const invertedDisabledMatch = Object.values(invertedFlagFeatures).find((v) => normFlag(v.disabledName) === fKey)
      const invertedEnabledMatch = Object.entries(invertedFlagFeatures).find(([n]) => normFlag(n) === fKey)
      const featureName = invertedDisabledMatch
        ? invertedDisabledMatch.disabledName
        : invertedEnabledMatch
          ? invertedEnabledMatch[0]
          : flags.length > 0
            ? (ffLookup.get(normFlag(flags[0]))?.featureName || flags[0])
            : Object.keys(cbDropdownFeatures).find((n) => normFlag(n) === fKey) || fKey

      const state = resolveMultiState(featureName, flags)
      const displayName = state?.denyName || featureName
      const isDeny = (!!invertedDisabledMatch && !invertedDisabledMatch.disabledPositive) || (state?.denyIcon ?? false)
      const disabledPositive = invertedDisabledMatch?.disabledPositive ?? false

      const compositeKey = `${dKey}::${normFlag(displayName)}`
      result.set(compositeKey, {
        domainKey: dKey,
        domainName: dGroup.domainName,
        featureName: displayName,
        flags,
        stateLabel: state?.label ?? null,
        stateColor: state?.color ?? null,
        denyIcon: isDeny,
        disabledPositive,
      })
    }
  }

  return result
}

const comparisonDomains = computed<ComparisonDomain[]>(() => {
  if (selectedPackages.value.length < 2) return []

  // Build per-package feature state maps
  const pkgStates = selectedPackages.value.map((pkg) => ({
    id: pkg.id,
    state: buildPackageFeatureState(pkg),
  }))

  // Collect all composite keys across all packages
  const allKeys = new Set<string>()
  for (const { state } of pkgStates) {
    for (const key of state.keys()) allKeys.add(key)
  }

  // Group by domain
  const domainMap = new Map<string, { domainName: string; features: Map<string, ComparisonFeatureRow> }>()

  for (const compositeKey of allKeys) {
    const [dKey] = compositeKey.split('::')
    let featureName = ''
    for (const { state } of pkgStates) {
      const entry = state.get(compositeKey)
      if (entry) { featureName = entry.featureName; break }
    }
    if (!featureName) continue

    if (!domainMap.has(dKey)) {
      let domainName = dKey
      for (const { state } of pkgStates) {
        const entry = state.get(compositeKey)
        if (entry) { domainName = entry.domainName; break }
      }
      domainMap.set(dKey, { domainName, features: new Map() })
    }

    const perPackage: Record<string, FeatureCellState | null> = {}
    const cellStates: string[] = []

    for (const { id, state } of pkgStates) {
      const entry = state.get(compositeKey)
      if (entry) {
        perPackage[id] = {
          active: true,
          stateLabel: entry.stateLabel,
          stateColor: entry.stateColor,
          denyIcon: entry.denyIcon,
          disabledPositive: entry.disabledPositive,
          flags: entry.flags,
        }
        cellStates.push(`${entry.stateLabel ?? ''}|${entry.denyIcon}|${entry.disabledPositive}`)
      } else {
        perPackage[id] = null
        cellStates.push('__absent__')
      }
    }

    const different = cellStates.some((s) => s !== cellStates[0])

    domainMap.get(dKey)!.features.set(compositeKey, {
      featureKey: compositeKey,
      name: featureName,
      perPackage,
      different,
    })
  }

  // Build ordered output
  return [...domainMap.entries()]
    .map(([dKey, group]) => {
      const orderKey = dKey === 'apps' ? 'bundles' : dKey
      const domain = dKey === 'apps'
        ? { id: 'apps', name: 'Apps', icon: 'mdi-apps', color: '#7C4DFF', description: '', features: [] }
        : domainMetaByName(group.domainName)

      const fOrder = featureOrderByDomain.get(orderKey) ?? featureOrderByDomain.get(dKey)
      const features = [...group.features.values()].sort((a, b) => {
        const orderA = fOrder?.get(normFlag(a.name)) ?? 9999
        const orderB = fOrder?.get(normFlag(b.name)) ?? 9999
        return orderA - orderB
      })

      return {
        domain: { id: domain.id, name: domain.name, icon: domain.icon, color: domain.color },
        features,
        _order: domainOrder.get(orderKey) ?? domainOrder.get(dKey) ?? 9999,
      }
    })
    .filter((d) => d.features.length > 0)
    .sort((a, b) => a._order - b._order)
})

// --- Table sizing ---
const LABEL_COL_WIDTH = 280
const PKG_COL_MIN_WIDTH = 160

const pkgColStyle = computed(() => {
  const w = Math.max(PKG_COL_MIN_WIDTH, Math.floor((900 - LABEL_COL_WIDTH) / Math.max(selectedPackages.value.length, 1)))
  return { width: `${w}px` }
})

const tableWidthStyle = computed(() => {
  const colW = parseInt(pkgColStyle.value.width)
  const total = LABEL_COL_WIDTH + colW * selectedPackages.value.length
  return { width: `${Math.max(total, 100)}px`, minWidth: '100%' }
})

function exportCsv() {
  const pkgs = selectedPackages.value
  if (pkgs.length < 2) return

  const csvEscape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const header = ['Section', 'Property', ...pkgs.map((p) => `${p.display_name} (${p.name})`)]
  const rows: string[][] = []

  // Settings
  for (const row of settingsRows.value) {
    rows.push(['Settings', row.label, ...pkgs.map((p) => row.values[p.id] ? 'Yes' : 'No')])
  }

  // Bundles
  for (const row of bundleRows.value) {
    rows.push(['Bundles', row.label, ...pkgs.map((p) => row.values[p.id])])
  }

  // Quotas
  for (const row of quotaRows.value) {
    rows.push(['Quotas', row.label, ...pkgs.map((p) => row.values[p.id])])
  }

  // Features by domain
  for (const domainDiff of comparisonDomains.value) {
    for (const feat of domainDiff.features) {
      const cells = pkgs.map((p) => {
        const cell = feat.perPackage[p.id]
        if (!cell) return ''
        if (cell.stateLabel) return cell.stateLabel
        if (cell.denyIcon) return 'Disabled'
        return 'Yes'
      })
      rows.push([domainDiff.domain.name, feat.name, ...cells])
    }
  }

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'package-comparison.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  try {
    await packageStore.ensureLoaded()
  } catch (err: any) {
    loadError.value = err?.response?.data?.message || err?.message || 'Failed to load packages'
  }
})
</script>

<style scoped>
.comparison-table-wrapper {
  overflow-x: auto;
}

.comparison-table {
  table-layout: fixed;
}

.comparison-table .label-col {
  width: 280px;
}

.comparison-table .sticky-col {
  position: sticky;
  left: 0;
  background: rgb(var(--v-theme-surface));
  z-index: 1;
  width: 280px;
  min-width: 280px;
  max-width: 280px;
}

.comparison-table .pkg-col {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.bg-amber-lighten-5 .sticky-col {
  background: rgb(255, 248, 225);
}

.section-title {
  cursor: pointer;
}
.section-title:hover {
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.ff-toggle {
  flex: 0 0 auto;
  font-size: 0.75rem;
}
.ff-toggle :deep(.v-label) {
  font-size: 0.75rem;
  opacity: 0.7;
}

.ff-names {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
}

.ff-code {
  font-size: 0.65rem;
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
}
</style>
