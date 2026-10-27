// Kembaran dari apps/web/src/mocks/handlers/kabupaten-sesi.test.ts: 6 dari 6 butir asal dipakai (3 utuh, 3 diadaptasi).
import { describe, expect, it } from 'vitest'
import { SESI_KUKI } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { ambilSesiKabupaten, keluarKabupaten, masukKabupaten } from '@/api/kabupaten'
import { ambilSesi } from '@/api/sesi'
import { ambilSesiKonsol } from '@/api/konsol'
import { ambilSesiWarga } from '@/api/warga'
import { masukKabupatenSebagai, masukSebagai, pakaiApiNyata } from '../api-nyata'

const api = pakaiApiNyata({ segarTiapUji: true })
const EMAIL_FAJAR = 'admin.pelalawan@demo.sinfodes.id'

const galatDari = async (janji: Promise<unknown>): Promise<GalatApi> => {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('sesi kabupaten (SPEC-V0.2 §8.1)', () => {
  it('Admin Pelalawan masuk di alamat kabupatennya', async () => {
    api.keAlamat('kab-pelalawan')
    const hasil = await masukKabupaten(EMAIL_FAJAR, 'demo')
    // Perbedaan sengaja: tanpa token dari server; penanda lokal mengisinya.
    expect(hasil.token).toBe(SESI_KUKI)
    expect(hasil.sesi.kabupaten.label).toBe('kab-pelalawan')
    expect(hasil.sesi.pengguna.peran).toBe('admin')
    expect((await ambilSesiKabupaten()).pengguna.id).toBe('kab_fajar')
  })

  it('akun kabupaten lain dijawab sama dengan kata sandi salah, tanpa petunjuk alamatnya', async () => {
    // Perbedaan sengaja: tiruan menjawab 403 dengan `alamatKabupaten` setelah kata sandi benar; server nyata menjawab 422 yang
    // sama persis dengan kata sandi salah, supaya tidak membocorkan akun mana terdaftar di kabupaten mana.
    api.keAlamat('kab-siak')
    const benar = await galatDari(masukKabupaten(EMAIL_FAJAR, 'demo'))
    const salah = await galatDari(masukKabupaten(EMAIL_FAJAR, 'salah'))
    expect(benar).toMatchObject({ kode: 'VALIDATION', status: 422, fields: { kataSandi: 'Email atau kata sandi salah.' } })
    expect(benar.message).toBe(salah.message)
    expect(benar.fields.alamatKabupaten).toBeUndefined()
  })

  it('kabupaten yang belum mitra dan alamat selain kabupaten tidak punya halaman masuk', async () => {
    api.keAlamat('kab-kampar')
    expect(await galatDari(masukKabupaten(EMAIL_FAJAR, 'demo'))).toMatchObject({ kode: 'NOT_FOUND', status: 404, message: 'Kabupaten ini belum memakai Sinfodes.' })
    for (const label of ['sungaisialang', 'konsol']) {
      api.keAlamat(label)
      expect(await galatDari(masukKabupaten(EMAIL_FAJAR, 'demo'))).toMatchObject({ kode: 'NOT_FOUND', status: 404 })
    }
  })

  it('sesi kabupaten hanya sah di alamat kabupatennya', async () => {
    await masukKabupatenSebagai('kab_fajar')
    api.pasangKukiDi('kab-siak', api.kukiDi('kab-pelalawan') as string)
    api.keAlamat('kab-siak')
    await expect(ambilSesiKabupaten()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    await masukKabupatenSebagai('kab_wahyu')
    expect((await ambilSesiKabupaten()).pengguna.id).toBe('kab_wahyu')
  })

  it('cookie tidak tertukar antarbagian (fokus review 2)', async () => {
    await masukKabupatenSebagai('kab_fajar')
    const token = (api.kukiDi('kab-pelalawan') as string).split('=')[1]
    // Token kabupaten ditaruh di cookie keluarga lain, di alamat keluarga itu.
    api.pasangKukiDi('sungaisialang', `__Host-panel=${token}`)
    api.pasangKukiDi('sungaisialang', `__Host-warga=${token}`)
    api.pasangKukiDi('konsol', `__Host-konsol=${token}`)
    api.keAlamat('sungaisialang')
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    await expect(ambilSesiWarga()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    api.keAlamat('konsol')
    await expect(ambilSesiKonsol()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    // Sebaliknya: token panel di cookie kabupaten.
    await masukSebagai('pgn_rosmiati')
    const panel = (api.kukiDi('sungaisialang') as string).match(/__Host-panel=([^;]+)/)?.[1] as string
    api.pasangKukiDi('kab-pelalawan', `__Host-kab=${panel}`)
    api.keAlamat('kab-pelalawan')
    await expect(ambilSesiKabupaten()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })

  it('akun nonaktif tidak bisa masuk, dan sesinya berhenti berlaku', async () => {
    await masukKabupatenSebagai('kab_fajar')
    await api.uji.sqlMigrasi`update pengguna_kabupaten set aktif = false where id = 'kab_fajar'`
    expect((await galatDari(masukKabupaten(EMAIL_FAJAR, 'demo'))).message).toBe('Email atau kata sandi salah.')
    await expect(ambilSesiKabupaten()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })

  it('keluar mencabut sesi', async () => {
    await masukKabupatenSebagai('kab_fajar')
    await expect(keluarKabupaten()).resolves.toBeUndefined()
    await expect(ambilSesiKabupaten()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })
})
