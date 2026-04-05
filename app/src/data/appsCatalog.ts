import type { App, AppCategory } from '@/types'

/**
 * Auto-generated from docs/apps-catalog.csv — do not edit manually.
 * Run: npm run sync:apps-catalog
 */
export const appsByCategoryRaw: Record<string, { app: string; price_usd: string; price_eur: string; price_gbp: string; price_chf: string }[]> = {
  "Client Management": [
    {
      "app": "app.rove",
      "price_usd": "7",
      "price_eur": "6.5",
      "price_gbp": "6",
      "price_chf": ""
    },
    {
      "app": "Facebook Messenger",
      "price_usd": "10",
      "price_eur": "10",
      "price_gbp": "8",
      "price_chf": ""
    },
    {
      "app": "Lead Forms",
      "price_usd": "",
      "price_eur": "",
      "price_gbp": "",
      "price_chf": ""
    }
  ],
  "Other": [
    {
      "app": "Email Signature",
      "price_usd": "5",
      "price_eur": "5",
      "price_gbp": "4",
      "price_chf": ""
    },
    {
      "app": "Google Analytics",
      "price_usd": "10",
      "price_eur": "10",
      "price_gbp": "10",
      "price_chf": ""
    },
    {
      "app": "Zapier",
      "price_usd": "",
      "price_eur": "",
      "price_gbp": "",
      "price_chf": ""
    },
    {
      "app": "Website Builder",
      "price_usd": "23.95",
      "price_eur": "23.95",
      "price_gbp": "17.95",
      "price_chf": ""
    },
    {
      "app": "Website Builder - DIFM",
      "price_usd": "49.95",
      "price_eur": "",
      "price_gbp": "",
      "price_chf": ""
    }
  ],
  "Payments": [
    {
      "app": "QuickBooks",
      "price_usd": "10",
      "price_eur": "10",
      "price_gbp": "10",
      "price_chf": ""
    }
  ],
  "Marketing": [
    {
      "app": "Pro Campaign Editor",
      "price_usd": "10",
      "price_eur": "9.5",
      "price_gbp": "8.5",
      "price_chf": ""
    }
  ],
  "Communication": [
    {
      "app": "Calls & Texting",
      "price_usd": "15",
      "price_eur": "",
      "price_gbp": "",
      "price_chf": ""
    },
    {
      "app": "Business Calls",
      "price_usd": "20",
      "price_eur": "20",
      "price_gbp": "16",
      "price_chf": "20"
    },
    {
      "app": "Business Texting",
      "price_usd": "15",
      "price_eur": "15",
      "price_gbp": "12",
      "price_chf": "15"
    },
    {
      "app": "AI Receptionist - 75 calls",
      "price_usd": "75",
      "price_eur": "",
      "price_gbp": "",
      "price_chf": ""
    },
    {
      "app": "AI Receptionist - 200 calls",
      "price_usd": "30",
      "price_eur": "",
      "price_gbp": "",
      "price_chf": ""
    }
  ],
  "Scheduling": [
    {
      "app": "SmartSlots",
      "price_usd": "24.95",
      "price_eur": "22.95",
      "price_gbp": "19.95",
      "price_chf": ""
    },
    {
      "app": "Reserve with Google",
      "price_usd": "",
      "price_eur": "",
      "price_gbp": "",
      "price_chf": ""
    }
  ]
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  communication: { icon: 'mdi-message-text-outline', color: '#FF9800' },
  marketing: { icon: 'mdi-bullhorn-outline', color: '#9C27B0' },
  scheduling: { icon: 'mdi-calendar-clock', color: '#4CAF50' },
  payments: { icon: 'mdi-credit-card-outline', color: '#2196F3' },
  ai: { icon: 'mdi-brain', color: '#3F51B5' },
  integrations: { icon: 'mdi-puzzle-outline', color: '#009688' },
  client_management: { icon: 'mdi-account-group-outline', color: '#009688' },
  business_administration: { icon: 'mdi-briefcase-outline', color: '#607D8B' },
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function categoryMeta(id: string) {
  return CATEGORY_META[id] ?? { icon: 'mdi-apps', color: '#7E57C2' }
}

export const appCategories: AppCategory[] = Object.entries(appsByCategoryRaw).map(
  ([categoryName, items]) => {
    const id = slugify(categoryName)
    const meta = categoryMeta(id)
    return {
      id,
      name: categoryName,
      icon: meta.icon,
      color: meta.color,
      apps: items.map((item) => ({
        name: item.app,
        category: categoryName,
        price_usd: item.price_usd,
        price_eur: item.price_eur,
        price_gbp: item.price_gbp,
        price_chf: item.price_chf,
      })),
    }
  },
)

export function getAllApps(): App[] {
  return appCategories.flatMap((c) => c.apps)
}
