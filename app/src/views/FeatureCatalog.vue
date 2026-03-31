<template>
  <v-container fluid class="pa-6">
    <!-- Search -->
    <v-text-field
      v-model="featureStore.searchQuery"
      placeholder="Search features by name, flag, or description..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      clearable
      hide-details
      class="mb-6"
      style="max-width: 600px;"
    />

    <!-- Expand / Collapse toggle -->
    <div class="d-flex align-center justify-end mb-3">
      <v-btn
        variant="text"
        density="compact"
        size="small"
        @click="toggleAll"
      >
        <v-icon start size="small">{{ allExpanded ? 'mdi-collapse-all-outline' : 'mdi-expand-all-outline' }}</v-icon>
        {{ allExpanded ? 'Collapse All' : 'Expand All' }}
      </v-btn>
    </div>

    <!-- Domain sections -->
    <v-expansion-panels v-model="openPanels" multiple variant="accordion">
      <v-expansion-panel
        v-for="domain in catalogDomains"
        :key="domain.id"
        rounded="lg"
        class="mb-2 border"
      >
        <v-expansion-panel-title>
          <div class="d-flex align-center" style="gap: 12px;">
            <v-avatar :color="domain.color" variant="tonal" size="36">
              <v-icon size="small">{{ domain.icon }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-2 font-weight-bold">{{ domain.name }}</div>
            </div>
          </div>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <v-table density="compact">
            <thead>
              <tr>
                <th class="font-weight-bold" style="width: 20%;">Feature</th>
                <th class="font-weight-bold" style="width: 30%;">Feature Flags</th>
                <th class="font-weight-bold" style="width: 50%;">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in flatFeatureRows(domain.features)" :key="`${domain.id}-${row.flag}`">
                <td>{{ row.featureName }}</td>
                <td class="text-caption text-medium-emphasis">{{ row.flag }}</td>
                <td class="text-caption text-medium-emphasis">{{ row.description }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFeatureStore } from '@/stores/features'

const featureStore = useFeatureStore()

const domainNameOverrides: Record<string, { name: string; icon?: string; color?: string }> = {
  bundles: { name: 'Apps and Bundles', icon: 'mdi-apps', color: '#7E57C2' },
}

const catalogDomains = computed(() =>
  featureStore.filteredDomains.map((d) => {
    const override = domainNameOverrides[d.id]
    return override ? { ...d, name: override.name, icon: override.icon ?? d.icon, color: override.color ?? d.color } : d
  }),
)

const openPanels = ref<number[]>([])
const allExpanded = computed(() => openPanels.value.length === catalogDomains.value.length)

function toggleAll() {
  if (allExpanded.value) {
    openPanels.value = []
  } else {
    openPanels.value = catalogDomains.value.map((_, i) => i)
  }
}

function flatFeatureRows(features: { business_name: string; name: string; description: string }[]) {
  return features.map((f) => ({
    featureName: f.business_name,
    flag: f.name,
    description: f.description,
  }))
}
</script>
