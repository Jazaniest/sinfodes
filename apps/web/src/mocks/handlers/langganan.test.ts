// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilLangganan, ambilTagihanCetak, kirimBukti } from '@/api/langganan'
import { tagihanSchema, type IsianBukti, type Tagihan } from '@/domain/langganan/tagihan'
import { tokenBantuanUntuk } from '@/mocks/bantuan'
import { REKENING_SINFODES } from '@/app/kontak-sinfodes'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { ambilDb, ubahDb } from '../db'

pakaiApiTiruan({ dbSegarTiapUji: true })

const MB = 1024 * 1024
const tagihanTerbit = (): Tagihan => ambilDb().tagihan.find((t) => t.desaId === ID_SUNGAI_SIALANG && t.status === 'terbit')!
const isian = (t: Tagihan, ubah: Partial<IsianBukti> = {}): IsianBukti => ({
  tanggalTransfer: '2026-09-23',
  namaPengirim: 'Pemdes Sungai Sialang',
  nominalTransfer: t.nominal,
  ...ubah,
})
const berkas = (ukuran = 1024, nama = 'bukti.png', tipe = 'image/png') => new File([new Uint8Array(ukuran)], nama, { type: tipe })

describe('GET /langganan', () => {
  it('Kaur Keuangan Sungai Sialang: tagihan berjalan terbit dan riwayat terurut terbaru dulu', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const l = await ambilLangganan()
    expect(l).toMatchObject({ paket: 'Lengkap', periodeTagihan: 'triwulan', berjalan: { status: 'terbit', nomor: 'SFD/2026/T4/001' } })
    expect(l.masaAktif?.sampai).toBe('2026-12-31')
    expect(l.riwayat[0].id).toBe(l.berjalan?.id)
    const mulai = l.riwayat.map((t) => t.periode.mulai)
    expect(mulai).toEqual([...mulai].sort().reverse())
    expect(l.riwayat.every((t) => t.desaId === ID_SUNGAI_SIALANG)).toBe(true)
    for (const t of l.riwayat) expect(tagihanSchema.safeParse(t).success).toBe(true)
  })
  it('Kepala Desa dan Sekretaris Desa juga bisa membuka', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.sekdes]) {
      masukSebagai(akun)
      expect((await ambilLangganan()).berjalan).not.toBeNull()
    }
  })
  it('Operator dan Kepala Dusun: 403 dengan pesan persis', async () => {
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      await expect(ambilLangganan()).rejects.toMatchObject({ status: 403, message: 'Peran Anda tidak membuka Langganan.' })
      await expect(ambilTagihanCetak(tagihanTerbit().id)).rejects.toMatchObject({ status: 403, message: 'Peran Anda tidak membuka Langganan.' })
    }
  })
  it('desa Persiapan belum berlangganan: tanpa masa aktif dan tanpa tagihan', async () => {
    ubahDb((d) => {
      d.pengguna.find((p) => p.id === AKUN_DESA_BARU_UJI)!.peran = 'sekdes'
    })
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await ambilLangganan()).toMatchObject({ masaAktif: null, berjalan: null, riwayat: [] })
  })
  it('sesi bantuan Tim Sinfodes: 403', async () => {
    ubahDb((d) => {
      d.aksesBantuan.push({
        id: 'akb_uji', desaId: ID_SUNGAI_SIALANG, diberiOlehId: 'pgn_hendri', mulai: '2026-09-24T08:00:00+07:00',
        sampai: '2026-09-25T08:00:00+07:00', sembunyikanDataPribadi: true, dicabut: null,
        sesi: [{ id: 'sb_uji', olehId: 'kns_dina', olehNama: 'Dina', mulai: '2026-09-24T08:30:00+07:00', halaman: [] }],
      })
    })
    aturTokenSesi(tokenBantuanUntuk('sb_uji'))
    await expect(ambilLangganan()).rejects.toMatchObject({ status: 403 })
    await expect(kirimBukti(tagihanTerbit().id, isian(tagihanTerbit()), berkas())).rejects.toMatchObject({ status: 403 })
  })
  it('waktu dimajukan ke 2027-04-20: Triwulan I dan II 2027 terbit satu kali; memanggil lagi tidak menggandakan', async () => {
    masukSebagai(AKUN_UJI.kades)
    vi.setSystemTime(new Date('2027-04-20T03:00:00Z'))
    try {
      const a = await ambilLangganan()
      expect(a.riwayat.slice(0, 2).map((t) => t.periode.label)).toEqual(['Triwulan II 2027', 'Triwulan I 2027'])
      expect(a.masaAktif?.sampai).toBe('2027-06-30')
      const b = await ambilLangganan()
      expect(b.riwayat).toHaveLength(a.riwayat.length)
      expect(ambilDb().tagihan.filter((t) => t.desaId === ID_SUNGAI_SIALANG && t.periode.mulai === '2027-01-01')).toHaveLength(1)
      const aktif = ambilDb().tagihan.filter((t) => t.status === 'terbit' || t.status === 'menunggu-verifikasi')
      expect(new Set(aktif.map((t) => t.nominal)).size).toBe(aktif.length)
    } finally {
      vi.setSystemTime(SEKARANG_UJI)
    }
  })
})

describe('GET /langganan/tagihan/:id', () => {
  it('memuat tagihan, rekening tujuan, dan identitas desa', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const t = tagihanTerbit()
    const c = await ambilTagihanCetak(t.id)
    expect(c).toMatchObject({ id: t.id, nominal: t.nominal, rekening: REKENING_SINFODES, desa: { nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan' } })
    expect(c.desa.alamatKantor).toMatch(/\S/)
  })
  it('tagihan desa lain dan ID yang tidak ada: 404 yang sama', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const lain = ambilDb().tagihan.find((t) => t.desaId !== ID_SUNGAI_SIALANG)!
    for (const id of [lain.id, 'tgh_tidak_ada']) {
      await expect(ambilTagihanCetak(id)).rejects.toMatchObject({ status: 404, message: 'Tagihan tidak ditemukan.' })
    }
  })
})

describe('POST /langganan/tagihan/:id/bukti', () => {
  it('gambar tepat 2 MB diterima: menunggu verifikasi, data URL terisi, riwayat bertambah dari desa', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const t = tagihanTerbit()
    const hasil = await kirimBukti(t.id, isian(t), berkas(2 * MB))
    expect(hasil).toMatchObject({ id: t.id, status: 'menunggu-verifikasi', penolakanTerakhir: null })
    expect(hasil.bukti).toMatchObject({
      berkas: 'bukti.png', ukuranKb: 2048, jenisBerkas: 'gambar', tanggalTransfer: '2026-09-23', namaPengirim: 'Pemdes Sungai Sialang',
      nominalTransfer: t.nominal, nominalCocok: true, oleh: { jenis: 'desa', id: 'pgn_nurhayati', nama: 'Nurhayati' },
    })
    expect(hasil.bukti?.dataUrl?.startsWith('data:image/png;base64,')).toBe(true)
    expect(hasil.riwayat.at(-1)).toMatchObject({ status: 'menunggu-verifikasi', oleh: { jenis: 'desa', id: 'pgn_nurhayati' } })
    expect(ambilDb().tagihan.find((x) => x.id === t.id)?.status).toBe('menunggu-verifikasi')
  })
  it('PDF: hanya nama dan ukuran disimpan; PDF tanpa ekstensi bertipe application/pdf juga diterima', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const t = tagihanTerbit()
    const hasil = await kirimBukti(t.id, isian(t), berkas(3000, 'slip-bank', 'application/pdf'))
    expect(hasil.bukti).toMatchObject({ jenisBerkas: 'pdf', dataUrl: null, berkas: 'slip-bank', ukuranKb: 3 })
  })
  it('2 MB + 1 bait ditolak, .docx ditolak, dan tanpa berkas ditolak; tagihan tidak berubah', async () => {
    masukSebagai(AKUN_UJI.kades)
    const t = tagihanTerbit()
    await expect(kirimBukti(t.id, isian(t), berkas(2 * MB + 1))).rejects.toMatchObject({ status: 422, fields: { bukti: 'Ukuran bukti maksimal 2 MB.' } })
    await expect(kirimBukti(t.id, isian(t), berkas(10, 'bukti.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).rejects.toMatchObject({
      status: 422,
      fields: { bukti: 'Bukti harus gambar (PNG, JPG, WebP) atau PDF.' },
    })
    await expect(kirimBukti(t.id, isian(t), null)).rejects.toMatchObject({ status: 422, fields: { bukti: 'Unggah bukti transfer.' } })
    expect(ambilDb().tagihan.find((x) => x.id === t.id)?.status).toBe('terbit')
  })
  it('nominal berbeda tetap diterima dengan nominalCocok false', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const t = tagihanTerbit()
    const hasil = await kirimBukti(t.id, isian(t, { nominalTransfer: t.harga }), berkas())
    expect(hasil.bukti).toMatchObject({ nominalTransfer: t.harga, nominalCocok: false })
    expect(hasil.status).toBe('menunggu-verifikasi')
  })
  it('tanggal transfer besok ditolak, hari ini diterima', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const t = tagihanTerbit()
    await expect(kirimBukti(t.id, isian(t, { tanggalTransfer: '2026-09-25' }), berkas())).rejects.toMatchObject({
      status: 422,
      fields: { tanggalTransfer: 'Tanggal transfer tidak boleh sesudah hari ini.' },
    })
    expect((await kirimBukti(t.id, isian(t, { tanggalTransfer: '2026-09-24' }), berkas())).bukti?.tanggalTransfer).toBe('2026-09-24')
  })
  it('isian tidak sah: semua galat dikembalikan sekaligus dengan pesan persis', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const t = tagihanTerbit()
    await expect(kirimBukti(t.id, isian(t, { namaPengirim: 'a'.repeat(81), nominalTransfer: 0 }), null)).rejects.toMatchObject({
      status: 422,
      fields: { namaPengirim: 'Paling banyak 80 karakter.', nominalTransfer: 'Nominal harus lebih dari 0.', bukti: 'Unggah bukti transfer.' },
    })
  })
  it('unggah kedua ke tagihan yang sudah menunggu verifikasi: 409', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const t = tagihanTerbit()
    await kirimBukti(t.id, isian(t), berkas())
    await expect(kirimBukti(t.id, isian(t), berkas())).rejects.toMatchObject({ status: 409, message: 'Tagihan ini tidak menunggu pembayaran.' })
  })
  it('tagihan lunas atau dibatalkan juga 409', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    for (const status of ['lunas', 'dibatalkan'] as const) {
      const t = ambilDb().tagihan.find((x) => x.desaId === ID_SUNGAI_SIALANG && x.status === 'lunas')!
      ubahDb((d) => {
        d.tagihan.find((x) => x.id === t.id)!.status = status
      })
      await expect(kirimBukti(t.id, isian(t), berkas())).rejects.toMatchObject({ status: 409 })
    }
  })
  it('bukti ditolak Tim sebelumnya: unggah ulang mengosongkan penolakanTerakhir', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const t = tagihanTerbit()
    ubahDb((d) => {
      d.tagihan.find((x) => x.id === t.id)!.penolakanTerakhir = { alasan: 'Nominal tidak sesuai.', pada: '2026-09-23T10:00:00+07:00', olehNama: 'Dina' }
    })
    const hasil = await kirimBukti(t.id, isian(t), berkas())
    expect(hasil.penolakanTerakhir).toBeNull()
  })
  it('tagihan desa lain: 404 dan tidak berubah', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const lain = ambilDb().tagihan.find((t) => t.desaId !== ID_SUNGAI_SIALANG && t.status === 'terbit')!
    await expect(kirimBukti(lain.id, isian(lain), berkas())).rejects.toMatchObject({ status: 404, message: 'Tagihan tidak ditemukan.' })
    expect(ambilDb().tagihan.find((t) => t.id === lain.id)?.status).toBe('terbit')
  })
  it('Operator dan Kepala Dusun: 403 dengan pesan persis', async () => {
    const t = tagihanTerbit()
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      await expect(kirimBukti(t.id, isian(t), berkas())).rejects.toMatchObject({ status: 403, message: 'Peran Anda tidak mengunggah bukti pembayaran.' })
    }
  })
})
