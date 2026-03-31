import fs from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SHEET_ID = '1yXx8M48F_YlwaO6X-kyDvPlMLaXO8-HxXPkn9hzSzN4'
const GID = '99010819'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const docsCsvPath = path.join(repoRoot, 'docs', 'domain-feature-ff-mapping.csv')
const mappingTsPath = path.join(repoRoot, 'app', 'src', 'data', 'domainFeatureFFMapping.ts')

function fetchText(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          if (redirectCount > 5) {
            reject(new Error('Too many redirects when fetching spreadsheet CSV'))
            return
          }
          const nextUrl = new URL(res.headers.location, url).toString()
          resolve(fetchText(nextUrl, redirectCount + 1))
          return
        }
        if (status < 200 || status >= 300) {
          reject(new Error(`Failed to fetch spreadsheet CSV: HTTP ${status}`))
          return
        }
        const chunks = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      })
      .on('error', reject)
  })
}

function parseCsv(csvText) {
  const rows = []
  let row = []
  let field = ''
  let i = 0
  let inQuotes = false

  while (i < csvText.length) {
    const char = csvText[i]

    if (inQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
      continue
    }
    if (char === '\r') {
      i += 1
      continue
    }

    field += char
    i += 1
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

const KNOWN_DOMAINS = new Set([
  'Bundles',
  'License',
  'AI',
  'Client management',
  'Scheduling',
  'Payments',
  'Communication',
  'Marketing',
  'Business Administration',
  'Trial \\ Spam prevention',
  'Other',
])

function findHeaderRow(rawRows) {
  for (let i = 0; i < rawRows.length; i += 1) {
    const lower = rawRows[i].map((c) => c.trim().toLowerCase())
    const hasDomainLike = lower.includes('domain') || lower.includes('category')
    const hasFfLike =
      lower.includes('ff') ||
      lower.includes('feature in the package') ||
      lower.includes('feature flag') ||
      lower.includes('flag') ||
      lower.includes('feature')
    if (hasDomainLike && hasFfLike) return i
  }
  return -1
}

function toDomainFeatureFfRows(rawRows) {
  if (rawRows.length === 0) throw new Error('Spreadsheet CSV is empty')

  const headerRowIdx = findHeaderRow(rawRows)
  if (headerRowIdx === -1) {
    throw new Error('Unsupported CSV format: could not find a header row with domain/category and ff columns')
  }

  const header = rawRows[headerRowIdx].map((h) => h.trim().toLowerCase())
  const findIndex = (candidates) => header.findIndex((h) => candidates.includes(h))
  const categoryIdx = findIndex(['category'])
  const domainIdx = findIndex(['domain'])
  const featureIdx = findIndex(['feature', 'business feature'])
  const ffIdx = findIndex(['ff', 'feature in the package', 'feature flag', 'flag'])

  const rows = []
  let currentDomain = ''

  for (let i = headerRowIdx + 1; i < rawRows.length; i += 1) {
    const r = rawRows[i]
    const categoryValue = categoryIdx >= 0 ? (r[categoryIdx] ?? '').trim() : ''
    const domainValue = domainIdx >= 0 ? (r[domainIdx] ?? '').trim() : ''

    if (domainValue) currentDomain = domainValue
    if (categoryValue && (KNOWN_DOMAINS.has(categoryValue) || !currentDomain)) currentDomain = categoryValue
    if (!currentDomain) continue

    const featureValue = featureIdx >= 0 ? (r[featureIdx] ?? '').trim() : ''
    const ffValue = ffIdx >= 0 ? (r[ffIdx] ?? '').trim() : ''
    if (!ffValue) continue

    const ffCandidates = ffValue
      .split(/[\r\n]+/g)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => v.replace(/\s*\(for[^)]*\)\s*$/i, '').trim())

    for (const ff of ffCandidates) {
      rows.push({
        domain: currentDomain,
        feature: featureValue || categoryValue || 'Other',
        ff,
      })
    }
  }

  return rows
}

function buildMapping(rows) {
  const out = {}
  for (const { domain, feature, ff } of rows) {
    if (!out[domain]) out[domain] = {}
    if (!out[domain][feature]) out[domain][feature] = []
    out[domain][feature].push(ff)
  }
  return out
}

/**
 * Load existing descriptions from the local CSV so they survive a re-sync.
 */
function loadExistingDescriptions(csvPath) {
  try {
    const text = require('fs').readFileSync(csvPath, 'utf8')
    const rows = parseCsv(text)
    if (rows.length === 0) return {}
    const header = rows[0].map((h) => h.trim().toLowerCase())
    const ffIdx = header.indexOf('ff')
    const descIdx = header.indexOf('description')
    if (ffIdx === -1 || descIdx === -1) return {}
    const map = {}
    for (let i = 1; i < rows.length; i++) {
      const ff = (rows[i][ffIdx] ?? '').trim()
      const desc = (rows[i][descIdx] ?? '').trim()
      if (ff && desc) map[ff] = desc
    }
    return map
  } catch {
    return {}
  }
}

function csvEscape(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function asTs(mapping, descriptions) {
  const allFFs = []
  for (const byFeature of Object.values(mapping)) {
    for (const ffs of Object.values(byFeature)) allFFs.push(...ffs)
  }
  const descEntries = allFFs.map((ff) => {
    const desc = (descriptions[ff] || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(ff) ? ff : `'${ff}'`
    return `  ${safeKey}: '${desc}',`
  })

  return `export type DomainFeatureFFMapping = Record<string, Record<string, string[]>>

/**
 * Source of truth:
 * https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${GID}#gid=${GID}
 *
 * Generated by: npm run sync:feature-flags
 */
export const domainFeatureFFMappingRaw: DomainFeatureFFMapping = ${JSON.stringify(mapping, null, 2)}

function isFlagToken(ff: string): boolean {
  const trimmed = ff.trim()
  return trimmed.length > 0 && !/[\\n\\r\\t]/.test(trimmed)
}

export const domainFeatureFFMappingFlagsOnly: DomainFeatureFFMapping = Object.fromEntries(
  Object.entries(domainFeatureFFMappingRaw).map(([domain, byFeature]) => [
    domain,
    Object.fromEntries(
      Object.entries(byFeature).map(([feature, ffs]) => [feature, ffs.filter(isFlagToken)]),
    ),
  ]),
)

export function flattenDomainFeatureFF(mapping: DomainFeatureFFMapping): Record<string, string[]> {
  const flat: Record<string, string[]> = {}
  for (const [domain, byFeature] of Object.entries(mapping)) {
    const acc: string[] = []
    for (const ffs of Object.values(byFeature)) acc.push(...ffs)
    flat[domain] = acc
  }
  return flat
}

/**
 * Feature-flag → description mapping.
 * Populated from the "description" column in docs/domain-feature-ff-mapping.csv.
 * Update via: OPERATOR_TOKEN=<jwt> npm run sync:descriptions
 */
export const featureDescriptions: Record<string, string> = {
${descEntries.join('\n')}
}
`
}

async function main() {
  const useLocalCsv = process.argv.includes('--from-local-csv')

  // Load existing descriptions from local CSV before overwriting
  const existingDescriptions = loadExistingDescriptions(docsCsvPath)

  const csvText = useLocalCsv ? await fs.readFile(docsCsvPath, 'utf8') : await fetchText(CSV_URL)
  const rawRows = parseCsv(csvText)
  const rows = toDomainFeatureFfRows(rawRows)
  if (rows.length === 0) throw new Error('No usable rows found in spreadsheet CSV')

  if (!useLocalCsv) {
    const csvOut = [
      'domain,feature,ff,description',
      ...rows.map((r) => [r.domain, r.feature, r.ff, existingDescriptions[r.ff] || ''].map(csvEscape).join(',')),
    ].join('\n')
    await fs.writeFile(docsCsvPath, `${csvOut}\n`, 'utf8')
  }

  const mapping = buildMapping(rows)
  await fs.writeFile(mappingTsPath, asTs(mapping, existingDescriptions), 'utf8')

  console.log(`Synced ${rows.length} rows from ${useLocalCsv ? 'local CSV' : 'sheet'} to:`)
  if (!useLocalCsv) console.log(`- ${docsCsvPath}`)
  console.log(`- ${mappingTsPath}`)
  const descCount = Object.keys(existingDescriptions).length
  if (descCount > 0) console.log(`  (preserved ${descCount} existing descriptions)`)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
