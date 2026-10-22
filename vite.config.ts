import { execFileSync } from 'node:child_process'

import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'

function serviceWorkerPlugin(): Plugin {
  let generated = false

  return {
    name: 'lights-out-service-worker',
    apply: 'build',
    closeBundle() {
      if (generated) return
      if (this.environment?.name && this.environment.name !== 'client') return

      generated = true
      const isVercel =
        Boolean(process.env.VERCEL) || process.env.NITRO_PRESET === 'vercel'
      const publicDir = isVercel
        ? '.vercel/output/static'
        : '.output/public'

      execFileSync(process.execPath, ['scripts/build-sw.mjs'], {
        stdio: 'inherit',
        env: { ...process.env, SW_PUBLIC_DIR: publicDir },
      })
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart(),
    nitro(),
    viteReact(),
    serviceWorkerPlugin(),
  ],
})

export default config
