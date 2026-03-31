<template>
  <v-container fluid class="pa-6">
    <Teleport to="#appbar-actions">
      <v-btn color="primary" size="small" prepend-icon="mdi-plus" to="/packages/new">
        Create Package
      </v-btn>
    </Teleport>

    <!-- Header -->
    <div class="mb-4">
      <p class="text-body-2 text-medium-emphasis">
        {{ sortedPackages.length }} of {{ packageStore.packages.length }} packages
      </p>
    </div>

    <!-- Filters -->
    <v-card variant="flat" class="border rounded-lg mb-4">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="packageStore.searchQuery"
              placeholder="Search packages by display name or name"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-autocomplete
              v-model="packageStore.filterFeature"
              :items="featureOptions"
              item-title="label"
              item-value="value"
              placeholder="Filter by feature flag"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-filter-variant"
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex justify-end">
            <v-switch
              v-model="hideDeprecated"
              label="Active only"
              density="compact"
              hide-details
              color="success"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

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

    <!-- Package list -->
    <v-card v-if="sortedPackages.length > 0" variant="flat" class="border rounded-lg">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>
              <v-btn variant="text" size="small" class="px-0 text-none" @click="toggleSort('display_name')">
                Display Name
                <v-icon end size="x-small">{{ sortIcon('display_name') }}</v-icon>
              </v-btn>
            </th>
            <th>
              <v-btn variant="text" size="small" class="px-0 text-none" @click="toggleSort('name')">
                Name
                <v-icon end size="x-small">{{ sortIcon('name') }}</v-icon>
              </v-btn>
            </th>
            <th>
              <v-btn variant="text" size="small" class="px-0 text-none" @click="toggleSort('created_at')">
                Created
                <v-icon end size="x-small">{{ sortIcon('created_at') }}</v-icon>
              </v-btn>
            </th>
            <th>
              <v-btn variant="text" size="small" class="px-0 text-none" @click="toggleSort('updated_at')">
                Updated
                <v-icon end size="x-small">{{ sortIcon('updated_at') }}</v-icon>
              </v-btn>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pkg in sortedPackages" :key="pkg.id" class="clickable-row" @click="goToPackage(pkg.id)">
            <td>
              <div class="d-flex align-center" style="gap: 8px;">
                <span class="font-weight-bold">{{ pkg.display_name }}</span>
                <v-tooltip v-if="pkg.deprecated" text="Deprecated" location="top">
                  <template #activator="{ props }">
                    <v-icon v-bind="props" icon="mdi-archive-off-outline" size="small" color="grey" />
                  </template>
                </v-tooltip>
              </div>
            </td>
            <td class="text-caption text-medium-emphasis">{{ pkg.name }}</td>
            <td class="text-caption text-medium-emphasis">{{ formatDate(pkg.created_at) }}</td>
            <td class="text-caption text-medium-emphasis">{{ formatDate(pkg.updated_at) }}</td>
            <td class="text-right">
              <v-btn size="small" variant="text" color="primary" :to="`/packages/${pkg.id}`" @click.stop>View</v-btn>
              <v-btn size="small" variant="text" :to="`/packages/${pkg.id}/edit`" @click.stop>Edit</v-btn>
              <v-btn size="small" variant="text" icon="mdi-content-copy" @click.stop.prevent="onClone(pkg)" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Empty state -->
    <v-card
      v-if="sortedPackages.length === 0"
      variant="flat"
      class="border rounded-lg pa-8 text-center"
    >
      <v-icon size="64" color="grey-lighten-1">mdi-package-variant</v-icon>
      <h3 class="text-h6 mt-4 mb-2">No packages found</h3>
      <p class="text-body-2 text-medium-emphasis">
        Try adjusting your search or filter criteria.
      </p>
    </v-card>

    <!-- Clone dialog -->
    <v-dialog v-model="cloneDialog" max-width="500">
      <v-card>
        <v-card-title>Clone Package</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Create a copy of <strong>{{ cloneSource?.display_name }}</strong>
          </p>
          <v-text-field
            v-model="cloneName"
            label="Package name (internal)"
            variant="outlined"
            density="compact"
            class="mb-2"
          />
          <v-text-field
            v-model="cloneDisplayName"
            label="Display name"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cloneDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmClone">Clone</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePackageStore } from '@/stores/packages'
import { useFeatureStore } from '@/stores/features'
import type { Package } from '@/types'

const router = useRouter()
const packageStore = usePackageStore()
const featureStore = useFeatureStore()

const cloneDialog = ref(false)
const cloneSource = ref<Package | null>(null)
const cloneName = ref('')
const cloneDisplayName = ref('')
const loadError = ref('')
type SortColumn = 'display_name' | 'name' | 'created_at' | 'updated_at'
const sortBy = ref<SortColumn>('display_name')
const sortDir = ref<'asc' | 'desc'>('asc')
const hideDeprecated = ref(localStorage.getItem('hideDeprecated') !== 'false')
watch(hideDeprecated, (v) => localStorage.setItem('hideDeprecated', String(v)))

const featureOptions = computed(() =>
  featureStore.allFeatures.map((f) => ({
    label: `${f.business_name} (${f.name})`,
    value: f.name,
  })),
)

const isDateColumn = (col: SortColumn) => col === 'created_at' || col === 'updated_at'

const sortedPackages = computed(() => {
  const filtered = hideDeprecated.value
    ? packageStore.filteredPackages.filter((p) => !p.deprecated)
    : packageStore.filteredPackages
  const list = [...filtered]
  list.sort((a, b) => {
    let cmp: number
    if (isDateColumn(sortBy.value)) {
      const la = new Date(a[sortBy.value] || 0).getTime()
      const lb = new Date(b[sortBy.value] || 0).getTime()
      cmp = la - lb
    } else {
      const left = (a[sortBy.value] || '').toString().toLowerCase()
      const right = (b[sortBy.value] || '').toString().toLowerCase()
      cmp = left.localeCompare(right)
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
  return list
})

function formatDate(iso: string) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toggleSort(column: SortColumn) {
  if (sortBy.value === column) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortBy.value = column
  sortDir.value = isDateColumn(column) ? 'desc' : 'asc'
}

function sortIcon(column: SortColumn) {
  if (sortBy.value !== column) return 'mdi-unfold-more-horizontal'
  return sortDir.value === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'
}

function goToPackage(id: string) {
  router.push(`/packages/${id}`)
}

function onClone(pkg: Package) {
  cloneSource.value = pkg
  cloneName.value = pkg.name + '_copy'
  cloneDisplayName.value = pkg.display_name + ' (Copy)'
  cloneDialog.value = true
}

async function confirmClone() {
  if (!cloneSource.value) return
  try {
    const newPkg = await packageStore.clonePackage(cloneSource.value.id, cloneName.value, cloneDisplayName.value)
    cloneDialog.value = false
    if (newPkg) {
      router.push(`/packages/${newPkg.id}`)
    }
  } catch (err: any) {
    loadError.value = err?.response?.data?.message || err?.message || 'Failed to clone package'
  }
}

onMounted(async () => {
  try {
    await packageStore.loadPackages(true)
  } catch (err: any) {
    loadError.value = err?.response?.data?.message || err?.message || 'Failed to load packages'
  }
})
</script>

<style scoped>
.clickable-row {
  cursor: pointer;
}
.clickable-row:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}
</style>
