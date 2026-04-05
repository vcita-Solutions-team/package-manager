<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent color="grey-lighten-5">
      <v-list-item
        :prepend-icon="rail ? 'mdi-package-variant' : undefined"
        class="pa-3"
      >
        <template v-if="!rail">
          <div class="text-subtitle-1 font-weight-bold text-primary">Package Manager</div>
          <div class="text-caption text-medium-emphasis">Configuration Tool</div>
        </template>
      </v-list-item>

      <v-divider />

      <v-list density="comfortable" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          rounded="lg"
          class="mb-1"
          color="primary"
        />
      </v-list>

      <template #append>
        <v-divider />
        <div class="pa-3">
          <div v-if="!rail" class="d-flex align-center justify-space-between">
            <div class="d-flex align-center" style="gap: 8px; min-width: 0;">
              <v-icon size="small" color="primary">mdi-account-circle</v-icon>
              <span class="text-body-2 text-truncate">{{ authStore.operator?.name || 'Operator' }}</span>
            </div>
            <v-btn
              icon="mdi-logout"
              variant="text"
              size="x-small"
              @click="authStore.logout()"
            />
          </div>
          <v-btn
            v-else
            icon="mdi-account-circle"
            variant="text"
            size="small"
            @click="authStore.logout()"
          />
        </div>
        <v-divider />
        <div class="pa-2">
          <v-btn
            :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            variant="text"
            size="small"
            block
            @click="rail = !rail"
          />
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar density="comfortable" flat border="b">
      <template #prepend>
        <div id="appbar-nav" class="d-flex align-center" />
      </template>
      <v-app-bar-title class="text-body-1">
        <span class="text-medium-emphasis">{{ currentPageTitle }}</span>
      </v-app-bar-title>
      <template #append>
        <div id="appbar-actions" class="d-flex align-center" style="gap: 8px; margin-right: 24px;" />
      </template>
    </v-app-bar>

    <v-main>
      <slot />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const drawer = ref(true)
const rail = ref(false)

onMounted(async () => {
  if (authStore.isAuthenticated && !authStore.operator) {
    await authStore.fetchOperator()
  }
})

const navItems = [
  { title: 'Packages', icon: 'mdi-package-variant-closed', to: '/' },
  { title: 'Templates', icon: 'mdi-file-document-outline', to: '/templates' },
  { title: 'Compare', icon: 'mdi-compare-horizontal', to: '/compare' },
  { title: 'Feature Catalog', icon: 'mdi-format-list-checks', to: '/features' },
  { title: 'Apps Catalog', icon: 'mdi-apps', to: '/apps' },
]

const currentPageTitle = computed(() => {
  const item = navItems.find((n) => n.to === route.path)
  return item?.title || route.meta.title || ''
})
</script>
