import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Feature, Domain, ValidationMessage } from '@/types'
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

  function validateFeatures(enabledFeatures: string[]): ValidationMessage[] {
    const messages: ValidationMessage[] = []
    const enabledSet = new Set(enabledFeatures)

    for (const featureName of enabledFeatures) {
      const feature = getFeatureByName(featureName)
      if (!feature) continue

      for (const dep of feature.dependencies) {
        if (dep.type === 'requires' && !enabledSet.has(dep.feature_name)) {
          const requiredFeature = getFeatureByName(dep.feature_name)
          messages.push({
            severity: 'error',
            feature: feature.business_name,
            message: `${feature.business_name} requires ${requiredFeature?.business_name || dep.feature_name} to be enabled`,
            related_features: [dep.feature_name],
          })
        }

        if (dep.type === 'coupled' && !enabledSet.has(dep.feature_name)) {
          const coupledFeature = getFeatureByName(dep.feature_name)
          messages.push({
            severity: 'warning',
            feature: feature.business_name,
            message: `${feature.business_name} works best with ${coupledFeature?.business_name || dep.feature_name}`,
            related_features: [dep.feature_name],
          })
        }

        if (dep.type === 'conflicts' && enabledSet.has(dep.feature_name)) {
          const conflictFeature = getFeatureByName(dep.feature_name)
          messages.push({
            severity: 'error',
            feature: feature.business_name,
            message: `${feature.business_name} conflicts with ${conflictFeature?.business_name || dep.feature_name}`,
            related_features: [dep.feature_name],
          })
        }
      }
    }

    return messages
  }

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
    validateFeatures,
    getFeatureDomainColor,
    getFeatureDomainName,
  }
})
