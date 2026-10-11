import { waktuIsoWib } from '@/domain/format/tanggal'
import { DESA_DEMO, DUSUN_DEMO, ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from '../data/desa-demo'
import { buatAcak } from '../prng'
import { VERSI_DATA, type DbDemo } from '../tipe-db'
import { pengaturanBawaan } from '@/domain/surat/pengaturan'
import { bangkitkanSuratMasuk } from './arsip'
import { bangkitkanLaporan } from './laporan'
import { bangkitkanMutasi } from './mutasi'
import { bangkitkanNotifikasi } from './notifikasi'
import { bangkitkanPenduduk } from './penduduk'
import { bangkitkanSurat } from './surat'

export const SEED_DEMO = 20260924

export function bangkitkanDb(sekarang: Date): DbDemo {
  const dasar = bangkitkanPenduduk(buatAcak(SEED_DEMO), {
    desaId: ID_SUNGAI_SIALANG,
    dusun: DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG),
    acuan: sekarang,
  })
  // Aliran acak terpisah: penduduk dasar tetap identik dengan Tahap 1.
  const hasil = bangkitkanMutasi(buatAcak(SEED_DEMO + 1), {
    desaId: ID_SUNGAI_SIALANG,
    penduduk: dasar.penduduk,
    keluarga: dasar.keluarga,
    pengguna: PENGGUNA_DEMO,
    acuan: sekarang,
  })
  const desaDemo = DESA_DEMO.find((d) => d.id === ID_SUNGAI_SIALANG)
  if (!desaDemo) throw new Error('Desa demo tidak ada')
  // Aliran acak ketiga: penduduk dan mutasi tetap identik dengan tahap sebelumnya.
  const surat = bangkitkanSurat(buatAcak(SEED_DEMO + 2), {
    desa: desaDemo,
    dusun: DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG),
    penduduk: hasil.penduduk,
    mutasi: hasil.mutasi,
    pengguna: PENGGUNA_DEMO,
    acuan: sekarang,
  })
  // Aliran acak keempat dan kelima: data tahap sebelumnya tetap identik.
  const laporanData = bangkitkanLaporan({ desaId: ID_SUNGAI_SIALANG, penduduk: hasil.penduduk, acuan: sekarang })
  const suratMasuk = bangkitkanSuratMasuk(buatAcak(SEED_DEMO + 3), {
    desaId: ID_SUNGAI_SIALANG,
    namaDesa: desaDemo.nama,
    pengguna: PENGGUNA_DEMO,
    acuan: sekarang,
  })
  const notifikasi = bangkitkanNotifikasi(buatAcak(SEED_DEMO + 4), {
    desaId: ID_SUNGAI_SIALANG,
    pengguna: PENGGUNA_DEMO,
    penduduk: hasil.penduduk,
    jenisSurat: surat.jenisSurat,
    permohonan: surat.permohonan,
    laporanData,
    acuan: sekarang,
  })
  return {
    versiData: VERSI_DATA,
    tanggalAcuan: waktuIsoWib(sekarang),
    desa: structuredClone(DESA_DEMO),
    dusun: structuredClone(DUSUN_DEMO),
    pengguna: structuredClone(PENGGUNA_DEMO),
    ...hasil,
    aktivitas: [...hasil.aktivitas, ...surat.aktivitas],
    laporanData,
    impor: [],
    jenisSurat: surat.jenisSurat,
    permohonan: surat.permohonan,
    pengaturanSurat: DESA_DEMO.map((d) => pengaturanBawaan(d.id)),
    suratMasuk,
    notifikasi,
  }
}
