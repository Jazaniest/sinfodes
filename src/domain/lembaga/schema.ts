import { z } from 'zod'

/** SPEC §8 dan §12.6, dalam urutan tampil. */
export const JENIS_LEMBAGA = ['perangkat', 'bpd', 'lpm', 'pkk', 'karang-taruna', 'rt-rw', 'kader-posyandu', 'linmas', 'bumdes'] as const
export type JenisLembaga = (typeof JENIS_LEMBAGA)[number]

/** Label pendek untuk tab. */
export const LABEL_LEMBAGA: Readonly<Record<JenisLembaga, string>> = {
  perangkat: 'Perangkat Desa',
  bpd: 'BPD',
  lpm: 'LPM',
  pkk: 'PKK',
  'karang-taruna': 'Karang Taruna',
  'rt-rw': 'RT dan RW',
  'kader-posyandu': 'Kader Posyandu',
  linmas: 'Linmas',
  bumdes: 'BUMDes',
}

/** Nama lengkap untuk judul bagian. */
export const NAMA_LENGKAP_LEMBAGA: Readonly<Record<JenisLembaga, string>> = {
  perangkat: 'Perangkat Desa',
  bpd: 'Badan Permusyawaratan Desa',
  lpm: 'Lembaga Pemberdayaan Masyarakat',
  pkk: 'Tim Penggerak PKK',
  'karang-taruna': 'Karang Taruna',
  'rt-rw': 'Ketua RT dan RW',
  'kader-posyandu': 'Kader Posyandu',
  linmas: 'Satuan Perlindungan Masyarakat (Linmas)',
  bumdes: 'Pengurus Badan Usaha Milik Desa',
}

/** Satu pengurus lembaga. `pendudukId` terisi bila orangnya tercatat sebagai penduduk (profilnya bisa dibuka). */
export const pengurusSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  lembaga: z.enum(JENIS_LEMBAGA),
  nama: z.string().min(1),
  jabatan: z.string().min(1),
  pendudukId: z.string().nullable(),
  /** Untuk ketua RT/RW dan kader posyandu. */
  dusunId: z.string().nullable(),
  masaBakti: z.object({ mulai: z.number().int(), selesai: z.number().int().nullable() }),
  /** Urutan jabatan di dalam lembaganya. */
  urutan: z.number().int().min(0),
})
export type Pengurus = z.infer<typeof pengurusSchema>

/** Pengurus per lembaga, sesuai urutan JENIS_LEMBAGA; lembaga tanpa pengurus dilewati. */
export function kelompokLembaga(daftar: readonly Pengurus[]): { lembaga: JenisLembaga; anggota: Pengurus[] }[] {
  return JENIS_LEMBAGA.map((lembaga) => ({
    lembaga,
    anggota: daftar.filter((p) => p.lembaga === lembaga).sort((a, b) => a.urutan - b.urutan),
  })).filter((k) => k.anggota.length > 0)
}

/** "2021–2029", atau "sejak 2018" bila masa baktinya belum ditentukan berakhir. */
export const teksMasaBakti = (m: Pengurus['masaBakti']): string => (m.selesai === null ? `sejak ${m.mulai}` : `${m.mulai}–${m.selesai}`)
