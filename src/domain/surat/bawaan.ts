import type { IsianTambahan, JenisSurat } from './jenis'
import type { Desa } from '../wilayah/schema'

type Bawaan = Omit<JenisSurat, 'id' | 'desaId'>

const isian = (kunci: string, label: string, opsi: Partial<Omit<IsianTambahan, 'kunci' | 'label'>> = {}): IsianTambahan => ({
  kunci,
  label,
  jenis: 'teks',
  wajib: true,
  pilihan: null,
  rupiah: false,
  diTabel: false,
  keterangan: null,
  ...opsi,
})
const keperluan = isian('keperluan', 'Keperluan', { keterangan: 'Ditulis seperti di kalimat surat, mis. "pendaftaran sekolah anak".' })
const paragraf = (...isi: string[]) => isi.join('\n\n')
const PENUTUP_KETERANGAN = 'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.'
const PENUTUP_PENGANTAR = 'Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.'

/** 12 jenis surat bawaan (SPEC §7.3). Semuanya aktif; desa bisa mengubah atau menonaktifkannya (2B-3). */
export const JENIS_SURAT_BAWAAN: readonly Bawaan[] = [
  {
    kode: 'SKD', nama: 'Surat Keterangan Domisili', klasifikasi: '470', subjek: 'pemohon', isian: [keperluan],
    bolehAtasNama: true, wajibParaf: false, masaBerlakuBulan: 3, online: true, syarat: ['KTP', 'KK', 'Pengantar RT'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa] dan berdomisili di [alamat].',
      'Surat keterangan ini dibuat untuk keperluan [keperluan] dan berlaku sampai [berlakuSampai].',
      PENUTUP_KETERANGAN,
    ),
    aktif: true,
  },
  {
    kode: 'SKTM', nama: 'Surat Keterangan Tidak Mampu', klasifikasi: '400', subjek: 'pemohon',
    isian: [
      isian('keperluan', 'Keperluan', { jenis: 'pilihan', pilihan: ['Pendidikan', 'Kesehatan', 'Lainnya'] }),
      isian('instansiTujuan', 'Instansi tujuan', { keterangan: 'Mis. SMA Negeri 1 Teluk Meranti atau RSUD Selasih.' }),
      isian('anggotaDibantu', 'Anggota keluarga yang dibantu', {
        wajib: false, diTabel: true, keterangan: 'Isi bila yang dibantu bukan pemohon, mis. anak yang bersekolah.',
      }),
    ],
    bolehAtasNama: false, wajibParaf: true, masaBerlakuBulan: 3, online: true, syarat: ['KTP', 'KK', 'Pengantar RT'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa] yang berdomisili di [alamat]. Sepanjang pengetahuan kami, keluarga yang bersangkutan tergolong keluarga tidak mampu.',
      '[tabelRincian]',
      'Surat keterangan ini diberikan untuk keperluan [keperluan] pada [instansiTujuan] dan berlaku sampai [berlakuSampai].',
      PENUTUP_KETERANGAN,
    ),
    aktif: true,
  },
  {
    kode: 'SKU', nama: 'Surat Keterangan Usaha', klasifikasi: '500', subjek: 'pemohon',
    isian: [
      isian('namaUsaha', 'Nama usaha', { diTabel: true }),
      isian('jenisUsaha', 'Jenis usaha', { diTabel: true }),
      isian('alamatUsaha', 'Alamat usaha', { diTabel: true, keterangan: 'Tulis RT/RW dan nama dusunnya.' }),
      isian('mulaiUsaha', 'Mulai usaha (tahun)', { jenis: 'angka', diTabel: true }),
    ],
    bolehAtasNama: false, wajibParaf: false, masaBerlakuBulan: 6, online: true,
    syarat: ['KTP', 'KK', 'Foto tempat usaha (opsional)'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa] dan benar memiliki usaha sebagai berikut:',
      '[tabelRincian]',
      'Surat keterangan ini dibuat sebagai kelengkapan administrasi usaha dan berlaku sampai [berlakuSampai].',
      PENUTUP_KETERANGAN,
    ),
    aktif: true,
  },
  {
    kode: 'SPCK', nama: 'Surat Pengantar SKCK', klasifikasi: '300', subjek: 'pemohon', isian: [keperluan],
    bolehAtasNama: true, wajibParaf: false, masaBerlakuBulan: 1, online: true,
    syarat: ['KTP', 'KK', 'Pas foto 4×6', 'Pengantar RT'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa] dan sepanjang pengetahuan kami berkelakuan baik serta tidak pernah tersangkut perkara pidana.',
      'Surat pengantar ini diberikan untuk mengurus Surat Keterangan Catatan Kepolisian (SKCK) di Kepolisian Sektor [kecamatan] guna keperluan [keperluan], dan berlaku sampai [berlakuSampai].',
      PENUTUP_PENGANTAR,
    ),
    aktif: true,
  },
  {
    kode: 'SKL', nama: 'Surat Keterangan Kelahiran', klasifikasi: '474.1', subjek: 'kelahiran',
    isian: [isian('pelapor', 'Nama pelapor')],
    bolehAtasNama: false, wajibParaf: false, masaBerlakuBulan: null, online: true,
    syarat: ['KK dan KTP orang tua', 'Keterangan lahir dari bidan/RS'],
    teks: paragraf(
      'Anak tersebut di atas benar telah lahir dan tercatat sebagai anggota keluarga penduduk Desa [namaDesa]. Kelahiran ini dilaporkan oleh [pelapor].',
      'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagai dasar pengurusan akta kelahiran.',
    ),
    aktif: true,
  },
  {
    kode: 'SKM', nama: 'Surat Keterangan Kematian', klasifikasi: '474.3', subjek: 'kematian',
    isian: [
      isian('tanggalMeninggal', 'Tanggal meninggal', { jenis: 'tanggal', diTabel: true }),
      isian('tempatMeninggal', 'Tempat meninggal', { diTabel: true }),
      isian('sebab', 'Sebab kematian', { diTabel: true }),
      isian('pelapor', 'Nama pelapor'),
    ],
    bolehAtasNama: false, wajibParaf: false, masaBerlakuBulan: null, online: false, syarat: ['KK', 'KTP almarhum', 'KTP pelapor'],
    teks: paragraf(
      'Nama tersebut di atas telah meninggal dunia dengan keterangan sebagai berikut:',
      '[tabelRincian]',
      'Kematian ini dilaporkan oleh [pelapor].',
      PENUTUP_KETERANGAN,
    ),
    aktif: true,
  },
  {
    kode: 'SPP', nama: 'Surat Pengantar Pindah', klasifikasi: '475', subjek: 'pemohon',
    isian: [
      isian('alamatTujuan', 'Alamat tujuan', { diTabel: true }),
      isian('alasan', 'Alasan pindah', { diTabel: true }),
      isian('anggotaPindah', 'Anggota keluarga yang pindah', { diTabel: true, keterangan: 'Nama semua yang ikut pindah, dipisah koma.' }),
    ],
    bolehAtasNama: false, wajibParaf: false, masaBerlakuBulan: 1, online: false, syarat: ['KK', 'KTP semua yang pindah'],
    teks: paragraf(
      'Nama tersebut di atas adalah penduduk Desa [namaDesa] yang akan pindah dengan keterangan sebagai berikut:',
      '[tabelRincian]',
      'Surat pengantar ini diberikan untuk mengurus Surat Keterangan Pindah di Dinas Kependudukan dan Pencatatan Sipil Kabupaten [kabupaten] dan berlaku sampai [berlakuSampai].',
      PENUTUP_PENGANTAR,
    ),
    aktif: true,
  },
  {
    kode: 'SKP', nama: 'Surat Keterangan Penghasilan', klasifikasi: '400', subjek: 'pemohon',
    isian: [
      isian('penghasilan', 'Penghasilan per bulan', { jenis: 'angka', rupiah: true, keterangan: 'Dalam rupiah, tanpa titik.' }),
      keperluan,
    ],
    bolehAtasNama: false, wajibParaf: true, masaBerlakuBulan: 3, online: true, syarat: ['KTP', 'KK'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa] yang bekerja sebagai [pekerjaan] dengan penghasilan rata-rata [penghasilan] per bulan.',
      'Surat keterangan ini dibuat untuk keperluan [keperluan] dan berlaku sampai [berlakuSampai].',
      PENUTUP_KETERANGAN,
    ),
    aktif: true,
  },
  {
    kode: 'SPN', nama: 'Surat Pengantar Nikah', klasifikasi: '474.2', subjek: 'pemohon',
    isian: [
      isian('namaPasangan', 'Nama calon pasangan', { diTabel: true }),
      isian('nikPasangan', 'NIK calon pasangan', { jenis: 'angka', diTabel: true }),
      isian('alamatPasangan', 'Alamat calon pasangan', { diTabel: true }),
      isian('rencanaTanggal', 'Rencana tanggal pernikahan', { jenis: 'tanggal', diTabel: true }),
    ],
    bolehAtasNama: false, wajibParaf: true, masaBerlakuBulan: 3, online: false, syarat: ['KTP', 'KK', 'Akta lahir', 'Pas foto'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa] yang akan melangsungkan pernikahan dengan:',
      '[tabelRincian]',
      'Surat pengantar ini diberikan sebagai kelengkapan pencatatan pernikahan dan berlaku sampai [berlakuSampai].',
      PENUTUP_PENGANTAR,
    ),
    aktif: true,
  },
  {
    kode: 'SKBN', nama: 'Surat Keterangan Beda Nama', klasifikasi: '470', subjek: 'pemohon',
    isian: [
      isian('namaLain', 'Nama di dokumen lain', { diTabel: true }),
      isian('jenisDokumen', 'Jenis dokumen', { diTabel: true }),
      isian('nomorDokumen', 'Nomor dokumen', { diTabel: true }),
    ],
    bolehAtasNama: false, wajibParaf: false, masaBerlakuBulan: null, online: true,
    syarat: ['KTP', 'KK', 'Dokumen yang namanya berbeda'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa]. Pada dokumen berikut, namanya tertulis berbeda:',
      '[tabelRincian]',
      'Kedua nama tersebut adalah orang yang sama, yaitu [nama].',
      PENUTUP_KETERANGAN,
    ),
    aktif: true,
  },
  {
    kode: 'SKBM', nama: 'Surat Keterangan Belum Menikah', klasifikasi: '474.2', subjek: 'pemohon', isian: [keperluan],
    bolehAtasNama: false, wajibParaf: false, masaBerlakuBulan: 3, online: true, syarat: ['KTP', 'KK', 'Pengantar RT'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa] dan sampai saat ini belum pernah menikah.',
      'Surat keterangan ini dibuat untuk keperluan [keperluan] dan berlaku sampai [berlakuSampai].',
      PENUTUP_KETERANGAN,
    ),
    aktif: true,
  },
  {
    kode: 'SKH', nama: 'Surat Keterangan Kehilangan', klasifikasi: '300', subjek: 'pemohon',
    isian: [
      isian('barangHilang', 'Barang/dokumen yang hilang', { diTabel: true }),
      isian('waktuHilang', 'Perkiraan waktu hilang', { diTabel: true }),
      isian('tempatHilang', 'Perkiraan tempat hilang', { diTabel: true }),
    ],
    bolehAtasNama: true, wajibParaf: false, masaBerlakuBulan: 1, online: true, syarat: ['KTP', 'KK'],
    teks: paragraf(
      'Nama tersebut di atas adalah benar penduduk Desa [namaDesa] dan telah melaporkan kehilangan dengan keterangan sebagai berikut:',
      '[tabelRincian]',
      'Surat keterangan ini dibuat untuk melengkapi laporan kehilangan dan berlaku sampai [berlakuSampai].',
      PENUTUP_KETERANGAN,
    ),
    aktif: true,
  },
]

/**
 * Katalog desa baru (tahap 6C): 12 jenis bawaan, semuanya belum dilayani. Desa memilih sendiri jenis yang dilayaninya di
 * langkah persiapan "Pilih jenis surat yang dilayani" (SPEC §5.3). ID memakai slug desa, yang unik di seluruh Sinfodes.
 */
export function katalogDesaBaru(desa: Pick<Desa, 'id' | 'slug'>): JenisSurat[] {
  const awalan = desa.slug.replaceAll('-', '_')
  return JENIS_SURAT_BAWAAN.map((j) => ({ ...structuredClone(j), id: `js_${awalan}_${j.kode.toLowerCase()}`, desaId: desa.id, aktif: false }))
}
