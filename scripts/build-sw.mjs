import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'

const rootDir = process.cwd()
const isVercel =
  Boolean(process.env.VERCEL) || process.env.NITRO_PRESET === 'vercel'
const publicDir = process.env.SW_PUBLIC_DIR
  ? resolve(rootDir, process.env.SW_PUBLIC_DIR)
  : isVercel
    ? join(rootDir, '.vercel', 'output', 'static')
    : join(rootDir, '.output', 'public')
const sourcePublicDir = join(rootDir, 'public')
const templatePath = join(rootDir, 'scripts', 'sw-template.js')
const outputPath = join(publicDir, 'sw.js')

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(path)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

async function collectFiles(directory, files, overwrite) {
  let entries
  try {
    entries = await walk(directory)
  } catch {
    return
  }

  for (const file of entries) {
    const relativePath = relative(directory, file).split(sep).join('/')
    if (relativePath === 'sw.js' || relativePath.endsWith('.map')) continue
    if (!overwrite && files.has(relativePath)) continue
    files.set(relativePath, file)
  }
}

try {
  await stat(publicDir)
} catch {
  throw new Error(
    `Missing ${publicDir}. Run \`vite build\` with the matching Nitro preset before this script.`,
  )
}

const template = await readFile(templatePath, 'utf8')
const files = new Map()

// The built public directory has the hashed client assets. The source public
// directory has the stable files (offline page, icons, manifest). Merge them
// so the worker still works if Vite has not copied `public/` yet.
await collectFiles(publicDir, files, true)
await collectFiles(sourcePublicDir, files, false)

const relativePaths = [...files.keys()].sort()
const hash = createHash('sha256')
const urls = []

for (const relativePath of relativePaths) {
  const contents = await readFile(files.get(relativePath))
  urls.push(`/${relativePath}`)
  hash.update(relativePath)
  hash.update(contents)
}

hash.update(template)

const version = hash.digest('hex').slice(0, 12)
const source = template
  .replace('__SW_VERSION__', version)
  .replace('__SW_PRECACHE__', JSON.stringify(urls, null, 2))

await writeFile(outputPath, source)
console.log(
  `Generated sw.js (${urls.length} files, version ${version}) in ${relative(rootDir, publicDir)}`,
)
