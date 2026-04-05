<template>
  <v-container fluid class="pa-6">
    <!-- Search -->
    <v-text-field
      v-model="appStore.searchQuery"
      placeholder="Search apps by name or category..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      clearable
      hide-details
      class="mb-6"
      style="max-width: 600px;"
    />

    <!-- Empty state -->
    <v-alert
      v-if="appStore.totalAppCount === 0"
      type="info"
      variant="tonal"
      class="mb-6"
    >
      No apps in the catalog yet. Update <code>docs/apps-catalog.csv</code> and run
      <code>npm run sync:apps-catalog</code> to populate.
    </v-alert>

    <!-- Single table -->
    <v-table v-if="appStore.totalAppCount > 0" density="compact">
      <thead>
        <tr>
          <th class="font-weight-bold" style="cursor: pointer; user-select: none;" @click="toggleSort('category')">
            Category
            <v-icon size="x-small" class="ml-1">{{ sortField === 'category' ? sortIcon : 'mdi-swap-vertical' }}</v-icon>
          </th>
          <th class="font-weight-bold" style="cursor: pointer; user-select: none;" @click="toggleSort('name')">
            App
            <v-icon size="x-small" class="ml-1">{{ sortField === 'name' ? sortIcon : 'mdi-swap-vertical' }}</v-icon>
          </th>
          <th class="font-weight-bold text-center">USD</th>
          <th class="font-weight-bold text-center">EUR</th>
          <th class="font-weight-bold text-center">GBP</th>
          <th class="font-weight-bold text-center">CHF</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="app in allApps" :key="`${app.category}-${app.name}`">
          <td class="text-caption text-medium-emphasis">{{ app.category }}</td>
          <td>{{ app.name }}</td>
          <td class="text-caption text-medium-emphasis text-center">{{ app.price_usd ? `$${app.price_usd}` : '' }}</td>
          <td class="text-caption text-medium-emphasis text-center">{{ app.price_eur ? `€${app.price_eur}` : '' }}</td>
          <td class="text-caption text-medium-emphasis text-center">{{ app.price_gbp ? `£${app.price_gbp}` : '' }}</td>
          <td class="text-caption text-medium-emphasis text-center">{{ app.price_chf ? `CHF ${app.price_chf}` : '' }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/apps'

const appStore = useAppStore()

const sortField = ref<'name' | 'category' | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(field: 'name' | 'category') {
  if (sortField.value === field) {
    if (sortDir.value === 'asc') sortDir.value = 'desc'
    else { sortField.value = null; sortDir.value = 'asc' }
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

const sortIcon = computed(() => sortDir.value === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down')

const allApps = computed(() => {
  const apps = appStore.filteredCategories.flatMap((cat) => cat.apps)
  if (!sortField.value) return apps
  const field = sortField.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...apps].sort((a, b) => dir * a[field].localeCompare(b[field]))
})
</script>
