import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { Desa } from '@/domain/wilayah/schema'
import { ID_SUNGAI_SIALANG } from '../data/desa-demo'
import type { Acak } from '../prng'
import type { KirimLaporan, TenggatLaporan } from '../tipe-db'

const HARI_MS = 86_400_000
const geser = (hariIni: string, hari: number) => new Date(Date.parse(`${hariIni}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)

const FAJAR = { id: 'kab_fajar', nama: 'Fajar Ramadhan' }
const WAHYU = { id: 'kab_wahyu', nama: 'Wahyu Saputra' }
/** Kaur Keuangan Sungai Sialang (SPEC §12.9). */
const NURHAYATI = { id: 'pgn_nurhayati', nama: 'Nurhayati' }

/**
 * Tenggat Dana Desa contoh (SPEC-V0.2 §13), relatif terhadap hari acuan A: semester I sudah lewat (A - 56), tahap II sebentar
 * lagi (A + 6, jadi pengingat H-14 dan H-7 sudah tampil), dan akhir tahun masih jauh. Sungai Sialang sudah mengirim semester I
 * dan belum mengirim tahap II, supaya alur menandai bisa dicoba. Desa rekaman lain diacak dari aliran sendiri.
 */
export function bangkitkanTenggat(acak: Acak, o: { acuan: Date; desa: readonly Desa[] }): { tenggat: TenggatLaporan[]; kirim: KirimLaporan[] } {
  const A = tanggalIsoWib(o.acuan)
  const tahun = A.slice(0, 4)
  const dibuatPada = `${geser(A, -70)}T09:00:00+07:00`
  const tenggat: TenggatLaporan[] = [
    { id: 'tgt_pll_smt1', kabupatenKode: '14.05', nama: `Laporan realisasi APBDes semester I ${tahun}`, tanggal: geser(A, -56), dibuatPada, dibuatOleh: FAJAR },
    { id: 'tgt_pll_dd2', kabupatenKode: '14.05', nama: `Laporan realisasi Dana Desa tahap II ${tahun}`, tanggal: geser(A, 6), dibuatPada, dibuatOleh: FAJAR },
    { id: 'tgt_pll_akhir', kabupatenKode: '14.05', nama: `Laporan realisasi APBDes akhir tahun ${tahun}`, tanggal: geser(A, 113), dibuatPada, dibuatOleh: FAJAR },
    { id: 'tgt_siak_dd2', kabupatenKode: '14.08', nama: `Laporan realisasi Dana Desa tahap II ${tahun}`, tanggal: geser(A, 9), dibuatPada, dibuatOleh: WAHYU },
  ]
  const kirim: KirimLaporan[] = []
  const catat = (tenggatId: string, desaId: string, tanggal: string, oleh: KirimLaporan['oleh']) =>
    kirim.push({ tenggatId, desaId, tanggal, oleh, dicatatPada: `${tanggal}T10:00:00+07:00` })
  for (const t of tenggat) {
    const sasaran = o.desa.filter((d) => d.kabupaten.kode === t.kabupatenKode && (d.status === 'Aktif' || d.status === 'Uji coba'))
    for (const d of sasaran) {
      if (d.id === ID_SUNGAI_SIALANG) {
        if (t.id === 'tgt_pll_smt1') catat(t.id, d.id, geser(A, -60), NURHAYATI)
        continue
      }
      // Desa rekaman tidak punya akun panel; penandanya dicatat atas nama jabatannya.
      const oleh = { id: `rekam_${d.id}`, nama: 'Sekretaris Desa' }
      if (t.id === 'tgt_pll_smt1') {
        const r = acak.angka()
        if (r < 0.8) catat(t.id, d.id, geser(A, -acak.bulat(57, 75)), oleh)
        else if (r < 0.9) catat(t.id, d.id, geser(A, -acak.bulat(40, 55)), oleh)
      } else if (t.id === 'tgt_pll_dd2' || t.id === 'tgt_siak_dd2') {
        if (acak.peluang(0.3)) catat(t.id, d.id, geser(A, -acak.bulat(0, 10)), oleh)
      }
    }
  }
  return { tenggat, kirim }
}
