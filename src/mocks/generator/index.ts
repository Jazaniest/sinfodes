import { waktuIsoWib } from '@/domain/format/tanggal'
import { DESA_DEMO, DUSUN_DEMO, ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from '../data/desa-demo'
import { buatAcak } from '../prng'
import { VERSI_DATA, type DbDemo } from '../tipe-db'
import { bangkitkanPenduduk } from './penduduk'

export const SEED_DEMO = 20260924

export function bangkitkanDb(sekarang: Date): DbDemo {
  const { penduduk, keluarga } = bangkitkanPenduduk(buatAcak(SEED_DEMO), {
    desaId: ID_SUNGAI_SIALANG,
    dusun: DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG),
    acuan: sekarang,
  })
  return {
    versiData: VERSI_DATA,
    tanggalAcuan: waktuIsoWib(sekarang),
    desa: structuredClone(DESA_DEMO),
    dusun: structuredClone(DUSUN_DEMO),
    pengguna: structuredClone(PENGGUNA_DEMO),
    penduduk,
    keluarga,
  }
}
