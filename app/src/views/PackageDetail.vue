<template>
  <v-container v-if="pkg" fluid class="pa-6">
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

    <Teleport to="#appbar-nav">
      <v-btn icon="mdi-arrow-left" variant="text" size="small" to="/" />
    </Teleport>
    <Teleport to="#appbar-actions">
      <v-btn color="primary" size="small" prepend-icon="mdi-pencil" :to="`/packages/${pkg.id}/edit`">
        Edit
      </v-btn>
    </Teleport>

    <!-- Header -->
    <div class="mb-4">
      <div class="d-flex align-center" style="gap: 8px;">
        <h1 class="text-h5 font-weight-bold">{{ pkg.display_name || pkg.name }}<span v-if="pkg.name && pkg.display_name" class="text-medium-emphasis font-weight-regular"> ({{ pkg.name }})</span></h1>
        <v-chip v-if="pkg.is_template" color="info" size="small" variant="tonal" prepend-icon="mdi-file-document-outline">Template</v-chip>
        <v-chip v-if="pkg.deprecated" color="grey" size="small" variant="tonal" prepend-icon="mdi-archive-off-outline">Deprecated</v-chip>
        <v-chip v-if="pkg.free" color="success" size="small" variant="tonal">FREE</v-chip>
      </div>
    </div>

    <v-row>
      <!-- Main content -->
      <v-col cols="12" md="8">
        <!-- Validation -->
        <v-card v-if="validationMessages.length > 0" variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
            <v-icon class="mr-2" size="small" color="warning">mdi-alert-circle-outline</v-icon>
            Validation Issues ({{ validationMessages.length }})
          </v-card-title>
          <v-card-text>
            <v-alert
              v-for="(msg, i) in validationMessages"
              :key="i"
              :type="msg.severity === 'error' ? 'error' : msg.severity === 'warning' ? 'warning' : 'info'"
              variant="tonal"
              density="compact"
              class="mb-2"
            >
              <div class="text-body-2">{{ msg.message }}</div>
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- Features by domain -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2" size="small">mdi-format-list-checks</v-icon>
              Features
            </div>
            <div class="d-flex align-center" style="gap: 12px;">
              <v-switch
                v-model="showFFs"
                label="Show FFs"
                density="compact"
                hide-details
                class="ff-toggle"
              />
              <v-btn
                variant="text"
                size="small"
                density="comfortable"
                :prepend-icon="allExpanded ? 'mdi-collapse-all-outline' : 'mdi-expand-all-outline'"
                @click="toggleAllPanels"
              >
                {{ allExpanded ? 'Collapse All' : 'Expand All' }}
              </v-btn>
            </div>
          </v-card-title>
          <v-card-text>
            <v-expansion-panels v-model="openPanels" variant="accordion" multiple>
              <v-expansion-panel
                v-for="domainGroup in featuresByDomain"
                :key="domainGroup.domain.id"
                class="mb-1"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center" style="gap: 8px;">
                    <v-avatar :color="domainGroup.domain.color" variant="tonal" size="28">
                      <v-icon size="x-small">{{ domainGroup.domain.icon }}</v-icon>
                    </v-avatar>
                    <span class="text-subtitle-2 font-weight-bold">{{ domainGroup.domain.name }}</span>
                    <v-chip v-if="domainGroup.hasUpsell" size="x-small" variant="flat" :color="'#fab4cd'" class="ml-1">
                      Upsell
                    </v-chip>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list density="compact">
                    <template
                      v-for="group in domainGroup.groups"
                      :key="`${domainGroup.domain.id}-${group.name}`"
                    >
                      <v-list-item>
                        <template #prepend>
                          <v-icon v-if="group.disabledPositive" color="success" size="small">mdi-check-circle</v-icon>
                          <v-icon v-else-if="group.isInvertedDisabled || group.denyIcon" color="warning" size="small">mdi-eye-off</v-icon>
                          <v-icon v-else-if="group.isInvertedEnabled && domainGroup.domain.id === 'trial_spam_prevention'" color="orange" size="small">mdi-shield-lock</v-icon>
                          <v-icon v-else-if="domainGroup.domain.id === 'trial_spam_prevention'" color="orange" size="small">mdi-shield-lock</v-icon>
                          <v-icon v-else color="success" size="small">mdi-check-circle</v-icon>
                        </template>
                        <v-list-item-title class="text-body-2 d-flex align-center">
                          {{ group.name }}
                          <v-chip
                            v-if="group.stateLabel"
                            size="x-small"
                            :color="group.stateColor || 'info'"
                            variant="flat"
                            class="ml-2"
                          >
                            {{ group.stateLabel }}
                          </v-chip>
                        </v-list-item-title>
                        <v-list-item-subtitle v-if="showFFs && !group.subFeatures && group.flags.length > 0" class="text-caption text-medium-emphasis">
                          <template v-for="(flag, i) in group.flags" :key="flag"><code>{{ flag }}</code><span v-if="i < group.flags.length - 1">, </span></template>
                        </v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item
                        v-for="sub in group.subFeatures || []"
                        :key="sub.ff"
                        class="ml-8"
                        density="compact"
                        style="min-height: 28px;"
                      >
                        <template #prepend>
                          <v-icon color="success" size="x-small">mdi-check</v-icon>
                        </template>
                        <v-list-item-title class="text-caption">{{ sub.label }}</v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Sidebar -->
      <v-col cols="12" md="4">
        <!-- Settings -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center sidebar-card-title" @click="sidebarCollapsed.settings = !sidebarCollapsed.settings" style="cursor: pointer;">
            <v-icon class="mr-2" size="small">mdi-cog-outline</v-icon>
            Settings
            <v-spacer />
            <v-icon size="small">{{ sidebarCollapsed.settings ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </v-card-title>
          <v-list v-show="!sidebarCollapsed.settings" density="compact">
            <v-list-item>
              <v-list-item-title class="text-body-2 d-flex align-center justify-space-between">
                <span>Additional Staff require upgrade</span>
                <v-icon
                  size="small"
                  :color="pkg.settings.disable_add_staff_button ? 'success' : 'grey-lighten-1'"
                  :icon="pkg.settings.disable_add_staff_button ? 'mdi-check-circle' : 'mdi-close-circle'"
                />
              </v-list-item-title>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="text-body-2 d-flex align-center justify-space-between">
                <span>Additional SMS require upgrade</span>
                <v-icon
                  size="small"
                  :color="pkg.settings.disable_sms_purchase_button ? 'success' : 'grey-lighten-1'"
                  :icon="pkg.settings.disable_sms_purchase_button ? 'mdi-check-circle' : 'mdi-close-circle'"
                />
              </v-list-item-title>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="text-body-2 d-flex align-center justify-space-between">
                <span>Free package</span>
                <v-icon
                  size="small"
                  :color="pkg.free ? 'success' : 'grey-lighten-1'"
                  :icon="pkg.free ? 'mdi-check-circle' : 'mdi-close-circle'"
                />
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Quotas -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center sidebar-card-title" @click="sidebarCollapsed.quotas = !sidebarCollapsed.quotas" style="cursor: pointer;">
            <v-icon class="mr-2" size="small">mdi-counter</v-icon>
            Quotas
            <v-spacer />
            <v-icon size="small">{{ sidebarCollapsed.quotas ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </v-card-title>
          <v-list v-show="!sidebarCollapsed.quotas" density="compact">
            <v-list-item v-for="q in quotaItems" :key="q.label">
              <v-list-item-title class="text-body-2 d-flex justify-space-between">
                <span>{{ q.label }}</span>
                <strong>{{ q.value }}</strong>
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Bundles -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center sidebar-card-title" @click="sidebarCollapsed.bundles = !sidebarCollapsed.bundles" style="cursor: pointer;">
            <v-icon class="mr-2" size="small">mdi-package-variant-closed</v-icon>
            Bundles
            <v-spacer />
            <v-icon size="small">{{ sidebarCollapsed.bundles ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </v-card-title>
          <v-list v-show="!sidebarCollapsed.bundles" density="compact">
            <v-list-item v-for="b in bundleItems" :key="b.label">
              <v-list-item-title class="text-body-2 d-flex justify-space-between">
                <span>{{ b.label }}</span>
                <strong>{{ b.value }}</strong>
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Audit trail -->
        <v-card variant="flat" class="border rounded-lg">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center sidebar-card-title" @click="sidebarCollapsed.history = !sidebarCollapsed.history" style="cursor: pointer;">
            <v-icon class="mr-2" size="small">mdi-history</v-icon>
            Change History
            <v-spacer />
            <v-icon size="small">{{ sidebarCollapsed.history ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </v-card-title>
          <template v-if="!sidebarCollapsed.history">
            <v-timeline density="compact" side="end" class="px-4 pb-4">
              <v-timeline-item
                v-for="entry in auditEntries"
                :key="entry.id"
                :dot-color="entry.action === 'created' ? 'success' : 'warning'"
                size="x-small"
              >
                <div class="text-body-2">
                  <strong>{{ entry.operator_name }}</strong> {{ entry.action }} this package
                </div>
                <div v-for="change in entry.changes" :key="change.field" class="text-caption text-medium-emphasis">
                  <span v-if="change.field === 'package'">{{ change.to }}</span>
                  <span v-else-if="change.field === 'features' && change.to && !change.from">
                    + Added <code>{{ getBusinessNameForFlag(String(change.to)) }}</code>
                  </span>
                  <span v-else-if="change.field === 'features' && change.from && !change.to">
                    - Removed <code>{{ getBusinessNameForFlag(String(change.from)) }}</code>
                  </span>
                  <span v-else>
                    {{ change.field }}: {{ change.from }} → {{ change.to }}
                  </span>
                </div>
                <div class="text-caption text-disabled mt-1">{{ formatDate(entry.timestamp) }}</div>
              </v-timeline-item>
            </v-timeline>
            <v-card-text v-if="auditEntries.length === 0" class="text-center text-caption text-medium-emphasis">
              No history available
            </v-card-text>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- Not found -->
  <v-container v-else fluid class="pa-6">
    <v-card variant="flat" class="border rounded-lg pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1">mdi-package-variant</v-icon>
      <h3 class="text-h6 mt-4">Package not found</h3>
      <v-btn class="mt-4" to="/packages" variant="text">Back to packages</v-btn>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePackageStore } from '@/stores/packages'
import { useFeatureStore } from '@/stores/features'
import { getFeatureByName } from '@/data/featureCatalog'
import { domainFeatureFFMappingRaw } from '@/data/domainFeatureFFMapping'

const route = useRoute()
const router = useRouter()
const packageStore = usePackageStore()
const featureStore = useFeatureStore()
const loadError = ref('')
const openPanels = ref<number[]>([])
const showFFs = ref(localStorage.getItem('pkg_showFFs') === 'true')
watch(showFFs, (val) => localStorage.setItem('pkg_showFFs', String(val)))

const pkg = computed(() => packageStore.getPackageById(route.params.id as string))
const sidebarCollapsed = reactive({ settings: false, quotas: false, bundles: false, history: false })
const hiddenQuotaControlFlags = new Set([
  'unlimited_clients',
  'invoices_monthly_unlimited',
  'estimates_monthly_unlimited',
  'campaign_recipients_monthly_unlimited',
])

const ffFriendlyLabels: Record<string, string> = {
  'tatango': 'Tatango',
  'dedicated_promotional_number': 'Dedicated Promotional Number',
  'bye_zipwip': 'Twilio',
  'disable_messages_notifications': 'Disable Messages Notifications',
  'multistaff_features': 'MultiStaff for Service',
  'joint_availability': 'Any Employee Selector',
  'staff_role_permissions': 'Custom Roles & Permissions',
  'auto_reassign': 'Staff Assignment Rules',
  'pro_campaigns': 'Pro Campaigns',
  'send_pro_campaigns': 'Send Pro Campaigns',
  'ace_add_on': 'ACE Add-on',
  'no_powered_by': 'vcita - Hide Powered By vcita',
  'backoffice_branding': 'vcita - Backoffice Branding',
  'yext_reviews': 'Yext Reviews',
  'pkg.thryv.listings_settings': 'Listings Settings',
  'reviews_respond': 'Reviews Respond',
  'review_publishing': 'Review Publishing',
  'thryv_pay': 'ThryvPay',
  'ThryvPay_wizards': 'ThryvPay Wizards',
}

const linkedFlagGroups = new Set([
  'External Calendar Sync (Google and Outlook)',
  'Zoom',
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

const allExpanded = computed(() =>
  featuresByDomain.value.length > 0 && openPanels.value.length === featuresByDomain.value.length,
)

function toggleAllPanels() {
  if (allExpanded.value) {
    openPanels.value = []
  } else {
    openPanels.value = featuresByDomain.value.map((_, i) => i)
  }
}

function normFlag(value: string) {
  return (value || '').trim().toLowerCase()
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

const validationMessages = computed(() => {
  if (!pkg.value) return []
  return featureStore.validateFeatures(pkg.value.features)
})

const featuresByDomain = computed(() => {
  if (!pkg.value) return []

  const domainGroupMap = new Map<string, { domainName: string; featureMap: Map<string, string[]> }>()
  const invalidFlags: string[] = []
  const invertedFFSet = new Set(Object.values(invertedFlagFeatures).map((v) => normFlag(v.ff)))
  const activeNorms = new Set(pkg.value.features.map((f) => normFlag(f)))

  for (const rawFlag of pkg.value.features) {
    const flag = rawFlag.trim()
    const norm = normFlag(flag)
    if (!norm || hiddenQuotaControlFlags.has(norm) || norm === 'unlimited_seats') continue
    if (invertedFFSet.has(norm)) continue

    const mapped = ffLookup.get(norm)
    if (!mapped) {
      invalidFlags.push(flag)
      continue
    }
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

  const domainGateFlags: Record<string, string> = {
    'communication': 'sms_enabled',
  }
  for (const [dKey, requiredFlag] of Object.entries(domainGateFlags)) {
    if (!activeNorms.has(normFlag(requiredFlag)) && domainGroupMap.has(dKey)) {
      domainGroupMap.delete(dKey)
    }
  }

  const result = [...domainGroupMap.entries()]
    .map(([dKey, dGroup]) => {
      const orderKey = dKey === 'apps' ? 'bundles' : dKey
      const fOrder = featureOrderByDomain.get(orderKey) ?? featureOrderByDomain.get(dKey)
      const groups = [...dGroup.featureMap.entries()]
        .map(([fKey, flags]) => {
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
          const subFeatures = flags.length > 1 && flags.some(f => !!ffFriendlyLabels[f])
            ? flags.map(f => ({ ff: f, label: ffFriendlyLabels[f] || f, enabled: true }))
            : null
          const isInvertedEnabled = !!invertedEnabledMatch
          const disabledPositive = invertedDisabledMatch?.disabledPositive ?? false
          return { name: displayName, flags, order: isDeny ? 9998 : (fOrder?.get(fKey) ?? 9999), stateLabel: state?.label ?? null, stateColor: state?.color ?? null, isInvertedDisabled: !!invertedDisabledMatch, isInvertedEnabled, disabledPositive, denyIcon: state?.denyIcon ?? false, subFeatures }
        })
        .sort((a, b) => a.order - b.order)
        .map(({ name, flags, stateLabel, stateColor, isInvertedDisabled, isInvertedEnabled, disabledPositive, denyIcon, subFeatures }) => ({ name, flags, stateLabel, stateColor, isInvertedDisabled, isInvertedEnabled, disabledPositive, denyIcon, subFeatures }))

      const flagCount = groups.reduce((sum, g) => sum + g.flags.length, 0)
      const upsellGateFeatures = new Set(['payment module', 'sms module', 'marketing module'])
      const hasUpsell = groups.some((g) => g.stateLabel === 'Upsell mode' && upsellGateFeatures.has(g.name.toLowerCase()))
      return {
        domain: dKey === 'apps'
          ? { id: 'apps', name: 'Apps', icon: 'mdi-apps', color: '#7C4DFF', description: 'App features', features: [] }
          : domainMetaByName(dGroup.domainName),
        groups,
        flagCount,
        hasUpsell,
        _order: domainOrder.get(orderKey) ?? domainOrder.get(dKey) ?? 9999,
      }
    })
    .sort((a, b) => a._order - b._order)

  if (invalidFlags.length > 0) {
    result.push({
      domain: {
        id: 'invalid',
        name: 'INVALID',
        icon: 'mdi-alert-circle-outline',
        color: '#D32F2F',
        description: 'Unmapped feature flags',
        features: [],
      },
      groups: invalidFlags.map((f) => ({ name: f, flags: [f] })),
      flagCount: invalidFlags.length,
      _order: 99999,
    })
  }

  return result
})

const quotaItems = computed(() => {
  if (!pkg.value) return []
  const q = pkg.value.quotas
  const featureSet = new Set(pkg.value.features.map(normFlag))
  const hasUnlimitedClients = featureSet.has('unlimited_clients')
  const hasUnlimitedInvoices = featureSet.has('invoices_monthly_unlimited')
  const hasUnlimitedEstimates = featureSet.has('estimates_monthly_unlimited')
  const hasUnlimitedCampaignRecipients = featureSet.has('campaign_recipients_monthly_unlimited')
  const fmt = (v: number | null | undefined) => {
    if (v === null || v === undefined) return '--'
    if (Number.isNaN(Number(v))) return '--'
    return Number(v).toLocaleString()
  }
  return [
    { label: 'Client Limit', value: hasUnlimitedClients ? 'Unlimited' : fmt(q.clients_credit) },
    { label: 'Booking Credits', value: fmt(q.booking_credit) },
    { label: 'Storage', value: formatStorage(q.storage_quota) },
    { label: 'Monthly Invoices', value: hasUnlimitedInvoices ? 'Unlimited' : fmt(q.invoice_monthly_quota) },
    { label: 'Monthly Estimates', value: hasUnlimitedEstimates ? 'Unlimited' : fmt(q.estimate_monthly_quota) },
    { label: 'Campaign Recipients', value: hasUnlimitedCampaignRecipients ? 'Unlimited' : fmt(q.campaign_recipients_monthly_quota) },
    { label: 'Campaign Credits', value: fmt(q.campaigns_credit) },
  ]
})

const bundleItems = computed(() => {
  if (!pkg.value) return []
  const q = pkg.value.quotas
  const smsUs = q.sms_monthly_quota_us_canada
  const smsIntl = q.sms_monthly_quota_other
  const hasUnlimitedSeats = new Set(pkg.value.features.map(normFlag)).has('unlimited_seats')

  return [
    { label: 'Staff Seats', value: hasUnlimitedSeats ? 'Unlimited' : (pkg.value.staff_slots?.toLocaleString?.() ?? '--') },
    { label: 'SMS (US, Canada, IL)', value: smsUs == null ? '--' : Number(smsUs).toLocaleString() },
    { label: 'SMS (other)', value: smsIntl == null ? '--' : Number(smsIntl).toLocaleString() },
  ]
})


const auditEntries = computed(() => {
  if (!pkg.value) return []
  return packageStore.getAuditForPackage(pkg.value.id)
})

function getBusinessNameForFlag(flagName: string) {
  return getFeatureByName(flagName)?.business_name || flagName
}

function formatStorage(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(Number(bytes))) return '--'
  const b = Number(bytes)
  if (b === 0) return '0'
  if (b >= 1073741824) return `${+(b / 1073741824).toFixed(1)} GB`
  if (b >= 1048576) return `${+(b / 1048576).toFixed(0)} MB`
  return `${b} bytes`
}


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function goCompare() {
  router.push({ path: '/compare', query: { ids: pkg.value?.id } })
}

onMounted(async () => {
  const id = route.params.id as string
  const hadCached = !!packageStore.getPackageById(id)
  try {
    // Use already-loaded package data immediately when navigating from list.
    await packageStore.loadPackageById(id, false)
    loadError.value = ''
  } catch (err: any) {
    if (!hadCached) {
      loadError.value = err?.response?.data?.message || err?.message || 'Failed to load package'
    }
  }

  // Refresh in background; keep UI usable even if this fails.
  void packageStore.loadPackageById(id, true).catch((err: any) => {
    if (!packageStore.getPackageById(id)) {
      loadError.value = err?.response?.data?.message || err?.message || 'Failed to refresh package'
    }
  })
})
</script>

<style scoped>
.ff-toggle {
  flex: 0 0 auto;
  font-size: 0.75rem;
}
.ff-toggle :deep(.v-label) {
  font-size: 0.75rem;
  opacity: 0.7;
}
.sidebar-card-title:hover {
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}
</style>
