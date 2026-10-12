import { ID_SUNGAI_SIALANG } from './desa-demo'

/** Akun layanan warga demo (SPEC §12.9). NIK dan PIN ditampilkan di halaman demo. */
export const AKUN_WARGA_DEMO = [
  {
    pendudukId: 'pdk_siti_rahmah', desaId: ID_SUNGAI_SIALANG, nama: 'Siti Rahmah', nik: '1405095203918002', pin: '246810',
    whatsapp: '081277402231', keterangan: 'punya balita, penerima BLT, satu permohonan Domisili sedang diproses',
  },
  {
    pendudukId: 'pdk_zulkifli', desaId: ID_SUNGAI_SIALANG, nama: 'Zulkifli', nik: '1405091706848005', pin: '135790',
    whatsapp: '081371185570', keterangan: 'pemilik usaha; Surat Keterangan Usaha-nya sedang dikembalikan Kepala Desa',
  },
] as const
