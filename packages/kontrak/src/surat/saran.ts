import type { JenisMutasi, Mutasi } from '../mutasi/schema'
import type { Penduduk } from '../penduduk/schema'
import type { JenisSurat } from './jenis'

export type SaranDariMutasi = { mutasiId: string | null; pemohonId: string | null; isian: Record<string, string> }

/** Jenis surat yang isiannya diambil dari mutasi (SPEC §7.3: "dari mutasi"). */
export const JENIS_MUTASI_SURAT: Partial<Record<string, JenisMutasi>> = { SKL: 'lahir', SKM: 'meninggal', SPP: 'pindah' }

const KOSONG: SaranDariMutasi = { mutasiId: null, pemohonId: null, isian: {} }

/**
 * Isian awal surat dari mutasinya (SPEC §6.6), supaya data kelahiran, kematian, dan kepindahan tidak diketik ulang.
 * `keluarga` = anggota KK orang yang meninggal, untuk menyarankan pemohon surat kematian.
 */
export function saranDariMutasi(
  jenis: Pick<JenisSurat, 'kode'>,
  mutasi: Mutasi | null,
  cari: (id: string) => Penduduk | undefined,
  keluarga: readonly Penduduk[],
): SaranDariMutasi {
  if (!mutasi || JENIS_MUTASI_SURAT[jenis.kode] !== mutasi.jenis) return KOSONG
  switch (mutasi.jenis) {
    case 'lahir': {
      const r = mutasi.rincian
      const orangTua = [r.ayahId, r.ibuId].map((id) => (id ? cari(id) : undefined)).find((p) => p?.statusDasar === 'Hidup')
      return { mutasiId: mutasi.id, pemohonId: orangTua?.id ?? null, isian: { pelapor: r.pelapor } }
    }
    case 'meninggal': {
      const r = mutasi.rincian
      const anggota = keluarga.find((p) => p.statusDasar === 'Hidup' && !mutasi.pendudukIds.includes(p.id))
      return {
        mutasiId: mutasi.id,
        pemohonId: anggota?.id ?? null,
        isian: { tanggalMeninggal: mutasi.tanggal, tempatMeninggal: r.tempat, sebab: r.sebab, pelapor: r.pelapor },
      }
    }
    case 'pindah': {
      const t = mutasi.rincian.tujuan
      return {
        mutasiId: mutasi.id,
        pemohonId: mutasi.pendudukIds[0] ?? null,
        isian: {
          alamatTujuan: `${t.alamat}, ${t.desa}, Kec. ${t.kecamatan}, ${t.kabupaten}, ${t.provinsi}`,
          alasan: mutasi.rincian.alasan,
          anggotaPindah: mutasi.pendudukIds.flatMap((id) => cari(id)?.nama ?? []).join(', '),
        },
      }
    }
    case 'datang':
      return KOSONG
  }
}
