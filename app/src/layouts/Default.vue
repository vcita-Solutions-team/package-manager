<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent color="grey-lighten-5">
      <v-list-item
        :prepend-icon="rail ? 'mdi-package-variant' : undefined"
        class="pa-3"
      >
        <template v-if="!rail">
          <div class="text-subtitle-1 font-weight-bold text-primary">Package Manager</div>
          <div class="font-weight-bold" :style="{ fontSize: '14px', color: authStore.environment === 'production' ? '#131a46' : '#fab4cd' }">
            {{ authStore.environmentLabel }}
          </div>
        </template>
      </v-list-item>

      <v-divider />

      <v-list density="comfortable" nav>
        <template v-for="(item, i) in navItems" :key="i">
          <v-divider v-if="'divider' in item" class="my-2" />
          <v-list-item
            v-else
            :to="item.to"
            :prepend-icon="item.icon"
            :title="item.title"
            rounded="lg"
            class="mb-1"
            color="primary"
          />
        </template>
      </v-list>

      <template #append>
        <v-divider />
        <div class="pa-3">
          <div v-if="!rail" class="d-flex align-center justify-space-between">
            <div class="d-flex align-center" style="gap: 8px; min-width: 0;">
              <v-icon size="small" color="primary">mdi-account-circle</v-icon>
              <span class="text-body-2 text-truncate">{{ authStore.operator?.name || 'Operator' }}</span>
            </div>
            <v-menu location="top end">
              <template #activator="{ props }">
                <v-btn
                  icon="mdi-dots-vertical"
                  variant="text"
                  size="x-small"
                  v-bind="props"
                />
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item @click="authStore.setReadOnly(!authStore.readOnly)">
                  <div class="d-flex align-center" style="gap: 8px;">
                    <v-icon size="small">{{ authStore.readOnly ? 'mdi-lock' : 'mdi-lock-open-variant' }}</v-icon>
                    <span class="text-body-2">Read-only</span>
                  </div>
                  <template #append>
                    <v-switch
                      :model-value="authStore.readOnly"
                      density="compact"
                      hide-details
                      color="primary"
                      @update:model-value="authStore.setReadOnly($event as boolean)"
                      @click.stop
                    />
                  </template>
                </v-list-item>
                <v-divider class="my-1" />
                <v-list-item @click="authStore.logout()">
                  <div class="d-flex align-center" style="gap: 8px;"><v-icon size="small">mdi-logout</v-icon><span class="text-body-2">Logout</span></div>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
          <v-menu v-else location="right">
            <template #activator="{ props }">
              <v-btn
                icon="mdi-account-circle"
                variant="text"
                size="small"
                v-bind="props"
              />
            </template>
            <v-list density="compact" min-width="200">
              <v-list-item @click="authStore.setReadOnly(!authStore.readOnly)">
                <div class="d-flex align-center" style="gap: 8px;">
                  <v-icon size="small">{{ authStore.readOnly ? 'mdi-lock' : 'mdi-lock-open-variant' }}</v-icon>
                  <span class="text-body-2">Read-only</span>
                </div>
                <template #append>
                  <v-switch
                    :model-value="authStore.readOnly"
                    density="compact"
                    hide-details
                    color="primary"
                    @update:model-value="authStore.setReadOnly($event as boolean)"
                    @click.stop
                  />
                </template>
              </v-list-item>
              <v-divider class="my-1" />
              <v-list-item @click="authStore.logout()">
                <div class="d-flex align-center" style="gap: 8px;"><v-icon size="small">mdi-logout</v-icon><span class="text-body-2">Logout</span></div>
              </v-list-item>
            </v-list>
          </v-menu>
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
        <v-chip
          v-if="authStore.readOnly"
          color="warning"
          size="small"
          variant="tonal"
          prepend-icon="mdi-lock"
        >
          Read-only
        </v-chip>
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

type NavLink = { title: string; icon: string; to: string }
type NavDivider = { divider: true }
type NavItem = NavLink | NavDivider

const navItems: NavItem[] = [
  { title: 'Packages', icon: 'mdi-package-variant-closed', to: '/' },
  { title: 'Templates', icon: 'mdi-file-document-outline', to: '/templates' },
  { title: 'Compare', icon: 'mdi-compare-horizontal', to: '/compare' },
  { title: 'Feature Catalog', icon: 'mdi-format-list-checks', to: '/features' },
  { divider: true },
  { title: 'Presell', icon: 'mdi-tag-multiple-outline', to: '/presell' },
]

const navLinks = navItems.filter((n): n is NavLink => 'to' in n)

const currentPageTitle = computed(() => {
  const item = navLinks.find((n) => n.to === route.path)
  return item?.title || route.meta.title || ''
})
</script>
