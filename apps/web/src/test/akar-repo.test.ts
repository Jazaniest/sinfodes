// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { akarRepo } from './akar-repo'

describe('akar repo dan susunan monorepo', () => {
  it('akarRepo menunjuk akar workspace', () => {
    const akar = akarRepo()
    expect(existsSync(join(akar, 'pnpm-workspace.yaml'))).toBe(true)
    expect(existsSync(join(akar, 'CHANGELOG.md'))).toBe(true)
  })

  it('susunan monorepo (SPEC-V0.3 §4)', () => {
    const akar = akarRepo()
    const baca = (jalur: string) => readFileSync(join(akar, jalur), 'utf-8')
    expect(JSON.parse(baca('apps/web/package.json')).name).toBe('@sinfodes/web')
    const skrip = JSON.parse(baca('package.json')).scripts
    expect(skrip.dev).toContain('@sinfodes/web')
    expect(skrip.test).toBe('pnpm -r test')
    const ruang = baca('pnpm-workspace.yaml')
    expect(ruang).toContain('apps/*')
    expect(ruang).toContain('packages/*')
  })
})
