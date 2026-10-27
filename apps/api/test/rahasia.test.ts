// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** Rahasia server tidak boleh masuk git (SPEC-V0.3 §15.1). Aturannya ada di `.gitignore` akar. */
const akar = fileURLToPath(new URL('../../..', import.meta.url))
const git = (...argumen: string[]) => spawnSync('git', argumen, { cwd: akar, encoding: 'utf8' })
const diabaikan = (jalur: string): boolean => git('check-ignore', '-q', jalur).status === 0

describe('rahasia tidak masuk git', () => {
  it.each([
    'apps/api/.env',
    'apps/api/.env.local',
    'apps/api/.env.produksi',
    'apps/api/kunci.pem',
    'apps/api/x.key',
    'apps/api/secrets/a',
  ])('%s diabaikan', (jalur) => {
    expect(diabaikan(jalur)).toBe(true)
  })

  it('.env.example tetap boleh dilacak', () => {
    expect(diabaikan('apps/api/.env.example')).toBe(false)
  })

  it('tidak ada berkas berpola rahasia yang dilacak di apps/api', () => {
    const dilacak = git('ls-files', 'apps/api').stdout.split('\n').filter(Boolean)
    const rahasia = dilacak.filter((f) => /(^|\/)\.env(\.(?!example$)[^/]+)?$|\.pem$|\.key$|(^|\/)secrets\//.test(f))
    expect(rahasia).toEqual([])
  })
})
