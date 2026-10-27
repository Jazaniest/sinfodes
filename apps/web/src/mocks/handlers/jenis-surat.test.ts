import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { verifikasiSurat } from '@/api/publik'
import {
  aktifkanLagiJenisSurat, ambilAntrianTtd, ambilJenisSurat, ambilPermohonan, arsipkanJenisSurat, buatPermohonan, daftarJenisSurat,
  hapusJenisSurat, jalankanAksi, tambahJenisSurat, ubahJenisSurat,
} from '@/api/surat'
import type { UbahJenisSurat } from '@/domain/surat/ubah-jenis'
import { ambilDb } from '@/mocks/db'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('jenis surat: detail dan ubah (SPEC §7.4 layar 6)', () => {
  it('detail: jumlah pakai sama dengan daftar; contoh dari permohonan terakhir jenis itu', async () => {
    masukSebagai(AKUN_UJI.operator)
    const d = await ambilJenisSurat('js_ss_skd')
    expect(d.jenis.jumlahPakai).toBe((await daftarJenisSurat()).data.find((j) => j.id === 'js_ss_skd')?.jumlahPakai)
    const terakhir = ambilDb()
      .permohonan.filter((p) => p.jenisId === 'js_ss_skd')
      .sort((a, b) => b.masukPada.localeCompare(a.masukPada))[0]
    expect(d.contoh.pemohon.id).toBe(terakhir.pemohonId)
    expect(d.contoh.isian).toEqual(terakhir.isian)
    expect(d.pejabat.kades).toBe('H. Muhammad Nasir')
  })
  it('ubah teks: surat yang sudah terbit tetap; yang belum terbit memakai teks baru (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const terbit = ambilDb().permohonan.find((p) => p.jenisId === 'js_ss_skd' && p.terbit)
    const lembarLama = structuredClone(terbit?.terbit?.lembar)
    const teks = 'Benar penduduk Desa [namaDesa] yang tinggal di [alamat].\n\nUntuk keperluan [keperluan].'
    const d = await ubahJenisSurat('js_ss_skd', { teks, klasifikasi: ' 470.1 ' })
    expect(d.jenis).toMatchObject({ teks, klasifikasi: '470.1' })
    expect(ambilDb().permohonan.find((p) => p.id === terbit?.id)?.terbit?.lembar).toEqual(lembarLama)
    const draf = ambilDb().permohonan.find((p) => p.jenisId === 'js_ss_skd' && !p.terbit)
    expect((await ambilPermohonan(draf?.id ?? '-')).jenis.teks).toBe(teks)
  })
  it('isian wajib baru: surat yang menunggu tanda tangan tidak bisa ditandatangani sebelum dilengkapi (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const d = await ambilJenisSurat('js_ss_skd')
    const baru = { kunci: 'namaSekolah', label: 'Nama sekolah', jenis: 'teks', wajib: true, pilihan: null, rupiah: false, diTabel: false, keterangan: null } as const
    await ubahJenisSurat('js_ss_skd', { isian: [...d.jenis.isian, baru], teks: `${d.jenis.teks}\n\nSekolah: [namaSekolah].` })
    masukSebagai(AKUN_UJI.kades)
    const skd = (await ambilAntrianTtd()).find((x) => x.jenis.kode === 'SKD')
    const g = await galatDari(jalankanAksi(skd?.permohonan.id ?? '-', 'tandatangani', { passphrase: 'sialang2026' }))
    expect(g.kode).toBe('VALIDATION')
    expect(g.message).toBe('Isian surat belum lengkap (Nama sekolah wajib diisi). Kembalikan ke operator untuk dilengkapi.')
    expect(ambilDb().permohonan.find((p) => p.id === skd?.permohonan.id)?.terbit).toBeNull()
  })
  it('nonaktif: ditolak saat membuat surat; permohonan lama tetap bisa diproses (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    await ubahJenisSurat('js_ss_skd', { aktif: false })
    const g = await galatDari(
      buatPermohonan({ jenisId: 'js_ss_skd', pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: { keperluan: 'x' }, ajukan: false }),
    )
    expect(g).toMatchObject({ status: 409, message: 'Jenis surat ini tidak tersedia.', fields: { jenisId: 'Jenis surat ini tidak tersedia.' } })
    const lama = ambilDb().permohonan.find((p) => p.jenisId === 'js_ss_skd' && p.status === 'diproses')
    expect((await jalankanAksi(lama?.id ?? '-', 'ajukan-ttd', { isian: lama?.isian })).permohonan.status).toBe('perlu-ttd')
  })
  it('teks tidak sah ditolak per kolom dan tidak tersimpan (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const d = await ambilJenisSurat('js_ss_sktm')
    const g = await galatDari(ubahJenisSurat('js_ss_sktm', { isian: d.jenis.isian.filter((x) => x.kunci !== 'instansiTujuan') }))
    expect(g.kode).toBe('VALIDATION')
    expect(g.fields).toEqual({ teks: 'Sisipan [instansiTujuan] tidak dikenal. Hapus, atau tambahkan isiannya lebih dulu.' })
    expect(ambilDb().jenisSurat.find((j) => j.id === 'js_ss_sktm')?.isian).toHaveLength(3)
  })
  it('isian dirapikan: label dan pilihan tanpa spasi tepi, pilihan kosong dibuang', async () => {
    masukSebagai(AKUN_UJI.operator)
    const d = await ambilJenisSurat('js_ss_sktm')
    const [keperluan, ...lain] = d.jenis.isian
    const hasil = await ubahJenisSurat('js_ss_sktm', {
      isian: [{ ...keperluan, label: ' Keperluan ', pilihan: [' Pendidikan', 'Kesehatan ', '', 'Lainnya'] }, ...lain],
      syarat: [' KTP ', 'KK'],
    })
    expect(hasil.jenis.isian[0]).toMatchObject({ label: 'Keperluan', pilihan: ['Pendidikan', 'Kesehatan', 'Lainnya'] })
    expect(hasil.jenis.syarat).toEqual(['KTP', 'KK'])
  })
  it('hanya Operator dan Sekdes yang boleh mengubah; kode tidak bisa diubah (fokus review 5)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(ubahJenisSurat('js_ss_skd', { aktif: false }))).kode).toBe('FORBIDDEN')
    }
    masukSebagai(AKUN_UJI.sekdes)
    const d = await ubahJenisSurat('js_ss_skd', { kode: 'XYZ', online: false } as UbahJenisSurat)
    expect(d.jenis).toMatchObject({ kode: 'SKD', online: false })
  })
})

describe('jenis surat desa baru (tahap 6C)', () => {
  it('Tanjung Lamo: 12 jenis bawaan, semuanya belum dilayani', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    const { data } = await daftarJenisSurat()
    expect(data).toHaveLength(12)
    expect(data.every((j) => !j.aktif && j.id.startsWith('js_tanjung_lamo_') && j.jumlahPakai === 0)).toBe(true)
  })
  it('mengaktifkan dan membuka jenis surat tanpa penduduk: pratinjau memakai pemohon contoh tanpa NIK (fokus review 1)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    const d = await ubahJenisSurat('js_tanjung_lamo_sktm', { aktif: true })
    expect(d.jenis.aktif).toBe(true)
    expect(d.contoh).toMatchObject({ tiruan: true, pemohon: { nama: 'Nama Pemohon', nik: null, desaId: 'desa_tanjung_lamo' }, subjek: null })
    expect((await ambilJenisSurat('js_tanjung_lamo_skl')).contoh.tiruan).toBe(true)
  })
  it('jenis surat desa lain tidak bisa dibuka atau diubah (fokus review 1)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect((await galatDari(ambilJenisSurat('js_ss_skd'))).kode).toBe('NOT_FOUND')
    expect((await galatDari(ubahJenisSurat('js_ss_skd', { aktif: false }))).kode).toBe('NOT_FOUND')
    expect(ambilDb().jenisSurat.find((j) => j.id === 'js_ss_skd')?.aktif).toBe(true)
  })
  it('Sungai Sialang tetap memakai permohonan sungguhan sebagai contoh', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilJenisSurat('js_ss_skd')).contoh.tiruan).toBe(false)
  })
})

const PESAN_TIDAK_ADA = 'Jenis surat tidak ditemukan.'

/** Jenis buatan desa yang sudah menyala dan sudah punya satu permohonan berjalan (belum diajukan ke penandatangan). */
async function jenisDesaDipakai(kode = 'SPK') {
  const j = await tambahJenisSurat({ dari: null, kode, nama: 'Surat Pengantar Kerja' })
  await ubahJenisSurat(j.id, { aktif: true })
  const dibuat = await buatPermohonan({ jenisId: j.id, pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: {}, ajukan: false })
  return { j, p: dibuat.permohonan }
}

describe('jenis surat buatan desa: tambah (SPEC-V0.2 12.1)', () => {
  it('dari kosong: asal desa, mati, belum diarsipkan, isi awal sesuai keputusan 2', async () => {
    masukSebagai(AKUN_UJI.operator)
    const j = await tambahJenisSurat({ dari: null, kode: 'SPK', nama: ' Surat Pengantar Kerja ' })
    expect(j).toMatchObject({
      kode: 'SPK', nama: 'Surat Pengantar Kerja', asal: 'desa', aktif: false, diarsipkan: null, desaId: 'desa_sungai_sialang',
      klasifikasi: '470', subjek: 'pemohon', syarat: ['KTP-el pemohon'], isian: [],
    })
    expect(ambilDb().jenisSurat.find((x) => x.id === j.id)).toEqual(j)
    expect((await ambilJenisSurat(j.id)).jenis).toMatchObject({ kode: 'SPK', dipakai: false, jumlahPakai: 0 })
  })
  it('salin dari SKTM: isian dan teks sama; mengubah salinan tidak mengubah sumber (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const sumber = structuredClone(ambilDb().jenisSurat.find((x) => x.id === 'js_ss_sktm'))
    const salinan = await tambahJenisSurat({ dari: 'js_ss_sktm', kode: 'SKTK', nama: 'Surat Keterangan Tidak Kuat' })
    expect(salinan).toMatchObject({ asal: 'desa', aktif: false, diarsipkan: null, isian: sumber?.isian, teks: sumber?.teks, syarat: sumber?.syarat })
    expect(salinan.id).not.toBe('js_ss_sktm')
    await ubahJenisSurat(salinan.id, { teks: 'Teks salinan [nama].', syarat: ['KTP'] })
    expect(ambilDb().jenisSurat.find((x) => x.id === 'js_ss_sktm')).toEqual(sumber)
  })
  it('salin dari jenis arsip diizinkan; hasilnya tidak ikut diarsipkan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const asal = await tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' })
    await arsipkanJenisSurat(asal.id)
    const salinan = await tambahJenisSurat({ dari: asal.id, kode: 'SPKB', nama: 'Surat Pengantar Kerja Baru' })
    expect(salinan).toMatchObject({ diarsipkan: null, aktif: false, asal: 'desa' })
  })
  it('kode ganda dengan jenis aktif, mati, maupun arsip → 422 persis (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const arsip = await tambahJenisSurat({ dari: null, kode: 'ARS', nama: 'Surat Arsip' })
    await arsipkanJenisSurat(arsip.id)
    for (const kode of ['SKD', 'ARS']) {
      const g = await galatDari(tambahJenisSurat({ dari: null, kode, nama: 'Surat Lain' }))
      expect(g).toMatchObject({ kode: 'VALIDATION', status: 422, fields: { kode: 'Kode sudah dipakai jenis surat lain.' } })
    }
    await ubahJenisSurat('js_ss_skd', { aktif: false })
    expect((await galatDari(tambahJenisSurat({ dari: null, kode: 'SKD', nama: 'Surat Lain' }))).fields).toEqual({
      kode: 'Kode sudah dipakai jenis surat lain.',
    })
  })
  it('kode dipakai per desa: desa lain boleh memakai kode yang tidak ada di katalognya', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect((await galatDari(tambahJenisSurat({ dari: null, kode: 'SKD', nama: 'Surat Domisili' }))).fields).toEqual({
      kode: 'Kode sudah dipakai jenis surat lain.',
    })
    const j = await tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' })
    expect(j.desaId).toBe('desa_tanjung_lamo')
  })
  it('kode dan nama tidak sah ditolak per kolom; sumber salinan milik desa lain atau tidak ada → 404', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(tambahJenisSurat({ dari: null, kode: 'ab', nama: ' ' }))
    expect(g).toMatchObject({ kode: 'VALIDATION', status: 422, fields: { kode: 'Kode 2-5 huruf kapital.', nama: 'Nama jenis surat wajib diisi.' } })
    for (const dari of ['js_tanjung_lamo_skd', 'js_tidak_ada']) {
      expect(await galatDari(tambahJenisSurat({ dari, kode: 'SPK', nama: 'Surat Pengantar Kerja' }))).toMatchObject({
        kode: 'NOT_FOUND', status: 404, message: PESAN_TIDAK_ADA,
      })
    }
    expect(ambilDb().jenisSurat.some((j) => j.kode === 'SPK')).toBe(false)
  })
  it('hanya Operator dan Sekdes; Kades dan Kepala Dusun → 403', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' }))).kode).toBe('FORBIDDEN')
    }
    masukSebagai(AKUN_UJI.sekdes)
    expect((await tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' })).asal).toBe('desa')
  })
})

describe('jenis surat buatan desa: hapus, arsipkan, aktifkan lagi (SPEC-V0.2 12.1)', () => {
  it('hapus jenis desa yang belum dipakai → hilang; GET sesudahnya 404', async () => {
    masukSebagai(AKUN_UJI.operator)
    const j = await tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' })
    await hapusJenisSurat(j.id)
    expect((await galatDari(ambilJenisSurat(j.id))).kode).toBe('NOT_FOUND')
    expect(ambilDb().jenisSurat.some((x) => x.id === j.id)).toBe(false)
  })
  it('hapus jenis bawaan → 422; hapus jenis desa yang sudah dipakai → 409; keduanya tetap ada', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await galatDari(hapusJenisSurat('js_ss_skd'))).toMatchObject({
      kode: 'VALIDATION', status: 422, message: 'Jenis bawaan tidak bisa dihapus atau diarsipkan.',
    })
    const { j } = await jenisDesaDipakai()
    expect(await galatDari(hapusJenisSurat(j.id))).toMatchObject({
      kode: 'CONFLICT', status: 409, message: 'Jenis ini sudah pernah dipakai. Arsipkan saja.',
    })
    expect(ambilDb().jenisSurat.filter((x) => x.id === 'js_ss_skd' || x.id === j.id)).toHaveLength(2)
    expect((await ambilJenisSurat(j.id)).jenis).toMatchObject({ dipakai: true, jumlahPakai: 1 })
  })
  it('arsipkan: diarsipkan terisi, mati, PATCH sesudahnya → 409; jenis bawaan tak bisa diarsipkan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { j } = await jenisDesaDipakai()
    const arsip = await arsipkanJenisSurat(j.id)
    expect(arsip.diarsipkan).toMatch(/^2026-09-24T/)
    expect(arsip.aktif).toBe(false)
    expect(await galatDari(ubahJenisSurat(j.id, { nama: 'Nama Baru' }))).toMatchObject({
      kode: 'CONFLICT', status: 409, message: 'Jenis ini diarsipkan. Aktifkan lagi sebelum mengubahnya.',
    })
    expect(ambilDb().jenisSurat.find((x) => x.id === j.id)?.nama).toBe('Surat Pengantar Kerja')
    expect(await galatDari(arsipkanJenisSurat('js_ss_skd'))).toMatchObject({
      kode: 'VALIDATION', status: 422, message: 'Jenis bawaan tidak bisa dihapus atau diarsipkan.',
    })
    expect((await galatDari(arsipkanJenisSurat(j.id))).status).toBe(409)
  })
  it('aktifkan lagi: diarsipkan null dan aktif tetap false; boleh diubah lagi', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { j } = await jenisDesaDipakai()
    await arsipkanJenisSurat(j.id)
    const lagi = await aktifkanLagiJenisSurat(j.id)
    expect(lagi).toMatchObject({ diarsipkan: null, aktif: false })
    expect((await ubahJenisSurat(j.id, { nama: 'Nama Baru' })).jenis.nama).toBe('Nama Baru')
    expect((await galatDari(aktifkanLagiJenisSurat(j.id))).status).toBe(409)
  })
  it('jenis desa lain atau tidak ada → 404 untuk hapus, arsipkan, aktifkan lagi', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    for (const aksi of [hapusJenisSurat, arsipkanJenisSurat, aktifkanLagiJenisSurat]) {
      expect(await galatDari(aksi('js_ss_skd'))).toMatchObject({ kode: 'NOT_FOUND', status: 404, message: PESAN_TIDAK_ADA })
    }
    expect(ambilDb().jenisSurat.some((x) => x.id === 'js_ss_skd')).toBe(true)
  })
  it('Kades dan Kepala Dusun → 403 untuk hapus, arsipkan, aktifkan lagi', async () => {
    masukSebagai(AKUN_UJI.operator)
    const j = await tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' })
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      for (const aksi of [hapusJenisSurat, arsipkanJenisSurat, aktifkanLagiJenisSurat]) {
        expect((await galatDari(aksi(j.id))).kode).toBe('FORBIDDEN')
      }
    }
  })
  it('jenis arsip tidak bisa membuat permohonan baru dari loket', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { j } = await jenisDesaDipakai()
    await arsipkanJenisSurat(j.id)
    const g = await galatDari(buatPermohonan({ jenisId: j.id, pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: {}, ajukan: false }))
    expect(g).toMatchObject({ status: 409, message: 'Jenis surat ini tidak tersedia.' })
  })
  it('permohonan yang sedang berjalan saat jenisnya diarsipkan tetap bisa diselesaikan dan ditandatangani (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { j, p } = await jenisDesaDipakai()
    await arsipkanJenisSurat(j.id)
    expect((await jalankanAksi(p.id, 'ajukan-ttd', { isian: {} })).permohonan.status).toBe('perlu-ttd')
    masukSebagai(AKUN_UJI.kades)
    const hasil = await jalankanAksi(p.id, 'tandatangani', { passphrase: 'sialang2026' })
    expect(hasil.permohonan.status).toBe('selesai')
    expect(ambilDb().permohonan.find((x) => x.id === p.id)?.terbit).not.toBeNull()
  })
  it('surat yang terbit dari jenis arsip tetap bisa diverifikasi di Cek keaslian (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { j, p } = await jenisDesaDipakai()
    await jalankanAksi(p.id, 'ajukan-ttd', { isian: {} })
    masukSebagai(AKUN_UJI.kades)
    await jalankanAksi(p.id, 'tandatangani', { passphrase: 'sialang2026' })
    masukSebagai(AKUN_UJI.operator)
    await arsipkanJenisSurat(j.id)
    const terbit = ambilDb().permohonan.find((x) => x.id === p.id)?.terbit
    const h = await verifikasiSurat('sungaisialang', terbit?.kodeVerifikasi ?? '-')
    expect(h).toMatchObject({ jenis: 'Surat Pengantar Kerja', nomor: terbit?.nomor, berlaku: { status: 'berlaku' } })
  })
})

describe('daftar jenis surat: dipakai dan penyaring status (SPEC-V0.2 12.1 butir 6)', () => {
  it('setiap baris punya dipakai (pernah dipakai permohonan apa pun); SKD dipakai', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarJenisSurat()
    expect(data.find((x) => x.id === 'js_ss_skd')?.dipakai).toBe(true)
    for (const x of data) expect(x.dipakai, x.kode).toBe(ambilDb().permohonan.some((p) => p.jenisId === x.id))
  })
  it('?status memilah aktif, dihentikan, dan diarsipkan; tanpa status memuat semuanya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const arsip = await tambahJenisSurat({ dari: null, kode: 'ARS', nama: 'Surat Arsip' })
    await arsipkanJenisSurat(arsip.id)
    await tambahJenisSurat({ dari: null, kode: 'MTI', nama: 'Surat Mati' })
    await ubahJenisSurat('js_ss_skd', { aktif: false })
    const kode = async (status?: 'aktif' | 'dihentikan' | 'diarsipkan') =>
      (await daftarJenisSurat(undefined, status)).data.map((j) => j.kode).sort()
    expect(await kode('diarsipkan')).toEqual(['ARS'])
    expect(await kode('dihentikan')).toEqual(['MTI', 'SKD'])
    expect(await kode('aktif')).not.toContain('SKD')
    expect((await kode('aktif')).length).toBe(11)
    expect((await kode()).length).toBe(14)
  })
})
