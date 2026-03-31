import type { Domain, Feature } from '@/types'
import { domainFeatureFFMappingFlagsOnly, featureDescriptions } from './domainFeatureFFMapping'

const DOMAIN_META: Record<string, { icon: string; color: string; description: string }> = {
  scheduling: { icon: 'mdi-calendar-clock', color: '#4CAF50', description: 'Scheduling features' },
  payments: { icon: 'mdi-credit-card-outline', color: '#2196F3', description: 'Payments and invoicing features' },
  marketing: { icon: 'mdi-bullhorn-outline', color: '#9C27B0', description: 'Marketing and campaigns features' },
  communication: { icon: 'mdi-message-text-outline', color: '#FF9800', description: 'Communication features' },
  ai: { icon: 'mdi-brain', color: '#3F51B5', description: 'AI features' },
  business_administration: { icon: 'mdi-briefcase-outline', color: '#607D8B', description: 'Business administration features' },
  client_management: { icon: 'mdi-account-group-outline', color: '#009688', description: 'Client management features' },
  bundles: { icon: 'mdi-package-variant-closed', color: '#795548', description: 'Bundles and integrations' },
  license: { icon: 'mdi-license', color: '#673AB7', description: 'License-related flags' },
  other: { icon: 'mdi-dots-horizontal-circle-outline', color: '#9E9E9E', description: 'Other feature flags' },
  trial_spam_prevention: { icon: 'mdi-shield-alert-outline', color: '#F44336', description: 'Trial and spam prevention features' },
}

function slugifyDomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\\/]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
}

function titleFromFlag(flag: string): string {
  return flag
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function domainMeta(domainId: string, domainName: string) {
  return DOMAIN_META[domainId] ?? { icon: 'mdi-shape-outline', color: '#9E9E9E', description: `${domainName} features` }
}

export const domains: Domain[] = Object.entries(domainFeatureFFMappingFlagsOnly).map(([domainName, byFeature]) => {
  const id = slugifyDomain(domainName)
  const meta = domainMeta(id, domainName)
  let sortOrder = 0
  const features: Feature[] = []

  for (const [featureName, flags] of Object.entries(byFeature)) {
    for (const flag of flags) {
      sortOrder += 1
      features.push({
        id: flag,
        name: flag,
        business_name: featureName === 'Other' ? titleFromFlag(flag) : featureName,
        description: featureDescriptions[flag] || '',
        domain: id,
        packageable: true,
        value_type: 'boolean',
        dependencies: [],
        sort_order: sortOrder,
      })
    }
  }

  return { id, name: domainName, icon: meta.icon, color: meta.color, description: meta.description, features }
})

export function getAllFeatures() {
  return domains.flatMap((d) => d.features)
}

export function getFeatureByName(name: string) {
  return getAllFeatures().find((f) => f.name === name)
}

export function getDomainById(id: string) {
  return domains.find((d) => d.id === id)
}
