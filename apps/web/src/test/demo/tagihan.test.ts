import { describe, expect, it } from 'vitest'
import { tagihanSchema, type Tagihan } from '@/domain/langganan/tagihan'
import { SEKARANG_UJI } from '@/test/api-tiruan'
import { buktiContohSvg } from '@sinfodes/demo/data/bukti-contoh'
import { tagihanJatuh } from '@sinfodes/demo/tagihan-hitung'
import { bangkitkanDb } from '@sinfodes/demo/generator/index'

const db = bangkitkanDb(SEKARANG_UJI)
const HARI_INI = '2026-09-24'
const idDesa = (nama: string) => db.desa.find((d) => d.nama === nama)!.id
const milik = (nama: string): Tagihan[] => db.tagihan.filter((t) => t.desaId === idDesa(nama))

describe('data tagihan demo (rencana 7D-1 Tugas 2)', () => {
  it('setiap tagihan lolos skema, dan langganan tidak lagi membawa tagihan', () => {
    expect(db.tagihan.length).toBeGreaterThan(100)
    for (const t of db.tagihan) expect(tagihanSchema.safeParse(t).success, t.id).toBe(true)
    for (const l of db.langganan) expect(l, l.desaId).not.toHaveProperty('tagihan')
    expect(new Set(db.tagihan.map((t) => t.id)).size).toBe(db.tagihan.length)
  })
  it('semua status ada: terbit (juga lewat jatuh tempo), menunggu-verifikasi tepat 2, lunas, dibatalkan tepat 1', () => {
    const per = (s: Tagihan['status']) => db.tagihan.filter((t) => t.status === s)
    expect(per('terbit').length).toBeGreaterThan(0)
    expect(per('terbit').some((t) => t.jatuhTempo < HARI_INI)).toBe(true)
    expect(per('lunas').length).toBeGreaterThan(0)
    const menunggu = per('menunggu-verifikasi')
    expect(menunggu).toHaveLength(2)
    expect(menunggu.map((t) => t.desaId).sort()).toEqual([idDesa('Kerinci Indah'), idDesa('Sungai Gelugur')].sort())
    for (const t of menunggu) {
      expect(t.bukti?.dataUrl?.startsWith('data:image/svg+xml')).toBe(true)
      expect(t.bukti).toMatchObject({ jenisBerkas: 'gambar', nominalTransfer: t.nominal, nominalCocok: true })
      expect(t.riwayat.at(-1)?.status).toBe('menunggu-verifikasi')
    }
    expect(per('dibatalkan')).toHaveLength(1)
  })
  it('Talang Gading: satu tagihan dibatalkan "Salah nominal paket." beserta pengganti lunas untuk periode yang sama', () => {
    const batal = milik('Talang Gading').find((t) => t.status === 'dibatalkan')!
    expect(batal.dibatalkan).toMatchObject({ alasan: 'Salah nominal paket.' })
    expect(batal).toMatchObject({ lunas: null, kwitansi: null })
    const ganti = milik('Talang Gading').find((t) => t.status === 'lunas' && t.periode.mulai === batal.periode.mulai)!
    expect(ganti.id).not.toBe(batal.id)
    expect(ganti.paket).toBe('Dasar')
    expect(ganti.kwitansi).not.toBeNull()
  })
  it('setiap tagihan lunas punya kwitansi bernomor unik KW/tahun/urut, dan selain lunas tanpa kwitansi', () => {
    const lunas = db.tagihan.filter((t) => t.status === 'lunas')
    for (const t of lunas) {
      expect(t.kwitansi?.nomor, t.id).toMatch(/^KW\/\d{4}\/\d{4}$/)
      expect(t.lunas, t.id).not.toBeNull()
      expect(t.kwitansi?.nomor.slice(3, 7)).toBe(t.lunas!.diterimaPada.slice(0, 4))
    }
    expect(new Set(lunas.map((t) => t.kwitansi!.nomor)).size).toBe(lunas.length)
    for (const t of db.tagihan.filter((x) => x.status !== 'lunas')) expect(t.kwitansi, t.id).toBeNull()
    const tahun = lunas.filter((t) => t.kwitansi!.nomor.startsWith('KW/2026/')).map((t) => Number(t.kwitansi!.nomor.slice(-4))).sort((a, b) => a - b)
    expect(tahun).toEqual(tahun.map((_, i) => i + 1))
  })
  it('Sungai Sialang: tepat satu tagihan terbit, yaitu Triwulan IV 2026 (terbaru yang sudah terbit)', () => {
    const terbit = db.tagihan.filter((t) => t.desaId === 'desa_sungai_sialang' && t.status === 'terbit')
    expect(terbit).toHaveLength(1)
    expect(terbit[0]).toMatchObject({ nomor: 'SFD/2026/T4/001', jatuhTempo: '2026-10-15', terbit: '2026-09-17', paket: 'Lengkap', harga: 3_000_000 })
    expect(terbit[0].nominal).toBe(3_000_000 + terbit[0].kodeUnik)
  })
  it('Sungai Rambai punya tagihan terbit yang lewat jatuh tempo; hanya satu di seluruh platform', () => {
    expect(milik('Sungai Rambai').filter((t) => t.status === 'terbit' && t.jatuhTempo < HARI_INI)).toHaveLength(1)
    expect(db.tagihan.filter((t) => t.status === 'terbit' && t.jatuhTempo < HARI_INI)).toHaveLength(1)
  })
  it('nominal tagihan terbit dan menunggu-verifikasi semua desa unik', () => {
    const aktif = db.tagihan.filter((t) => t.status === 'terbit' || t.status === 'menunggu-verifikasi')
    expect(aktif.length).toBeGreaterThan(20)
    expect(new Set(aktif.map((t) => t.nominal)).size).toBe(aktif.length)
    for (const t of db.tagihan) expect(t.nominal).toBe(t.harga + t.kodeUnik)
  })
  it('hanya desa Aktif mendapat Triwulan IV 2026; masa aktif = akhir periode tagihan terakhir yang tidak dibatalkan', () => {
    for (const d of db.desa) {
      const t = db.tagihan.filter((x) => x.desaId === d.id)
      const l = db.langganan.find((x) => x.desaId === d.id)!
      const q4 = t.filter((x) => x.periode.mulai === '2026-10-01')
      expect(q4.length, d.nama).toBe(d.status === 'Aktif' ? 1 : 0)
      if (d.status === 'Persiapan' || d.status === 'Uji coba') expect(t, d.nama).toEqual([])
      else expect(l.sampai, d.nama).toBe(t.filter((x) => x.status !== 'dibatalkan').map((x) => x.periode.sampai).sort().at(-1))
    }
  })
  it('nomor tagihan memakai urutan desa di db.desa; harga mengikuti paket langganan', () => {
    for (const t of db.tagihan) {
      const urut = String(db.desa.findIndex((d) => d.id === t.desaId) + 1).padStart(3, '0')
      expect(t.nomor.endsWith(`/${urut}`), t.id).toBe(true)
    }
    for (const t of db.tagihan.filter((x) => x.status !== 'dibatalkan')) expect(t.paket, t.id).toBe(db.langganan.find((l) => l.desaId === t.desaId)!.paket)
  })
  it('waktu dimajukan ke 2027-04-20: setiap desa Aktif mendapat Triwulan I dan II 2027, masing-masing satu', () => {
    const baru = tagihanJatuh(db, new Date('2027-04-20T10:00:00+07:00'))
    const aktif = db.desa.filter((d) => d.status === 'Aktif')
    expect(baru).toHaveLength(aktif.length * 2)
    for (const d of aktif) expect(baru.filter((t) => t.desaId === d.id).map((t) => t.periode.label)).toEqual(['Triwulan I 2027', 'Triwulan II 2027'])
    const gabungan = [...db.tagihan, ...baru].filter((t) => t.status === 'terbit' || t.status === 'menunggu-verifikasi')
    expect(new Set(gabungan.map((t) => t.nominal)).size).toBe(gabungan.length)
  })
  it('bukti contoh: SVG kecil dengan cap CONTOH dan tulisan demo', () => {
    const url = buktiContohSvg({ bank: 'Bank Contoh Nusantara', nominal: 3_000_127, tanggal: '2026-09-22', pengirim: 'Pemdes <Uji> & Co' })
    expect(url.startsWith('data:image/svg+xml')).toBe(true)
    const svg = decodeURIComponent(url.slice(url.indexOf(',') + 1))
    expect(svg).toContain('CONTOH')
    expect(svg).toContain('Bukti transfer demo, bukan dokumen asli')
    expect(svg).toContain('Rp3.000.127')
    expect(svg).toContain('Pemdes &lt;Uji&gt; &amp; Co')
    expect(url.length).toBeLessThan(6000)
  })
})
