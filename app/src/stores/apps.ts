import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppCategory } from '@/types'
import { appCategories } from '@/data/appsCatalog'

export const useAppStore = defineStore('apps', () => {
  const allCategories = ref<AppCategory[]>(appCategories)
  const searchQuery = ref('')

  const filteredCategories = computed(() => {
    if (!searchQuery.value) return allCategories.value

    const q = searchQuery.value.toLowerCase()
    return allCategories.value
      .map((cat) => ({
        ...cat,
        apps: cat.apps.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.apps.length > 0)
  })

  const totalAppCount = computed(() => allCategories.value.reduce((sum, c) => sum + c.apps.length, 0))

  return {
    allCategories,
    searchQuery,
    filteredCategories,
    totalAppCount,
  }
})
