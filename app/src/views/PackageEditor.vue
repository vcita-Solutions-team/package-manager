<template>
  <v-container fluid class="pa-6">
    <Teleport to="#appbar-nav">
      <v-btn icon="mdi-arrow-left" variant="text" size="small" @click="goBack" />
    </Teleport>
    <Teleport to="#appbar-actions">
      <v-btn variant="outlined" size="small" @click="goBack">Cancel</v-btn>
      <v-btn color="primary" size="small" prepend-icon="mdi-content-save" @click="onSave" :disabled="!formValid">
        {{ isEdit ? 'Save Changes' : 'Create Package' }}
      </v-btn>
    </Teleport>

    <v-alert
      v-if="saveError || loadError || packageStore.error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="saveError = ''; loadError = ''"
    >
      {{ saveError || loadError || packageStore.error }}
    </v-alert>

    <v-row>
      <!-- Main form -->
      <v-col cols="12" md="8">
        <!-- Basic Info -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            <v-icon class="mr-2" size="small">mdi-information-outline</v-icon>
            Package Information
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formDisplayName"
                  label="Display Name"
                  placeholder="e.g. Partner X — Professional"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formName"
                  label="Name"
                  placeholder="e.g. partner_x_professional"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
            </v-row>
            <v-checkbox
              v-if="isEdit"
              v-model="formDeprecated"
              label="Deprecated"
              density="compact"
              hide-details
              color="error"
              class="mt-0"
            />
          </v-card-text>
        </v-card>

        <!-- Features by domain -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center justify-space-between">
            <div>
              <v-icon class="mr-2" size="small">mdi-format-list-checks</v-icon>
              Features
            </div>
            <v-text-field
              v-model="featureSearch"
              placeholder="Filter features..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              style="max-width: 300px;"
              clearable
            />
          </v-card-title>
          <v-card-text>
            <v-expansion-panels variant="accordion" multiple v-model="openDomainPanels">
              <v-expansion-panel
                v-for="(domain, idx) in filteredEditorDomains"
                :key="domain.id"
                class="mb-1"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100 pr-4">
                    <div class="d-flex align-center" style="gap: 8px;">
                      <v-avatar :color="domain.color" variant="tonal" size="28">
                        <v-icon size="x-small">{{ domain.icon }}</v-icon>
                      </v-avatar>
                      <span class="text-subtitle-2 font-weight-bold">{{ domain.name }}</span>
                    </div>
                    <div class="d-flex align-center" style="gap: 6px;">
                      <v-chip v-if="getDomainGateWarning(domain.name)" size="x-small" variant="flat" color="error">
                        Error
                      </v-chip>
                      <v-chip size="x-small" variant="tonal" :color="domainEnabledCount(domain) > 0 ? 'success' : 'grey'">
                        {{ domainEnabledCount(domain) }} / {{ groupDomainFeatures(domain.features).length }}
                      </v-chip>
                    </div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-alert
                    v-if="getDomainGateWarning(domain.name)"
                    type="error"
                    variant="tonal"
                    density="compact"
                    class="mb-3"
                    style="font-size: 0.8rem;"
                    prepend-icon="mdi-alert-circle"
                  >
                    {{ getDomainGateWarning(domain.name) }}
                  </v-alert>
                  <div
                    v-for="group in groupDomainFeatures(domain.features)"
                    :key="`${domain.id}-${group.name}`"
                    class="py-2 feature-row"
                    :class="{ 'gate-conflict': isFeatureGateConflict(domain.name, group.name) }"
                  >
                    <!-- Checkbox + dropdown feature -->
                    <template v-if="getCbDropdownForGroup(group.name)">
                      <div class="d-flex align-center" style="gap: 8px;">
                        <v-checkbox
                          v-model="cbDropdownEnabled[group.name]"
                          @update:model-value="applyCbDropdown(getCbDropdownForGroup(group.name)!)"
                          hide-details
                          density="compact"
                          class="flex-grow-0"
                        />
                        <span class="text-body-2 font-weight-medium">{{ group.name }}</span>
                        <v-tooltip v-if="getCbDropdownForGroup(group.name)!.hint" location="top">
                          <template #activator="{ props }">
                            <v-icon v-bind="props" size="x-small" color="grey" class="ml-1">mdi-help-circle-outline</v-icon>
                          </template>
                          {{ getCbDropdownForGroup(group.name)!.hint }}
                        </v-tooltip>
                        <v-select
                          v-if="cbDropdownEnabled[group.name]"
                          v-model="cbDropdownSelection[group.name]"
                          @update:model-value="applyCbDropdown(getCbDropdownForGroup(group.name)!)"
                          :items="getCbDropdownForGroup(group.name)!.options"
                          item-title="label"
                          item-value="value"
                          hide-details
                          density="compact"
                          variant="outlined"
                          style="max-width: 240px;"
                        />
                      </div>
                    </template>
                    <!-- Linked flag group: single checkbox toggles all FFs -->
                    <template v-else-if="isLinkedGroup(group.name)">
                      <div class="d-flex align-center">
                        <v-checkbox
                          :model-value="isLinkedGroupEnabled(group.flags)"
                          @update:model-value="toggleLinkedGroup(group.flags, $event)"
                          hide-details
                          density="compact"
                          class="mr-2 flex-grow-0"
                        />
                        <span class="text-body-2 font-weight-medium">{{ group.name }}</span>
                      </div>
                    </template>
                    <!-- Single FF: show feature name with checkbox inline -->
                    <template v-else-if="group.flags.length === 1">
                      <div class="d-flex align-center">
                        <v-checkbox
                          :model-value="invertedFlagFeatures.has(group.name) ? !formFeatures.has(group.flags[0].name) : formFeatures.has(group.flags[0].name)"
                          @update:model-value="toggleFeature(group.flags[0].name, invertedFlagFeatures.has(group.name) ? !$event : $event)"
                          hide-details
                          density="compact"
                          class="mr-2 flex-grow-0"
                        />
                        <span class="text-body-2 font-weight-medium">{{ group.name }}</span>
                        <v-tooltip v-if="featureTooltips[group.name]" location="top">
                          <template #activator="{ props }">
                            <v-icon v-bind="props" size="x-small" color="grey" class="ml-1">mdi-help-circle-outline</v-icon>
                          </template>
                          {{ featureTooltips[group.name] }}
                        </v-tooltip>
                      </div>
                    </template>
                    <!-- Multiple FFs: show feature name header + individual FF checkboxes -->
                    <template v-else>
                      <div class="mb-1">
                        <span class="text-body-2 font-weight-medium">{{ group.name }}</span>
                      </div>
                      <div v-for="feature in group.flags" :key="feature.id" class="d-flex align-center ml-6" style="margin-top: -2px; margin-bottom: -2px;">
                        <v-checkbox
                          :model-value="formFeatures.has(feature.name)"
                          @update:model-value="toggleFeature(feature.name, $event)"
                          hide-details
                          density="compact"
                          class="mr-1 flex-grow-0"
                        />
                        <span v-if="ffFriendlyLabels[feature.name]" class="text-caption">{{ ffFriendlyLabels[feature.name] }}</span>
                        <code v-else class="text-caption">{{ feature.name }}</code>
                      </div>
                    </template>
                  </div>
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
          <v-card-text v-show="!sidebarCollapsed.settings">
            <v-checkbox
              v-model="formSettings.disable_add_staff_button"
              density="compact"
              hide-details
            >
              <template #label><span class="ml-2">Additional Staff require upgrade</span></template>
            </v-checkbox>
            <v-checkbox
              v-model="formSettings.disable_sms_purchase_button"
              density="compact"
              hide-details
            >
              <template #label><span class="ml-2">Additional SMS require upgrade</span></template>
            </v-checkbox>
            <v-checkbox
              v-model="formFree"
              density="compact"
              hide-details
            >
              <template #label><span class="ml-2">Free package</span></template>
            </v-checkbox>
          </v-card-text>
        </v-card>

        <!-- Quotas -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center sidebar-card-title" @click="sidebarCollapsed.quotas = !sidebarCollapsed.quotas" style="cursor: pointer;">
            <v-icon class="mr-2" size="small">mdi-counter</v-icon>
            Quotas
            <v-spacer />
            <v-icon size="small">{{ sidebarCollapsed.quotas ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </v-card-title>
          <v-card-text v-show="!sidebarCollapsed.quotas">
            <template v-for="q in sidebarQuotaFields" :key="q.key">
              <div v-if="q.key === 'storage_quota'" class="quota-row mb-4">
                <v-text-field
                  v-model.number="storageDisplay"
                  label="Storage"
                  type="number"
                  :min="0"
                  variant="outlined"
                  density="compact"
                  hide-details
                  :disabled="isEdit"
                  class="quota-input"
                />
                <v-select
                  v-model="storageUnit"
                  :items="['MB', 'GB']"
                  variant="outlined"
                  density="compact"
                  hide-details
                  :disabled="isEdit"
                  class="quota-check"
                />
              </div>
              <div v-else class="quota-row mb-4">
                <v-text-field
                  v-model.number="formQuotas[q.key]"
                  :label="q.label"
                  type="number"
                  :min="0"
                  variant="outlined"
                  density="compact"
                  :disabled="isEdit || quotaUnlimited[q.key]"
                  :placeholder="quotaUnlimited[q.key] ? 'Unlimited' : ''"
                  hide-details
                  class="quota-input"
                />
                <v-checkbox
                  v-if="q.canBeUnlimited"
                  v-model="quotaUnlimited[q.key]"
                  label="Unlimited"
                  density="compact"
                  hide-details
                  class="quota-check"
                />
                <div v-else class="quota-check" />
              </div>
            </template>
          </v-card-text>
        </v-card>

        <!-- Bundles -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center sidebar-card-title" @click="sidebarCollapsed.bundles = !sidebarCollapsed.bundles" style="cursor: pointer;">
            <v-icon class="mr-2" size="small">mdi-package-variant-closed</v-icon>
            Bundles
            <v-spacer />
            <v-icon size="small">{{ sidebarCollapsed.bundles ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </v-card-title>
          <v-card-text v-show="!sidebarCollapsed.bundles">
            <div class="quota-row mb-4">
              <v-text-field
                v-model.number="formStaffSlots"
                label="Staff Seats"
                type="number"
                min="1"
                variant="outlined"
                density="compact"
                hide-details
                :disabled="unlimitedSeats"
                :placeholder="unlimitedSeats ? 'Unlimited' : ''"
                class="quota-input"
              />
              <v-checkbox
                v-model="unlimitedSeats"
                label="Unlimited"
                density="compact"
                hide-details
                class="quota-check"
              />
            </div>
            <div class="quota-row mb-4">
              <v-text-field
                v-model.number="formQuotas.sms_monthly_quota_us_canada"
                label="SMS (US, Canada, IL)"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                hide-details
                :disabled="isEdit"
                class="quota-input"
              />
              <div class="quota-check" />
            </div>
            <div class="quota-row mb-4">
              <v-text-field
                v-model.number="formQuotas.sms_monthly_quota_other"
                label="SMS (other)"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                hide-details
                :disabled="isEdit"
                class="quota-input"
              />
              <div class="quota-check" />
            </div>
          </v-card-text>
        </v-card>

        <!-- Validation -->
        <v-card variant="flat" class="border rounded-lg mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center sidebar-card-title" @click="sidebarCollapsed.validation = !sidebarCollapsed.validation" style="cursor: pointer;">
            <v-icon class="mr-2" size="small">mdi-shield-check-outline</v-icon>
            Validation
            <v-spacer />
            <v-chip
              :color="validationErrors.length > 0 ? 'error' : validationWarnings.length > 0 ? 'warning' : 'success'"
              size="x-small"
              variant="flat"
              class="mr-2"
            >
              {{ validationErrors.length > 0 ? `${validationErrors.length} errors` : validationWarnings.length > 0 ? `${validationWarnings.length} warnings` : 'All clear' }}
            </v-chip>
            <v-icon size="small">{{ sidebarCollapsed.validation ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </v-card-title>
          <v-card-text v-show="!sidebarCollapsed.validation">
            <div v-if="allValidation.length === 0" class="text-center py-4">
              <v-icon color="success" size="large">mdi-check-circle-outline</v-icon>
              <div class="text-body-2 mt-2">No issues detected</div>
            </div>
            <v-alert
              v-for="(msg, i) in allValidation"
              :key="i"
              :type="msg.severity === 'error' ? 'error' : msg.severity === 'warning' ? 'warning' : 'info'"
              variant="tonal"
              density="compact"
              class="mb-2"
              style="font-size: 0.8rem;"
            >
              {{ msg.message }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Save snackbar -->
    <v-snackbar v-model="saveSuccess" color="success" :timeout="3000">
      Package {{ isEdit ? 'updated' : 'created' }} successfully!
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePackageStore } from '@/stores/packages'
import { useFeatureStore } from '@/stores/features'
import { domainFeatureFFMappingRaw } from '@/data/domainFeatureFFMapping'

import type { PackageSettings, PackageQuotas } from '@/types'

const route = useRoute()
const router = useRouter()
const packageStore = usePackageStore()
const featureStore = useFeatureStore()

const isEdit = computed(() => !!route.params.id)
const saveSuccess = ref(false)
const saveError = ref('')
const loadError = ref('')
const featureSearch = ref('')
const openDomainPanels = ref<number[]>([])


const formName = ref('')
const formDisplayName = ref('')
const formStaffSlots = ref(1)
const formFree = ref(false)
const formDeprecated = ref(false)
const unlimitedSeats = ref(false)
const formFeatures = reactive(new Set<string>())
const sidebarCollapsed = reactive({ settings: false, quotas: false, bundles: false, validation: false })
const formSettings = reactive<PackageSettings>({
  disable_staff_slots: false,
  disable_add_staff_button: false,
  disable_sms_purchase_button: false,
})

const quotaKeys = [
  'invoice_monthly_quota',
  'campaign_recipients_monthly_quota',
  'estimate_monthly_quota',
  'clients_credit',
  'campaigns_credit',
  'booking_credit',
  'sms_monthly_quota_us_canada',
  'sms_monthly_quota_other',
  'storage_quota',
] as const

const formQuotas = reactive<Record<string, number>>({
  invoice_monthly_quota: 20,
  campaign_recipients_monthly_quota: 500,
  estimate_monthly_quota: 10,
  clients_credit: 2000,
  campaigns_credit: 5,
  booking_credit: 200,
  sms_monthly_quota_us_canada: 100,
  sms_monthly_quota_other: 50,
  storage_quota: 2 * 1073741824,
})

const quotaUnlimited = reactive<Record<string, boolean>>({
  invoice_monthly_quota: false,
  campaign_recipients_monthly_quota: false,
  estimate_monthly_quota: false,
  clients_credit: false,
  campaigns_credit: false,
  booking_credit: false,
  sms_monthly_quota_us_canada: false,
  sms_monthly_quota_other: false,
  storage_quota: false,
})

const quotaFields = [
  { key: 'clients_credit', label: 'Client Limit', canBeUnlimited: true, unlimitedFlag: 'unlimited_clients' },
  { key: 'booking_credit', label: 'Booking Credits', canBeUnlimited: false },
  { key: 'storage_quota', label: 'Storage', canBeUnlimited: false },
  { key: 'invoice_monthly_quota', label: 'Monthly Invoices', canBeUnlimited: true, unlimitedFlag: 'invoices_monthly_unlimited' },
  { key: 'estimate_monthly_quota', label: 'Monthly Estimates', canBeUnlimited: true, unlimitedFlag: 'estimates_monthly_unlimited' },
  { key: 'campaign_recipients_monthly_quota', label: 'Campaign Recipients', canBeUnlimited: true, unlimitedFlag: 'campaign_recipients_monthly_unlimited' },
  { key: 'campaigns_credit', label: 'Campaign Credits', canBeUnlimited: false },
  { key: 'sms_monthly_quota_us_canada', label: 'SMS (US/Canada)', canBeUnlimited: false },
  { key: 'sms_monthly_quota_other', label: 'SMS (International)', canBeUnlimited: false },
]

const sidebarQuotaFields = quotaFields.filter(
  (q) => q.key !== 'sms_monthly_quota_us_canada' && q.key !== 'sms_monthly_quota_other',
)

const storageUnit = ref<'MB' | 'GB'>('GB')
const storageDisplay = ref(2)

function syncStorageFromBytes() {
  const bytes = formQuotas.storage_quota || 0
  if (bytes >= 1073741824 && bytes % 1073741824 === 0) {
    storageUnit.value = 'GB'
    storageDisplay.value = bytes / 1073741824
  } else {
    storageUnit.value = 'MB'
    storageDisplay.value = Math.round(bytes / 1048576)
  }
}

watch([storageDisplay, storageUnit], () => {
  const n = Number(storageDisplay.value) || 0
  formQuotas.storage_quota = storageUnit.value === 'GB' ? n * 1073741824 : n * 1048576
})

const unlimitedFlagMap = Object.fromEntries(
  quotaFields.filter((q) => q.unlimitedFlag).map((q) => [q.key, q.unlimitedFlag!]),
)

const hiddenUnlimitedFlags = new Set([
  ...Object.values(unlimitedFlagMap),
  'unlimited_seats',
])

const linkedFlagGroups = new Set([
  'External Calendar Sync (Google and Outlook)',
  'Zoom',
])

const invertedFlagFeatures = new Set([
  'SMS Campaigns',
  'Pendo',
  'Block Links in Messages',
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

const featureTooltips: Record<string, string> = {
  'Business management upsell': 'Showing only Business Management upsell instead of payment, marketing and documents',
  'Event Attendees': 'Unselecting Event Attendees feature results in 5 attendees limit',
  'Services': 'Unselecting Services feature results in 5 services limit',
}

function isLinkedGroup(groupName: string): boolean {
  return linkedFlagGroups.has(groupName)
}

function isLinkedGroupEnabled(flags: { name: string }[]): boolean {
  return flags.every((f) => formFeatures.has(f.name))
}

function toggleLinkedGroup(flags: { name: string }[], value: any) {
  for (const f of flags) {
    if (value) formFeatures.add(f.name)
    else formFeatures.delete(f.name)
  }
}

interface CheckboxDropdownFeature {
  featureName: string
  baseFlag?: string
  hint?: string
  defaultEnabled?: boolean
  defaultOption?: string
  uncheckedFlags?: string[]
  options: { value: string; label: string; flags: string[] }[]
}

const checkboxDropdownFeatures: CheckboxDropdownFeature[] = [
  {
    featureName: 'Email Templates Customization',
    baseFlag: 'pkg.business_administration.email_templates',
    options: [
      { value: 'upsell', label: 'Upsell mode', flags: [] },
      { value: 'client', label: 'Client emails only', flags: ['cliche_client_features'] },
      { value: 'all', label: 'Client & Business emails', flags: ['cliche_all_features'] },
    ],
  },
  {
    featureName: 'Documents \\ Storage',
    options: [
      { value: 'upsell', label: 'Upsell mode', flags: ['pkg.documents.promote'] },
      { value: 'available', label: 'Available', flags: ['documents_enabled'] },
    ],
  },
  {
    featureName: 'Reviews',
    options: [
      { value: 'upsell', label: 'Upsell mode', flags: ['collect_reviews'] },
      { value: 'available', label: 'Available', flags: ['enable_reviews_auto_publishing'] },
    ],
  },
  {
    featureName: 'Payment Module',
    options: [
      { value: 'upsell', label: 'Upsell mode', flags: ['pkg.payments.promote'] },
      { value: 'available', label: 'Available', flags: ['payments_module'] },
    ],
  },
  {
    featureName: 'SMS Module',
    baseFlag: 'sms_enabled',
    options: [
      { value: 'available', label: 'Available', flags: [] },
      { value: 'deduct_marketing', label: 'Deduct only marketing from quota', flags: ['purchase_sms_credits'] },
      { value: 'deduct_all', label: 'Deduct all SMS from quota', flags: ['sms_deduct_all_chargeables'] },
    ],
  },
  {
    featureName: 'Marketing Module',
    options: [
      { value: 'upsell', label: 'Upsell mode', flags: ['pkg.marketing.promote'] },
      { value: 'available', label: 'Available', flags: ['marketing_module'] },
    ],
  },
  {
    featureName: 'Reports',
    options: [
      { value: 'upsell', label: 'Upsell mode', flags: ['reports'] },
      { value: 'available', label: 'Available', flags: ['reports', 'detailed_reports'] },
    ],
  },
  {
    featureName: 'Automated Campaigns',
    options: [
      { value: 'activate', label: 'Activate only', flags: ['activate_automatic_campaigns'] },
      { value: 'activate_create', label: 'Activate + Create/Delete', flags: ['activate_automatic_campaigns', 'create_delete_automatic_campaigns'] },
    ],
  },
  {
    featureName: 'Onboarding wizard',
    defaultEnabled: false,
    defaultOption: 'full',
    uncheckedFlags: ['pkg.business_administration.registration_wizard.deny'],
    options: [
      { value: 'full', label: 'Full onboarding', flags: [] },
      { value: 'slim', label: 'Slim onboarding', flags: ['pkg.business_administration.slim_registration_wizard'] },
    ],
  },
  {
    featureName: 'Getting Started wizard',
    defaultEnabled: false,
    defaultOption: 'getting_started',
    uncheckedFlags: ['pkg.business_administration.getting_started.deny'],
    options: [
      { value: 'getting_started', label: 'Getting Started', flags: [] },
      { value: 'setup_wizard', label: 'Setup wizard (Thryv)', flags: ['setup_wizard_menu_item'] },
    ],
  },
  {
    featureName: 'Event Attendees',
    hint: 'Unselecting Event Attendees feature results in 5 attendees limit',
    defaultEnabled: false,
    defaultOption: '5att',
    options: [
      { value: '5att', label: '5 Attendees', flags: [] },
      { value: 'unlimited', label: 'Unlimited', flags: ['event_attendees_limit_increased'] },
    ],
  },
  {
    featureName: 'Services',
    hint: 'Unselecting Services feature results in 5 services limit',
    defaultEnabled: false,
    defaultOption: '5svc',
    options: [
      { value: '1svc', label: '1 Service limit', flags: ['single_service_booking'] },
      { value: '3svc', label: '3 Services limit', flags: ['3_services_limitation'] },
      { value: '5svc', label: '5 Services limit', flags: [] },
      { value: '150svc', label: '150 Services limit', flags: ['unlimited_services', 'remove_service_limit'] },
      { value: 'unlimited', label: 'Unlimited Services', flags: ['unlimited_services'] },
    ],
  },
]

const cbDropdownAllFlags = new Set(
  checkboxDropdownFeatures.flatMap((cd) => [cd.baseFlag, ...(cd.uncheckedFlags || []), ...cd.options.flatMap((o) => o.flags)].filter(Boolean).map((f) => f!.toLowerCase())),
)

const cbDropdownEnabled = reactive<Record<string, boolean>>(
  Object.fromEntries(checkboxDropdownFeatures.map((cd) => [cd.featureName, false])),
)
const cbDropdownSelection = reactive<Record<string, string>>(
  Object.fromEntries(checkboxDropdownFeatures.map((cd) => [cd.featureName, cd.options[0].value])),
)

function syncCbDropdownFromFeatures() {
  for (const cd of checkboxDropdownFeatures) {
    const hasUnchecked = cd.uncheckedFlags?.length ? cd.uncheckedFlags.some((f) => formFeatures.has(f)) : false
    const hasBase = cd.baseFlag ? formFeatures.has(cd.baseFlag) : false
    const hasAnyOption = cd.options.some((o) => o.flags.length > 0 && o.flags.every((f) => formFeatures.has(f)))

    if (hasUnchecked) {
      cbDropdownEnabled[cd.featureName] = false
    } else if (hasBase || hasAnyOption) {
      cbDropdownEnabled[cd.featureName] = true
    } else {
      cbDropdownEnabled[cd.featureName] = cd.defaultEnabled ?? false
    }

    if (cbDropdownEnabled[cd.featureName]) {
      const matched = [...cd.options]
        .filter((o) => o.flags.length > 0 && o.flags.every((f) => formFeatures.has(f)))
        .sort((a, b) => b.flags.length - a.flags.length)[0]
      cbDropdownSelection[cd.featureName] = matched?.value ?? cd.defaultOption ?? cd.options[0].value
    }
  }
}

function applyCbDropdown(cd: CheckboxDropdownFeature) {
  if (cd.baseFlag) formFeatures.delete(cd.baseFlag)
  for (const o of cd.options) {
    for (const f of o.flags) formFeatures.delete(f)
  }
  if (cd.uncheckedFlags) {
    for (const f of cd.uncheckedFlags) formFeatures.delete(f)
  }

  if (cbDropdownEnabled[cd.featureName]) {
    if (cd.baseFlag) formFeatures.add(cd.baseFlag)
    const chosen = cd.options.find((o) => o.value === cbDropdownSelection[cd.featureName])
    if (chosen) {
      for (const f of chosen.flags) formFeatures.add(f)
    }
  } else if (cd.uncheckedFlags) {
    for (const f of cd.uncheckedFlags) formFeatures.add(f)
  }
}

function getCbDropdownForGroup(groupName: string): CheckboxDropdownFeature | undefined {
  return checkboxDropdownFeatures.find((cd) => cd.featureName === groupName)
}

watch(quotaUnlimited, (val) => {
  for (const [key, flag] of Object.entries(unlimitedFlagMap)) {
    if (val[key]) {
      formFeatures.add(flag)
    } else {
      formFeatures.delete(flag)
    }
  }
}, { deep: true })

watch(unlimitedSeats, (val) => {
  if (val) {
    formFeatures.add('unlimited_seats')
  } else {
    formFeatures.delete('unlimited_seats')
  }
})

const formValid = computed(() => !!formName.value && !!formDisplayName.value && domainGateErrors.value.length === 0)

const filteredEditorDomains = computed(() => {
  const hideFlag = (f: { name: string }) => !hiddenUnlimitedFlags.has(f.name.toLowerCase())
  const q = featureSearch.value?.toLowerCase()
  return featureStore.allDomains
    .map((domain) => {
      const isBundles = domain.id === 'bundles'
      return {
        ...domain,
        name: isBundles ? 'Apps' : domain.name,
        icon: isBundles ? 'mdi-apps' : domain.icon,
        color: isBundles ? '#7E57C2' : domain.color,
        features: domain.features.filter(
          (f) =>
            hideFlag(f) &&
            (!q ||
              f.business_name.toLowerCase().includes(q) ||
              f.name.toLowerCase().includes(q) ||
              f.description.toLowerCase().includes(q)),
        ),
      }
    })
    .filter((d) => d.features.length > 0)
})

interface DomainGateRule {
  domain: string
  gateFeature: string
  isAvailable: () => boolean
  message: string
}

const domainGateRules: DomainGateRule[] = [
  {
    domain: 'Payments',
    gateFeature: 'Payment Module',
    isAvailable: () => cbDropdownEnabled['Payment Module'] && cbDropdownSelection['Payment Module'] === 'available',
    message: 'Payment Module must be set to "Available" to use other Payments features. Either make it Available or remove the selected payment features (including unlimited flags for invoices and estimates).',
  },
  {
    domain: 'Communication',
    gateFeature: 'SMS Module',
    isAvailable: () => !!cbDropdownEnabled['SMS Module'],
    message: 'SMS Module must be enabled to use other Communication features. Either enable SMS Module or remove the selected communication features.',
  },
  {
    domain: 'Marketing',
    gateFeature: 'Marketing Module',
    isAvailable: () => cbDropdownEnabled['Marketing Module'] && cbDropdownSelection['Marketing Module'] === 'available',
    message: 'Marketing Module must be set to "Available" to use other Marketing features. Either make it Available or remove the selected marketing features (including unlimited campaign recipients).',
  },
]

const domainGateErrors = computed(() => {
  const errors: { severity: string; message: string }[] = []
  for (const rule of domainGateRules) {
    if (rule.isAvailable()) continue
    const domainMapping = domainFeatureFFMappingRaw[rule.domain]
    if (!domainMapping) continue
    const conflicting: string[] = []
    for (const [featureName, ffs] of Object.entries(domainMapping)) {
      if (featureName === rule.gateFeature) continue
      if (invertedFlagFeatures.has(featureName)) {
        const isEnabled = (ffs as string[]).every((ff) => !formFeatures.has(ff))
        if (isEnabled) conflicting.push(featureName)
      } else {
        const hasAny = (ffs as string[]).some((ff) => formFeatures.has(ff))
        if (hasAny) conflicting.push(featureName)
      }
    }
    if (conflicting.length > 0) {
      errors.push({
        severity: 'error',
        message: rule.message,
      })
    }
  }
  return errors
})

const allValidation = computed(() => [
  ...domainGateErrors.value,
  ...featureStore.validateFeatures([...formFeatures]),
])
const validationErrors = computed(() => allValidation.value.filter((m) => m.severity === 'error'))
const validationWarnings = computed(() => allValidation.value.filter((m) => m.severity === 'warning'))

watch(domainGateErrors, (errors) => {
  if (errors.length === 0) return
  const domains = filteredEditorDomains.value
  for (const err of errors) {
    const rule = domainGateRules.find((r) => r.message === err.message)
    if (!rule) continue
    const idx = domains.findIndex((d) => d.name === rule.domain)
    if (idx >= 0 && !openDomainPanels.value.includes(idx)) {
      openDomainPanels.value.push(idx)
    }
  }
})

function toggleFeature(name: string, value: any) {
  if (value) {
    formFeatures.add(name)
  } else {
    formFeatures.delete(name)
  }
}

function domainEnabledCount(domain: { features: { name: string; business_name: string }[] }) {
  const groups = groupDomainFeatures(domain.features)
  return groups.filter((group) => {
    if (getCbDropdownForGroup(group.name)) return !!cbDropdownEnabled[group.name]
    if (isLinkedGroup(group.name)) return isLinkedGroupEnabled(group.flags)
    if (invertedFlagFeatures.has(group.name)) return group.flags.every((f: any) => !formFeatures.has(f.name))
    return group.flags.some((f: any) => formFeatures.has(f.name))
  }).length
}

function getDomainGateWarning(domainName: string): string | null {
  const rule = domainGateRules.find((r) => r.domain === domainName)
  if (!rule || rule.isAvailable()) return null
  const domainMapping = domainFeatureFFMappingRaw[rule.domain]
  if (!domainMapping) return null
  const conflicting: string[] = []
  for (const [featureName, ffs] of Object.entries(domainMapping)) {
    if (featureName === rule.gateFeature) continue
    if (invertedFlagFeatures.has(featureName)) {
      if ((ffs as string[]).every((ff) => !formFeatures.has(ff))) conflicting.push(featureName)
    } else {
      if ((ffs as string[]).some((ff) => formFeatures.has(ff))) conflicting.push(featureName)
    }
  }
  if (conflicting.length === 0) return null
  return rule.message
}

function isFeatureGateConflict(domainName: string, featureGroupName: string): boolean {
  const rule = domainGateRules.find((r) => r.domain === domainName)
  if (!rule || rule.isAvailable()) return false
  if (featureGroupName === rule.gateFeature) return false
  const domainMapping = domainFeatureFFMappingRaw[rule.domain]
  if (!domainMapping) return false
  const ffs = domainMapping[featureGroupName]
  if (!ffs) return false
  if (invertedFlagFeatures.has(featureGroupName)) {
    return (ffs as string[]).every((ff) => !formFeatures.has(ff))
  }
  return (ffs as string[]).some((ff) => formFeatures.has(ff))
}

function groupDomainFeatures(features: any[]) {
  const byName = new Map<string, any[]>()
  for (const f of features) {
    if (!byName.has(f.business_name)) byName.set(f.business_name, [])
    byName.get(f.business_name)!.push(f)
  }
  return [...byName.entries()].map(([name, flags]) => ({ name, flags }))
}

function buildQuotas(): PackageQuotas {
  const result: any = {}
  for (const key of quotaKeys) {
    result[key] = quotaUnlimited[key] ? null : formQuotas[key]
  }
  return result as PackageQuotas
}

async function onSave() {
  saveError.value = ''
  try {
    if (isEdit.value) {
      await packageStore.updatePackage(route.params.id as string, {
        name: formName.value,
        display_name: formDisplayName.value,
        staff_slots: formStaffSlots.value,
        free: formFree.value,
        features: [...formFeatures],
        settings: { ...formSettings },
        quotas: buildQuotas(),
      })
      packageStore.setDeprecated(route.params.id as string, formDeprecated.value)
      saveSuccess.value = true
      setTimeout(() => router.push(`/packages/${route.params.id}`), 1000)
    } else {
      const newPkg = await packageStore.createPackage({
        name: formName.value,
        display_name: formDisplayName.value,
        staff_slots: formStaffSlots.value,
        free: formFree.value,
        features: [...formFeatures],
        settings: { ...formSettings },
        quotas: buildQuotas(),
      })
      if (!newPkg) return
      saveSuccess.value = true
      setTimeout(() => router.push(`/packages/${newPkg.id}`), 1000)
    }
  } catch (err: any) {
    saveError.value = err?.response?.data?.message || err?.message || 'Failed to save package'
  }
}

function goBack() {
  if (isEdit.value) {
    router.push(`/packages/${route.params.id}`)
  } else {
    router.push('/packages')
  }
}

onMounted(async () => {
  try {
    if (isEdit.value) {
      await packageStore.loadPackageById(route.params.id as string, true)
    }
  } catch (err: any) {
    loadError.value = err?.response?.data?.message || err?.message || 'Failed to load packages'
    return
  }

  if (!isEdit.value) {
    // Inverted flags: adding the flag makes the checkbox appear unchecked.
    // These features should start unselected on new packages.
    const defaultUncheckedInverted = [
      'hide_sms_channel_from_marketing', // SMS Campaigns
      'pkg.bus.pendo.deny',              // Pendo
      'allow_to_send_link',              // Block Links in Messages
    ]
    for (const ff of defaultUncheckedInverted) formFeatures.add(ff)
    syncCbDropdownFromFeatures()
  }

  if (isEdit.value) {
    const pkg = packageStore.getPackageById(route.params.id as string)
    if (pkg) {
      formName.value = pkg.name
      formDisplayName.value = pkg.display_name
      formStaffSlots.value = pkg.staff_slots
      formFree.value = pkg.free
      formDeprecated.value = pkg.deprecated

      formFeatures.clear()
      pkg.features.forEach((f) => formFeatures.add(f))

      Object.assign(formSettings, pkg.settings)

      for (const [key, flag] of Object.entries(unlimitedFlagMap)) {
        quotaUnlimited[key] = formFeatures.has(flag)
      }

      for (const key of quotaKeys) {
        const val = pkg.quotas[key]
        if (quotaUnlimited[key]) {
          formQuotas[key] = 0
        } else {
          formQuotas[key] = val ?? 0
        }
      }

      unlimitedSeats.value = formFeatures.has('unlimited_seats')
      syncCbDropdownFromFeatures()
      syncStorageFromBytes()
    }
  }
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.feature-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.feature-row:last-child {
  border-bottom: none;
}
.sticky-sidebar {
  position: sticky;
  top: 80px;
}
.w-100 {
  width: 100%;
}
.quota-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.quota-input {
  flex: 0 0 50%;
  max-width: 50%;
}
.quota-check {
  flex: 0 0 auto;
  white-space: nowrap;
}
.gate-conflict {
  background-color: rgba(244, 67, 54, 0.06);
  border-left: 3px solid #f44336;
  padding-left: 8px;
  border-radius: 4px;
}
.sidebar-card-title:hover {
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}
</style>
