<template>
  <v-container fluid class="pa-6">
    <div class="mb-4">
      <p class="text-body-2 text-medium-emphasis">
        {{ sortedTemplates.length }} of {{ packageStore.filteredTemplates.length }} templates
      </p>
    </div>

    <!-- Filters -->
    <v-card variant="flat" class="border rounded-lg mb-4">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="packageStore.templateSearchQuery"
              placeholder="Search templates by display name or name"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="packageStore.templateFilterFeature"
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

    <!-- Template list -->
    <v-card v-if="sortedTemplates.length > 0" variant="flat" class="border rounded-lg">
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
          <tr v-for="pkg in sortedTemplates" :key="pkg.id" class="clickable-row" @click="goToPackage(pkg.id)">
            <td>
              <span class="font-weight-bold">{{ pkg.display_name }}</span>
            </td>
            <td class="text-caption text-medium-emphasis">{{ pkg.name }}</td>
            <td class="text-caption text-medium-emphasis">{{ formatDate(pkg.created_at) }}</td>
            <td class="text-caption text-medium-emphasis">{{ formatDate(pkg.updated_at) }}</td>
            <td class="text-right">
              <v-menu location="bottom end">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" icon="mdi-dots-vertical" @click.stop />
                </template>
                <v-list density="compact">
                  <v-list-item :to="`/packages/${pkg.id}?ref=templates`">
                    <div class="d-flex align-center" style="gap: 8px;"><v-icon size="small">mdi-eye-outline</v-icon><span class="text-body-2">View</span></div>
                  </v-list-item>
                  <v-list-item :to="`/packages/${pkg.id}/edit?ref=templates`">
                    <div class="d-flex align-center" style="gap: 8px;"><v-icon size="small">mdi-pencil-outline</v-icon><span class="text-body-2">Edit</span></div>
                  </v-list-item>
                  <v-list-item @click="onClone(pkg)">
                    <div class="d-flex align-center" style="gap: 8px;"><v-icon size="small">mdi-content-copy</v-icon><span class="text-body-2">Clone</span></div>
                  </v-list-item>
                  <v-list-item @click="onCreateFromTemplate(pkg)">
                    <div class="d-flex align-center" style="gap: 8px;"><v-icon size="small">mdi-package-variant-plus</v-icon><span class="text-body-2">Create Package</span></div>
                  </v-list-item>
                  <v-divider class="my-1" />
                  <v-list-item @click="onRemoveTemplate(pkg)">
                    <div class="d-flex align-center" style="gap: 8px;"><v-icon size="small">mdi-bookmark-remove-outline</v-icon><span class="text-body-2">Remove Template</span></div>
                  </v-list-item>
                </v-list>
              </v-menu>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Empty state -->
    <v-card
      v-if="sortedTemplates.length === 0"
      variant="flat"
      class="border rounded-lg pa-8 text-center"
    >
      <v-icon size="64" color="grey-lighten-1">mdi-file-document-outline</v-icon>
      <h3 class="text-h6 mt-4 mb-2">No templates yet</h3>
      <p class="text-body-2 text-medium-emphasis">
        Mark a package as a template to use it as a baseline for creating new packages.
      </p>
    </v-card>

    <!-- Remove template confirmation -->
    <v-dialog v-model="removeDialog" max-width="420">
      <v-card>
        <v-card-title>Remove Template</v-card-title>
        <v-card-text>
          Are you sure you want to remove <strong>{{ removeTarget?.display_name }}</strong> from templates?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="removeDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmRemoveTemplate">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePackageStore } from '@/stores/packages'
import { useFeatureStore } from '@/stores/features'
import type { Package } from '@/types'

const router = useRouter()
const packageStore = usePackageStore()
const featureStore = useFeatureStore()

const loadError = ref('')
const removeDialog = ref(false)
const removeTarget = ref<Package | null>(null)
type SortColumn = 'display_name' | 'name' | 'created_at' | 'updated_at'
const sortBy = ref<SortColumn>('display_name')
const sortDir = ref<'asc' | 'desc'>('asc')

const featureOptions = computed(() =>
  featureStore.allFeatures.map((f) => ({
    label: `${f.business_name} (${f.name})`,
    value: f.name,
  })),
)

const isDateColumn = (col: SortColumn) => col === 'created_at' || col === 'updated_at'

const sortedTemplates = computed(() => {
  const list = [...packageStore.filteredTemplates]
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
  router.push(`/packages/${id}?ref=templates`)
}

function onCreateFromTemplate(pkg: Package) {
  router.push({ path: '/packages/new', query: { from: pkg.id, ref: 'templates' } })
}

function onRemoveTemplate(pkg: Package) {
  removeTarget.value = pkg
  removeDialog.value = true
}

function confirmRemoveTemplate() {
  if (!removeTarget.value) return
  packageStore.setTemplate(removeTarget.value.id, false)
  removeDialog.value = false
}

function onClone(pkg: Package) {
  router.push({ path: '/packages/new', query: { from: pkg.id, ref: 'templates' } })
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
