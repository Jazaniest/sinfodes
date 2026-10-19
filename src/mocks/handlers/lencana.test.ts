import { describe, expect, it } from 'vitest'
import { ambilBuktiLencana } from '@/api/induk'
import { ambilBerandaPublik } from '@/api/publik'
import { daftarLencana, ubahTampilLencana } from '@/api/website'
import { buktiLencanaSchema } from '@/domain/indeks/lencana'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { ambilDb } from '../db'

pakaiApiTiruan({ dbSegarTiapUji: true })

const kunciDilarang = (nilai: unknown, ditemukan = new Set<string>()): Set<string> => {
  if (Array.isArray(nilai)) nilai.forEach((x) => kunciDilarang(x, ditemukan))
  else if (nilai !== null && typeof nilai === 'object') {
    for (const [k, v] of Object.entries(nilai)) {
      if (['tingkatan', 'indeks', 'skor', 'klasemen'].includes(k)) ditemukan.add(k)
      kunciDilarang(v, ditemukan)
    }
  }
  return ditemukan
}

describe('lencana: daftar, saklar tampil, dan bukti (rencana 7C-2 Tugas 4)', () => {
  it('Operator melihat lencana desanya saja; hiding menghapusnya dari website tetapi bukti tetap 200', async () => {
    masukSebagai(AKUN_UJI.operator)
    const daftar = (await daftarLencana()).data
    expect(daftar.length).toBeGreaterThan(0)
    const idSialang = 'desa_sungai_sialang'
    const milik = new Set(ambilDb().lencana.filter((l) => l.desaId === idSialang).map((l) => l.kode))
    expect(daftar.every((l) => milik.has(l.kode))).toBe(true)
    expect(daftar).toHaveLength(milik.size)

    const sebelum = (await ambilBerandaPublik('sungaisialang')).lencana
    expect(sebelum.length).toBeGreaterThan(0)
    const sasaran = sebelum[0]
    const diubah = await ubahTampilLencana(sasaran.kode, false)
    expect(diubah).toMatchObject({ kode: sasaran.kode, tampil: false })
    const sesudah = (await ambilBerandaPublik('sungaisialang')).lencana
    expect(sesudah.map((l) => l.kode)).not.toContain(sasaran.kode)
    expect((await ambilBuktiLencana(sasaran.kode)).kalimat).toBe(sasaran.kalimat)

    await ubahTampilLencana(sasaran.kode, true)
    expect((await ambilBerandaPublik('sungaisialang')).lencana.map((l) => l.kode)).toContain(sasaran.kode)
  })
  it('Kades tidak berhak: GET dan PUT 403 dengan pesan persis', async () => {
    masukSebagai(AKUN_UJI.kades)
    await expect(daftarLencana()).rejects.toMatchObject({ status: 403, message: 'Peran Anda tidak mengelola Website Desa.' })
    await expect(ubahTampilLencana(ambilDb().lencana[0].kode, false)).rejects.toMatchObject({ status: 403, message: 'Peran Anda tidak mengelola Website Desa.' })
  })
  it('sesi desa lain tidak bisa mengubah lencana Sungai Sialang (404) dan tidak ada yang berubah', async () => {
    const kode = ambilDb().lencana.find((l) => l.desaId === 'desa_sungai_sialang')!.kode
    masukSebagai(AKUN_DESA_BARU_UJI)
    await expect(ubahTampilLencana(kode, false)).rejects.toMatchObject({ status: 404, message: 'Lencana tidak ditemukan.' })
    expect(ambilDb().lencana.find((l) => l.kode === kode)!.tampil).toBe(true)
  })
  it('kode yang tidak ada → 404, termasuk LJ-00000000 dan kode berbentuk salah', async () => {
    await expect(ambilBuktiLencana('LJ-00000000')).rejects.toMatchObject({ status: 404, message: 'Lencana tidak ditemukan.' })
    await expect(ambilBuktiLencana('bukan-kode')).rejects.toMatchObject({ status: 404 })
  })
  it('bukti: alamat desa, nilai terformat, tanpa tingkatan, Indeks, atau skor', async () => {
    const l = ambilDb().lencana.find((x) => x.desaId === 'desa_sungai_sialang')!
    const bukti = await ambilBuktiLencana(l.kode)
    expect(bukti.desa).toEqual({ nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan', alamat: 'sungaisialang' })
    expect(bukti.nilai).toMatch(/\S/)
    expect(bukti.terbitPada).toBe(l.terbitPada)
    expect(kunciDilarang(bukti).size).toBe(0)
    expect(buktiLencanaSchema.safeParse({ ...bukti, tingkatan: 'Maju' }).success).toBe(false)
  })
  it('beranda publik: paling banyak 6 lencana, semuanya dari periode tutup terakhir per musim, tanpa kunci terlarang', async () => {
    const beranda = await ambilBerandaPublik('sungaisialang')
    expect(beranda.lencana.length).toBeLessThanOrEqual(6)
    const terakhir: Record<string, string> = { bulanan: '2026-08', triwulan: '2026-T2', tahunan: '2025' }
    for (const l of beranda.lencana) expect(l.periode.kode).toBe(terakhir[l.periode.musim])
    expect(kunciDilarang(beranda.lencana).size).toBe(0)
    expect(JSON.stringify(beranda.lencana)).not.toContain('2026-09')
  })
})
