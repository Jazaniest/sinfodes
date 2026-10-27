import { describe, expect, it } from 'vitest'
import { kegiatanSchema, statusKegiatan } from '@sinfodes/kontrak/pembangunan/schema'
import { dalamPoligon } from '@sinfodes/kontrak/peta/schema'
import { DESA_DEMO, DUSUN_DEMO, ID_SUNGAI_SIALANG } from '../data/desa-demo'
import { bangkitkanDb } from './index'
import { bangkitkanPembangunan } from './pembangunan'

const ACUAN = new Date('2026-09-24T02:00:00Z')
const db = bangkitkanDb(ACUAN)
const desa = DESA_DEMO.find((d) => d.id === ID_SUNGAI_SIALANG)
if (!desa) throw new Error('Desa demo tidak ada')
const { rincian } = bangkitkanPembangunan({ desa, dusun: DUSUN_DEMO, acuan: ACUAN })

describe('pembangunan demo (SPEC §12.6)', () => {
  it('7 kegiatan sesuai SPEC: nama, progres fisik, dan status yang mengikuti progresnya', () => {
    expect(db.kegiatan.map((k) => [k.nama, k.progresFisik, k.status])).toEqual([
      ['Semenisasi jalan lingkungan Dusun III', 70, 'berjalan'],
      ['Drainase RT 006-007', 100, 'selesai'],
      ['Rehabilitasi Posyandu Kenanga', 100, 'selesai'],
      ['Sumur bor air bersih Dusun IV', 40, 'berjalan'],
      ['Titian kayu penghubung Dusun II-IV', 15, 'berjalan'],
      ['Lampu jalan tenaga surya', 100, 'selesai'],
      ['Pelantar perahu nelayan', 0, 'perencanaan'],
    ])
    for (const k of db.kegiatan) {
      expect(kegiatanSchema.parse(k)).toEqual(k)
      expect(k.status).toBe(statusKegiatan(k.progresFisik, k.mulai))
    }
  })
  it('dokumentasi progres hanya sampai progres fisiknya, dimulai 0%, dan tidak di masa depan', () => {
    for (const k of db.kegiatan) {
      const persen = k.dokumentasi.map((d) => d.persen)
      expect(persen[0], k.nama).toBe(0)
      expect(persen.every((p) => p <= k.progresFisik)).toBe(true)
      expect(k.dokumentasi.every((d) => d.tanggal <= '2026-09-24')).toBe(true)
    }
  })
  it('foto kurasi semenisasi menjadi dokumentasi 0% dan 50% semenisasi Dusun III; kegiatan lain belum berfoto', () => {
    const berkasGaleri = new Set(db.galeri.filter((f) => f.tersedia).map((f) => f.berkas))
    const semenisasi = db.kegiatan.find((k) => k.nama === 'Semenisasi jalan lingkungan Dusun III')
    expect(semenisasi?.dokumentasi.map((d) => d.foto)).toEqual(['/demo/foto/semenisasi-0.jpg', '/demo/foto/semenisasi-50.jpg'])
    for (const d of semenisasi?.dokumentasi ?? []) expect(d.foto !== null && berkasGaleri.has(d.foto)).toBe(true)
    const lain = db.kegiatan.filter((k) => k !== semenisasi)
    expect(lain.every((k) => k.dokumentasi.every((d) => d.foto === null))).toBe(true)
  })
  it('lokasi setiap kegiatan berada di dalam dusunnya', () => {
    const [peta] = db.peta
    for (const k of db.kegiatan) {
      const batas = peta.dusun.find((d) => d.dusunId === k.dusunId)?.batas ?? []
      expect(dalamPoligon(k.titik, batas), k.nama).toBe(true)
    }
  })
  it('rincian APBDes bidang 5.2: 7 kegiatan Rp721.900.000 ditambah operasional, total Rp748.900.000 (fokus review 1)', () => {
    expect(rincian.every((r) => r.induk === '5.2' && r.kelompok === 'belanja')).toBe(true)
    expect(rincian.map((r) => r.kode)).toEqual(db.kegiatan.map((k) => k.kodeApbdes).concat('5.2.08'))
    expect(rincian.slice(0, 7).reduce((n, r) => n + r.anggaran, 0)).toBe(721_900_000)
    expect(rincian.reduce((n, r) => n + r.anggaran, 0)).toBe(748_900_000)
    expect(rincian.every((r) => r.realisasi <= r.anggaran)).toBe(true)
    expect(rincian.find((r) => r.kode === '5.2.07')?.realisasi).toBe(0)
  })
})
