// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { akarRepo } from './akar-repo'

/**
 * Pagar susunan monorepo (SPEC-V0.3 §4): isi `packages/kontrak` dan `packages/demo`, batas impor keduanya,
 * dan tidak ada impor di web yang menggantung setelah pemindahan. Batas yang sama dijaga `tsc` dan ESLint tiap paket.
 */
const akar = akarRepo()
const jalur = (...bagian: string[]): string => join(akar, ...bagian)

/** Semua berkas .ts dan .tsx di bawah `dir`, tanpa node_modules. Folder yang tidak ada dianggap kosong. */
function berkas(dir: string): string[] {
  if (!existsSync(dir)) return []
  const hasil: string[] = []
  for (const nama of readdirSync(dir)) {
    if (nama === 'node_modules') continue
    const p = join(dir, nama)
    if (statSync(p).isDirectory()) hasil.push(...berkas(p))
    else if (/\.tsx?$/.test(nama)) hasil.push(p)
  }
  return hasil
}

const POLA_IMPOR = /(?:from|import\(|vi\.(?:mock|doMock|importActual)\()\s*['"]([^'"]+)['"]/g
const penentu = (isi: string): string[] => [...isi.matchAll(POLA_IMPOR)].map((m) => m[1])

/** Penentu impor yang tidak lolos `boleh`, di berkas bukan-uji `dir`. */
function pelanggaran(dir: string, boleh: (penentu: string) => boolean): string[] {
  const hasil: string[] = []
  for (const f of berkas(dir)) {
    if (f.endsWith('.test.ts')) continue
    for (const s of penentu(readFileSync(f, 'utf8'))) if (!boleh(s)) hasil.push(`${relative(akar, f)} -> ${s}`)
  }
  return hasil
}

const BERKAS_AKAR_DEMO = ['tipe-db', 'prng', 'indeks-dasar', 'indeks-hitung', 'indeks-panel', 'kabupaten-angka', 'lencana-terbit', 'siaran', 'tagihan-hitung']

describe('susunan paket (SPEC-V0.3 §4)', () => {
  it('paket kontrak: isi domain pindah, tidak tersisa di web', () => {
    expect(existsSync(jalur('packages/kontrak/src/api.ts'))).toBe(true)
    expect(existsSync(jalur('packages/kontrak/src/penduduk/schema.ts'))).toBe(true)
    expect(existsSync(jalur('apps/web/src/domain'))).toBe(false)
  })

  it('paket kontrak: berkas bukan-uji hanya mengimpor relatif, zod, dan css-tree', () => {
    const dir = jalur('packages/kontrak/src')
    expect(existsSync(dir)).toBe(true)
    expect(berkas(dir).filter((f) => f.endsWith('.tsx'))).toEqual([])
    expect(pelanggaran(dir, (s) => s.startsWith('.') || s === 'zod' || s === 'css-tree')).toEqual([])
  })

  it('paket demo: pembangkit dan tipe pindah, tidak tersisa di mocks web', () => {
    for (const nama of BERKAS_AKAR_DEMO) {
      expect(existsSync(jalur(`packages/demo/src/${nama}.ts`)), `demo/${nama}`).toBe(true)
      expect(existsSync(jalur(`apps/web/src/mocks/${nama}.ts`)), `mocks/${nama}`).toBe(false)
    }
    expect(existsSync(jalur('packages/demo/src/generator/index.ts'))).toBe(true)
    expect(existsSync(jalur('packages/demo/src/data/desa-demo.ts'))).toBe(true)
    expect(existsSync(jalur('apps/web/src/mocks/generator'))).toBe(false)
    expect(existsSync(jalur('apps/web/src/mocks/data'))).toBe(false)
  })

  it('paket demo: berkas bukan-uji hanya mengimpor relatif dan @sinfodes/kontrak', () => {
    const dir = jalur('packages/demo/src')
    expect(existsSync(jalur('packages/demo/src/tipe-db.ts'))).toBe(true)
    expect(berkas(dir).filter((f) => f.endsWith('.tsx'))).toEqual([])
    expect(pelanggaran(dir, (s) => s.startsWith('.') || s.startsWith('@sinfodes/kontrak/'))).toEqual([])
  })

  it('web: tidak ada impor relatif atau @/ yang menggantung', () => {
    const src = jalur('apps/web/src')
    const srcKontrak = jalur('packages/kontrak/src')
    const ada = (p: string): boolean =>
      ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].some((ekstensi) => {
        const q = p + ekstensi
        return existsSync(q) && statSync(q).isFile()
      })
    const menggantung: string[] = []
    for (const f of berkas(src)) {
      for (const asli of penentu(readFileSync(f, 'utf8'))) {
        const s = asli.split('?')[0]
        let target: string | null = null
        if (s.startsWith('@/domain/')) target = join(srcKontrak, s.slice('@/domain/'.length))
        else if (s.startsWith('@/')) target = join(src, s.slice(2))
        else if (s.startsWith('.')) target = join(dirname(f), s)
        if (target && !ada(target)) menggantung.push(`${relative(akar, f)} -> ${asli}`)
      }
    }
    expect(menggantung).toEqual([])
    // Membaca ±1.700 berkas; saat seluruh suite berjalan paralel di mesin lambat, 15 detik bawaan bisa terlewati.
  }, 60_000)

  it('satu instans modul: @/domain/api dan @sinfodes/kontrak/api', async () => {
    const lewatAlias = await import('@/domain/api')
    const lewatPaket = await import('@sinfodes/kontrak/api')
    expect(lewatAlias.KODE_GALAT).toBe(lewatPaket.KODE_GALAT)
  })

  it('web dapat memakai paket demo', async () => {
    const { buatAcak } = await import('@sinfodes/demo/prng')
    expect(typeof buatAcak).toBe('function')
  })
})
