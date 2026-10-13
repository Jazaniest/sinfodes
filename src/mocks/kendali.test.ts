import { describe, expect, it } from 'vitest'
import { tambahDesa, undangSekdes } from '@/api/konsol'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { ubahDb } from './db'
import { infoDataDemo } from './kendali'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('akun desa Persiapan di halaman demo (tahap 6C)', () => {
  it('bawaan: Yusri, Operator Desa Tanjung Lamo', () => {
    expect(infoDataDemo().desaBaru).toEqual([
      { id: 'pgn_yusri', nama: 'Yusri', email: 'operator@tanjunglamo.desa.id', jabatan: 'Operator Desa', namaDesa: 'Tanjung Lamo' },
    ])
  })
  it('Sekretaris Desa undangan Tim dan admin desa dari Tambah desa ikut tampil; akun nonaktif tidak', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await undangSekdes('desa_tanjung_lamo', { nama: 'Rahmawati', email: 'sekdes@tanjunglamo.desa.id' })
    await tambahDesa({ nama: 'Koto Baru Sentosa', kecamatan: '14.01.17', kodeDesa: '2077', paket: 'Lengkap', email: 'admin@kotobarusentosa.desa.id' })
    ubahDb((d) => {
      const yusri = d.pengguna.find((p) => p.id === 'pgn_yusri')
      if (yusri) yusri.aktif = false
    })
    expect(infoDataDemo().desaBaru.map((a) => `${a.nama} · ${a.jabatan} ${a.namaDesa}`)).toEqual([
      'Admin desa · Sekretaris Desa Koto Baru Sentosa',
      'Rahmawati · Sekretaris Desa Tanjung Lamo',
    ])
  })
})
