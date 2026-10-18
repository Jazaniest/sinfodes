import { describe, expect, it } from 'vitest'
import { ambilBerandaPublik } from '@/api/publik'
import { ambilDetailDesaKonsol, ambilRingkasanKonsol, ambilUsulanAlamat, daftarDesaKonsol, periksaAlamat, tambahDesa, ubahAlamatDesa } from '@/api/konsol'
import { masuk } from '@/api/sesi'
import { PESAN_ALAMAT_TIDAK_SAH } from '@/domain/alamat/alamat'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const isianBaru = {
  nama: 'Koto Baru Sentosa', kecamatan: '14.01.17', kodeDesa: '2077', paket: 'Lengkap' as const, email: 'admin@kotobarusentosa.desa.id',
  alamat: 'kotobarusentosa',
}

describe('API Konsol (SPEC §11, §3.4)', () => {
  it('Ringkasan Tim Sinfodes: semua desa; 3 tidak aktif, 3 berhenti di persiapan, 1 tagihan lewat', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const r = await ambilRingkasanKonsol()
    expect(r.cakupan).toBe('Semua desa')
    expect(r.perhatian).toEqual([
      { jenis: 'tidak-aktif', jumlah: 3 },
      { jenis: 'berhenti-persiapan', jumlah: 3 },
      { jenis: 'tagihan-lewat', jumlah: 1 },
    ])
    expect(r.desa).toEqual({ aktif: 26, ujiCoba: 5, persiapan: 7, ditangguhkan: 2 })
    expect(r).not.toHaveProperty('suratMingguIni')
  })
  it('Ringkasan pemantau: hanya 32 desa Pelalawan dan tanpa butir tagihan (fokus review 1)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    const r = await ambilRingkasanKonsol()
    expect(r.cakupan).toBe('Kabupaten Pelalawan')
    expect(r.desa.aktif + r.desa.ujiCoba + r.desa.persiapan + r.desa.ditangguhkan).toBe(32)
    expect(r.perhatian.map((p) => p.jenis)).toEqual(['tidak-aktif', 'berhenti-persiapan'])
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
    const ss = semua.find((d) => d.slug === 'sungaisialang')
    expect(ss).toMatchObject({ status: 'Aktif', paket: 'Lengkap', penggunaAktif: 5 })
    expect(ss).not.toHaveProperty('kelengkapan')
    expect((await daftarDesaKonsol({ kabupaten: '14.08' })).data.map((d) => d.nama).sort()).toEqual(['Sungai Limau Hilir', 'Tualang Permai'])
    expect((await daftarDesaKonsol({ status: 'Persiapan' })).data).toHaveLength(7)
    expect((await daftarDesaKonsol({ provinsi: '14', status: 'Ditangguhkan', paket: 'Dasar' })).data).toHaveLength(2)
    expect((await daftarDesaKonsol({ provinsi: '33' })).data).toEqual([])
  })
  it('Detail desa: identitas, kontak, persiapan, keaktifan 12 minggu, langganan dan tagihan; tanpa isi data desa', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const d = await ambilDetailDesaKonsol('desa_sungai_sialang')
    expect(d).toMatchObject({ nama: 'Sungai Sialang', kontak: { kades: 'H. Muhammad Nasir' } })
    expect(d).not.toHaveProperty('jiwa')
    expect(d.persiapan.every((l) => l.selesai)).toBe(true)
    expect(d).not.toHaveProperty('suratPerBulan')
    expect(d.masukPerMinggu).toHaveLength(12)
    expect(d.langganan.paket).toBe('Lengkap')
    expect(d.langganan.tagihan.length).toBeGreaterThan(0)
    const tl = await ambilDetailDesaKonsol('desa_tanjung_lamo')
    expect(tl).toMatchObject({ status: 'Persiapan', aktivitasTerakhir: null, aliasAlamat: ['tanjung-lamo'], langganan: { mulai: null, tagihan: [] } })
    await expect(ambilDetailDesaKonsol('desa_tidak_ada')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
  })
  it('Tambah desa: tercipta berstatus Persiapan beserta admin Sekretaris Desa yang langsung aktif, langganan, dan katalog', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const hasil = await tambahDesa(isianBaru)
    expect(hasil).toEqual({ id: 'desa_kotobarusentosa', nama: 'Koto Baru Sentosa', email: 'admin@kotobarusentosa.desa.id' })
    const d = await ambilDetailDesaKonsol(hasil.id)
    expect(d).toMatchObject({
      status: 'Persiapan', kodeDesa: '14.01.17.2077', kecamatan: { nama: 'Kampa' }, kabupaten: { nama: 'Kampar' }, paket: 'Lengkap',
      kontak: { operator: null, sekdes: { nama: 'Admin desa', email: 'admin@kotobarusentosa.desa.id' } },
      bisaUndangSekdes: false,
    })
    expect(d.persiapan.filter((l) => l.selesai)).toEqual([])
    const admin = ambilDb().pengguna.find((p) => p.email === 'admin@kotobarusentosa.desa.id')
    expect(admin).toMatchObject({ desaId: 'desa_kotobarusentosa', peran: 'sekdes', jabatan: 'Sekretaris Desa', aktif: true })
    expect((await masuk('admin@kotobarusentosa.desa.id', 'demo')).sesi.desa).toMatchObject({ id: hasil.id, status: 'Persiapan' })
    const katalog = ambilDb().jenisSurat.filter((j) => j.desaId === hasil.id)
    expect(katalog).toHaveLength(12)
    expect(katalog.every((j) => !j.aktif && j.id.startsWith('js_kotobarusentosa_'))).toBe(true)
    expect((await ambilRingkasanKonsol()).desa.persiapan).toBe(8)
  })
  it('usulan alamat: desa bernama sama di kabupaten lain diberi nama kabupaten (SPEC-V0.2 §4.2)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect(await ambilUsulanAlamat('Sungai Sialang', '14.08.02')).toEqual({ usulan: 'sungaisialang-siak' })
  })
  it('periksa alamat: tersedia, dipakai desa lain, alias milik sendiri, alamat sekarang, tidak sah (SPEC-V0.2 §4.2)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect(await periksaAlamat('kampunguji')).toEqual({ status: 'tersedia', pesan: 'Alamat ini bisa dipakai.' })
    expect(await periksaAlamat('sungai-sialang')).toEqual({ status: 'dipakai', pesan: 'Alamat ini sudah dipakai desa lain.' })
    expect((await periksaAlamat('sungai-sialang', 'desa_sungai_sialang')).status).toBe('tersedia')
    expect(await periksaAlamat('sungaisialang', 'desa_sungai_sialang')).toEqual({ status: 'sekarang', pesan: 'Ini alamat desa sekarang.' })
    expect((await periksaAlamat('api')).status).toBe('tidak-sah')
  })
  it('Tambah desa: alamat yang sudah jadi alias desa lain ditolak; alamat bebas dipakai (fokus review 4)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await expect(tambahDesa({ ...isianBaru, alamat: 'sungai-sialang' })).rejects.toMatchObject({
      kode: 'CONFLICT', fields: { alamat: 'Alamat ini sudah dipakai desa lain.' },
    })
    const hasil = await tambahDesa({ ...isianBaru, alamat: 'kotobaru' })
    expect(ambilDb().desa.find((d) => d.id === hasil.id)?.slug).toBe('kotobaru')
  })
  it('Ubah alamat: alamat lama jadi alias dan mengarah ke alamat baru (SPEC-V0.2 §4.2)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const hasil = await ubahAlamatDesa('desa_sungai_sialang', 'sialang')
    expect(hasil.slug).toBe('sialang')
    expect(hasil.aliasAlamat).toEqual(expect.arrayContaining(['sungai-sialang', 'sungaisialang']))
    const r = await fetch('http://sungaisialang.sinfodes.localhost/api/v1/alamat')
    expect(await r.json()).toEqual({ jenis: 'alias', labelBaru: 'sialang' })
  })
  it('Ubah alamat kembali ke alias sendiri: label itu keluar dari daftar alias', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const hasil = await ubahAlamatDesa('desa_sungai_sialang', 'sungai-sialang')
    expect(hasil.slug).toBe('sungai-sialang')
    expect(hasil.aliasAlamat).toContain('sungaisialang')
    expect(hasil.aliasAlamat).not.toContain('sungai-sialang')
    expect(ambilDb().aliasAlamat.filter((a) => a.label === 'sungai-sialang')).toHaveLength(0)
  })
  it('Ubah alamat yang dipakai desa lain, sama dengan sekarang, atau tidak sah ditolak per kolom', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await expect(ubahAlamatDesa('desa_tanjung_lamo', 'sungai-sialang')).rejects.toMatchObject({
      kode: 'CONFLICT', fields: { alamat: 'Alamat ini sudah dipakai desa lain.' },
    })
    await expect(ubahAlamatDesa('desa_sungai_sialang', 'sungaisialang')).rejects.toMatchObject({
      kode: 'VALIDATION', fields: { alamat: 'Alamat baru sama dengan alamat sekarang.' },
    })
    await expect(ubahAlamatDesa('desa_sungai_sialang', 'api')).rejects.toMatchObject({
      kode: 'VALIDATION', fields: { alamat: PESAN_ALAMAT_TIDAK_SAH },
    })
    expect(ambilDb().desa.find((d) => d.id === 'desa_sungai_sialang')?.slug).toBe('sungaisialang')
  })
  it('pemantau tidak bisa mengubah alamat desa', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    await expect(ubahAlamatDesa('desa_sungai_sialang', 'sialang')).rejects.toMatchObject({ kode: 'FORBIDDEN' })
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
    const hasil = await tambahDesa({ ...isianBaru, nama: 'Sungai Sialang', email: 'admin2@contoh.desa.id', alamat: 'sungaisialang-kampar' })
    expect(hasil.id).toBe('desa_sungaisialang_kampar')
    expect(ambilDb().desa.filter((d) => d.nama === 'Sungai Sialang')).toHaveLength(2)
  })
  it('website desa fiktif yang Aktif tetap terbuka dengan isi kosong, bukan galat (fokus review 4)', async () => {
    const b = await ambilBerandaPublik('sungaigelugur')
    expect(b).toMatchObject({ utama: null, terbaru: [], pengumuman: [], agenda: [], apbdes: null, potensi: [] })
  })
})
