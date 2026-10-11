import type { Aktivitas } from '@/domain/aktivitas/schema'
import { hitungUmur, tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import type { EntriPengaduan, KategoriPengaduan, Pengaduan, StatusPengaduan } from '@/domain/pengaduan/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { Dusun } from '@/domain/wilayah/schema'
import type { Acak } from '../prng'

type Opsi = { desaId: string; dusun: readonly Dusun[]; penduduk: readonly Penduduk[]; pengguna: readonly Pengguna[]; acuan: Date }

type Templat = {
  kategori: KategoriPengaduan
  /** `{rt}` diganti nomor RT pelapor. */
  judul: string
  cerita: string
  balasan: string
  /** Pesan warga sesudah masalahnya beres; null bila warga biasanya tidak membalas lagi. */
  terimaKasih: string | null
  lokasi: string | null
  /** Warga biasanya melampirkan foto untuk laporan seperti ini. */
  berfoto: boolean
}

/** Topik pengaduan desa pesisir di Pelalawan (SPEC §12.6). */
const TEMPLAT: readonly Templat[] = [
  {
    kategori: 'Infrastruktur', judul: 'Jalan berlubang di RT {rt}',
    cerita: 'Jalan semenisasi di depan rumah kami berlubang besar sejak hujan pekan lalu. Motor anak sekolah sering terperosok. Mohon segera ditimbun.',
    balasan: 'Terima kasih laporannya. Kepala dusun sudah meninjau lokasi; penimbunan sementara dengan sirtu dikerjakan Sabtu ini bersama warga.',
    terimaKasih: 'Sudah ditimbun tadi pagi. Terima kasih.', lokasi: 'Jalan lingkungan RT {rt}, dekat surau', berfoto: true,
  },
  {
    kategori: 'Infrastruktur', judul: 'Lampu jalan mati di RT {rt}',
    cerita: 'Dua lampu jalan tenaga surya di ujung gang sudah tiga malam tidak menyala. Jalan jadi gelap; ibu-ibu takut pulang dari pengajian.',
    balasan: 'Laporan kami terima. Teknisi penyedia lampu sudah kami hubungi untuk memeriksa baterainya paling lambat Kamis.',
    terimaKasih: 'Lampunya sudah menyala lagi. Terima kasih.', lokasi: 'Ujung gang RT {rt}', berfoto: true,
  },
  {
    kategori: 'Lingkungan', judul: 'Air pasang meluap dari parit',
    cerita: 'Setiap air pasang besar, parit di belakang rumah meluap ke halaman karena tersumbat sampah dan eceng gondok.',
    balasan: 'Pembersihan parit kami masukkan ke gotong royong hari Minggu. Mohon bantu sampaikan ke tetangga sekitar.',
    terimaKasih: 'Paritnya sudah bersih, air pasang kemarin tidak meluap lagi. Terima kasih.', lokasi: 'Parit belakang rumah warga RT {rt}',
    berfoto: true,
  },
  {
    kategori: 'Lingkungan', judul: 'Sampah menumpuk di tepi sungai',
    cerita: 'Ada yang membuang sampah rumah tangga di tepi sungai dekat pelantar. Baunya sampai ke rumah dan banyak lalat.',
    balasan: 'Papan larangan akan dipasang di lokasi, dan tumpukan sampahnya diangkut bersama petugas kebersihan desa pekan ini.',
    terimaKasih: null, lokasi: 'Tepi sungai dekat pelantar RT {rt}', berfoto: true,
  },
  {
    kategori: 'Pelayanan', judul: 'Lama menunggu surat di kantor desa',
    cerita: 'Kemarin saya menunggu hampir dua jam untuk surat keterangan usaha karena petugasnya sedang rapat.',
    balasan: 'Mohon maaf atas ketidaknyamanannya. Mulai pekan ini loket surat tetap dibuka saat ada rapat, dan surat juga bisa diajukan dari HP lewat layanan warga.',
    terimaKasih: 'Baik, terima kasih penjelasannya.', lokasi: null, berfoto: false,
  },
  {
    kategori: 'Bantuan sosial', judul: 'BLT tahap kemarin belum kami terima',
    cerita: 'Nama suami saya ada di daftar penerima BLT, tetapi pencairan tahap kemarin belum kami terima. Mohon dicek.',
    balasan: 'Sudah kami cek: pencairannya tertahan karena data KTP-el belum padan. Silakan datang ke kantor desa pada hari kerja dengan membawa KK dan KTP-el.',
    terimaKasih: 'Sudah diurus di kantor desa. Terima kasih.', lokasi: null, berfoto: false,
  },
  {
    kategori: 'Bantuan sosial', judul: 'Lansia tinggal sendiri belum dapat bantuan',
    cerita: 'Nenek di sebelah rumah tinggal sendiri dan tidak punya penghasilan, tetapi belum pernah menerima bantuan apa pun.',
    balasan: 'Terima kasih sudah peduli. Beliau kami usulkan dalam musyawarah desa pemutakhiran DTSEN bulan depan.',
    terimaKasih: null, lokasi: null, berfoto: false,
  },
  {
    kategori: 'Keamanan', judul: 'Mesin pompa air hilang di kebun',
    cerita: 'Mesin pompa air di kebun kami hilang semalam. Sudah dua kebun di RT {rt} yang kehilangan bulan ini.',
    balasan: 'Laporan sudah kami teruskan ke Bhabinkamtibmas dan Linmas. Ronda malam di RT {rt} diaktifkan lagi mulai pekan ini.',
    terimaKasih: null, lokasi: 'Kebun warga RT {rt}', berfoto: false,
  },
  {
    kategori: 'Keamanan', judul: 'Balap liar di jalan poros',
    cerita: 'Hampir tiap malam Minggu ada balap liar di jalan poros desa. Berisik dan membahayakan anak-anak.',
    balasan: 'Linmas akan berjaga di simpang jalan poros setiap malam Minggu, dan orang tua para pemuda kami undang bicara.',
    terimaKasih: 'Malam Minggu kemarin sudah sepi. Terima kasih.', lokasi: 'Jalan poros desa', berfoto: false,
  },
  {
    kategori: 'Infrastruktur', judul: 'Papan titian lapuk dan patah',
    cerita: 'Beberapa papan titian penghubung sudah lapuk dan ada yang patah. Anak sekolah lewat situ setiap hari.',
    balasan: 'Papan yang patah diganti swadaya Sabtu ini. Perbaikan titian secara menyeluruh sudah masuk kegiatan pembangunan tahun ini.',
    terimaKasih: 'Papannya sudah diganti. Terima kasih.', lokasi: 'Titian penghubung dekat RT {rt}', berfoto: true,
  },
  {
    kategori: 'Lainnya', judul: 'Usul jadwal angkut sampah',
    cerita: 'Bisakah desa mengatur jadwal pengangkutan sampah dua kali seminggu? Banyak warga bingung harus membuang sampah ke mana.',
    balasan: 'Usulan yang baik. Kami bahas bersama BUMDes dan BPD; hasilnya diumumkan di website desa.',
    terimaKasih: null, lokasi: null, berfoto: false,
  },
  {
    kategori: 'Lingkungan', judul: 'Asap pembakaran lahan masuk rumah',
    cerita: 'Ada pembakaran lahan di belakang kebun, asapnya masuk ke rumah. Anak saya batuk-batuk sejak kemarin.',
    balasan: 'Pemilik lahan sudah kami tegur bersama Babinsa dan apinya sudah dipadamkan. Bila anak masih batuk, silakan periksa ke pustu.',
    terimaKasih: 'Asapnya sudah hilang. Terima kasih atas bantuannya.', lokasi: 'Lahan belakang kebun RT {rt}', berfoto: true,
  },
  {
    kategori: 'Pelayanan', judul: 'Kartu keluarga belum diperbarui',
    cerita: 'Anak kedua kami sudah lahir tiga bulan, tetapi KK kami belum diperbarui.',
    balasan: 'Silakan datang membawa surat keterangan lahir dari bidan. Kelahirannya kami catat dan pengantar KK baru langsung kami buatkan.',
    terimaKasih: 'Sudah selesai diurus. Terima kasih.', lokasi: null, berfoto: false,
  },
  {
    kategori: 'Infrastruktur', judul: 'Sumur bor airnya keruh',
    cerita: 'Sumur bor bantuan di RT {rt} airnya keruh dan kadang tidak keluar sama sekali.',
    balasan: 'Penyedia sumur bor sudah kami hubungi untuk membersihkan pipa dan saringannya pekan ini.',
    terimaKasih: 'Airnya sudah jernih lagi. Terima kasih.', lokasi: 'Sumur bor RT {rt}', berfoto: true,
  },
]
const JALAN = 0
const LAMPU = 1
const PARIT = 2

/** Persona demo hanya muncul di pengaduan yang ditetapkan, supaya alur demo dan layanan warga dapat diprediksi. */
const PERSONA_PELAPOR = new Set(['pdk_siti_rahmah', 'pdk_zulkifli'])

const MENIT_MS = 60_000
const JAM_MS = 60 * MENIT_MS
const HARI_MS = 24 * JAM_MS
/** Kejadian hari ini paling awal pukul 07.30 WIB (SPEC §12.7). */
const AWAL_HARI_INI = 7 * 60 + 30

type Rencana = { status: StatusPengaduan; masuk: number; templat: number; pelaporId: string | null; dusunNomor: number | null }

/** Nama berkas foto dari kamera HP, mis. "IMG_20260923_0712.jpg". */
const namaFoto = (waktu: string) => `IMG_${waktu.slice(0, 10).replaceAll('-', '')}_${waktu.slice(11, 16).replace(':', '')}.jpg`

/**
 * 30 pengaduan dalam 6 bulan (SPEC §12.6): Baru 2, Ditanggapi 3, Selesai 25. Pengaduan Baru dan pengaduan Siti Rahmah
 * ditetapkan untuk alur demo; sisanya acak dari daftar topik.
 */
export function bangkitkanPengaduan(acak: Acak, o: Opsi): { pengaduan: Pengaduan[]; aktivitas: Aktivitas[] } {
  const t = o.acuan.getTime()
  const indeks = new Map(o.penduduk.map((p) => [p.id, p]))
  const dusunDesa = o.dusun.filter((d) => d.desaId === o.desaId)
  const dewasa = (dusunId: string) =>
    o.penduduk.filter(
      (p) =>
        p.desaId === o.desaId && p.dusunId === dusunId && p.statusDasar === 'Hidup' && !PERSONA_PELAPOR.has(p.id) &&
        hitungUmur(p.tanggalLahir, o.acuan).tahun >= 17,
    )
  const petugas = o.pengguna.filter((p) => p.desaId === o.desaId && p.aktif && boleh(p.peran, 'pengaduan.tanggapi'))
  const operator = petugas.find((p) => p.peran === 'operator')
  const sekdes = petugas.find((p) => p.peran === 'sekdes')
  if (!operator || !sekdes) throw new Error('Operator dan Sekdes demo wajib ada')
  // Kepala Dusun ikut membalas pengaduan dusunnya; selebihnya Operator, kadang Sekdes.
  const pembalas = (dusunId: string): Pengguna => {
    const kadus = petugas.find((p) => p.peran === 'kadus' && p.dusunId === dusunId)
    if (kadus && acak.peluang(0.5)) return kadus
    return acak.peluang(0.7) ? operator : sekdes
  }
  const topik = () => acak.bulat(0, TEMPLAT.length - 1)
  const lalu = (jam: number) => t - jam * JAM_MS - acak.bulat(0, 50) * MENIT_MS
  // SPEC §12.7: kejadian hari ini hanya 07.30 sampai 5 menit sebelum sekarang. Bila rentang itu belum ada, pengaduan
  // terbaru masuk kemarin malam. Pengaduan Zulkifli masuk kemarin 10.10–10.50, sekitar 22 jam sebelum demo pukul 09.00.
  const tengahMalam = Date.parse(`${tanggalIsoWib(o.acuan)}T00:00:00+07:00`)
  const batasMenit = Math.floor((t - tengahMalam) / MENIT_MS) - 5
  const masukTerbaru =
    batasMenit >= AWAL_HARI_INI
      ? tengahMalam + acak.bulat(AWAL_HARI_INI, batasMenit) * MENIT_MS
      : tengahMalam - HARI_MS + acak.bulat(19 * 60, 21 * 60) * MENIT_MS
  const rencana: Rencana[] = [
    { status: 'baru', masuk: masukTerbaru, templat: LAMPU, pelaporId: null, dusunNomor: 2 },
    { status: 'baru', masuk: tengahMalam - HARI_MS + acak.bulat(610, 650) * MENIT_MS, templat: JALAN, pelaporId: 'pdk_zulkifli', dusunNomor: null },
    { status: 'selesai', masuk: lalu(40 * 24), templat: PARIT, pelaporId: 'pdk_siti_rahmah', dusunNomor: null },
    ...Array.from({ length: 3 }, (): Rencana => ({
      status: 'ditanggapi', masuk: lalu(acak.bulat(2, 10) * 24 + acak.bulat(0, 8)), templat: topik(), pelaporId: null, dusunNomor: null,
    })),
    ...Array.from({ length: 24 }, (): Rencana => ({
      status: 'selesai', masuk: lalu(acak.bulat(12, 180) * 24 + acak.bulat(0, 8)), templat: topik(), pelaporId: null, dusunNomor: null,
    })),
  ]

  const daftar = rencana.map((r): Pengaduan => {
    const tpl = TEMPLAT[r.templat]
    const dusun = r.dusunNomor ? dusunDesa.find((d) => d.nomor === r.dusunNomor) : acak.pilih(dusunDesa)
    const pelapor = r.pelaporId ? indeks.get(r.pelaporId) : dusun && acak.pilih(dewasa(dusun.id))
    if (!pelapor) throw new Error('Pelapor pengaduan tidak ditemukan')
    const isi = (s: string) => s.replaceAll('{rt}', pelapor.rt)
    const masuk = r.masuk
    const masukPada = waktuIsoWib(new Date(masuk))
    const percakapan: EntriPengaduan[] = [
      {
        jenis: 'warga', id: acak.id('pes'), waktu: masukPada, isi: isi(tpl.cerita),
        foto: tpl.berfoto && acak.peluang(0.6) ? { berkas: namaFoto(masukPada), ukuranKb: acak.bulat(280, 950) } : null,
      },
    ]
    let tanggapanPertamaPada: string | null = null
    let selesaiPada: string | null = null
    if (r.status !== 'baru') {
      // Tanggapan pertama umumnya beberapa jam setelah masuk, sesekali lebih dari sehari.
      const jeda = [acak.bulat(1, 3), acak.bulat(4, 10), acak.bulat(11, 30)][acak.berbobot([[0, 4], [1, 4], [2, 2]])]
      const ditanggapi = Math.min(masuk + jeda * JAM_MS + acak.bulat(0, 50) * MENIT_MS, t - JAM_MS)
      tanggapanPertamaPada = waktuIsoWib(new Date(ditanggapi))
      const p = pembalas(pelapor.dusunId)
      const oleh = { id: p.id, nama: p.nama }
      percakapan.push({ jenis: 'desa', id: acak.id('pes'), waktu: tanggapanPertamaPada, isi: isi(tpl.balasan), oleh, jabatan: p.jabatan })
      if (r.status === 'selesai') {
        let akhir = ditanggapi
        if (tpl.terimaKasih && acak.peluang(0.6)) {
          akhir = Math.min(ditanggapi + acak.bulat(2, 48) * JAM_MS, t - JAM_MS)
          percakapan.push({ jenis: 'warga', id: acak.id('pes'), waktu: waktuIsoWib(new Date(akhir)), isi: tpl.terimaKasih, foto: null })
        }
        selesaiPada = waktuIsoWib(new Date(Math.min(akhir + acak.bulat(1, 24) * JAM_MS, t - JAM_MS)))
        percakapan.push({ jenis: 'status', id: acak.id('pes'), waktu: selesaiPada, status: 'selesai', oleh })
      }
    }
    return {
      id: acak.id('adu'), desaId: o.desaId, dusunId: pelapor.dusunId, nomor: '', judul: isi(tpl.judul), kategori: tpl.kategori,
      pelapor: { pendudukId: pelapor.id, nama: pelapor.nama }, lokasi: tpl.lokasi ? isi(tpl.lokasi) : null, masukPada,
      status: r.status, tanggapanPertamaPada, selesaiPada, percakapan,
    }
  })

  // Nomor urut per tahun menurut waktu masuk: ADU-2026-001, ADU-2026-002, …
  const pengaduan = daftar.sort((a, b) => a.masukPada.localeCompare(b.masukPada))
  const urutTahun = new Map<string, number>()
  for (const a of pengaduan) {
    const tahun = a.masukPada.slice(0, 4)
    const urut = (urutTahun.get(tahun) ?? 0) + 1
    urutTahun.set(tahun, urut)
    a.nomor = `ADU-${tahun}-${String(urut).padStart(3, '0')}`
  }
  const aktivitas = pengaduan.map(
    (a): Aktivitas => ({
      id: acak.id('akt'), desaId: a.desaId, dusunId: a.dusunId, waktu: a.masukPada, jenis: 'pengaduan-masuk',
      ringkasan: `Pengaduan masuk · ${a.judul} (${a.pelapor.nama})`, oleh: null, rujukan: { jenis: 'pengaduan', id: a.id },
    }),
  )
  return { pengaduan, aktivitas }
}
