import { describe, expect, it } from 'vitest'
import { ID_SUNGAI_SIALANG, ID_TANJUNG_LAMO } from '../data/desa-demo'
import { desaSasaranKabupaten } from '../kabupaten-angka'
import { bangkitkanDb } from './index'

const SEKARANG = new Date('2026-09-24T02:00:00Z')

describe('siaran contoh (SPEC-V0.2 §13)', () => {
  const db = bangkitkanDb(SEKARANG)
  const siaran = (id: string) => db.siaran.find((s) => s.id === id)

  it('lima siaran relatif terhadap hari acuan, dengan pengirim dan sasarannya', () => {
    expect(db.siaran.map((s) => [s.id, s.kabupatenKode, s.dikirimPada, s.dikirimOleh.id, s.sasaran.jenis])).toEqual([
      ['srn_pll_libur', '14.05', '2026-08-20T09:00:00+07:00', 'kab_fajar', 'semua'],
      ['srn_pll_rakor', '14.05', '2026-09-04T10:00:00+07:00', 'kab_fajar', 'semua'],
      ['srn_pll_blt', '14.05', '2026-09-21T08:30:00+07:00', 'kab_fajar', 'kecamatan'],
      ['srn_pll_ralat', '14.05', '2026-09-14T14:00:00+07:00', 'kab_fajar', 'desa'],
      ['srn_siak_rakor', '14.08', '2026-09-18T09:00:00+07:00', 'kab_wahyu', 'semua'],
    ])
    expect(siaran('srn_pll_rakor')).toMatchObject({
      judul: 'Undangan rapat koordinasi penyaluran Dana Desa tahap II',
      lampiran: { berkas: 'undangan-rakor-dd-tahap-2.pdf', ukuranKb: 284 },
      tindakLanjut: { tenggat: '2026-09-11' },
    })
    expect(siaran('srn_pll_blt')?.tindakLanjut).toEqual({ tenggat: '2026-10-05' })
    expect(siaran('srn_pll_ralat')?.ditarik).toEqual({ pada: '2026-09-14T14:25:00+07:00', oleh: { id: 'kab_fajar', nama: 'Fajar Ramadhan' } })
  })

  it('sasaran dibekukan: semua desa Pelalawan = desa sasaran kabupaten; kecamatan tanpa Tanjung Lamo (Persiapan)', () => {
    expect(siaran('srn_pll_rakor')?.desaIds).toHaveLength(desaSasaranKabupaten(db, '14.05').length)
    expect(siaran('srn_pll_rakor')?.desaIds).toHaveLength(25)
    expect(siaran('srn_pll_blt')?.desaIds).toContain(ID_SUNGAI_SIALANG)
    expect(siaran('srn_pll_blt')?.desaIds).not.toContain(ID_TANJUNG_LAMO)
    expect(siaran('srn_siak_rakor')?.desaIds).toHaveLength(2)
  })

  it('Sungai Sialang: rapat ditindaklanjuti Hendri, BLT belum dibaca; baca hanya dari desa sasaran dan tidak melewati acuan', () => {
    expect(db.bacaSiaran.find((b) => b.siaranId === 'srn_pll_rakor' && b.desaId === ID_SUNGAI_SIALANG)).toEqual({
      siaranId: 'srn_pll_rakor',
      desaId: ID_SUNGAI_SIALANG,
      dibaca: { pada: '2026-09-04T13:10:00+07:00', oleh: { id: 'pgn_hendri', nama: 'Hendri Saputra' } },
      tindakLanjut: {
        pada: '2026-09-05T09:30:00+07:00', oleh: { id: 'pgn_hendri', nama: 'Hendri Saputra' }, catatan: 'Sekretaris Desa dan Kaur Keuangan akan hadir.',
      },
    })
    expect(db.bacaSiaran.some((b) => b.siaranId === 'srn_pll_blt' && b.desaId === ID_SUNGAI_SIALANG)).toBe(false)
    for (const b of db.bacaSiaran) {
      const s = siaran(b.siaranId)
      expect(s?.desaIds, `${b.siaranId} ${b.desaId}`).toContain(b.desaId)
      expect(Date.parse(b.dibaca.pada) <= SEKARANG.getTime()).toBe(true)
      if (b.tindakLanjut) {
        expect(s?.tindakLanjut).not.toBeNull()
        expect(Date.parse(b.tindakLanjut.pada) <= SEKARANG.getTime()).toBe(true)
        expect(b.tindakLanjut.pada >= b.dibaca.pada).toBe(true)
      }
    }
  })

  it('siaran yang ditarik hanya dibaca Kuala Rengas sebelum ditarik', () => {
    const baca = db.bacaSiaran.filter((b) => b.siaranId === 'srn_pll_ralat')
    expect(baca.map((b) => [db.desa.find((d) => d.id === b.desaId)?.nama, b.dibaca.pada])).toEqual([['Kuala Rengas', '2026-09-14T14:10:00+07:00']])
  })

  it('deterministik: dua kali bangkit dengan acuan sama menghasilkan siaran dan status baca yang sama', () => {
    const lagi = bangkitkanDb(SEKARANG)
    expect(lagi.siaran).toEqual(db.siaran)
    expect(lagi.bacaSiaran).toEqual(db.bacaSiaran)
  })

  it('notifikasi siaran: Operator tetap 3 belum dibaca; Hendri dan Nasir masing-masing satu siaran BLT belum dibaca', () => {
    const belum = (id: string) => db.notifikasi.filter((n) => n.penggunaId === id && !n.dibaca)
    expect(belum('pgn_rosmiati')).toHaveLength(3)
    for (const id of ['pgn_hendri', 'pgn_nasir']) {
      expect(belum(id).filter((n) => n.jenis === 'siaran-kabupaten').map((n) => n.rujukan)).toEqual([{ jenis: 'siaran', id: 'srn_pll_blt' }])
    }
    const blt = db.notifikasi.find((n) => n.id === 'ntf_srn_srn_pll_blt_pgn_nasir')
    expect(blt).toMatchObject({
      judul: 'Pemutakhiran data penerima BLT-DD triwulan IV',
      isi: 'Dari Kabupaten Pelalawan. Perlu tindak lanjut sampai 5 Oktober 2026.',
      waktu: '2026-09-21T08:30:00+07:00',
    })
    expect(db.notifikasi.filter((n) => n.jenis === 'siaran-kabupaten' && n.penggunaId === 'pgn_nurhayati')).toEqual([])
  })
})
