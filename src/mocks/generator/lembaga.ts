import { angkaRomawi } from '@/domain/format/romawi'
import { hitungUmur } from '@/domain/format/tanggal'
import type { JenisLembaga, Pengurus } from '@/domain/lembaga/schema'
import type { JenisKelamin } from '@/domain/penduduk/enum'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Peran, Pengguna } from '@/domain/pengguna/schema'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import type { Acak } from '../prng'

type Opsi = { desa: Desa; dusun: readonly Dusun[]; penduduk: readonly Penduduk[]; pengguna: readonly Pengguna[]; acuan: Date }
type MasaBakti = Pengurus['masaBakti']
type Syarat = { umurMin: number; umurMaks: number; jenisKelamin?: JenisKelamin; dusunId?: string }

/** Persona demo tidak dijadikan pengurus, supaya cerita alur demonya tetap sederhana. */
const PERSONA = new Set(['pdk_syahrial', 'pdk_siti_rahmah', 'pdk_zulkifli', 'pdk_rosnani'])

const DEWASA: Syarat = { umurMin: 25, umurMaks: 60 }

/** Susunan pengurus per lembaga (SPEC §12.6): BPD 7, LPM 5, PKK 8, Karang Taruna 6, Linmas 10, BUMDes 4. */
const SUSUNAN: readonly { lembaga: JenisLembaga; jabatan: readonly string[]; masa: MasaBakti; syarat: Syarat }[] = [
  {
    lembaga: 'bpd', jabatan: ['Ketua', 'Wakil Ketua', 'Sekretaris', 'Anggota', 'Anggota', 'Anggota', 'Anggota'],
    masa: { mulai: 2021, selesai: 2029 }, syarat: { umurMin: 30, umurMaks: 60 },
  },
  { lembaga: 'lpm', jabatan: ['Ketua', 'Sekretaris', 'Bendahara', 'Anggota', 'Anggota'], masa: { mulai: 2023, selesai: 2028 }, syarat: DEWASA },
  {
    lembaga: 'pkk', jabatan: ['Ketua', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Ketua Pokja I', 'Ketua Pokja II', 'Ketua Pokja III', 'Ketua Pokja IV'],
    masa: { mulai: 2021, selesai: 2029 }, syarat: { ...DEWASA, jenisKelamin: 'P' },
  },
  {
    lembaga: 'karang-taruna', jabatan: ['Ketua', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Anggota', 'Anggota'],
    masa: { mulai: 2024, selesai: 2029 }, syarat: { umurMin: 17, umurMaks: 30 },
  },
  {
    lembaga: 'linmas', jabatan: ['Kepala Satuan Linmas', ...Array.from({ length: 9 }, () => 'Anggota Linmas')],
    masa: { mulai: 2024, selesai: null }, syarat: { umurMin: 20, umurMaks: 50, jenisKelamin: 'L' },
  },
  {
    lembaga: 'bumdes', jabatan: ['Direktur', 'Sekretaris', 'Bendahara', 'Kepala Unit Usaha Perikanan'],
    masa: { mulai: 2024, selesai: 2029 }, syarat: DEWASA,
  },
]

/**
 * Pengurus 9 lembaga desa (SPEC §8, §12.6). Perangkat desa memakai nama SPEC §12.1 dan nama kepala dusun dari data
 * wilayah; ketua RT/RW disalin dari data wilayah; pengurus lain diambil dari penduduk dewasa yang hidup, tanpa merangkap.
 */
export function bangkitkanLembaga(acak: Acak, o: Opsi): Pengurus[] {
  const dusunDesa = o.dusun.filter((d) => d.desaId === o.desa.id)
  const terpakai = new Set<string>()
  const calon = o.penduduk.filter((p) => p.desaId === o.desa.id && p.statusDasar === 'Hidup' && !PERSONA.has(p.id))
  // Umur dihitung sekali per calon; menghitungnya di setiap pengambilan membuat pembangkitan data dua kali lebih lambat.
  const umurCalon = new Map(calon.map((p) => [p.id, hitungUmur(p.tanggalLahir, o.acuan).tahun]))
  const umur = (p: Penduduk) => umurCalon.get(p.id) ?? 0
  const ambil = (s: Syarat): Penduduk => {
    const cocok = calon.filter(
      (p) =>
        !terpakai.has(p.id) && umur(p) >= s.umurMin && umur(p) <= s.umurMaks &&
        (s.jenisKelamin === undefined || p.jenisKelamin === s.jenisKelamin) && (s.dusunId === undefined || p.dusunId === s.dusunId),
    )
    const p = acak.pilih(cocok)
    terpakai.add(p.id)
    return p
  }
  const namaPeran = (peran: Peran): string => {
    const p = o.pengguna.find((x) => x.desaId === o.desa.id && x.peran === peran)
    if (!p) throw new Error(`Akun demo ${peran} tidak ada`)
    return p.nama
  }
  const hasil: Pengurus[] = []
  const tambah = (lembaga: JenisLembaga, jabatan: string, nama: string, pendudukId: string | null, dusunId: string | null, masaBakti: MasaBakti) => {
    hasil.push({
      id: acak.id('lmb'), desaId: o.desa.id, lembaga, nama, jabatan, pendudukId, dusunId, masaBakti,
      urutan: hasil.filter((p) => p.lembaga === lembaga).length,
    })
  }
  const dariPenduduk = (lembaga: JenisLembaga, jabatan: string, s: Syarat, masa: MasaBakti, dusunId: string | null = null) => {
    const p = ambil(s)
    tambah(lembaga, jabatan, p.nama, p.id, dusunId, masa)
  }

  // Perangkat desa: 13 orang ditambah operator (SPEC §12.6).
  tambah('perangkat', 'Kepala Desa', namaPeran('kades'), null, null, { mulai: 2021, selesai: 2029 })
  tambah('perangkat', 'Sekretaris Desa', namaPeran('sekdes'), null, null, { mulai: 2017, selesai: null })
  tambah('perangkat', 'Kaur Tata Usaha dan Umum', 'Syafrizal', null, null, { mulai: 2019, selesai: null })
  tambah('perangkat', 'Kaur Keuangan', namaPeran('kaur-keuangan'), null, null, { mulai: 2018, selesai: null })
  tambah('perangkat', 'Kaur Perencanaan', 'Wahyu Hidayat', null, null, { mulai: 2020, selesai: null })
  tambah('perangkat', 'Kasi Pemerintahan', 'Zulkarnain', null, null, { mulai: 2016, selesai: null })
  tambah('perangkat', 'Kasi Kesejahteraan', 'Wan Aisyah', null, null, { mulai: 2019, selesai: null })
  tambah('perangkat', 'Kasi Pelayanan', 'Dedi Kurniawan', null, null, { mulai: 2021, selesai: null })
  for (const d of dusunDesa) tambah('perangkat', `Kepala Dusun ${angkaRomawi(d.nomor)}`, d.kepalaDusun, null, d.id, { mulai: 2018, selesai: null })
  dariPenduduk('perangkat', 'Staf Seksi Pelayanan', { umurMin: 20, umurMaks: 40 }, { mulai: 2023, selesai: null })
  tambah('perangkat', 'Operator Desa', namaPeran('operator'), null, null, { mulai: 2022, selesai: null })

  for (const s of SUSUNAN) for (const j of s.jabatan) dariPenduduk(s.lembaga, j, s.syarat, s.masa)

  // Ketua RW dan RT dari data wilayah.
  for (const d of dusunDesa) {
    for (const rw of d.rw) {
      tambah('rt-rw', `Ketua RW ${rw.nomor}`, rw.ketua, null, d.id, { mulai: 2024, selesai: 2027 })
      for (const rt of rw.rt) tambah('rt-rw', `Ketua RT ${rt.nomor} / RW ${rw.nomor}`, rt.ketua, null, d.id, { mulai: 2024, selesai: 2027 })
    }
  }

  // Kader posyandu: 4 per posyandu, perempuan dari dusunnya (SPEC §12.6).
  for (const d of dusunDesa) {
    for (const j of ['Ketua Kader', 'Kader', 'Kader', 'Kader']) {
      dariPenduduk('kader-posyandu', `${j} · Posyandu ${d.posyandu}`, { ...DEWASA, umurMin: 20, jenisKelamin: 'P', dusunId: d.id }, { mulai: 2023, selesai: null }, d.id)
    }
  }
  return hasil
}
