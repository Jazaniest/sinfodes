// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { konfirmasiImpor, unggahImpor } from '@/api/impor'
import { ambilDetailDesaKonsol, tambahDesa, undangSekdes } from '@/api/konsol'
import { ambilWilayah, simpanIdentitas, simpanWilayah, undangPengguna } from '@/api/pengaturan'
import { ambilRingkasanPenduduk } from '@/api/penduduk'
import { masuk } from '@/api/sesi'
import { daftarJenisSurat, ubahJenisSurat } from '@/api/surat'
import type { IdentitasDesa } from '@/domain/pengaturan/identitas'
import type { UbahWilayah } from '@/domain/pengaturan/wilayah'
import { jumlahSelesai, langkahBerikut } from '@/domain/wilayah/persiapan'
import { ID_TANJUNG_LAMO } from '@/mocks/data/desa-demo'
import { AKUN_DESA_BARU_UJI, AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

/** Progres persiapan di Beranda desa yang sedang masuk (SPEC §5.3). */
async function progres() {
  const p = (await ambilBeranda()).persiapan
  if (!p) throw new Error('Beranda bukan daftar persiapan')
  return { selesai: jumlahSelesai(p), berikut: langkahBerikut(p) }
}

const IDENTITAS: IdentitasDesa = {
  nama: 'Tanjung Lamo', kodeDesa: '14.05.10.2010', alamatKantor: 'Jalan Lintas Kuala Kampar No. 1', kodePos: '28384',
  surel: 'kantor@tanjunglamo.desa.id', telepon: '081234567890', jamLayanan: [{ hari: 'Senin-Jumat', buka: '08.00', tutup: '15.00' }],
  lambang: null,
}
const WILAYAH: UbahWilayah = {
  istilah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' },
  dusun: [
    {
      id: 'baru-1', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani',
      rw: [{ nomor: '001', ketua: 'Rasyid', rt: [{ nomor: '001', ketua: 'Udin' }, { nomor: '002', ketua: 'Usman' }] }],
    },
  ],
}
/** Baris berkas contoh yang sengaja bermasalah (sama dengan uji impor Sungai Sialang). */
const BERMASALAH = [5, 8, 12, 13, 17]

describe('alur persiapan desa baru sampai tuntas (tahap 6C)', () => {
  it('Tanjung Lamo: lima langkah selesai satu per satu; Konsol melihat progres yang sama (fokus review 1, 2, 5)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await progres()).toEqual({ selesai: 0, berikut: 'identitas' })
    await simpanIdentitas(IDENTITAS)
    expect(await progres()).toEqual({ selesai: 1, berikut: 'wilayah' })
    await simpanWilayah(WILAYAH)
    expect(await progres()).toEqual({ selesai: 2, berikut: 'impor' })
    const lap = await unggahImpor(null)
    await konfirmasiImpor(lap.id, { pemetaan: lap.kolom.map((k) => k.field), perbaikan: {}, lewati: BERMASALAH })
    expect(await progres()).toEqual({ selesai: 3, berikut: 'pengguna' })
    expect((await ambilWilayah()).susunanTerkunci).toBe(true)

    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await undangSekdes(ID_TANJUNG_LAMO, { nama: 'Rahmawati', email: 'sekdes@tanjunglamo.desa.id' })

    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await progres()).toEqual({ selesai: 4, berikut: 'jenis-surat' })
    await ubahJenisSurat('js_tanjung_lamo_sktm', { aktif: true })
    expect(await progres()).toEqual({ selesai: 5, berikut: null })

    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const d = await ambilDetailDesaKonsol(ID_TANJUNG_LAMO)
    expect(d.persiapan.every((l) => l.selesai)).toBe(true)
    expect(d).toMatchObject({ kontak: { sekdes: { nama: 'Rahmawati' } }, bisaUndangSekdes: false })
    expect(d).not.toHaveProperty('jiwa')

    masukSebagai(AKUN_UJI.operator)
    expect((await ambilRingkasanPenduduk()).jiwa).toBe(2812)
  })
  it('desa dari Tambah desa: admin Sekretaris Desa masuk, mengundang Operator, dan memilih jenis surat (fokus review 4)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const { id } = await tambahDesa({
      nama: 'Koto Baru Sentosa', kecamatan: '14.01.17', kodeDesa: '2077', paket: 'Dasar', email: 'admin@kotobarusentosa.desa.id',
      alamat: 'kotobarusentosa',
    })
    const { sesi } = await masuk('admin@kotobarusentosa.desa.id', 'demo')
    expect(sesi).toMatchObject({ pengguna: { peran: 'sekdes' }, desa: { id, status: 'Persiapan' }, dusun: [] })

    masukSebagai(sesi.pengguna.id)
    expect(await progres()).toEqual({ selesai: 0, berikut: 'identitas' })
    await undangPengguna({ nama: 'Fitriani', email: 'operator@kotobarusentosa.desa.id', peran: 'operator', dusunId: null })
    const { data } = await daftarJenisSurat()
    expect(data.filter((j) => j.aktif)).toEqual([])
    await ubahJenisSurat(data[0].id, { aktif: true })
    expect(await progres()).toEqual({ selesai: 2, berikut: 'identitas' })
  })
})
