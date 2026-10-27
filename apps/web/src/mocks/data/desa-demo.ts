import type { Pengguna } from '@/domain/pengguna/schema'
import type { Desa, Dusun } from '@/domain/wilayah/schema'

export const ID_SUNGAI_SIALANG = 'desa_sungai_sialang'
export const ID_TANJUNG_LAMO = 'desa_tanjung_lamo'
/** Semua akun demo memakai kata sandi ini (ditampilkan di halaman demo). */
export const KATA_SANDI_DEMO = 'demo'
/** Passphrase tanda tangan elektronik tiruan (SPEC §12.9), ditampilkan di halaman demo. */
export const PASSPHRASE_TTE_DEMO = 'sialang2026'

const RIAU = { kode: '14', nama: 'Riau' }
const PELALAWAN = { kode: '14.05', nama: 'Pelalawan' }

/** SPEC §12.1 dan §12.8. Semua nama desa di sini fiktif. */
export const DESA_DEMO: Desa[] = [
  {
    id: ID_SUNGAI_SIALANG,
    slug: 'sungaisialang',
    nama: 'Sungai Sialang',
    kodeDesa: '14.05.09.2009',
    kecamatan: { kode: '14.05.09', nama: 'Teluk Meranti' },
    kabupaten: PELALAWAN,
    provinsi: RIAU,
    kodePos: '28353',
    alamatKantor: 'Jalan Lintas Teluk Meranti Km 4, Sungai Sialang',
    surel: 'pemdes@sungaisialang.desa.id',
    telepon: '081266031140',
    jamLayanan: [
      { hari: 'Senin-Kamis', buka: '08.00', tutup: '15.00' },
      { hari: 'Jumat', buka: '08.00', tutup: '11.30' },
    ],
    luasKm2: 48.6,
    batas: {
      utara: 'Sungai Kampar',
      selatan: 'Kawasan hutan tanaman',
      timur: 'Desa Kuala Rengas',
      barat: 'Desa Teluk Pauh',
    },
    istilahWilayah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' },
    kodeSurat: 'SS',
    status: 'Aktif',
  },
  {
    id: ID_TANJUNG_LAMO,
    slug: 'tanjunglamo',
    nama: 'Tanjung Lamo',
    kodeDesa: '14.05.10.2010',
    kecamatan: { kode: '14.05.10', nama: 'Kuala Kampar' },
    kabupaten: PELALAWAN,
    provinsi: RIAU,
    kodePos: '',
    alamatKantor: '',
    surel: '',
    telepon: '',
    jamLayanan: [],
    luasKm2: null,
    batas: null,
    istilahWilayah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' },
    kodeSurat: 'TL',
    status: 'Persiapan',
  },
]

const rt = (nomor: string, ketua: string) => ({ nomor, ketua })

/** SPEC §12.2. Desa Tanjung Lamo belum punya dusun (sedang persiapan). */
export const DUSUN_DEMO: Dusun[] = [
  {
    id: 'dsn_ss_1', desaId: ID_SUNGAI_SIALANG, nomor: 1, nama: 'Kampung Tengah', kepalaDusun: 'Amran', posyandu: 'Melati',
    rw: [
      { nomor: '001', ketua: 'Rusli', rt: [rt('001', 'Jufri'), rt('002', 'Azhar'), rt('003', 'Syamsul Bahri')] },
      { nomor: '002', ketua: 'Darwis', rt: [rt('004', 'Firdaus'), rt('005', 'Mukhtar')] },
    ],
  },
  {
    id: 'dsn_ss_2', desaId: ID_SUNGAI_SIALANG, nomor: 2, nama: 'Sialang Jaya', kepalaDusun: 'Sukardi', posyandu: 'Mawar',
    rw: [
      { nomor: '003', ketua: 'Sugiyono', rt: [rt('006', 'Joko Santoso'), rt('007', 'Wagiman'), rt('008', 'Syahrul')] },
      { nomor: '004', ketua: 'Bambang Susilo', rt: [rt('009', 'Heru Purnomo'), rt('010', 'Irwan')] },
    ],
  },
  {
    id: 'dsn_ss_3', desaId: ID_SUNGAI_SIALANG, nomor: 3, nama: 'Teluk Rengas', kepalaDusun: 'Ramli', posyandu: 'Kenanga',
    rw: [
      { nomor: '005', ketua: 'Khairul', rt: [rt('011', 'Afrizal'), rt('012', 'Mahmud'), rt('013', 'Fauzi')] },
      { nomor: '006', ketua: 'Hamzah', rt: [rt('014', 'Syafrizal'), rt('015', 'Idris')] },
    ],
  },
  {
    id: 'dsn_ss_4', desaId: ID_SUNGAI_SIALANG, nomor: 4, nama: 'Sungai Lamo', kepalaDusun: 'Tigor Siregar', posyandu: 'Anggrek',
    rw: [
      { nomor: '007', ketua: 'Salim', rt: [rt('016', 'Kasim'), rt('017', 'Darwin Situmorang'), rt('018', 'Harun')] },
      { nomor: '008', ketua: 'Zainal Abidin', rt: [rt('019', 'Eko Prasetyo'), rt('020', 'Jamaris')] },
    ],
  },
]

/** SPEC §12.9 */
export const PENGGUNA_DEMO: Pengguna[] = [
  { id: 'pgn_rosmiati', desaId: ID_SUNGAI_SIALANG, nama: 'Rosmiati', jabatan: 'Operator Desa', peran: 'operator', dusunId: null, email: 'rosmiati@sungaisialang.desa.id', aktif: true, nip: null },
  { id: 'pgn_hendri', desaId: ID_SUNGAI_SIALANG, nama: 'Hendri Saputra', jabatan: 'Sekretaris Desa', peran: 'sekdes', dusunId: null, email: 'hendri@sungaisialang.desa.id', aktif: true, nip: null },
  { id: 'pgn_nasir', desaId: ID_SUNGAI_SIALANG, nama: 'H. Muhammad Nasir', jabatan: 'Kepala Desa', peran: 'kades', dusunId: null, email: 'kades@sungaisialang.desa.id', aktif: true, nip: null },
  { id: 'pgn_nurhayati', desaId: ID_SUNGAI_SIALANG, nama: 'Nurhayati', jabatan: 'Kaur Keuangan', peran: 'kaur-keuangan', dusunId: null, email: 'nurhayati@sungaisialang.desa.id', aktif: true, nip: null },
  { id: 'pgn_sukardi', desaId: ID_SUNGAI_SIALANG, nama: 'Sukardi', jabatan: 'Kepala Dusun II', peran: 'kadus', dusunId: 'dsn_ss_2', email: 'sukardi@sungaisialang.desa.id', aktif: true, nip: null },
  { id: 'pgn_yusri', desaId: ID_TANJUNG_LAMO, nama: 'Yusri', jabatan: 'Operator Desa', peran: 'operator', dusunId: null, email: 'operator@tanjunglamo.desa.id', aktif: true, nip: null },
]
