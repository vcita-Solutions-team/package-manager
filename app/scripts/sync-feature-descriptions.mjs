/**
 * Fetches feature descriptions from the operator API and updates:
 *   - docs/domain-feature-ff-mapping.csv  (description column)
 *   - app/src/data/domainFeatureFFMapping.ts  (featureDescriptions map)
 *
 * Usage:
 *   OPERATOR_TOKEN=<jwt> npm run sync:descriptions
 *
 * The JWT token is the value stored in the browser's localStorage
 * under the key "operator_jwt_token" while logged in to the app.
 */

import fs from 'node:fs/promises'
import https from 'node:https'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const appRoot = path.resolve(__dirname, '..')
const docsCsvPath = path.join(repoRoot, 'docs', 'domain-feature-ff-mapping.csv')
const mappingTsPath = path.join(repoRoot, 'app', 'src', 'data', 'domainFeatureFFMapping.ts')

function loadEnv() {
  const envFiles = ['.env', '.env.development']
  const vars = {}
  for (const file of envFiles) {
    try {
      const content = require('fs').readFileSync(path.join(appRoot, file), 'utf8')
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)$/)
        if (match) vars[match[1]] = match[2].trim()
      }
    } catch { /* file may not exist */ }
  }
  return vars
}

const env = loadEnv()
const API_URL = process.env.VITE_OPERATOR_API_URL || env.VITE_OPERATOR_API_URL || 'https://api2.meet2know.com'
const TOKEN = process.env.OPERATOR_TOKEN

if (!TOKEN) {
  console.error('ERROR: OPERATOR_TOKEN environment variable is required.')
  console.error('')
  console.error('To get your token:')
  console.error('  1. Log in to the app in your browser')
  console.error('  2. Open DevTools > Console')
  console.error('  3. Run: localStorage.getItem("operator_jwt_token")')
  console.error('  4. Copy the value and run:')
  console.error('     OPERATOR_TOKEN=<token> npm run sync:descriptions')
  process.exit(1)
}

function fetchJson(url) {
  const lib = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    lib
      .get(url, { headers: { Authorization: TOKEN } }, (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          resolve(fetchJson(new URL(res.headers.location, url).toString()))
          return
        }
        const chunks = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}: ${body.slice(0, 200)}`))
            return
          }
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`))
          }
        })
      })
      .on('error', reject)
  })
}

function parseCsvSimple(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

function csvEscape(value) {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

async function main() {
  console.log(`Fetching features from ${API_URL}/operator_api/v1/features?packageable=true ...`)
  const response = await fetchJson(`${API_URL}/operator_api/v1/features?packageable=true`)

  const features = response?.data ?? response?.features ?? response
  if (!Array.isArray(features)) {
    console.error('Unexpected API response structure:', JSON.stringify(response).slice(0, 300))
    process.exit(1)
  }

  const descMap = {}
  let count = 0
  for (const f of features) {
    if (f?.name && f?.description) {
      descMap[f.name] = f.description
      count++
    }
  }
  console.log(`Found ${count} descriptions out of ${features.length} features.`)

  // --- Update CSV ---
  const csvText = await fs.readFile(docsCsvPath, 'utf8')
  const csvRows = parseCsvSimple(csvText)

  if (csvRows.length === 0) throw new Error('CSV is empty')

  const header = csvRows[0]
  let descIdx = header.findIndex((h) => h.trim().toLowerCase() === 'description')
  if (descIdx === -1) {
    header.push('description')
    descIdx = header.length - 1
  }

  let csvUpdated = 0
  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i]
    const ff = (row[2] ?? '').trim()
    if (ff && descMap[ff]) {
      while (row.length <= descIdx) row.push('')
      row[descIdx] = descMap[ff]
      csvUpdated++
    }
  }

  const csvOut = csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')
  await fs.writeFile(docsCsvPath, csvOut + '\n', 'utf8')
  console.log(`Updated ${csvUpdated} descriptions in ${docsCsvPath}`)

  // --- Update TS featureDescriptions ---
  // Use the CSV FF column as the canonical key list (preserves order)
  const csvFFs = []
  for (let i = 1; i < csvRows.length; i++) {
    const ff = (csvRows[i][2] ?? '').trim()
    if (ff && !csvFFs.includes(ff)) csvFFs.push(ff)
  }
  // Add any API-only keys not in the CSV
  for (const key of Object.keys(descMap)) {
    if (!csvFFs.includes(key)) csvFFs.push(key)
  }

  const tsText = await fs.readFile(mappingTsPath, 'utf8')
  const startMarker = 'export const featureDescriptions: Record<string, string> = {'
  const startIdx = tsText.indexOf(startMarker)

  if (startIdx === -1) {
    console.error('Could not find featureDescriptions in TS file. Skipping TS update.')
    return
  }

  const blockStart = startIdx + startMarker.length
  let braceDepth = 1
  let blockEnd = blockStart
  while (blockEnd < tsText.length && braceDepth > 0) {
    if (tsText[blockEnd] === '{') braceDepth++
    else if (tsText[blockEnd] === '}') braceDepth--
    if (braceDepth > 0) blockEnd++
  }

  const tsEntries = csvFFs.map((key) => {
    const desc = descMap[key] || ''
    const safeDesc = desc.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`
    return `  ${safeKey}: '${safeDesc}',`
  })

  const newBlock = '\n' + tsEntries.join('\n') + '\n'
  const newTs = tsText.slice(0, blockStart) + newBlock + tsText.slice(blockEnd)
  await fs.writeFile(mappingTsPath, newTs, 'utf8')
  console.log(`Updated ${csvFFs.length} entries in featureDescriptions (${count} with descriptions)`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
