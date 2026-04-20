<template>
  <div class="page-shell">
    <div class="page-fixed pa-6 pb-0">
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

      <!-- Loading state: wait for full enrichment before showing data -->
      <div v-if="!ready" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
        <p class="text-body-2 text-medium-emphasis">Loading presell packages…</p>
      </div>

      <template v-else-if="selectedPackages.length >= 2">
        <!-- Toolbar -->
        <div class="d-flex align-center justify-end mb-4">
          <v-btn
            size="small"
            variant="tonal"
            prepend-icon="mdi-download"
            @click="exportCsv"
          >
            Export CSV
          </v-btn>
        </div>

        <!-- Search -->
        <v-text-field
          v-model="featureSearchText"
          label="Search features, settings, quotas..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
        />
      </template>
    </div>

    <div v-if="ready && selectedPackages.length >= 2" class="page-scroll">
      <div class="scroll-content pb-6" :style="{ minWidth: tableWidthStyle.width }">
        <!-- Sticky package names header -->
        <div class="pkg-header-sticky px-6 pt-4">
          <table class="comparison-table" style="width: 100%">
            <colgroup>
              <col class="label-col" />
              <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
            </colgroup>
            <tbody>
              <tr>
                <td class="sticky-col"></td>
                <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center pkg-name-cell">
                  <span class="text-h6 font-weight-bold">{{ pkg.display_name }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-6">
          <!-- Settings -->
          <v-card v-if="!isSearchActive || filteredSettingsRows.length" variant="flat" class="border rounded-lg mb-4">
            <v-card-title
              class="text-subtitle-1 font-weight-bold d-flex align-center section-title"
              @click="collapsed.settings = !collapsed.settings"
            >
              <v-icon class="mr-2" size="small">mdi-cog-outline</v-icon>
              Settings
              <v-spacer />
              <v-icon size="small">{{ collapsed.settings ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
            </v-card-title>
            <div v-show="!collapsed.settings || isSearchActive">
              <table class="comparison-table" style="width: 100%">
                <colgroup>
                  <col class="label-col" />
                  <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
                </colgroup>
                <tbody>
                  <tr v-for="row in filteredSettingsRows" :key="row.key">
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
              </table>
            </div>
          </v-card>

          <!-- Quotas -->
          <v-card v-if="!isSearchActive || filteredQuotaRows.length" variant="flat" class="border rounded-lg mb-4">
            <v-card-title
              class="text-subtitle-1 font-weight-bold d-flex align-center section-title"
              @click="collapsed.quotas = !collapsed.quotas"
            >
              <v-icon class="mr-2" size="small">mdi-counter</v-icon>
              Quotas
              <v-spacer />
              <v-icon size="small">{{ collapsed.quotas ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
            </v-card-title>
            <div v-show="!collapsed.quotas || isSearchActive">
              <table class="comparison-table" style="width: 100%">
                <colgroup>
                  <col class="label-col" />
                  <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
                </colgroup>
                <tbody>
                  <tr v-for="q in filteredQuotaRows" :key="q.key">
                    <td class="sticky-col font-weight-medium">{{ q.label }}</td>
                    <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center">
                      {{ q.values[pkg.id] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-card>

          <!-- Features (excluding Apps) -->
          <v-card v-if="!isSearchActive || filteredFeatureDomains.length" variant="flat" class="border rounded-lg mb-4">
            <v-card-title
              class="text-subtitle-1 font-weight-bold d-flex align-center section-title"
              @click="collapsed.features = !collapsed.features"
            >
              <v-icon class="mr-2" size="small">mdi-format-list-checks</v-icon>
              Features
              <v-spacer />
              <v-icon size="small">{{ collapsed.features ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
            </v-card-title>
            <v-card-text v-show="!collapsed.features || isSearchActive" class="pa-0">
              <div v-for="domainDiff in filteredFeatureDomains" :key="domainDiff.domain.id" class="mb-2">
                <div class="d-flex align-center pa-4 pb-2">
                  <v-avatar :color="domainDiff.domain.color" variant="tonal" size="28" class="mr-2">
                    <v-icon size="x-small">{{ domainDiff.domain.icon }}</v-icon>
                  </v-avatar>
                  <span class="text-subtitle-2 font-weight-bold">{{ domainDiff.domain.name }}</span>
                  <v-tooltip v-if="domainDescriptions[domainDiff.domain.name]" location="end">
                    <template #activator="{ props }">
                      <v-icon v-bind="props" size="x-small" class="ml-1" color="medium-emphasis">mdi-information-outline</v-icon>
                    </template>
                    {{ domainDescriptions[domainDiff.domain.name] }}
                  </v-tooltip>
                </div>
                <table class="comparison-table" style="width: 100%">
                  <colgroup>
                    <col class="label-col" />
                    <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
                  </colgroup>
                  <tbody>
                    <tr v-for="row in domainDiff.features" :key="row.featureKey">
                      <td class="sticky-col">
                        <span class="font-weight-medium">{{ row.name }}</span>
                        <v-tooltip v-if="featureDescriptions[row.name]" location="end" content-class="presell-tooltip">
                          <template #activator="{ props }">
                            <v-icon v-bind="props" size="x-small" class="ml-1" color="medium-emphasis">mdi-information-outline</v-icon>
                          </template>
                          {{ featureDescriptions[row.name] }}
                        </v-tooltip>
                      </td>
                      <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center">
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
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </v-card-text>
          </v-card>

          <!-- Bundles and Apps -->
          <v-card v-if="!isSearchActive || filteredBundleRows.length || filteredAppsDomain" variant="flat" class="border rounded-lg mb-4">
            <v-card-title
              class="text-subtitle-1 font-weight-bold d-flex align-center section-title"
              @click="collapsed.bundles = !collapsed.bundles"
            >
              <v-icon class="mr-2" size="small">mdi-package-variant-closed</v-icon>
              Bundles and Apps
              <v-spacer />
              <v-icon size="small">{{ collapsed.bundles ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
            </v-card-title>
            <div v-show="!collapsed.bundles || isSearchActive">
              <table class="comparison-table" style="width: 100%">
                <colgroup>
                  <col class="label-col" />
                  <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
                </colgroup>
                <tbody>
                  <tr v-for="row in filteredBundleRows" :key="row.key">
                    <td class="sticky-col font-weight-medium">{{ row.label }}</td>
                    <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center">
                      {{ row.values[pkg.id] }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <template v-if="filteredAppsDomain">
                <div class="d-flex align-center pa-4 pb-2 pt-4">
                  <v-avatar :color="filteredAppsDomain.domain.color" variant="tonal" size="28" class="mr-2">
                    <v-icon size="x-small">{{ filteredAppsDomain.domain.icon }}</v-icon>
                  </v-avatar>
                  <span class="text-subtitle-2 font-weight-bold">{{ filteredAppsDomain.domain.name }}</span>
                </div>
                <table class="comparison-table" style="width: 100%">
                  <colgroup>
                    <col class="label-col" />
                    <col v-for="pkg in selectedPackages" :key="pkg.id" :style="pkgColStyle" />
                  </colgroup>
                  <tbody>
                    <tr v-for="row in filteredAppsDomain.features" :key="row.featureKey">
                      <td class="sticky-col">
                        <span class="font-weight-medium">{{ row.name }}</span>
                      </td>
                      <td v-for="pkg in selectedPackages" :key="pkg.id" class="text-center">
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
                      </td>
                    </tr>
                  </tbody>
                </table>
              </template>
            </div>
          </v-card>

          <!-- No search results -->
          <v-card
            v-if="isSearchActive && !hasAnySearchResults"
            variant="flat"
            class="border rounded-lg pa-8 text-center"
          >
            <v-icon size="48" color="grey-lighten-1">mdi-magnify-close</v-icon>
            <h3 class="text-subtitle-1 mt-3 mb-1">No results found</h3>
            <p class="text-body-2 text-medium-emphasis">
              No features, settings, or quotas match "{{ featureSearchText }}".
            </p>
          </v-card>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="ready && selectedPackages.length < 2" class="page-scroll pa-6 pt-4">
      <v-card
        variant="flat"
        class="border rounded-lg pa-12 text-center"
      >
        <v-icon size="80" color="grey-lighten-1">mdi-tag-multiple-outline</v-icon>
        <h3 class="text-h6 mt-4 mb-2">No presell packages available</h3>
        <p class="text-body-2 text-medium-emphasis">
          Template packages need to be configured before they appear here.
        </p>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * This page reuses the exact same comparison logic as PackageComparison.vue
 * but auto-selects two hardcoded template packages instead of a user picker.
 */
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePackageStore } from '@/stores/packages'
import { useFeatureStore } from '@/stores/features'
import { domainFeatureFFMappingRaw } from '@/data/domainFeatureFFMapping'
import type { Package } from '@/types'

const packageStore = usePackageStore()
const featureStore = useFeatureStore()
const loadError = ref('')
const ready = ref(false)

const collapsed = reactive({ settings: false, bundles: false, quotas: false, features: false })
const featureSearchText = ref('')

// --- Presell: auto-select packages by name ---
const PRESELL_PACKAGE_NAMES = ['connect_template', 'bm_template']

const selectedPackages = computed<Package[]>(() =>
  PRESELL_PACKAGE_NAMES
    .map((name) => packageStore.packages.find((p) => p.name === name))
    .filter((p): p is Package => !!p),
)

// ============================================================
// Everything below is copied from PackageComparison.vue as-is
// ============================================================

// --- Settings ---
interface SettingsRow {
  key: string
  label: string
  values: Record<string, boolean>
}

const settingsRows = computed<SettingsRow[]>(() => {
  if (selectedPackages.value.length < 2) return []
  const defs: { key: string; label: string; valueFn: (pkg: Package) => boolean }[] = [
    { key: 'disable_add_staff_button', label: 'Additional Staff require upgrade', valueFn: (pkg) => pkg.settings.disable_add_staff_button },
    { key: 'disable_sms_purchase_button', label: 'Additional SMS require upgrade', valueFn: (pkg) => pkg.settings.disable_sms_purchase_button },
  ]
  return defs.map(({ key, label, valueFn }) => {
    const values: Record<string, boolean> = {}
    for (const pkg of selectedPackages.value) {
      values[pkg.id] = valueFn(pkg)
    }
    return { key, label, values }
  })
})

// --- Bundles ---
interface ComparisonRow {
  key: string
  label: string
  values: Record<string, string>
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
    return { key, label, values }
  })
})

// --- Quotas ---
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
    return { key, label, values }
  })
})

// --- Feature comparison by domain ---

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

  const domainGateFlags: Record<string, string> = { 'communication': 'sms_enabled' }
  for (const [dKey, requiredFlag] of Object.entries(domainGateFlags)) {
    if (!activeNorms.has(normFlag(requiredFlag)) && domainGroupMap.has(dKey)) {
      domainGroupMap.delete(dKey)
    }
  }

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

  const pkgStates = selectedPackages.value.map((pkg) => ({
    id: pkg.id,
    state: buildPackageFeatureState(pkg),
  }))

  const allKeys = new Set<string>()
  for (const { state } of pkgStates) {
    for (const key of state.keys()) allKeys.add(key)
  }

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
      } else {
        perPackage[id] = null
      }
    }

    domainMap.get(dKey)!.features.set(compositeKey, {
      featureKey: compositeKey,
      name: featureName,
      perPackage,
    })
  }

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

// --- Presell-specific ---
const domainDescriptions: Record<string, string> = {
  'Client Management': 'Includes: Inbox and Chat, Caller ID, Follow up reminders, import/export',
}

const featureDescriptions: Record<string, string> = {
  'Basic Scheduling': 'Includes: Secure client portal, Email notifications & reminders, Business Page &\nWebsite widgets, Business calendar, Date specific availability settings, Multi-service booking',
  'Payment Module': 'Includes: Record offline payments, Payment reminders (emails), Products',
  'Marketing Module': 'Includes: Bulk email announcement, Scheduled campaigns (newsletter)',
}

// --- Presell-specific: split features vs apps ---
const featureDomains = computed(() => comparisonDomains.value.filter((d) => d.domain.id !== 'apps'))
const appsDomain = computed(() => comparisonDomains.value.find((d) => d.domain.id === 'apps') ?? null)

// --- Search / filter ---

function matchesSearch(terms: string[], q: string): boolean {
  return terms.some(t => t.toLowerCase().includes(q))
}

const normalizedSearch = computed(() => featureSearchText.value?.trim().toLowerCase() ?? '')
const isSearchActive = computed(() => normalizedSearch.value.length > 0)

const filteredSettingsRows = computed(() => {
  if (!isSearchActive.value) return settingsRows.value
  const q = normalizedSearch.value
  return settingsRows.value.filter(row => matchesSearch([row.label, row.key], q))
})

const filteredBundleRows = computed(() => {
  if (!isSearchActive.value) return bundleRows.value
  const q = normalizedSearch.value
  return bundleRows.value.filter(row => matchesSearch([row.label, row.key], q))
})

const filteredQuotaRows = computed(() => {
  if (!isSearchActive.value) return quotaRows.value
  const q = normalizedSearch.value
  return quotaRows.value.filter(row => matchesSearch([row.label, row.key], q))
})

const featureNameToFFs = new Map<string, string[]>()
for (const [, byFeature] of Object.entries(domainFeatureFFMappingRaw)) {
  for (const [featureName, flags] of Object.entries(byFeature)) {
    featureNameToFFs.set(normFlag(featureName), flags.map(f => f.toLowerCase()))
  }
}

function filterDomainFeatures(domains: ComparisonDomain[]): ComparisonDomain[] {
  if (!isSearchActive.value) return domains
  const q = normalizedSearch.value
  return domains
    .map(d => ({
      ...d,
      features: d.features.filter(f => {
        const cells = Object.values(f.perPackage).filter((c): c is FeatureCellState => c !== null)
        const activeFlags = cells.flatMap(c => c.flags)
        const stateLabels = cells.map(c => c.stateLabel).filter((l): l is string => !!l)
        const mappingFFs = featureNameToFFs.get(normFlag(f.name)) || []
        return matchesSearch([f.name, ...activeFlags, ...stateLabels, ...mappingFFs], q)
      }),
    }))
    .filter(d => d.features.length > 0)
}

const filteredFeatureDomains = computed(() => filterDomainFeatures(featureDomains.value))
const filteredAppsDomain = computed(() => {
  if (!appsDomain.value) return null
  const filtered = filterDomainFeatures([appsDomain.value])
  return filtered.length > 0 ? filtered[0] : null
})

const hasAnySearchResults = computed(() => {
  if (!isSearchActive.value) return true
  return (
    filteredSettingsRows.value.length > 0 ||
    filteredQuotaRows.value.length > 0 ||
    filteredBundleRows.value.length > 0 ||
    filteredFeatureDomains.value.length > 0 ||
    !!filteredAppsDomain.value
  )
})

// --- Export CSV ---

function exportCsv() {
  const pkgs = selectedPackages.value
  if (pkgs.length < 2) return

  const csvEscape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const header = ['Section', 'Property', ...pkgs.map((p) => p.display_name)]
  const rows: string[][] = []

  for (const row of settingsRows.value) {
    rows.push(['Settings', row.label, ...pkgs.map((p) => row.values[p.id] ? 'Yes' : 'No')])
  }
  for (const row of quotaRows.value) {
    rows.push(['Quotas', row.label, ...pkgs.map((p) => row.values[p.id])])
  }
  for (const domainDiff of featureDomains.value) {
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
  for (const row of bundleRows.value) {
    rows.push(['Bundles', row.label, ...pkgs.map((p) => row.values[p.id])])
  }
  if (appsDomain.value) {
    for (const feat of appsDomain.value.features) {
      const cells = pkgs.map((p) => {
        const cell = feat.perPackage[p.id]
        if (!cell) return ''
        if (cell.stateLabel) return cell.stateLabel
        if (cell.denyIcon) return 'Disabled'
        return 'Yes'
      })
      rows.push(['Apps', feat.name, ...cells])
    }
  }

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'presell-packages.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// --- Table sizing ---
const LABEL_COL_WIDTH = 280
const PKG_COL_MIN_WIDTH = 200

const pkgColStyle = computed(() => {
  const w = Math.max(PKG_COL_MIN_WIDTH, Math.floor((900 - LABEL_COL_WIDTH) / Math.max(selectedPackages.value.length, 1)))
  return { width: `${w}px` }
})

const tableWidthStyle = computed(() => {
  const colW = parseInt(pkgColStyle.value.width)
  const total = LABEL_COL_WIDTH + colW * selectedPackages.value.length
  return { width: `${Math.max(total, 100)}px`, minWidth: '100%' }
})

onMounted(async () => {
  document.documentElement.classList.add('no-page-scroll')
  try {
    // Kick off full load in the background but don't wait for ALL packages to enrich
    packageStore.ensureLoaded().catch(() => {})

    // Wait only for the package list to be available
    if (!packageStore.initialized) {
      await new Promise<void>((resolve) => {
        const stop = watch(() => packageStore.initialized, (val) => {
          if (val) { stop(); resolve() }
        }, { immediate: true })
      })
    }

    // Force-load only the 2 presell packages in parallel (fast: 2 API calls)
    const presellPkgs = PRESELL_PACKAGE_NAMES
      .map(name => packageStore.packages.find(p => p.name === name))
      .filter((p): p is Package => !!p)

    await Promise.all(
      presellPkgs.map(pkg => packageStore.loadPackageById(pkg.id, true).catch(() => {}))
    )
  } catch (err: any) {
    loadError.value = err?.response?.data?.message || err?.message || 'Failed to load packages'
  } finally {
    ready.value = true
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('no-page-scroll')
})
</script>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.page-fixed {
  flex-shrink: 0;
}

.page-scroll {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.scroll-content {
  min-width: 100%;
}

/* Sticky package names header */
.pkg-header-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(var(--v-theme-surface));
  padding-bottom: 8px;
}

.pkg-name-cell {
  vertical-align: middle;
}

/* Shared table styles */
.comparison-table {
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.875rem;
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
  padding: 6px 16px;
}

.comparison-table td {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 6px 16px;
}

.comparison-table td:last-child {
  border-right: none;
}

/* Section cards */
.section-title {
  cursor: pointer;
}
.section-title:hover {
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}
</style>

<style>
.presell-tooltip {
  white-space: pre-line;
}
</style>
