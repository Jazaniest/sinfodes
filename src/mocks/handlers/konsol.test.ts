import { describe, expect, it } from 'vitest'
import { ambilBerandaPublik } from '@/api/publik'
import { ambilDetailDesaKonsol, ambilRingkasanKonsol, daftarDesaKonsol, tambahDesa } from '@/api/konsol'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const isianBaru = { nama: 'Koto Baru Sentosa', kecamatan: '14.01.17', kodeDesa: '2077', paket: 'Lengkap' as const, email: 'admin@kotobarusentosa.desa.id' }

describe('API Konsol (SPEC §11, §3.4)', () => {
  it('Ringkasan Tim Sinfodes: semua desa; 3 tidak aktif, 2 berhenti di impor, 1 tagihan lewat', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const r = await ambilRingkasanKonsol()
    expect(r.cakupan).toBe('Semua desa')
    expect(r.perhatian).toEqual([
      { jenis: 'tidak-aktif', jumlah: 3 },
      { jenis: 'berhenti-impor', jumlah: 2 },
      { jenis: 'tagihan-lewat', jumlah: 1 },
    ])
    expect(r.desa).toEqual({ aktif: 26, ujiCoba: 5, persiapan: 7, ditangguhkan: 2 })
    expect(r.suratMingguIni).toBeGreaterThan(0)
  })
  it('Ringkasan pemantau: hanya 32 desa Pelalawan dan tanpa butir tagihan (fokus review 1)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    const r = await ambilRingkasanKonsol()
    expect(r.cakupan).toBe('Kabupaten Pelalawan')
    expect(r.desa.aktif + r.desa.ujiCoba + r.desa.persiapan + r.desa.ditangguhkan).toBe(32)
    expect(r.perhatian.map((p) => p.jenis)).toEqual(['tidak-aktif', 'berhenti-impor'])
  })
  it('pemantau ditolak di semua endpoint Desa (fokus review 1)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    await expect(daftarDesaKonsol({})).rejects.toMatchObject({ kode: 'FORBIDDEN' })
    await expect(ambilDetailDesaKonsol('desa_sungai_sialang')).rejects.toMatchObject({ kode: 'FORBIDDEN' })
    await expect(tambahDesa(isianBaru)).rejects.toMatchObject({ kode: 'FORBIDDEN' })
    expect(ambilDb().desa).toHaveLength(40)
  })
  it('Daftar desa: 40 desa urut nama; filter provinsi, kabupaten, status, dan paket', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const semua = (await daftarDesaKonsol({})).data
    expect(semua).toHaveLength(40)
    expect(semua.map((d) => d.nama)).toEqual([...semua.map((d) => d.nama)].sort((a, b) => a.localeCompare(b, 'id')))
    const ss = semua.find((d) => d.slug === 'sungai-sialang')
    expect(ss).toMatchObject({ status: 'Aktif', paket: 'Lengkap', penggunaAktif: 5 })
    expect(ss?.kelengkapan).toBeCloseTo(2800 / 2812, 6)
    expect((await daftarDesaKonsol({ kabupaten: '14.08' })).data.map((d) => d.nama).sort()).toEqual(['Sungai Limau Hilir', 'Tualang Permai'])
    expect((await daftarDesaKonsol({ status: 'Persiapan' })).data).toHaveLength(7)
    expect((await daftarDesaKonsol({ provinsi: '14', status: 'Ditangguhkan', paket: 'Dasar' })).data).toHaveLength(2)
    expect((await daftarDesaKonsol({ provinsi: '33' })).data).toEqual([])
  })
  it('Detail desa: identitas, kontak, persiapan, penggunaan 12 bulan dan 12 minggu, langganan dan tagihan', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const d = await ambilDetailDesaKonsol('desa_sungai_sialang')
    expect(d).toMatchObject({ nama: 'Sungai Sialang', jiwa: 2812, kontak: { kades: 'H. Muhammad Nasir' } })
    expect(d.persiapan.every((l) => l.selesai)).toBe(true)
    expect(d.suratPerBulan).toHaveLength(12)
    expect(d.masukPerMinggu).toHaveLength(12)
    expect(d.langganan.paket).toBe('Lengkap')
    expect(d.langganan.tagihan.length).toBeGreaterThan(0)
    const tl = await ambilDetailDesaKonsol('desa_tanjung_lamo')
    expect(tl).toMatchObject({ status: 'Persiapan', jiwa: 0, kelengkapan: null, aktivitasTerakhir: null, langganan: { mulai: null, tagihan: [] } })
    await expect(ambilDetailDesaKonsol('desa_tidak_ada')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
  })
  it('Tambah desa: tercipta berstatus Persiapan beserta akun admin undangan dan langganannya', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const hasil = await tambahDesa(isianBaru)
    expect(hasil).toEqual({ id: 'desa_koto_baru_sentosa', nama: 'Koto Baru Sentosa', email: 'admin@kotobarusentosa.desa.id' })
    const d = await ambilDetailDesaKonsol(hasil.id)
    expect(d).toMatchObject({
      status: 'Persiapan', kodeDesa: '14.01.17.2077', kecamatan: { nama: 'Kampa' }, kabupaten: { nama: 'Kampar' }, paket: 'Lengkap',
      kontak: { operator: { email: 'admin@kotobarusentosa.desa.id' } },
    })
    expect(d.persiapan.filter((l) => l.selesai)).toEqual([])
    const admin = ambilDb().pengguna.find((p) => p.email === 'admin@kotobarusentosa.desa.id')
    expect(admin).toMatchObject({ desaId: 'desa_koto_baru_sentosa', peran: 'operator', aktif: false })
    expect((await ambilRingkasanKonsol()).desa.persiapan).toBe(8)
  })
  it('Tambah desa yang bentrok atau tidak sah: galat per kolom, dan tidak ada yang tercipta setengah jadi (fokus review 3)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await expect(tambahDesa({ ...isianBaru, nama: 'A', kodeDesa: '1077' })).rejects.toMatchObject({
      kode: 'VALIDATION', fields: { nama: 'Nama desa minimal 3 huruf.', kodeDesa: 'Kode desa 4 angka berawalan 2, mis. 2015.' },
    })
    await expect(tambahDesa({ ...isianBaru, kecamatan: '14.05.99' })).rejects.toMatchObject({ kode: 'VALIDATION', fields: { kecamatan: 'Kecamatan tidak dikenal.' } })
    await expect(tambahDesa({ ...isianBaru, kecamatan: '14.05.09', kodeDesa: '2009' })).rejects.toMatchObject({
      kode: 'CONFLICT', fields: { kodeDesa: 'Kode desa 14.05.09.2009 sudah terdaftar.' },
    })
    await expect(tambahDesa({ ...isianBaru, email: 'ROSMIATI@sungaisialang.desa.id' })).rejects.toMatchObject({
      kode: 'CONFLICT', fields: { email: 'Email ini sudah dipakai akun lain.' },
    })
    await expect(tambahDesa({ ...isianBaru, email: 'dina@sinfodes.id' })).rejects.toMatchObject({ kode: 'CONFLICT' })
    expect(ambilDb().desa).toHaveLength(40)
    expect(ambilDb().langganan).toHaveLength(40)
  })
  it('nama desa yang sudah dipakai mendapat slug lain, bukan menimpa desa lama', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const hasil = await tambahDesa({ ...isianBaru, nama: 'Sungai Sialang', email: 'admin2@contoh.desa.id' })
    expect(hasil.id).toBe('desa_sungai_sialang_2')
    expect(ambilDb().desa.filter((d) => d.nama === 'Sungai Sialang')).toHaveLength(2)
  })
  it('website desa fiktif yang Aktif tetap terbuka dengan isi kosong, bukan galat (fokus review 4)', async () => {
    const b = await ambilBerandaPublik('sungai-gelugur')
    expect(b).toMatchObject({ utama: null, terbaru: [], pengumuman: [], agenda: [], apbdes: null, potensi: [] })
  })
})
