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

    <div class="mb-4">
      <p class="text-body-2 text-medium-emphasis">
        Select two packages to see what's different between them.
      </p>
    </div>

    <!-- Package selectors -->
    <v-card variant="flat" class="border rounded-lg mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="5">
            <v-autocomplete
              v-model="leftId"
              :items="packageOptions"
              item-title="label"
              item-value="value"
              label="Package A"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-package-variant"
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center justify-center">
            <v-btn icon="mdi-swap-horizontal" variant="tonal" size="small" @click="swapPackages" />
          </v-col>
          <v-col cols="12" md="5">
            <v-autocomplete
              v-model="rightId"
              :items="packageOptions"
              item-title="label"
              item-value="value"
              label="Package B"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-package-variant"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Diff results -->
    <template v-if="leftPkg && rightPkg">
      <!-- Summary -->
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold text-error">{{ diff.onlyInA.length }}</div>
              <div class="text-caption text-medium-emphasis">Only in {{ leftPkg.display_name }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold text-success">{{ diff.common.length }}</div>
              <div class="text-caption text-medium-emphasis">Shared Features</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold text-info">{{ diff.onlyInB.length }}</div>
              <div class="text-caption text-medium-emphasis">Only in {{ rightPkg.display_name }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quotas comparison -->
      <v-card variant="flat" class="border rounded-lg mb-4">
        <v-card-title class="text-subtitle-1">
          <v-icon class="mr-2" size="small">mdi-counter</v-icon>
          Quota Comparison
        </v-card-title>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Quota</th>
              <th class="text-center">{{ leftPkg.display_name }}</th>
              <th class="text-center">{{ rightPkg.display_name }}</th>
              <th class="text-center">Diff</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in quotaRows" :key="q.key" :class="q.different ? 'bg-amber-lighten-5' : ''">
              <td class="font-weight-medium">{{ q.label }}</td>
              <td class="text-center">{{ formatQuotaVal(q.leftVal, q.key) }}</td>
              <td class="text-center">{{ formatQuotaVal(q.rightVal, q.key) }}</td>
              <td class="text-center">
                <v-chip v-if="q.different" size="x-small" :color="q.diffColor" variant="tonal">
                  {{ q.diffText }}
                </v-chip>
                <span v-else class="text-caption text-medium-emphasis">—</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <!-- Feature diff by domain -->
      <v-card variant="flat" class="border rounded-lg mb-4">
        <v-card-title class="text-subtitle-1">
          <v-icon class="mr-2" size="small">mdi-format-list-checks</v-icon>
          Feature Differences by Domain
        </v-card-title>
        <v-card-text>
          <div v-for="domainDiff in diff.byDomain" :key="domainDiff.domain.id" class="mb-4">
            <div class="d-flex align-center mb-2">
              <v-avatar :color="domainDiff.domain.color" variant="tonal" size="28" class="mr-2">
                <v-icon size="x-small">{{ domainDiff.domain.icon }}</v-icon>
              </v-avatar>
              <span class="text-subtitle-2 font-weight-bold">{{ domainDiff.domain.name }}</span>
            </div>

            <v-table density="compact">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th class="text-center" style="width: 120px;">{{ leftPkg.display_name }}</th>
                  <th class="text-center" style="width: 120px;">{{ rightPkg.display_name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in domainDiff.features"
                  :key="row.name"
                  :class="{
                    'bg-red-lighten-5': row.status === 'only-a',
                    'bg-blue-lighten-5': row.status === 'only-b',
                  }"
                >
                  <td>
                    <span class="font-weight-medium">{{ row.businessName }}</span>
                    <span class="text-caption text-medium-emphasis ml-2">({{ row.name }})</span>
                  </td>
                  <td class="text-center">
                    <v-icon v-if="row.inA" color="success" size="small">mdi-check-circle</v-icon>
                    <v-icon v-else color="grey-lighten-2" size="small">mdi-close-circle-outline</v-icon>
                  </td>
                  <td class="text-center">
                    <v-icon v-if="row.inB" color="success" size="small">mdi-check-circle</v-icon>
                    <v-icon v-else color="grey-lighten-2" size="small">mdi-close-circle-outline</v-icon>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card-text>
      </v-card>

      <!-- General info -->
      <v-card variant="flat" class="border rounded-lg">
        <v-card-title class="text-subtitle-1">
          <v-icon class="mr-2" size="small">mdi-information-outline</v-icon>
          General Information
        </v-card-title>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Property</th>
              <th class="text-center">{{ leftPkg.display_name }}</th>
              <th class="text-center">{{ rightPkg.display_name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr :class="leftPkg.staff_slots !== rightPkg.staff_slots ? 'bg-amber-lighten-5' : ''">
              <td class="font-weight-medium">Staff Slots</td>
              <td class="text-center">{{ leftPkg.staff_slots }}</td>
              <td class="text-center">{{ rightPkg.staff_slots }}</td>
            </tr>
            <tr>
              <td class="font-weight-medium">Total Features</td>
              <td class="text-center">{{ leftPkg.features.length }}</td>
              <td class="text-center">{{ rightPkg.features.length }}</td>
            </tr>
            <tr>
              <td class="font-weight-medium">Last Updated</td>
              <td class="text-center">{{ formatDate(leftPkg.updated_at) }}</td>
              <td class="text-center">{{ formatDate(rightPkg.updated_at) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>

    <!-- Empty state -->
    <v-card
      v-else
      variant="flat"
      class="border rounded-lg pa-12 text-center"
    >
      <v-icon size="80" color="grey-lighten-1">mdi-compare-horizontal</v-icon>
      <h3 class="text-h6 mt-4 mb-2">Select two packages to compare</h3>
      <p class="text-body-2 text-medium-emphasis">
        Choose a package in each dropdown above to see a detailed diff.
      </p>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePackageStore } from '@/stores/packages'
import { useFeatureStore } from '@/stores/features'
import { getFeatureByName } from '@/data/featureCatalog'
import type { Package, Domain } from '@/types'

const route = useRoute()
const packageStore = usePackageStore()
const featureStore = useFeatureStore()
const loadError = ref('')

const leftId = ref<string | null>(null)
const rightId = ref<string | null>(null)

const packageOptions = computed(() =>
  packageStore.packages.map((p) => ({ label: p.display_name, value: p.id })),
)

const leftPkg = computed(() => (leftId.value ? packageStore.getPackageById(leftId.value) : undefined))
const rightPkg = computed(() => (rightId.value ? packageStore.getPackageById(rightId.value) : undefined))

watch(() => route.query, (q) => {
  if (q.a) leftId.value = q.a as string
  if (q.b) rightId.value = q.b as string
}, { immediate: true })

interface DomainDiffRow {
  name: string
  businessName: string
  inA: boolean
  inB: boolean
  status: 'both' | 'only-a' | 'only-b'
}

interface DomainDiff {
  domain: Domain
  features: DomainDiffRow[]
}

const diff = computed(() => {
  if (!leftPkg.value || !rightPkg.value) {
    return { onlyInA: [], onlyInB: [], common: [], byDomain: [] as DomainDiff[] }
  }

  const setA = new Set(leftPkg.value.features)
  const setB = new Set(rightPkg.value.features)
  const allFeatures = new Set([...setA, ...setB])

  const onlyInA = [...allFeatures].filter((f) => setA.has(f) && !setB.has(f))
  const onlyInB = [...allFeatures].filter((f) => !setA.has(f) && setB.has(f))
  const common = [...allFeatures].filter((f) => setA.has(f) && setB.has(f))

  const byDomain: DomainDiff[] = featureStore.allDomains
    .map((domain) => {
      const features = domain.features
        .filter((f) => allFeatures.has(f.name))
        .map((f) => ({
          name: f.name,
          businessName: f.business_name,
          inA: setA.has(f.name),
          inB: setB.has(f.name),
          status: (setA.has(f.name) && setB.has(f.name)
            ? 'both'
            : setA.has(f.name)
              ? 'only-a'
              : 'only-b') as 'both' | 'only-a' | 'only-b',
        }))
      return { domain, features }
    })
    .filter((d) => d.features.length > 0)

  return { onlyInA, onlyInB, common, byDomain }
})

interface QuotaRow {
  key: string
  label: string
  leftVal: number | null
  rightVal: number | null
  different: boolean
  diffText: string
  diffColor: string
}

const quotaRows = computed<QuotaRow[]>(() => {
  if (!leftPkg.value || !rightPkg.value) return []
  const labels: Record<string, string> = {
    invoice_monthly_quota: 'Monthly Invoices',
    campaign_recipients_monthly_quota: 'Campaign Recipients',
    estimate_monthly_quota: 'Monthly Estimates',
    clients_credit: 'Client Limit',
    campaigns_credit: 'Campaign Credits',
    booking_credit: 'Booking Credits',
    sms_monthly_quota_us_canada: 'SMS (US/Canada)',
    sms_monthly_quota_other: 'SMS (International)',
    storage_quota: 'Storage',
  }
  return Object.entries(labels).map(([key, label]) => {
    const leftVal = (leftPkg.value!.quotas as any)[key]
    const rightVal = (rightPkg.value!.quotas as any)[key]
    const different = leftVal !== rightVal
    let diffText = ''
    let diffColor = 'grey'
    if (different) {
      if (leftVal === null && rightVal !== null) { diffText = 'A: ∞'; diffColor = 'info' }
      else if (leftVal !== null && rightVal === null) { diffText = 'B: ∞'; diffColor = 'info' }
      else if (leftVal !== null && rightVal !== null) {
        const delta = rightVal - leftVal
        diffText = delta > 0 ? `B +${delta}` : `B ${delta}`
        diffColor = delta > 0 ? 'success' : 'error'
      }
    }
    return { key, label, leftVal, rightVal, different, diffText, diffColor }
  })
})

function swapPackages() {
  const tmp = leftId.value
  leftId.value = rightId.value
  rightId.value = tmp
}

function formatQuotaVal(val: number | null, key?: string) {
  if (val === null) return 'Unlimited'
  if (key === 'storage_quota') return formatStorage(val)
  return val.toLocaleString()
}

function formatStorage(bytes: number): string {
  if (bytes === 0) return '0'
  if (bytes >= 1073741824) return `${+(bytes / 1073741824).toFixed(1)} GB`
  if (bytes >= 1048576) return `${+(bytes / 1048576).toFixed(0)} MB`
  return `${bytes} bytes`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(async () => {
  try {
    await packageStore.ensureLoaded()
  } catch (err: any) {
    loadError.value = err?.response?.data?.message || err?.message || 'Failed to load packages'
  }
})
</script>
