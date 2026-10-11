import { angkaRomawi } from '@/domain/format/romawi'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { SuratMasuk, TujuanDisposisi } from '@/domain/surat/arsip'
import type { Acak } from '../prng'

type Opsi = { desaId: string; namaDesa: string; pengguna: readonly Pengguna[]; acuan: Date }

const HARI_MS = 86_400_000
const INSTRUKSI = [
  'Hadiri dan laporkan hasilnya.',
  'Siapkan data yang diminta.',
  'Teruskan ke kepala dusun terkait.',
  'Untuk diketahui dan diarsipkan.',
  'Tindak lanjuti sesuai ketentuan.',
] as const
const TUJUAN: ReadonlyArray<readonly [TujuanDisposisi, number]> = [
  ['Sekretaris Desa', 4], ['Kepala Desa', 2], ['Kasi Pemerintahan', 2], ['Kasi Kesejahteraan', 1], ['Kasi Pelayanan', 1],
  ['Kaur Keuangan', 1], ['Kepala Dusun', 1],
]

function pengirim(namaDesa: string): readonly { nama: string; kode: string; perihal: readonly string[] }[] {
  return [
    {
      nama: 'Camat Teluk Meranti', kode: 'Kec-TM',
      perihal: ['Undangan rapat koordinasi kepala desa', 'Jadwal Musrenbang kecamatan', 'Permintaan data penduduk miskin ekstrem', 'Laporan realisasi Dana Desa'],
    },
    {
      nama: 'Dinas Pemberdayaan Masyarakat dan Desa Kab. Pelalawan', kode: 'DPMD',
      perihal: ['Sosialisasi aplikasi Siskeudes', 'Pembinaan administrasi pemerintahan desa', 'Penyaluran Alokasi Dana Desa'],
    },
    {
      nama: 'Dinas Kependudukan dan Pencatatan Sipil Kab. Pelalawan', kode: 'Disdukcapil',
      perihal: ['Jadwal perekaman KTP-el keliling', 'Pemutakhiran data kependudukan semester'],
    },
    { nama: 'Puskesmas Teluk Meranti', kode: 'PKM-TM', perihal: ['Jadwal posyandu dan imunisasi', 'Permintaan data balita berisiko stunting'] },
    { nama: 'Polsek Teluk Meranti', kode: 'Polsek', perihal: ['Imbauan kamtibmas menjelang hari besar', 'Undangan rapat keamanan lingkungan'] },
    { nama: 'BPJS Kesehatan Cabang Pekanbaru', kode: 'BPJS', perihal: ['Verifikasi data peserta PBI'] },
    { nama: `Badan Permusyawaratan Desa ${namaDesa}`, kode: 'BPD', perihal: ['Undangan musyawarah desa', 'Penyampaian aspirasi warga'] },
  ]
}

/**
 * Register surat masuk 12 bulan (SPEC §7.4 layar 5): kira-kira satu surat tiap empat hari kerja. Hari kerja terakhir
 * sebelum acuan pasti ada, supaya bulan berjalan tidak pernah kosong saat demo.
 */
export function bangkitkanSuratMasuk(acak: Acak, o: Opsi): SuratMasuk[] {
  const operator = o.pengguna.find((p) => p.desaId === o.desaId && p.peran === 'operator' && p.aktif)
  if (!operator) throw new Error('Akun operator desa demo tidak ada')
  const daftarPengirim = pengirim(o.namaDesa)
  const hariKerja: string[] = []
  for (let mundur = 365; mundur >= 1; mundur--) {
    const tanggal = tanggalIsoWib(new Date(o.acuan.getTime() - mundur * HARI_MS))
    const hari = new Date(`${tanggal}T12:00:00+07:00`).getUTCDay()
    if (hari !== 0 && hari !== 6) hariKerja.push(tanggal)
  }
  const terakhir = hariKerja.at(-1)
  const perTahun = new Map<string, number>()
  return hariKerja
    .filter((t) => t === terakhir || acak.peluang(0.25))
    .map((diterima): SuratMasuk => {
      const tahun = diterima.slice(0, 4)
      const noAgenda = (perTahun.get(tahun) ?? 0) + 1
      perTahun.set(tahun, noAgenda)
      const dari = acak.pilih(daftarPengirim)
      const tanggalSurat = tanggalIsoWib(new Date(new Date(`${diterima}T12:00:00+07:00`).getTime() - acak.bulat(0, 4) * HARI_MS))
      const urut = String(acak.bulat(20, 480)).padStart(3, '0')
      const jam = `${String(acak.bulat(8, 14)).padStart(2, '0')}:${String(acak.bulat(0, 59)).padStart(2, '0')}`
      return {
        id: acak.id('sm'),
        desaId: o.desaId,
        noAgenda,
        diterima,
        nomor: `${acak.pilih(['005', '140', '400', '470'])}/${urut}/${dari.kode}/${angkaRomawi(Number(tanggalSurat.slice(5, 7)))}/${tanggalSurat.slice(0, 4)}`,
        tanggalSurat,
        pengirim: dari.nama,
        perihal: acak.pilih(dari.perihal),
        scan: acak.peluang(0.85) ? { berkas: `surat-masuk-${tahun}-${String(noAgenda).padStart(3, '0')}.pdf`, ukuranKb: acak.bulat(180, 950) } : null,
        disposisi: acak.peluang(0.8) ? { kepada: acak.berbobot(TUJUAN), instruksi: acak.pilih(INSTRUKSI) } : null,
        dicatat: { oleh: { id: operator.id, nama: operator.nama }, pada: `${diterima}T${jam}:00+07:00` },
      }
    })
}
