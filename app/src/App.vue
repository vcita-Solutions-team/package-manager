<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/Default.vue'
import BlankLayout from '@/layouts/Blank.vue'
import { getEnvironment, updateFavicon } from '@/api/client'

const route = useRoute()

onMounted(() => updateFavicon(getEnvironment()))

const layouts: Record<string, any> = {
  default: DefaultLayout,
  blank: BlankLayout,
}

const layout = computed(() => {
  const key = (route.meta.layout as string) || 'default'
  return layouts[key] || DefaultLayout
})
</script>
