import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import type { Notifikasi } from '@/domain/notifikasi/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { Desa } from '@/domain/wilayah/schema'
import { ID_SUNGAI_SIALANG } from '../data/desa-demo'
import { KABUPATEN_MITRA_DEMO } from '../data/kabupaten-demo'
import type { Acak } from '../prng'
import { notifikasiSiaran, pilihDesaSasaran } from '../siaran'
import type { BacaSiaran, SiaranKabupaten } from '../tipe-db'

const HARI_MS = 86_400_000
const JAM_MS = 3_600_000
const geser = (hariIni: string, hari: number) => new Date(Date.parse(`${hariIni}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)
const pukul = (tanggal: string, jam: string) => `${tanggal}T${jam}:00+07:00`

const FAJAR = { id: 'kab_fajar', nama: 'Fajar Ramadhan' }
const WAHYU = { id: 'kab_wahyu', nama: 'Wahyu Saputra' }
const ROSMIATI = { id: 'pgn_rosmiati', nama: 'Rosmiati' }
const HENDRI = { id: 'pgn_hendri', nama: 'Hendri Saputra' }

const CATATAN_RAKOR = [
  'Sudah dikonfirmasi ke panitia.', 'Sekdes dan Kaur Keuangan hadir.', 'Kepala Desa hadir.', 'Sudah disampaikan ke perangkat desa.',
] as const

type Rencana = Omit<SiaranKabupaten, 'desaIds'>

/**
 * Siaran contoh (SPEC-V0.2 §13), relatif terhadap hari acuan A. Sungai Sialang ikut sasaran keempat siaran Pelalawan: rapat
 * koordinasi sudah ditindaklanjuti Sekdes, BLT-DD belum dibuka (alur tindak lanjut bisa dicoba), dan satu siaran sudah ditarik.
 * Status baca desa rekaman diacak dari aliran sendiri; desa panel lain tidak punya baris baca.
 */
export function bangkitkanSiaran(
  acak: Acak,
  o: { acuan: Date; desa: readonly Desa[]; pengguna: readonly Pengguna[] },
): { siaran: SiaranKabupaten[]; baca: BacaSiaran[]; notifikasi: Notifikasi[] } {
  const A = tanggalIsoWib(o.acuan)
  const batas = o.acuan.getTime()
  const sasaranKab = (kode: string) => o.desa.filter((d) => d.kabupaten.kode === kode && (d.status === 'Aktif' || d.status === 'Uji coba'))
  const idDesa = (nama: string) => o.desa.find((d) => d.kabupaten.kode === '14.05' && d.nama === nama)?.id ?? nama
  const rencana: Rencana[] = [
    {
      id: 'srn_pll_libur', kabupatenKode: '14.05', judul: 'Penyesuaian jam pelayanan kantor desa',
      isi:
        'Sehubungan dengan cuti bersama, pelayanan kantor desa pada tanggal yang ditetapkan pemerintah disesuaikan menjadi pukul 08.00 sampai 12.00 WIB.\n\n' +
        'Mohon jadwal ini diumumkan kepada warga melalui papan pengumuman dan website desa. Layanan surat dari HP warga tetap berjalan seperti biasa.',
      lampiran: null, tindakLanjut: null, sasaran: { jenis: 'semua' }, dikirimPada: pukul(geser(A, -35), '09:00'), dikirimOleh: FAJAR, ditarik: null,
    },
    {
      id: 'srn_pll_rakor', kabupatenKode: '14.05', judul: 'Undangan rapat koordinasi penyaluran Dana Desa tahap II',
      isi:
        'Dinas PMD Kabupaten Pelalawan mengundang Sekretaris Desa dan Kaur Keuangan untuk rapat koordinasi penyaluran Dana Desa tahap II di aula kantor bupati.\n\n' +
        'Undangan lengkap beserta agenda terlampir. Mohon konfirmasi kehadiran paling lambat sesuai tenggat dengan menandai siaran ini sudah ditindaklanjuti dan menuliskan nama yang hadir.',
      lampiran: { berkas: 'undangan-rakor-dd-tahap-2.pdf', ukuranKb: 284 }, tindakLanjut: { tenggat: geser(A, -13) }, sasaran: { jenis: 'semua' },
      dikirimPada: pukul(geser(A, -20), '10:00'), dikirimOleh: FAJAR, ditarik: null,
    },
    {
      id: 'srn_pll_blt', kabupatenKode: '14.05', judul: 'Pemutakhiran data penerima BLT-DD triwulan IV',
      isi:
        'Menjelang penyaluran BLT Dana Desa triwulan IV, desa diminta memeriksa kembali daftar keluarga penerima: keluarga yang pindah, anggota yang meninggal, dan keluarga yang sudah tidak memenuhi syarat.\n\n' +
        'Perbarui datanya di menu Bantuan Sosial, lalu tandai siaran ini sudah ditindaklanjuti beserta jumlah keluarga yang diperbarui.',
      lampiran: null, tindakLanjut: { tenggat: geser(A, 11) }, sasaran: { jenis: 'kecamatan', kode: ['14.05.09', '14.05.10'] },
      dikirimPada: pukul(geser(A, -3), '08:30'), dikirimOleh: FAJAR, ditarik: null,
    },
    {
      id: 'srn_pll_ralat', kabupatenKode: '14.05', judul: 'Perubahan jadwal rapat koordinasi',
      isi: 'Rapat koordinasi penyaluran Dana Desa tahap II dimajukan satu hari. Tempat dan agenda tetap sama.',
      lampiran: null, tindakLanjut: null,
      sasaran: { jenis: 'desa', id: [ID_SUNGAI_SIALANG, idDesa('Kuala Rengas'), idDesa('Teluk Pauh')] },
      dikirimPada: pukul(geser(A, -10), '14:00'), dikirimOleh: FAJAR, ditarik: { pada: pukul(geser(A, -10), '14:25'), oleh: FAJAR },
    },
    {
      id: 'srn_siak_rakor', kabupatenKode: '14.08', judul: 'Rapat koordinasi operator desa',
      isi: 'Operator desa diundang mengikuti rapat koordinasi pemakaian Sinfodes di kantor Diskominfo Siak.\n\nMohon membawa laptop yang dipakai untuk panel desa.',
      lampiran: null, tindakLanjut: null, sasaran: { jenis: 'semua' }, dikirimPada: pukul(geser(A, -6), '09:00'), dikirimOleh: WAHYU, ditarik: null,
    },
  ]
  const siaran: SiaranKabupaten[] = rencana.map((r) => {
    const desa = pilihDesaSasaran(sasaranKab(r.kabupatenKode), r.sasaran)
    return { ...r, desaIds: desa === 'luar' ? [] : desa.map((d) => d.id) }
  })

  const desaPanel = new Set(o.pengguna.map((p) => p.desaId))
  const baca: BacaSiaran[] = []
  /** Waktu kirim + jam, dipotong agar tidak melewati acuan. */
  const setelah = (iso: string, jam: number) => waktuIsoWib(new Date(Math.min(Date.parse(iso) + jam * JAM_MS, batas)))
  for (const s of siaran) {
    for (const desaId of s.desaIds) {
      if (desaId === ID_SUNGAI_SIALANG) {
        if (s.id === 'srn_pll_libur') baca.push({ siaranId: s.id, desaId, dibaca: { pada: pukul(geser(A, -35), '10:20'), oleh: ROSMIATI }, tindakLanjut: null })
        if (s.id === 'srn_pll_rakor') {
          baca.push({
            siaranId: s.id, desaId, dibaca: { pada: pukul(geser(A, -20), '13:10'), oleh: HENDRI },
            tindakLanjut: { pada: pukul(geser(A, -19), '09:30'), oleh: HENDRI, catatan: 'Sekretaris Desa dan Kaur Keuangan akan hadir.' },
          })
        }
        continue
      }
      if (desaPanel.has(desaId)) continue
      // Desa rekaman tidak punya akun panel; pembacanya dicatat atas nama jabatannya.
      const oleh = { id: `rekam_${desaId}`, nama: 'Sekretaris Desa' }
      const catat = (pada: string, tindakLanjut: BacaSiaran['tindakLanjut'] = null) => baca.push({ siaranId: s.id, desaId, dibaca: { pada, oleh }, tindakLanjut })
      if (s.id === 'srn_pll_libur' && acak.peluang(0.95)) catat(setelah(s.dikirimPada, acak.bulat(1, 72)))
      else if (s.id === 'srn_pll_rakor' && acak.peluang(0.9)) {
        const pada = setelah(s.dikirimPada, acak.bulat(1, 96))
        catat(pada, acak.peluang(0.75) ? { pada: setelah(pada, acak.bulat(1, 72)), oleh, catatan: acak.pilih(CATATAN_RAKOR) } : null)
      } else if (s.id === 'srn_pll_blt' && acak.peluang(0.5)) {
        const pada = setelah(s.dikirimPada, acak.bulat(1, 48))
        catat(pada, acak.peluang(0.3) ? { pada: setelah(pada, acak.bulat(1, 24)), oleh, catatan: 'Data sudah diperbarui di aplikasi.' } : null)
      } else if (s.id === 'srn_pll_ralat' && o.desa.find((d) => d.id === desaId)?.nama === 'Kuala Rengas') {
        catat(pukul(geser(A, -10), '14:10'))
      } else if (s.id === 'srn_siak_rakor') catat(setelah(s.dikirimPada, acak.bulat(1, 30)))
    }
  }

  // Notifikasi untuk pemegang `siaran.lihat` di desa panel sasaran. Yang belum dibaca hanya BLT-DD untuk Sekdes dan Kades,
  // supaya angka notifikasi Operator tetap 3 (SPEC §5.2).
  const notifikasi = siaran.flatMap((s) =>
    notifikasiSiaran(o.pengguna, s, KABUPATEN_MITRA_DEMO.find((k) => k.kode === s.kabupatenKode)?.nama ?? '', (p) =>
      !(s.id === 'srn_pll_blt' && (p.peran === 'sekdes' || p.peran === 'kades')),
    ),
  )
  return { siaran, baca, notifikasi }
}
