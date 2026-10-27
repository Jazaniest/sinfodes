// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { daftarJenisSuratWarga, daftarRiwayatWarga, kirimPermohonanWarga } from '@/api/warga'
import type { KirimPermohonanWarga } from '@/domain/warga/ajukan'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const foto = (nama: string, type = 'image/jpeg') => new File([new Uint8Array(300 * 1024)], nama, { type })
const FOTO_SKD = () => [foto('ktp.jpg'), foto('kk.jpg'), foto('pengantar-rt.jpg')]

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

function idJenis(kode: string): string {
  const j = ambilDb().jenisSurat.find((x) => x.desaId === 'desa_sungai_sialang' && x.kode === kode)
  if (!j) throw new Error(`Jenis ${kode} tidak ada`)
  return j.id
}

const kirimanSkd = (ubah: Partial<KirimPermohonanWarga> = {}): KirimPermohonanWarga => ({
  kunci: 'kunci-uji-skd-0001',
  jenisId: idJenis('SKD'),
  untukId: 'pdk_siti_rahmah',
  isian: { keperluan: 'pembukaan rekening bank' },
  lampiran: [{ syarat: 'KTP' }, { syarat: 'KK' }, { syarat: 'Pengantar RT' }],
  ...ubah,
})

describe('Ajukan surat dari layanan warga (SPEC §10)', () => {
  it('hanya jenis yang boleh online, beserta syarat dan perkiraan waktunya', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const jenis = await daftarJenisSuratWarga()
    const kode = jenis.map((j) => j.kode)
    expect(kode).toEqual(expect.arrayContaining(['SKD', 'SKTM', 'SKU', 'SKL']))
    expect(kode).not.toContain('SKM')
    expect(kode).not.toContain('SPP')
    expect(jenis.find((j) => j.kode === 'SKD')).toMatchObject({ syarat: ['KTP', 'KK', 'Pengantar RT'], subjek: 'pemohon' })
    expect(jenis.find((j) => j.kode === 'SKD')?.perkiraanHariKerja).not.toBeNull()
  })
  it('kirim → Menunggu di antrean admin dengan lampirannya; tiket; operator mendapat notifikasi', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const hasil = await kirimPermohonanWarga(kirimanSkd(), FOTO_SKD())
    expect(hasil.tiket).toMatch(/^2026-\d{4}$/)
    const p = ambilDb().permohonan.find((x) => x.id === hasil.id)
    expect(p).toMatchObject({ status: 'menunggu', kanal: 'online', pemohonId: 'pdk_siti_rahmah', subjekId: null })
    expect(p?.lampiran.map((l) => [l.syarat, l.berkas, l.ukuranKb])).toEqual([
      ['KTP', 'ktp.jpg', 300], ['KK', 'kk.jpg', 300], ['Pengantar RT', 'pengantar-rt.jpg', 300],
    ])
    expect(p?.riwayat).toEqual([expect.objectContaining({ kejadian: 'diajukan', oleh: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' } })])
    // Kalimatnya sama dengan notifikasi permohonan online bawaan, supaya daftar notifikasi operator seragam.
    expect(
      ambilDb().notifikasi.find((n) => n.penggunaId === 'pgn_rosmiati' && n.jenis === 'permohonan-baru' && n.rujukan?.id === hasil.id),
    ).toMatchObject({ judul: 'Permohonan baru: SKD · Siti Rahmah', isi: 'Diajukan lewat layanan warga. Periksa kelengkapan berkasnya.' })
    const riwayat = await daftarRiwayatWarga()
    expect(riwayat.data.find((r) => r.id === hasil.id)?.tiket).toBe(hasil.tiket)
  })
  it('untuk anggota KK: anggota itu menjadi pemohonnya', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const hasil = await kirimPermohonanWarga(kirimanSkd({ untukId: 'pdk_syahrial' }), FOTO_SKD())
    expect(ambilDb().permohonan.find((x) => x.id === hasil.id)).toMatchObject({ pemohonId: 'pdk_syahrial', dusunId: 'dsn_ss_1' })
  })
  it('Kirim ulang dengan kunci yang sama tidak membuat permohonan ganda (fokus review 1)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const jumlahAwal = ambilDb().permohonan.length
    const pertama = await kirimPermohonanWarga(kirimanSkd(), FOTO_SKD())
    const ulang = await kirimPermohonanWarga(kirimanSkd(), FOTO_SKD())
    expect(ulang).toEqual(pertama)
    expect(ambilDb().permohonan.length).toBe(jumlahAwal + 1)
  })
  it('menolak anggota di luar KK, jenis yang tidak online, dan surat kelahiran untuk anak yang bukan bayi (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await galatDari(kirimPermohonanWarga(kirimanSkd({ untukId: 'pdk_zulkifli' }), FOTO_SKD()))).fields.untukId).toBe(
      'Pilih anggota keluarga Anda sendiri.',
    )
    expect((await galatDari(kirimPermohonanWarga(kirimanSkd({ jenisId: idJenis('SKM') }), FOTO_SKD()))).fields.jenisId).toBe(
      'Jenis surat ini tidak bisa diajukan online. Datang ke kantor desa.',
    )
    const skl = kirimanSkd({ jenisId: idJenis('SKL'), untukId: 'pdk_muhammad_alif', isian: {}, lampiran: [] })
    expect((await galatDari(kirimPermohonanWarga(skl, []))).fields.untukId).toBe('Surat kelahiran hanya untuk bayi di bawah 12 bulan.')
  })
  it('jenis yang dihentikan atau diarsipkan tidak tampil di daftar dan ditolak 409 saat diajukan (SPEC-V0.2 12.1)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    for (const ubah of [{ aktif: false }, { aktif: false, diarsipkan: '2026-09-20T09:00:00+07:00' }]) {
      ubahDb((d) => {
        const j = d.jenisSurat.find((x) => x.id === idJenis('SKD'))
        if (j) Object.assign(j, { aktif: true, diarsipkan: null }, ubah)
      })
      expect((await daftarJenisSuratWarga()).map((j) => j.kode)).not.toContain('SKD')
      const g = await galatDari(kirimPermohonanWarga(kirimanSkd(), FOTO_SKD()))
      expect(g).toMatchObject({ status: 409, message: 'Jenis surat ini tidak tersedia.', fields: { jenisId: 'Jenis surat ini tidak tersedia.' } })
    }
  })
  it('isian wajib, foto syarat wajib, dan berkas bukan foto ditandai jelas', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await galatDari(kirimPermohonanWarga(kirimanSkd({ isian: { keperluan: ' ' } }), FOTO_SKD()))).fields).toEqual({
      'isian.keperluan': 'Keperluan wajib diisi',
    })
    expect((await galatDari(kirimPermohonanWarga(kirimanSkd({ lampiran: [{ syarat: 'KTP' }] }), [foto('ktp.jpg')]))).fields.lampiran).toBe(
      'Foto KK, Pengantar RT wajib dilampirkan.',
    )
    const pdf = [foto('ktp.pdf', 'application/pdf'), foto('kk.jpg'), foto('pengantar-rt.jpg')]
    expect((await galatDari(kirimPermohonanWarga(kirimanSkd(), pdf))).fields.lampiran).toBe(
      'Lampiran harus berupa foto (JPG, PNG, atau WebP).',
    )
  })
})
