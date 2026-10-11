import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilAntrianTtd, ambilJenisSurat, ambilPermohonan, buatPermohonan, daftarJenisSurat, jalankanAksi, ubahJenisSurat } from '@/api/surat'
import type { UbahJenisSurat } from '@/domain/surat/ubah-jenis'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

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
    expect(g.fields).toEqual({ jenisId: 'Jenis surat tidak ditemukan atau sedang tidak dilayani.' })
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
