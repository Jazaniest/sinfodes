// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  ambilDetailKabupatenKonsol, ambilRingkasanKonsol, daftarKabupatenKonsol, tambahKabupaten, ubahAkunKabupatenKonsol,
} from '@/api/konsol'
import { ambilRingkasanInduk } from '@/api/induk'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const pdf = (nama = 'sk-bupati-kampar.pdf', kb = 240) => new File([new Uint8Array(kb * 1024)], nama, { type: 'application/pdf' })
const isianKampar = {
  kabupaten: '14.01', namaAdmin: 'Rahmat Hidayat', emailAdmin: 'Admin@Kampar.go.id', nomorSurat: '800/DISKOMINFO/X/2026/021',
  tanggalSurat: '2026-09-20',
}
const diAlamat = (label: string, jalur: string, init?: RequestInit) => fetch(`http://${label}.sinfodes.localhost/api/v1${jalur}`, init)

describe('Kabupaten mitra di Konsol (SPEC-V0.2 §7)', () => {
  it('daftar: Pelalawan dan Siak dengan Admin, jumlah desa bergabung, dan tanggal bergabung, urut nama', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect(await daftarKabupatenKonsol()).toEqual([
      {
        kode: '14.05', nama: 'Pelalawan', label: 'kab-pelalawan', admin: { nama: 'Fajar Ramadhan', email: 'admin.pelalawan@demo.sinfodes.id' },
        desaBergabung: 25, bergabung: '2026-03-02',
      },
      {
        kode: '14.08', nama: 'Siak', label: 'kab-siak', admin: { nama: 'Wahyu Saputra', email: 'admin.siak@demo.sinfodes.id' },
        desaBergabung: 2, bergabung: '2026-08-17',
      },
    ])
  })
  it('tambah Kampar: menjadi mitra, alamatnya terbuka, dan Admin barunya bisa masuk di kab-kampar', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect(await tambahKabupaten(isianKampar, pdf())).toEqual({
      kode: '14.01', nama: 'Kampar', label: 'kab-kampar', emailAdmin: 'admin@kampar.go.id',
    })
    const kampar = ambilDb().kabupatenMitra.find((k) => k.kode === '14.01')
    expect(kampar).toMatchObject({
      label: 'kab-kampar', provinsi: { kode: '14', nama: 'Riau' }, bergabung: tanggalIsoWib(new Date()),
      suratPenunjukan: { nomor: '800/DISKOMINFO/X/2026/021', tanggal: '2026-09-20', berkas: 'sk-bupati-kampar.pdf', ukuranKb: 240 },
    })
    expect(await (await diAlamat('kab-kampar', '/alamat')).json()).toMatchObject({ jenis: 'kabupaten', kabupaten: { mitra: true } })
    const masuk = await diAlamat('kab-kampar', '/kabupaten/sesi/masuk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kampar.go.id', kataSandi: 'demo' }),
    })
    expect(masuk.status).toBe(200)
    expect(await masuk.json()).toMatchObject({ sesi: { pengguna: { nama: 'Rahmat Hidayat', peran: 'admin' }, kabupaten: { label: 'kab-kampar' } } })
  })
  it('isian yang bentrok atau tidak sah: galat per kolom, dan tidak ada yang tercipta setengah jadi', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await expect(tambahKabupaten({ ...isianKampar, kabupaten: '14.05' }, pdf())).rejects.toMatchObject({
      kode: 'CONFLICT', fields: { kabupaten: 'Kabupaten Pelalawan sudah bermitra.' },
    })
    await expect(tambahKabupaten({ ...isianKampar, kabupaten: '14.99' }, pdf())).rejects.toMatchObject({
      kode: 'VALIDATION', fields: { kabupaten: 'Kabupaten tidak dikenal.' },
    })
    await expect(tambahKabupaten({ ...isianKampar, emailAdmin: 'pmd.pelalawan@demo.sinfodes.id' }, pdf())).rejects.toMatchObject({
      kode: 'CONFLICT', fields: { emailAdmin: 'Email ini sudah dipakai akun lain.' },
    })
    await expect(tambahKabupaten(isianKampar, pdf('sk-kampar.docx'))).rejects.toMatchObject({
      kode: 'VALIDATION', fields: { suratPenunjukan: 'Surat penunjukan harus berkas PDF.' },
    })
    await expect(tambahKabupaten(isianKampar, pdf('sk-kampar.pdf', 5 * 1024 + 1))).rejects.toMatchObject({
      kode: 'VALIDATION', fields: { suratPenunjukan: 'Ukuran surat penunjukan maksimal 5 MB.' },
    })
    await expect(tambahKabupaten(isianKampar, null)).rejects.toMatchObject({
      kode: 'VALIDATION', fields: { suratPenunjukan: 'Unggah surat penunjukan (PDF).' },
    })
    await expect(tambahKabupaten({ ...isianKampar, nomorSurat: '' }, pdf())).rejects.toMatchObject({ kode: 'VALIDATION' })
    expect(ambilDb().kabupatenMitra).toHaveLength(2)
    expect(ambilDb().penggunaKabupaten).toHaveLength(3)
  })
  it('detail Pelalawan: identitas, surat penunjukan, dan akun kabupaten; kabupaten bukan mitra → 404', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const d = await ambilDetailKabupatenKonsol('14.05')
    expect(d).toMatchObject({
      kode: '14.05', nama: 'Pelalawan', label: 'kab-pelalawan', desaBergabung: 25,
      suratPenunjukan: { nomor: '800/DISKOMINFO/II/2026/017', berkas: 'surat-penunjukan-pelalawan.pdf' },
    })
    expect(d.pengguna.map((p) => [p.nama, p.email, p.peran, p.aktif])).toEqual([
      ['Fajar Ramadhan', 'admin.pelalawan@demo.sinfodes.id', 'admin', true],
      ['Hj. Rosnani', 'pmd.pelalawan@demo.sinfodes.id', 'peninjau', true],
    ])
    await expect(ambilDetailKabupatenKonsol('14.01')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
  })
  it('Nonaktifkan akun kabupaten: Admin aktif terakhir ditolak (409); akun kabupaten lain → 404', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await expect(ubahAkunKabupatenKonsol('14.05', 'kab_fajar', { aktif: false })).rejects.toMatchObject({
      kode: 'CONFLICT', message: 'Kabupaten harus punya paling sedikit satu Admin aktif.',
    })
    expect(await ubahAkunKabupatenKonsol('14.05', 'kab_rosnani', { aktif: false })).toMatchObject({ id: 'kab_rosnani', aktif: false })
    expect(await ubahAkunKabupatenKonsol('14.05', 'kab_rosnani', { aktif: true })).toMatchObject({ aktif: true })
    await expect(ubahAkunKabupatenKonsol('14.05', 'kab_wahyu', { aktif: false })).rejects.toMatchObject({ kode: 'NOT_FOUND' })
    expect(ambilDb().penggunaKabupaten.find((p) => p.id === 'kab_wahyu')?.aktif).toBe(true)
  })
  it('akun kabupaten tidak bisa memakai endpoint Konsol', async () => {
    const r = await fetch('http://localhost/api/v1/konsol/kabupaten', { headers: { Authorization: 'Bearer kab.kab_fajar' } })
    expect(r.status).toBe(401)
  })
  it('Ringkasan Konsol dan halaman utama menghitung kabupaten mitra', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect((await ambilRingkasanKonsol()).kabupatenMitra).toBe(2)
    expect((await ambilRingkasanInduk()).kabupatenMitra).toEqual([
      { label: 'kab-pelalawan', nama: 'Pelalawan' },
      { label: 'kab-siak', nama: 'Siak' },
    ])
  })
})
