import { describe, expect, it } from 'vitest'
import { KATEGORI_DESA } from '@/domain/indeks/kategori'
import { bulanPeriode, geserBulan, type Periode } from '@/domain/indeks/periode'
import { pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { ambilDb } from './db'
import { papanKabupaten, podiumKabupaten } from './indeks'
import { desaDiKabupaten } from '@sinfodes/demo/kabupaten-angka'
import { lencanaDesa, lencanaTampil, pastikanLencana, terbitkanLencana } from './lencana'

pakaiApiTiruan({ dbSegarTiapUji: true })

const AGUSTUS: Periode = { musim: 'bulanan', kode: '2026-08' }
const PELALAWAN = '14.05'

describe('penerbitan lencana (rencana 7C-2 Tugas 1)', () => {
  it('semua kode unik dan periode tutup ketiga musim sudah diproses, tanpa periode berjalan', () => {
    const db = ambilDb()
    const kode = db.lencana.map((l) => l.kode)
    expect(new Set(kode).size).toBe(kode.length)
    expect(kode.length).toBeGreaterThan(100)
    const p = new Set(db.periodeLencana)
    for (let i = 0; i < 32; i++) expect(p.has(`bulanan:${geserBulan('2024-01', i)}`), String(i)).toBe(true)
    for (const t of ['2024-T1', '2024-T2', '2024-T3', '2024-T4', '2025-T1', '2025-T2', '2025-T3', '2025-T4', '2026-T1', '2026-T2']) expect(p.has(`triwulan:${t}`), t).toBe(true)
    expect(p.has('tahunan:2024') && p.has('tahunan:2025')).toBe(true)
    expect(p.has('bulanan:2026-09') || p.has('triwulan:2026-T3') || p.has('tahunan:2026')).toBe(false)
    expect(db.periodeLencana).toHaveLength(32 + 10 + 2)
  })

  it('Juara Umum Agustus 2026 Pelalawan sama persis dengan podium papan 7C-1', () => {
    const db = ambilDb()
    const podiumUmum = podiumKabupaten(db, PELALAWAN, AGUSTUS, SEKARANG_UJI).find((k) => k.kategori === 'umum')!.juara
    const lencana = db.lencana
      .filter((l) => l.kategori === 'umum' && l.tingkat === 'kabupaten' && l.wilayah.kode === PELALAWAN && l.periode.kode === '2026-08')
      .map((l) => ({ nama: db.desa.find((d) => d.id === l.desaId)!.nama, peringkat: l.peringkat, bersama: l.bersama }))
      .sort((a, b) => a.peringkat - b.peringkat || a.nama.localeCompare(b.nama, 'id'))
    expect(lencana).toEqual(podiumUmum.map((j) => ({ nama: j.nama, peringkat: j.peringkat, bersama: j.bersama })).sort((a, b) => a.peringkat - b.peringkat || a.nama.localeCompare(b.nama, 'id')))
    expect(lencana.length).toBeGreaterThanOrEqual(3)
  })

  it('kecamatan dengan kurang dari 3 desa memenuhi syarat tidak punya lencana kecamatan, tetapi lencana kabupaten tetap ada', () => {
    const db = ambilDb()
    const kosong: string[] = []
    const kecamatan = [...new Map(desaDiKabupaten(db, PELALAWAN).map((d) => [d.kecamatan.kode, d.kecamatan])).values()]
    for (const kec of kecamatan) {
      for (const kategori of KATEGORI_DESA) {
        const papan = papanKabupaten(db, PELALAWAN, { musim: 'bulanan', periode: AGUSTUS, kategori, kecamatan: kec.kode }, SEKARANG_UJI)
        const ada = db.lencana.filter((l) => l.tingkat === 'kecamatan' && l.wilayah.kode === kec.kode && l.kategori === kategori && l.periode.kode === '2026-08')
        if (papan.peringkat.length < 3) {
          kosong.push(`${kec.kode}:${kategori}`)
          expect(ada, `${kec.kode} ${kategori}`).toHaveLength(0)
        } else expect(ada.length, `${kec.kode} ${kategori}`).toBeGreaterThanOrEqual(3)
      }
    }
    expect(kosong.length).toBeGreaterThan(0)
    const umumKab = db.lencana.filter((l) => l.tingkat === 'kabupaten' && l.kategori === 'umum' && l.wilayah.kode === PELALAWAN && l.periode.kode === '2026-08')
    expect(umumKab.length).toBeGreaterThan(0)
  })

  it('seri: dua desa Juara 1 bersama sama-sama bertanda bersama, dan juara berikutnya berperingkat 3', () => {
    const db = ambilDb()
    const [a, b] = desaDiKabupaten(db, PELALAWAN).filter((d) => d.id !== ID_SUNGAI_SIALANG && db.ukuranIndeks.some((u) => u.desaId === d.id && u.bulan === '2026-08' && u.aktif))
    for (const u of db.ukuranIndeks.filter((x) => (x.desaId === a.id || x.desaId === b.id) && x.bulan === '2026-08')) u.layanan = { selesai: 40, medianJam: 0.1 }
    db.lencana = []
    db.periodeLencana = []
    const layananKab = terbitkanLencana(db, SEKARANG_UJI).lencana.filter((l) => l.kategori === 'layanan' && l.tingkat === 'kabupaten' && l.wilayah.kode === PELALAWAN && l.periode.kode === '2026-08')
    const juara1 = layananKab.filter((l) => l.peringkat === 1)
    expect(juara1.map((l) => l.desaId).sort()).toEqual([a.id, b.id].sort())
    expect(juara1.every((l) => l.bersama)).toBe(true)
    expect(Math.min(...layananKab.filter((l) => l.peringkat > 1).map((l) => l.peringkat))).toBe(3)
  })

  it('waktu dimajukan ke 2 Oktober: bulan September dan Triwulan III terbit tepat sekali', () => {
    const db = ambilDb()
    const nanti = new Date('2026-10-02T01:00:00+07:00')
    const baru = terbitkanLencana(db, nanti)
    expect(baru.periode.sort()).toEqual(['bulanan:2026-09', 'triwulan:2026-T3'])
    expect(baru.lencana.length).toBeGreaterThan(0)
    expect(new Set(baru.lencana.map((l) => `${l.periode.musim}:${l.periode.kode}`))).toEqual(new Set(['bulanan:2026-09', 'triwulan:2026-T3']))
    db.lencana.push(...baru.lencana)
    db.periodeLencana.push(...baru.periode)
    expect(terbitkanLencana(db, nanti)).toEqual({ lencana: [], periode: [] })
  })

  it('pastikanLencana tidak menulis bila tidak ada periode baru', () => {
    const sebelum = ambilDb().lencana
    pastikanLencana(SEKARANG_UJI)
    expect(ambilDb().lencana).toBe(sebelum)
  })

  it('Sungai Sialang punya lencana kecamatan Teluk Meranti untuk Agustus 2026', () => {
    const db = ambilDb()
    const l = db.lencana.filter((x) => x.desaId === ID_SUNGAI_SIALANG && x.tingkat === 'kecamatan' && x.periode.kode === '2026-08')
    expect(l.length).toBeGreaterThanOrEqual(1)
    expect(l.every((x) => x.wilayah.nama === 'Teluk Meranti')).toBe(true)
  })

  it('terbitPada = tutup periode', () => {
    const l = ambilDb().lencana.find((x) => x.periode.musim === 'triwulan' && x.periode.kode === '2026-T2')!
    expect(l.terbitPada).toBe('2026-07-01T00:00:00+07:00')
    expect(bulanPeriode(l.periode)).toEqual(['2026-04', '2026-05', '2026-06'])
  })
})

describe('lencanaTampil dan lencanaDesa', () => {
  it('hanya periode tutup terakhir tiap musim, paling banyak 6, tanpa yang disembunyikan, urut keputusan 3', () => {
    const db = ambilDb()
    const tampil = lencanaTampil(db, ID_SUNGAI_SIALANG)
    expect(tampil.length).toBeGreaterThan(0)
    expect(tampil.length).toBeLessThanOrEqual(6)
    const terakhir = { bulanan: '2026-08', triwulan: '2026-T2', tahunan: '2025' }
    for (const l of tampil) expect(l.periode.kode).toBe(terakhir[l.periode.musim])
    const urutMusim = ['tahunan', 'triwulan', 'bulanan']
    const kunci = tampil.map((l) => [urutMusim.indexOf(l.periode.musim), l.tingkat === 'kabupaten' ? 0 : 1, l.peringkat, KATEGORI_DESA.indexOf(l.kategori)])
    expect(kunci).toEqual([...kunci].sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || x[3] - y[3]))
    const sembunyi = tampil[0]
    db.lencana.find((l) => l.kode === sembunyi.kode)!.tampil = false
    expect(lencanaTampil(db, ID_SUNGAI_SIALANG).map((l) => l.kode)).not.toContain(sembunyi.kode)
  })
  it('lencanaDesa memuat semua lencana desa itu, periode terbaru dulu', () => {
    const db = ambilDb()
    const semua = lencanaDesa(db, ID_SUNGAI_SIALANG)
    expect(semua).toHaveLength(db.lencana.filter((l) => l.desaId === ID_SUNGAI_SIALANG).length)
    const waktu = semua.map((l) => l.terbitPada)
    expect(waktu).toEqual([...waktu].sort().reverse())
  })
})
