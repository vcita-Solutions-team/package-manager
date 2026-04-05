import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const csvPath = path.join(repoRoot, 'docs', 'apps-catalog.csv')
const tsPath = path.join(repoRoot, 'app', 'src', 'data', 'appsCatalog.ts')

const CURRENCIES = ['usd', 'eur', 'gbp', 'chf']

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else { field += ch }
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === ',') { row.push(field); field = ''; continue }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    if (ch === '\r') continue
    field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

async function main() {
  const csvText = await fs.readFile(csvPath, 'utf8')
  const rawRows = parseCsv(csvText)
  if (rawRows.length < 2) {
    console.log('CSV has no data rows — writing empty catalog.')
  }

  const header = rawRows[0]?.map(h => h.trim().toLowerCase()) ?? []
  const catIdx = header.indexOf('category')
  const appIdx = header.indexOf('app')
  const priceIdxs = {}
  for (const cur of CURRENCIES) {
    priceIdxs[cur] = header.indexOf(`price_${cur}`)
  }

  if (catIdx === -1 || appIdx === -1) {
    throw new Error('CSV must have columns: category, app, price_usd, price_eur, price_gbp, price_chf')
  }

  const byCategory = {}
  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i]
    const category = (r[catIdx] ?? '').trim()
    const app = (r[appIdx] ?? '').trim()
    if (!category || !app) continue
    const entry = { app }
    for (const cur of CURRENCIES) {
      entry[`price_${cur}`] = priceIdxs[cur] >= 0 ? (r[priceIdxs[cur]] ?? '').trim() : ''
    }
    if (!byCategory[category]) byCategory[category] = []
    byCategory[category].push(entry)
  }

  const rawType = `{ app: string; price_usd: string; price_eur: string; price_gbp: string; price_chf: string }`

  const ts = `import type { App, AppCategory } from '@/types'

/**
 * Auto-generated from docs/apps-catalog.csv — do not edit manually.
 * Run: npm run sync:apps-catalog
 */
export const appsByCategoryRaw: Record<string, ${rawType}[]> = ${JSON.stringify(byCategory, null, 2)}

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
`

  await fs.writeFile(tsPath, ts, 'utf8')
  const appCount = Object.values(byCategory).flat().length
  console.log(`Synced ${appCount} apps in ${Object.keys(byCategory).length} categories → ${tsPath}`)
}

main().catch((err) => { console.error(err.message); process.exit(1) })
