#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
}

function publicFile(src) {
  return path.join(root, 'public', src.replace(/^\/+/, ''))
}

function requireField(value, message) {
  if (!value) throw new Error(message)
}

const manifest = readJson('public/manifest.webmanifest')
for (const key of ['name', 'short_name', 'start_url', 'display', 'icons']) {
  requireField(manifest[key], `Manifest is missing ${key}`)
}

if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error('Manifest must list at least one icon')
}

for (const icon of manifest.icons) {
  if (!icon.src || !icon.sizes || !icon.type) {
    throw new Error('Every icon needs src, sizes, and type')
  }
  const file = publicFile(icon.src)
  if (!fs.existsSync(file)) throw new Error(`Missing manifest icon: ${file}`)
}

for (const screenshot of manifest.screenshots ?? []) {
  if (!screenshot.src || !screenshot.sizes || !screenshot.type) {
    throw new Error('Every screenshot needs src, sizes, and type')
  }
  const file = publicFile(screenshot.src)
  if (!fs.existsSync(file)) {
    throw new Error(`Missing manifest screenshot: ${file}`)
  }
}

const assetLinks = readJson('public/.well-known/assetlinks.json')
if (!Array.isArray(assetLinks) || assetLinks.length === 0) {
  throw new Error('assetlinks.json must contain at least one statement')
}

const fingerprintPattern = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/
const androidStatements = assetLinks.filter(
  (statement) =>
    statement?.target?.namespace === 'android_app' &&
    statement.target.package_name === 'app.lightsout.puzzle',
)

if (androidStatements.length === 0) {
  throw new Error('assetlinks.json must include app.lightsout.puzzle')
}

for (const statement of androidStatements) {
  if (!statement.relation?.includes('delegate_permission/common.handle_all_urls')) {
    throw new Error('Android asset link must delegate common.handle_all_urls')
  }

  const fingerprints = statement.target.sha256_cert_fingerprints
  if (!Array.isArray(fingerprints) || fingerprints.length === 0) {
    throw new Error('Android asset link must include a signing fingerprint')
  }

  for (const fingerprint of fingerprints) {
    if (!fingerprintPattern.test(fingerprint.toUpperCase())) {
      throw new Error(`Invalid Android signing fingerprint: ${fingerprint}`)
    }
  }
}

console.log(
  `PWA OK: ${manifest.icons.length} icons, ${manifest.screenshots?.length ?? 0} screenshots, ${androidStatements.length} Android asset link(s)`,
)
