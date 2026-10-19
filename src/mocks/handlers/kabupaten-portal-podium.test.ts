import { describe, expect, it } from 'vitest'
import { KATEGORI_DESA } from '@/domain/indeks/kategori'
import { portalKabupatenSchema, type PortalKabupaten } from '@/domain/kabupaten/portal'
import { pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { ambilDb } from '../db'
import { kategoriProvinsi, peringkatProvinsi, podiumKabupaten } from '../indeks'

pakaiApiTiruan({ dbSegarTiapUji: true })

const AGUSTUS = { musim: 'bulanan', kode: '2026-08' } as const

async function portalMitra(label: string): Promise<Extract<PortalKabupaten, { mitra: true }>> {
  const r = await fetch(`http://${label}.sinfodes.localhost/api/v1/kabupaten/portal`)
  const p = portalKabupatenSchema.parse(await r.json())
  if (!p.mitra) throw new Error(`${label} seharusnya mitra`)
  return p
}

describe('GET /kabupaten/portal: podium (rencana 7C-2 Tugas 6)', () => {
  it('Pelalawan: periode 2026-08, 9 kategori, dan juara Juara Umum sama dengan papan 7C-1', async () => {
    const p = await portalMitra('kab-pelalawan')
    expect(p.podium.periode).toEqual({ kode: '2026-08', label: 'Agustus 2026' })
    expect(p.podium.kategori.map((k) => k.kategori)).toEqual([...KATEGORI_DESA])
    const papan = podiumKabupaten(ambilDb(), '14.05', AGUSTUS, SEKARANG_UJI).find((k) => k.kategori === 'umum')!.juara
    const umum = p.podium.kategori.find((k) => k.kategori === 'umum')!.juara
    expect(umum.map((j) => [j.peringkat, j.bersama, j.desa.nama])).toEqual(papan.map((j) => [j.peringkat, j.bersama, j.nama]))
    expect(umum[0].desa.alamat).toMatch(/^[a-z0-9-]+$/)
  })
  it('tanpa tingkatan, Indeks, atau skor; tidak memuat nama kategori sementara September', async () => {
    const teks = JSON.stringify(await portalMitra('kab-pelalawan'))
    for (const k of ['"tingkatan"', '"indeks"', '"skor"', '"klasemen"', '2026-09']) expect(teks.includes(k), k).toBe(false)
  })
  it('hanya desa Pelalawan di podium Pelalawan, dan hanya desa Siak di podium Siak', async () => {
    const db = ambilDb()
    for (const [label, kode] of [['kab-pelalawan', '14.05'], ['kab-siak', '14.08']] as const) {
      const p = await portalMitra(label)
      const milik = new Set(db.desa.filter((d) => d.kabupaten.kode === kode).map((d) => d.slug))
      for (const k of p.podium.kategori) for (const j of k.juara) expect(milik.has(j.desa.alamat), `${label} ${j.desa.nama}`).toBe(true)
    }
  })
  it('posisiProvinsi: hanya kategori yang kabupatennya masuk podium se-provinsi, dipilih dari hasil nyata', async () => {
    const db = ambilDb()
    const nilai = peringkatProvinsi(db, '14', AGUSTUS, SEKARANG_UJI)
    for (const [label, kode] of [['kab-pelalawan', '14.05'], ['kab-siak', '14.08']] as const) {
      const p = await portalMitra(label)
      for (const kategori of ['umum', 'merata'] as const) {
        const posisi = kategoriProvinsi(kategori, nilai, kode).posisi
        const ada = p.posisiProvinsi.find((x) => x.kategori === kategori)
        if (posisi && posisi.peringkat <= 3) expect(ada, `${label} ${kategori}`).toMatchObject({ peringkat: posisi.peringkat, bersama: posisi.bersama, dari: posisi.dari, provinsi: 'Riau' })
        else expect(ada, `${label} ${kategori}`).toBeUndefined()
      }
    }
    // Data demo: Pelalawan juara hanya di Paling Merata; Siak di kedua kategori. Kedua cabang (masuk dan tidak) terpakai.
    expect((await portalMitra('kab-pelalawan')).posisiProvinsi.map((x) => x.kategori)).toEqual(['merata'])
    expect((await portalMitra('kab-siak')).posisiProvinsi.map((x) => x.kategori)).toEqual(['umum', 'merata'])
  })
  it('lencana September terbit setelah waktu maju, dan portal pindah ke September', async () => {
    const { vi } = await import('vitest')
    vi.setSystemTime(new Date('2026-10-02T01:00:00+07:00'))
    try {
      const p = await portalMitra('kab-pelalawan')
      expect(p.podium.periode).toEqual({ kode: '2026-09', label: 'September 2026' })
      expect(ambilDb().periodeLencana).toContain('bulanan:2026-09')
      const banyak = ambilDb().lencana.length
      await portalMitra('kab-pelalawan')
      expect(ambilDb().lencana).toHaveLength(banyak)
    } finally {
      vi.setSystemTime(SEKARANG_UJI)
    }
  })
})
