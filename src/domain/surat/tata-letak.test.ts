import { describe, expect, it } from 'vitest'
import { tataLetakSuratSchema, type TataLetakSurat } from './tata-letak'
import { barisKopBawaan, isiBarisKop, samaDenganSiap, tataLetakBerlaku, TATA_LETAK_SIAP } from './tata-letak-siap'

const standar = () => structuredClone(TATA_LETAK_SIAP.standar)
const pesan = (t: unknown) => {
  const h = tataLetakSuratSchema.safeParse(t)
  return h.success ? [] : h.error.issues.map((i) => i.message)
}

describe('tata letak surat siap pakai (SPEC-V0.2 12.2)', () => {
  it('ketiganya lolos skema dan membawa namanya di `siap`', () => {
    for (const id of ['standar', 'dua-lambang', 'rata-tengah'] as const) {
      expect(tataLetakSuratSchema.parse(TATA_LETAK_SIAP[id])).toEqual(TATA_LETAK_SIAP[id])
      expect(TATA_LETAK_SIAP[id].siap).toBe(id)
    }
  })
  it('standar sama dengan v0.1: A4, margin 20-20-20-30, Tinos 12 pt spasi 1,15, tanda tangan kanan, QR kiri bawah', () => {
    expect(TATA_LETAK_SIAP.standar).toMatchObject({
      kop: { posisiLambang: 'kiri', jumlahLambang: 1, garis: 'tebal-tipis' },
      kertas: { ukuran: 'A4', margin: { atas: 20, kanan: 20, bawah: 20, kiri: 30 } },
      huruf: { keluarga: 'Tinos', ukuranPt: 12, spasi: 1.15 },
      tandaTangan: { posisi: 'kanan', nip: false, tempatCap: false },
      qr: { posisi: 'kiri-bawah' },
    })
  })
  it('dua lambang: dua lambang dengan garis ganda; rata tengah: lambang di tengah, garis tunggal, tanda tangan dan QR di tengah', () => {
    expect(TATA_LETAK_SIAP['dua-lambang'].kop).toMatchObject({ jumlahLambang: 2, garis: 'ganda' })
    expect(TATA_LETAK_SIAP['rata-tengah']).toMatchObject({
      kop: { posisiLambang: 'tengah', jumlahLambang: 1, garis: 'tunggal' },
      tandaTangan: { posisi: 'tengah' },
      qr: { posisi: 'bawah-tanda-tangan' },
    })
  })
  it('baris kop bawaan memakai sisipan kabupaten, kecamatan, desa, dan alamat', () => {
    expect(barisKopBawaan()).toEqual(['PEMERINTAH KABUPATEN {kab}', 'KECAMATAN {kec}', 'DESA {desa}', '{alamat}'])
  })
})

describe('skema tata letak: batas dan pesan persis', () => {
  it('baris kop: 0 atau 6 baris → pesan jumlah baris', () => {
    const kosong = { ...standar(), kop: { ...standar().kop, baris: [] } }
    const enam = { ...standar(), kop: { ...standar().kop, baris: ['a', 'b', 'c', 'd', 'e', 'f'] } }
    expect(pesan(kosong)).toContain('Kop paling sedikit 1 baris dan paling banyak 5 baris.')
    expect(pesan(enam)).toContain('Kop paling sedikit 1 baris dan paling banyak 5 baris.')
  })
  it('baris kop: 81 karakter → pesan panjang; 80 karakter sah', () => {
    expect(pesan({ ...standar(), kop: { ...standar().kop, baris: ['x'.repeat(81)] } })).toContain('Baris kop paling banyak 80 karakter.')
    expect(pesan({ ...standar(), kop: { ...standar().kop, baris: ['x'.repeat(80)] } })).toEqual([])
  })
  it('baris kop kosong ditolak', () => {
    expect(pesan({ ...standar(), kop: { ...standar().kop, baris: ['  '] } })).toContain('Baris kop tidak boleh kosong.')
  })
  it('margin 9, 41, dan 20,5 → Margin 10-40 mm.; 10 dan 40 sah', () => {
    const margin = (kiri: number) => ({ ...standar(), kertas: { ukuran: 'A4', margin: { atas: 20, kanan: 20, bawah: 20, kiri } } })
    for (const salah of [9, 41, 20.5]) expect(pesan(margin(salah))).toContain('Margin 10-40 mm.')
    expect(pesan(margin(10))).toEqual([])
    expect(pesan(margin(40))).toEqual([])
  })
  it('urutan tanda tangan tanpa tempat-tanggal, jabatan, atau nama → pesan wajib; unsur ganda ditolak', () => {
    const urutan = (u: string[]) => ({ ...standar(), tandaTangan: { ...standar().tandaTangan, urutan: u } })
    for (const u of [['jabatan', 'nama'], ['tempat-tanggal', 'nama'], ['tempat-tanggal', 'jabatan', 'nip']]) {
      expect(pesan(urutan(u))).toContain('Tempat dan tanggal, jabatan, dan nama wajib ada di blok tanda tangan.')
    }
    expect(pesan(urutan(['tempat-tanggal', 'jabatan', 'nama', 'nama']))).toContain('Unsur blok tanda tangan tidak boleh ganda.')
    expect(pesan(urutan(['nama', 'jabatan', 'tempat-tanggal']))).toEqual([])
  })
  it('kunci tambahan ditolak, termasuk CSS atau HTML yang diselipkan', () => {
    expect(pesan({ ...standar(), css: 'body{display:none}' }).length).toBeGreaterThan(0)
    expect(pesan({ ...standar(), qr: { posisi: 'kiri-bawah', sembunyikanNomor: true } }).length).toBeGreaterThan(0)
    expect(pesan({ ...standar(), kop: { ...standar().kop, style: 'x' } }).length).toBeGreaterThan(0)
  })
  it('QR tidak bisa dimatikan: tanpa `qr` atau posisi di luar daftar ditolak', () => {
    const tanpaQr: Partial<TataLetakSurat> = standar()
    delete tanpaQr.qr
    expect(pesan(tanpaQr).length).toBeGreaterThan(0)
    expect(pesan({ ...standar(), qr: { posisi: 'tidak-ada' } }).length).toBeGreaterThan(0)
    expect(pesan({ ...standar(), qr: null }).length).toBeGreaterThan(0)
  })
  it('ukuran huruf dan spasi hanya dari daftar', () => {
    expect(pesan({ ...standar(), huruf: { keluarga: 'Tinos', ukuranPt: 14, spasi: 1.15 } }).length).toBeGreaterThan(0)
    expect(pesan({ ...standar(), huruf: { keluarga: 'Comic', ukuranPt: 12, spasi: 1.15 } }).length).toBeGreaterThan(0)
    expect(pesan({ ...standar(), huruf: { keluarga: 'Plex Serif', ukuranPt: 12.5, spasi: 1.5 } })).toEqual([])
  })
})

describe('tataLetakBerlaku', () => {
  const desa = { tataLetak: TATA_LETAK_SIAP['rata-tengah'] }
  it('memakai pengecualian jenis bila ada', () => {
    expect(tataLetakBerlaku({ tataLetak: TATA_LETAK_SIAP['dua-lambang'] }, desa)).toBe(TATA_LETAK_SIAP['dua-lambang'])
  })
  it('memakai tata letak desa bila jenis tidak punya pengecualian', () => {
    expect(tataLetakBerlaku({ tataLetak: null }, desa)).toBe(desa.tataLetak)
  })
})

describe('isiBarisKop', () => {
  const nilai = { kab: 'Pelalawan', kec: 'Teluk Meranti', desa: 'Sungai Sialang', alamat: 'Jalan Lintas Km 4, Kode Pos 28353' }
  it('mengganti sisipan (nama wilayah huruf kapital) dan membiarkan teks lain', () => {
    expect(isiBarisKop(barisKopBawaan(), nilai)).toEqual([
      'PEMERINTAH KABUPATEN PELALAWAN', 'KECAMATAN TELUK MERANTI', 'DESA SUNGAI SIALANG', 'Jalan Lintas Km 4, Kode Pos 28353',
    ])
    expect(isiBarisKop(['Kantor {desa} {tidak-dikenal}'], nilai)).toEqual(['Kantor SUNGAI SIALANG {tidak-dikenal}'])
  })
  it('markup di baris tetap teks (tidak dihilangkan, tidak ditafsirkan)', () => {
    expect(isiBarisKop(['<b>DESA {desa}</b>'], nilai)).toEqual(['<b>DESA SUNGAI SIALANG</b>'])
  })
})

describe('samaDenganSiap', () => {
  it('mengenali ketiga tata letak siap pakai, apa pun isi `siap`-nya', () => {
    for (const id of ['standar', 'dua-lambang', 'rata-tengah'] as const) {
      expect(samaDenganSiap({ ...structuredClone(TATA_LETAK_SIAP[id]), siap: null })).toBe(id)
    }
  })
  it('satu perubahan kecil → null', () => {
    const t: TataLetakSurat = { ...standar(), kertas: { ukuran: 'A4', margin: { atas: 20, kanan: 20, bawah: 20, kiri: 31 } } }
    expect(samaDenganSiap(t)).toBeNull()
  })
  it('dua lambang mengabaikan posisi lambang', () => {
    const t = structuredClone(TATA_LETAK_SIAP['dua-lambang'])
    t.kop.posisiLambang = 'tengah'
    expect(samaDenganSiap(t)).toBe('dua-lambang')
  })
})
