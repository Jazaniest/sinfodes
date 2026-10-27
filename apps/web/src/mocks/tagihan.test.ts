import { describe, expect, it } from 'vitest'
import { tagihanSchema, type Tagihan } from '@/domain/langganan/tagihan'
import type { Langganan } from '@/domain/konsol/schema'
import type { StatusDesa } from '@/domain/wilayah/schema'
import { buatTagihan, nomorDesa, pilihKodeUnik, tagihanBerjalan, tagihanJatuh } from './tagihan-hitung'
import type { DbDemo } from './tipe-db'

type Db = Pick<DbDemo, 'desa' | 'langganan' | 'tagihan'>

const WIB = (tanggal: string) => new Date(`${tanggal}T10:00:00+07:00`)

function langganan(desaId: string, o: Partial<Langganan> = {}): Langganan {
  return { desaId, paket: 'Lengkap', periodeTagihan: 'triwulan', mulai: '2025-01-01', sampai: '2026-09-30', ...o }
}

function tagihanLunas(desaId: string, mulai: string, sampai: string, label: string, id = `tgh_${desaId}_${mulai}`): Tagihan {
  const desa = [{ id: desaId, status: 'Aktif' }] as unknown as Db['desa']
  const db: Db = { desa, langganan: [], tagihan: [] }
  const t = buatTagihan(db, { desa: desa[0], langganan: langganan(desaId), periode: { mulai, sampai, label } })
  return { ...t, id, status: 'lunas' }
}

function dbKecil(status: StatusDesa[]): Db {
  const desa = status.map((s, i) => ({ id: `desa_${i}`, status: s })) as unknown as Db['desa']
  return { desa, langganan: [], tagihan: [] }
}

/** Satu desa per status, semuanya triwulan dan sudah ditagih sampai Triwulan III 2026. */
function dbPerStatus(): Db {
  const db = dbKecil(['Aktif', 'Uji coba', 'Persiapan', 'Ditangguhkan'])
  db.langganan = db.desa.map((d) => langganan(d.id, d.status === 'Persiapan' || d.status === 'Uji coba' ? { mulai: null, sampai: null } : {}))
  db.tagihan = [tagihanLunas('desa_0', '2026-07-01', '2026-09-30', 'Triwulan III 2026'), tagihanLunas('desa_3', '2026-07-01', '2026-09-30', 'Triwulan III 2026')]
  return db
}

describe('nomorDesa', () => {
  it('urutan desa di db.desa, tiga digit', () => {
    const db = dbKecil(['Aktif', 'Aktif', 'Aktif'])
    expect(nomorDesa(db, 'desa_0')).toBe('001')
    expect(nomorDesa(db, 'desa_2')).toBe('003')
  })
})

describe('pilihKodeUnik', () => {
  it('kode 1-999 dan tetap untuk ID yang sama', () => {
    const a = pilihKodeUnik({ tagihan: [] }, 'tgh_x')
    expect(a).toBeGreaterThanOrEqual(1)
    expect(a).toBeLessThanOrEqual(999)
    expect(pilihKodeUnik({ tagihan: [] }, 'tgh_x')).toBe(a)
  })
  it('hash awal sama: kode berikutnya naik satu bila sudah dipakai tagihan terbit atau menunggu verifikasi', () => {
    const awal = pilihKodeUnik({ tagihan: [] }, 'tgh_x')
    for (const status of ['terbit', 'menunggu-verifikasi'] as const) {
      const dipakai = { ...tagihanLunas('desa_0', '2026-07-01', '2026-09-30', 'T'), status, kodeUnik: awal }
      expect(pilihKodeUnik({ tagihan: [dipakai] }, 'tgh_x')).toBe(awal === 999 ? 1 : awal + 1)
    }
  })
  it('kode tagihan lunas atau dibatalkan boleh dipakai lagi', () => {
    const awal = pilihKodeUnik({ tagihan: [] }, 'tgh_x')
    for (const status of ['lunas', 'dibatalkan'] as const) {
      const lama = { ...tagihanLunas('desa_0', '2026-07-01', '2026-09-30', 'T'), status, kodeUnik: awal }
      expect(pilihKodeUnik({ tagihan: [lama] }, 'tgh_x')).toBe(awal)
    }
  })
  it('melewati 999 kembali ke 1', () => {
    const contoh = tagihanLunas('desa_0', '2026-07-01', '2026-09-30', 'T')
    const id = Array.from({ length: 50 }, (_, i) => `tgh_uji_${i}`).find((x) => {
      const k = pilihKodeUnik({ tagihan: [] }, x)
      return k > 1 && k < 999
    })!
    const awal = pilihKodeUnik({ tagihan: [] }, id)
    const terpakai = Array.from({ length: 999 - awal + 1 }, (_, i) => ({ ...contoh, status: 'terbit' as const, kodeUnik: awal + i }))
    expect(pilihKodeUnik({ tagihan: terpakai }, id)).toBe(1)
  })
  it('ruang kode habis: galat jelas', () => {
    const contoh = tagihanLunas('desa_0', '2026-07-01', '2026-09-30', 'T')
    const penuh = Array.from({ length: 999 }, (_, i) => ({ ...contoh, status: 'terbit' as const, kodeUnik: i + 1 }))
    expect(() => pilihKodeUnik({ tagihan: penuh }, 'tgh_x')).toThrow(/kode unik/i)
  })
})

describe('buatTagihan', () => {
  it('tagihan sah menurut skema: jadwal, harga, nominal, riwayat pertama dari sistem', () => {
    const db = dbPerStatus()
    const t = buatTagihan(db, {
      desa: db.desa[0],
      langganan: db.langganan[0],
      periode: { mulai: '2026-10-01', sampai: '2026-12-31', label: 'Triwulan IV 2026' },
    })
    expect(tagihanSchema.safeParse(t).success).toBe(true)
    expect(t).toMatchObject({
      desaId: 'desa_0',
      nomor: 'SFD/2026/T4/001',
      paket: 'Lengkap',
      harga: 3_000_000,
      terbit: '2026-09-17',
      jatuhTempo: '2026-10-15',
      status: 'terbit',
      metode: 'transfer-manual',
      referensiPembayaran: null,
      bukti: null,
    })
    expect(t.nominal).toBe(3_000_000 + t.kodeUnik)
    expect(t.riwayat).toEqual([{ status: 'terbit', pada: '2026-09-17T00:00:00+07:00', oleh: { jenis: 'sistem', id: 'sistem', nama: 'Sinfodes' }, catatan: null }])
  })
  it('ID berbeda untuk periode yang sama bila yang lama dibatalkan', () => {
    const db = dbPerStatus()
    const periode = { mulai: '2026-10-01', sampai: '2026-12-31', label: 'Triwulan IV 2026' }
    const pertama = buatTagihan(db, { desa: db.desa[0], langganan: db.langganan[0], periode })
    db.tagihan.push({ ...pertama, status: 'dibatalkan' })
    const kedua = buatTagihan(db, { desa: db.desa[0], langganan: db.langganan[0], periode })
    expect(kedua.id).not.toBe(pertama.id)
  })
})

describe('tagihanJatuh', () => {
  it('H-14 sebelum Triwulan IV: terbit untuk desa Aktif, sehari sebelumnya belum', () => {
    const db = dbPerStatus()
    expect(tagihanJatuh(db, WIB('2026-09-16'))).toEqual([])
    const baru = tagihanJatuh(db, WIB('2026-09-17'))
    expect(baru.map((t) => [t.desaId, t.periode.label])).toEqual([['desa_0', 'Triwulan IV 2026']])
  })
  it('desa Uji coba, Persiapan, dan Ditangguhkan tidak mendapat tagihan baru, meski waktu jauh melompat', () => {
    const db = dbPerStatus()
    const desaDitagih = new Set(tagihanJatuh(db, WIB('2027-04-20')).map((t) => t.desaId))
    expect([...desaDitagih]).toEqual(['desa_0'])
  })
  it('lompatan tujuh bulan menerbitkan setiap periode yang tertinggal, satu per periode, dengan kode unik berbeda', () => {
    const db = dbPerStatus()
    const baru = tagihanJatuh(db, WIB('2027-04-20'))
    expect(baru.map((t) => t.periode.label)).toEqual(['Triwulan IV 2026', 'Triwulan I 2027', 'Triwulan II 2027'])
    expect(baru.map((t) => t.terbit)).toEqual(['2026-09-17', '2026-12-18', '2027-03-18'])
    expect(new Set(baru.map((t) => t.kodeUnik)).size).toBe(3)
    expect(new Set(baru.map((t) => t.id)).size).toBe(3)
  })
  it('fungsi murni: tidak mengubah db, dan memanggil dua kali memberi hasil sama', () => {
    const db = dbPerStatus()
    const sebelum = structuredClone(db)
    const a = tagihanJatuh(db, WIB('2026-09-24'))
    expect(db).toEqual(sebelum)
    expect(tagihanJatuh(db, WIB('2026-09-24'))).toEqual(a)
  })
  it('tagihan baru yang sudah dimasukkan tidak terbit lagi', () => {
    const db = dbPerStatus()
    db.tagihan.push(...tagihanJatuh(db, WIB('2026-09-24')))
    expect(tagihanJatuh(db, WIB('2026-09-24'))).toEqual([])
  })
  it('tagihan dibatalkan tidak menggeser periode berikut: periode tetap dianggap terisi oleh yang tidak dibatalkan', () => {
    const db = dbPerStatus()
    db.tagihan.push({ ...tagihanLunas('desa_0', '2026-10-01', '2026-12-31', 'Triwulan IV 2026', 'tgh_batal'), status: 'dibatalkan' })
    expect(tagihanJatuh(db, WIB('2026-09-24')).map((t) => t.periode.label)).toEqual(['Triwulan IV 2026'])
  })
  it('tahunan: terbit H-14 sebelum 1 Januari', () => {
    const db = dbPerStatus()
    db.langganan[0] = langganan('desa_0', { periodeTagihan: 'tahunan', sampai: '2026-12-31' })
    db.tagihan = []
    db.tagihan.push(tagihanLunas('desa_0', '2026-01-01', '2026-12-31', 'Tahun 2026'))
    expect(tagihanJatuh(db, WIB('2026-12-17'))).toEqual([])
    expect(tagihanJatuh(db, WIB('2026-12-18')).map((t) => t.periode.label)).toEqual(['Tahun 2027'])
  })
  it('kode unik semua tagihan aktif unik, juga untuk banyak desa terbit bersamaan', () => {
    const status = Array.from({ length: 60 }, () => 'Aktif' as const)
    const db = dbKecil(status)
    db.langganan = db.desa.map((d) => langganan(d.id))
    db.tagihan = db.desa.map((d) => tagihanLunas(d.id, '2026-07-01', '2026-09-30', 'Triwulan III 2026'))
    const baru = tagihanJatuh(db, WIB('2026-09-24'))
    expect(baru).toHaveLength(60)
    expect(new Set(baru.map((t) => t.kodeUnik)).size).toBe(60)
    expect(new Set(baru.map((t) => t.nominal)).size).toBe(60)
  })
})

describe('tagihanBerjalan', () => {
  it('terbit atau menunggu verifikasi dengan jatuh tempo terdekat; lunas dan batal tidak', () => {
    const db = dbPerStatus()
    const dasar = tagihanLunas('desa_0', '2026-01-01', '2026-03-31', 'Triwulan I 2026')
    db.tagihan = [
      { ...dasar, id: 'a', status: 'lunas', jatuhTempo: '2026-01-15' },
      { ...dasar, id: 'b', status: 'terbit', jatuhTempo: '2026-07-15' },
      { ...dasar, id: 'c', status: 'menunggu-verifikasi', jatuhTempo: '2026-04-15' },
      { ...dasar, id: 'd', status: 'dibatalkan', jatuhTempo: '2026-02-15' },
    ]
    expect(tagihanBerjalan(db, 'desa_0')?.id).toBe('c')
    expect(tagihanBerjalan(db, 'desa_1')).toBeNull()
    db.tagihan = db.tagihan.filter((t) => t.status === 'lunas')
    expect(tagihanBerjalan(db, 'desa_0')).toBeNull()
  })
})
