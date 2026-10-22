// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { beriAksesSinfodes } from '@/api/pengaturan'
import { kirimBukti } from '@/api/langganan'
import { AKUN_UJI, AKUN_WARGA_UJI, masukSebagai, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { ID_SUNGAI_SIALANG } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'

pakaiApiTiruan({ dbSegarTiapUji: true })

const PESAN_PANEL = 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.'
const PESAN_WARGA = 'Layanan pengajuan Desa Sungai Sialang sedang ditutup. Silakan datang ke kantor desa.'

const tangguhkan = () =>
  ubahDb((d) => {
    d.desa.find((x) => x.id === ID_SUNGAI_SIALANG)!.status = 'Ditangguhkan'
  })

async function panggil(metode: string, jalur: string, token: string, body: unknown = {}): Promise<{ status: number; pesan?: string }> {
  const r = await fetch(`http://localhost:3000/api/v1${jalur}`, {
    method: metode,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: metode === 'GET' ? undefined : JSON.stringify(body),
  })
  const json = (await r.json().catch(() => null)) as { error?: { message: string } } | null
  return { status: r.status, pesan: json?.error?.message }
}
const sebagai = (akun: string) => `demo.${akun}`

/** Endpoint tulis desa yang harus ditolak (Review Focus 3); `peran` = akun yang kemampuannya dicabut penangguhan. */
const TULIS: readonly (readonly [string, string, string, string])[] = [
  ['tambah penduduk', 'POST', '/penduduk', AKUN_UJI.sekdes],
  ['proses surat', 'POST', '/permohonan/prm_x/proses', AKUN_UJI.sekdes],
  ['ubah isian surat', 'PATCH', '/permohonan/prm_x', AKUN_UJI.sekdes],
  ['balas pengaduan', 'POST', '/pengaduan/pgd_x/balasan', AKUN_UJI.sekdes],
  ['ubah status pengaduan', 'POST', '/pengaduan/pgd_x/status', AKUN_UJI.sekdes],
  ['simpan tampilan website', 'PUT', '/website/situs/draf', AKUN_UJI.sekdes],
  ['simpan identitas', 'PUT', '/pengaturan/desa', AKUN_UJI.sekdes],
  ['undang pengguna', 'POST', '/pengaturan/pengguna', AKUN_UJI.sekdes],
  ['tandai laporan kabupaten terkirim', 'POST', '/tenggat-laporan/tgt_x/kirim', AKUN_UJI.sekdes],
  ['tindak lanjut siaran', 'POST', '/siaran/srn_x/tindak-lanjut', AKUN_UJI.sekdes],
  ['sinkron Siskeudes', 'POST', '/keuangan/sinkron-siskeudes', AKUN_UJI.kaurKeuangan],
]

describe('penangguhan desa: panel hanya bisa dilihat (rencana 7D-2 Tugas 4)', () => {
  it.each(TULIS)('Ditangguhkan: %s → 403 dengan pesan persis', async (_nama, metode, jalur, akun) => {
    tangguhkan()
    const r = await panggil(metode, jalur, sebagai(akun))
    expect(r).toEqual({ status: 403, pesan: PESAN_PANEL })
  })
  it.each(TULIS)('Aktif: %s tidak ditolak karena penangguhan', async (_nama, metode, jalur, akun) => {
    const r = await panggil(metode, jalur, sebagai(akun))
    expect(r.pesan).not.toBe(PESAN_PANEL)
  })
  it('peran yang memang tidak berhak tetap mendapat pesan perannya, bukan pesan penangguhan', async () => {
    tangguhkan()
    const r = await panggil('POST', '/penduduk', sebagai(AKUN_UJI.kaurKeuangan))
    expect(r.status).toBe(403)
    expect(r.pesan).not.toBe(PESAN_PANEL)
  })
  it('unggah bukti tagihan dan beri akses bantuan tetap berjalan (200)', async () => {
    const t = ambilDb().tagihan.find((x) => x.desaId === ID_SUNGAI_SIALANG && x.status === 'terbit')!
    tangguhkan()
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const hasil = await kirimBukti(
      t.id,
      { tanggalTransfer: '2026-09-23', namaPengirim: 'Pemdes Sungai Sialang', nominalTransfer: t.nominal },
      new File([new Uint8Array(1024)], 'bukti.png', { type: 'image/png' }),
    )
    expect(hasil.status).toBe('menunggu-verifikasi')
    masukSebagai(AKUN_UJI.sekdes)
    expect((await beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: true })).aktif).not.toBeNull()
  })
  it('semua GET tetap 200 untuk desa Ditangguhkan', async () => {
    tangguhkan()
    for (const jalur of ['/penduduk', '/permohonan', '/beranda', '/website/situs', '/website/artikel', '/langganan', '/pengaduan']) {
      const r = await panggil('GET', jalur, sebagai(AKUN_UJI.sekdes))
      expect(r.status, jalur).toBe(200)
    }
  })
  it('ekspor data penduduk (POST) dan tandai notifikasi dibaca tetap boleh', async () => {
    tangguhkan()
    expect((await panggil('POST', '/penduduk/ekspor', sebagai(AKUN_UJI.sekdes), { kata: null, filter: {}, format: 'csv' })).status).toBe(200)
    expect((await panggil('POST', '/notifikasi/tandai-dibaca', sebagai(AKUN_UJI.sekdes), { ids: null })).status).toBe(200)
  })
})

describe('penangguhan desa: layanan warga (rencana 7D-2 Tugas 4)', () => {
  it('pengajuan surat dan pengaduan baru → 403 dengan kalimat persis', async () => {
    tangguhkan()
    const token = `warga.${AKUN_WARGA_UJI.siti}`
    expect(await panggil('POST', '/warga/permohonan', token)).toEqual({ status: 403, pesan: PESAN_WARGA })
    expect(await panggil('POST', '/warga/pengaduan', token)).toEqual({ status: 403, pesan: PESAN_WARGA })
  })
  it('masuk, melihat riwayat, dan daftar jenis surat tetap 200', async () => {
    tangguhkan()
    const token = `warga.${AKUN_WARGA_UJI.siti}`
    for (const jalur of ['/warga/sesi', '/warga/beranda', '/warga/permohonan', '/warga/pengaduan']) {
      const r = await panggil('GET', jalur, token)
      expect(r.status, jalur).toBe(200)
    }
  })
  it('desa Aktif: pengajuan tidak ditolak karena penutupan', async () => {
    const r = await panggil('POST', '/warga/permohonan', `warga.${AKUN_WARGA_UJI.siti}`)
    expect(r.pesan).not.toBe(PESAN_WARGA)
  })
  it('sesi warga membawa status desa, dipakai layar untuk menutup formulir', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    aturTokenSesi(`warga.${AKUN_WARGA_UJI.siti}`, 'warga')
    const r = await fetch('http://localhost:3000/api/v1/warga/sesi', { headers: { Authorization: `Bearer warga.${AKUN_WARGA_UJI.siti}` } })
    const json = (await r.json()) as { desa: { status: string } }
    expect(json.desa.status).toBe('Aktif')
  })
})
