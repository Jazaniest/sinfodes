import { tanggalIsoWib, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { LaporanData } from '@sinfodes/kontrak/laporan/schema'
import type { Penduduk } from '@sinfodes/kontrak/penduduk/schema'

const JAM_MS = 60 * 60 * 1000

/**
 * Laporan warga di data demo (SPEC §5.3, §12.6): satu perbaikan data (pekerjaan Syahrial) dan satu kelahiran di
 * keluarga Zulkifli yang belum dicatat. Tanpa PRNG, jadi penduduk dan mutasi seed tetap identik.
 */
export function bangkitkanLaporan(opsi: { desaId: string; penduduk: readonly Penduduk[]; acuan: Date }): LaporanData[] {
  const cari = (id: string): Penduduk => {
    const p = opsi.penduduk.find((x) => x.id === id)
    if (!p) throw new Error(`Persona ${id} tidak ada di data seed`)
    return p
  }
  const syahrial = cari('pdk_syahrial')
  const siti = cari('pdk_siti_rahmah')
  const rosnani = cari('pdk_rosnani')
  const zulkifli = cari('pdk_zulkifli')
  const t = opsi.acuan.getTime()
  return [
    {
      id: 'lap_pekerjaan_syahrial', desaId: opsi.desaId, dusunId: syahrial.dusunId,
      dibuatPada: waktuIsoWib(new Date(t - 26 * JAM_MS)),
      pelapor: { pendudukId: siti.id, nama: siti.nama }, status: 'baru', ditangani: null, lampiran: null,
      isi: {
        jenis: 'perbaikan', pendudukId: syahrial.id, field: 'pekerjaan', nilaiBaru: 'Wiraswasta',
        catatan: 'Sudah dua tahun berjualan ikan asap di rumah, tidak melaut lagi.',
      },
    },
    {
      id: 'lap_kelahiran_rosnani', desaId: opsi.desaId, dusunId: rosnani.dusunId,
      dibuatPada: waktuIsoWib(new Date(t - JAM_MS)),
      pelapor: { pendudukId: zulkifli.id, nama: zulkifli.nama }, status: 'baru', ditangani: null, lampiran: null,
      isi: {
        jenis: 'kelahiran', ibuId: rosnani.id, nama: 'Nayla Safitri', jenisKelamin: 'P',
        tanggalLahir: tanggalIsoWib(new Date(t - 72 * JAM_MS)), jam: '05:20', tempatDilahirkan: 'Puskesmas',
        penolong: 'Bidan/Perawat', beratGram: 3050, panjangCm: 49, catatan: null,
      },
    },
  ]
}
