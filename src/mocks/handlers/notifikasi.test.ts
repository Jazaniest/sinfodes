import { describe, expect, it } from 'vitest'
import { ambilNotifikasi, tandaiDibaca } from '@/api/notifikasi'
import { ambilAntrianTtd, jalankanAksi } from '@/api/surat'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('notifikasi (SPEC §5.5)', () => {
  it('hanya milik pengguna sendiri, terbaru dulu, dengan angka belum dibaca', async () => {
    masukSebagai(AKUN_UJI.operator)
    const k = await ambilNotifikasi()
    expect(k.belumDibaca).toBe(3)
    expect(k.data.every((n) => n.penggunaId === 'pgn_rosmiati')).toBe(true)
    const waktu = k.data.map((n) => n.waktu)
    expect(waktu).toEqual([...waktu].sort().reverse())
  })
  it('tandai satu lalu semua; ID milik orang lain diabaikan (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const kotakSekdes = await ambilNotifikasi()
    const milikSekdes = kotakSekdes.data.find((n) => !n.dibaca)
    masukSebagai(AKUN_UJI.operator)
    const [belum] = (await ambilNotifikasi()).data.filter((n) => !n.dibaca)
    expect((await tandaiDibaca([belum.id, milikSekdes?.id ?? '-'])).belumDibaca).toBe(2)
    // Sekdes juga menerima pengingat tenggat laporan (7B-2); angkanya tidak berubah oleh tindakan Operator.
    masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilNotifikasi()).belumDibaca).toBe(kotakSekdes.belumDibaca)
    masukSebagai(AKUN_UJI.operator)
    expect((await tandaiDibaca(null)).belumDibaca).toBe(0)
  })
  it('surat ditandatangani Kades: Operator dan Sekdes menerima; Kades dan Kepala Dusun tidak (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.kades)
    const [d] = await ambilAntrianTtd()
    await jalankanAksi(d.permohonan.id, 'tandatangani', { passphrase: 'sialang2026' })
    const harapan = [
      [AKUN_UJI.operator, true],
      [AKUN_UJI.sekdes, true],
      [AKUN_UJI.kades, false],
      [AKUN_UJI.kadus, false],
    ] as const
    for (const [akun, dapat] of harapan) {
      masukSebagai(akun)
      const ada = (await ambilNotifikasi()).data.some((n) => n.jenis === 'surat-ditandatangani' && n.rujukan?.id === d.permohonan.id && !n.dibaca)
      expect(ada, akun).toBe(dapat)
    }
  })
  it('surat dikembalikan Sekdes: Operator menerima catatannya; Sekdes sendiri tidak', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const [d] = await ambilAntrianTtd()
    await jalankanAksi(d.permohonan.id, 'kembalikan', { catatan: 'Alamat pemohon belum lengkap.' })
    masukSebagai(AKUN_UJI.operator)
    const [terbaru] = (await ambilNotifikasi()).data
    expect(terbaru).toMatchObject({
      jenis: 'surat-dikembalikan', isi: 'Alamat pemohon belum lengkap.', dibaca: false, rujukan: { jenis: 'permohonan', id: d.permohonan.id },
    })
    expect(terbaru.judul).toMatch(/ dikembalikan untuk diperbaiki$/)
    masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilNotifikasi()).data.some((n) => n.jenis === 'surat-dikembalikan' && n.rujukan?.id === d.permohonan.id)).toBe(false)
  })
})
