import { z } from 'zod'
import { aktivitasSchema } from '../aktivitas/schema'
import { kartuPeringkatSchema } from '../indeks/peringkat-desa'
import { pengingatTenggatSchema } from '../kabupaten/tenggat'
import { pengingatTagihanSchema } from '../langganan/pengingat'
import { barisPengaduanSchema } from '../pengaduan/schema'
import { TAHAP_TTD } from '../surat/permohonan'
import { persiapanSchema } from '../wilayah/persiapan'

/** "Perlu ditindaklanjuti" (SPEC §5.3). Butir laporan dan surat membawa rujukan butir terlamanya. */
export const tindakanSchema = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('permohonan-menunggu'), jumlah: z.number().int().min(1), tertuaHariKerja: z.number().int().min(0) }),
  z.object({ jenis: z.literal('pengaduan-belum-dibalas'), jumlah: z.number().int().min(1) }),
  z.object({ jenis: z.literal('surat-dikembalikan'), jumlah: z.number().int().min(1), permohonanId: z.string(), ringkas: z.string() }),
  z.object({ jenis: z.literal('kelahiran-dilaporkan'), jumlah: z.number().int().min(1), laporanId: z.string() }),
  z.object({ jenis: z.literal('laporan-perbaikan'), jumlah: z.number().int().min(1), pendudukId: z.string() }),
  z.object({ jenis: z.literal('data-belum-lengkap'), jumlah: z.number().int().min(1) }),
])
export type Tindakan = z.infer<typeof tindakanSchema>

const jumlah = z.number().int().min(0)

/** Keadaan desa (atau dusun, untuk Kepala Dusun) dalam bentuk kalimat. */
export const keadaanSchema = z.object({
  cakupan: z.enum(['desa', 'dusun']),
  dusunId: z.string().nullable(),
  jiwa: jumlah,
  kk: jumlah,
  laki: jumlah,
  perempuan: jumlah,
  bulanIni: z.object({ lahir: jumlah, meninggal: jumlah, datang: jumlah, pindah: jumlah }),
  /** Surat Selesai 30 hari terakhir dan rata-rata lama selesainya (hari kerja). */
  surat: z.object({ terbit30Hari: jumlah, rataSelesaiHariKerja: jumlah }),
})
export type Keadaan = z.infer<typeof keadaanSchema>

const uang = z.object({ anggaran: z.number().int().min(0), realisasi: z.number().int().min(0) })

/** GET /beranda. Bagian bernilai null tidak ditampilkan untuk peran tersebut. */
export const berandaSchema = z.object({
  tindakan: z.array(tindakanSchema).nullable(),
  bukuHariIni: z.array(aktivitasSchema).nullable(),
  /** Sekdes: surat yang perlu diparaf; Kades: yang menunggu tanda tangannya. Null untuk peran lain. */
  suratSaya: z.object({ tahap: z.enum(TAHAP_TTD), jumlah }).nullable(),
  /** Kades: 5 pengaduan terbaru desa; Kepala Dusun: 5 terbaru dari dusunnya. Null untuk peran lain. */
  pengaduanTerbaru: z.array(barisPengaduanSchema).nullable(),
  /** Kepala Dusun: jadwal posyandu dusunnya yang terdekat. Null untuk peran lain. */
  posyandu: z.object({ nama: z.string(), tempat: z.string(), jadwal: z.iso.date() }).nullable(),
  /** Realisasi APBDes tahun berjalan untuk pemegang `keuangan.lihat` (SPEC §5.3). */
  apbdes: z
    .object({ tahun: z.number().int(), pendapatan: uang, belanja: uang, bidang: z.array(uang.extend({ kode: z.string(), nama: z.string() })) })
    .nullable(),
  /** Kades dan Kaur Keuangan: kegiatan pembangunan yang sedang berjalan. */
  pembangunan: z.array(uang.extend({ id: z.string(), nama: z.string(), progresFisik: z.number().int().min(0).max(100) })).nullable(),
  /**
   * Tenggat laporan ke kabupaten yang belum dikirim, mulai H-14 (SPEC-V0.2 §8.3 butir 4). Null untuk pengguna tanpa
   * `keuangan.lihat`; kosong bila desa bukan sasaran tenggat atau semuanya sudah dikirim.
   */
  pengingatTenggat: z.array(pengingatTenggatSchema).nullable(),
  /** Pita tagihan langganan mulai H-14 (SPEC-V0.2 §10). Null bagi peran tanpa `langganan.lihat` dan bila tidak ada yang perlu diingatkan. */
  pengingatTagihan: pengingatTagihanSchema.nullable(),
  /** Desa berstatus Persiapan (SPEC §5.3): Beranda berganti menjadi lima langkah persiapan. Null untuk desa lain. */
  persiapan: persiapanSchema.nullable(),
  /** Kartu Peringkat bulan terakhir tutup (SPEC-V0.2 §9.5). Null bagi desa yang belum ikut peringkat. */
  peringkat: kartuPeringkatSchema.nullable(),
  keadaan: keadaanSchema,
})
export type Beranda = z.infer<typeof berandaSchema>
