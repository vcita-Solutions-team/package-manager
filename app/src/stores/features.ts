import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Feature, Domain } from '@/types'
import { domains, getAllFeatures, getFeatureByName } from '@/data/featureCatalog'

export const useFeatureStore = defineStore('features', () => {
  const allDomains = ref<Domain[]>(domains)
  const searchQuery = ref('')

  const allFeatures = computed(() => getAllFeatures())

  const totalFeatureCount = computed(() => allFeatures.value.length)

  const filteredDomains = computed(() => {
    if (!searchQuery.value) return allDomains.value

    const q = searchQuery.value.toLowerCase()
    return allDomains.value
      .map((domain) => ({
        ...domain,
        features: domain.features.filter(
          (f) =>
            f.business_name.toLowerCase().includes(q) ||
            f.name.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q),
        ),
      }))
      .filter((domain) => domain.features.length > 0)
  })

  function getFeatureDomainColor(featureName: string): string {
    const feature = getFeatureByName(featureName)
    if (!feature) return '#666'
    const domain = allDomains.value.find((d) => d.id === feature.domain)
    return domain?.color || '#666'
  }

  function getFeatureDomainName(featureName: string): string {
    const feature = getFeatureByName(featureName)
    if (!feature) return ''
    const domain = allDomains.value.find((d) => d.id === feature.domain)
    return domain?.name || ''
  }

  return {
    allDomains,
    allFeatures,
    totalFeatureCount,
    searchQuery,
    filteredDomains,
    getFeatureDomainColor,
    getFeatureDomainName,
  }
})
