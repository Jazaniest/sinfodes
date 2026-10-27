import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Akar workspace pnpm: folder terdekat ke atas yang memuat `pnpm-workspace.yaml`. Uji yang membaca dokumen di akar
 * memakai ini, bukan `process.cwd()`, supaya tidak ikut bergeser (atau terlewat diam-diam) saat paket dipindah (tahap 8A).
 */
export function akarRepo(dari: string = fileURLToPath(import.meta.url)): string {
  let dir = dirname(dari)
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const induk = dirname(dir)
    if (induk === dir) throw new Error(`pnpm-workspace.yaml tidak ditemukan di atas ${dari}`)
    dir = induk
  }
}
