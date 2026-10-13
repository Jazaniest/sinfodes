import { waktuIsoWib } from '@/domain/format/tanggal'
import { DESA_DEMO, DUSUN_DEMO, ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from '../data/desa-demo'
import { AKUN_WARGA_DEMO } from '../data/warga-demo'
import { buatAcak } from '../prng'
import { VERSI_DATA, type DbDemo } from '../tipe-db'
import { katalogDesaBaru } from '@/domain/surat/bawaan'
import { pengaturanBawaan } from '@/domain/surat/pengaturan'
import { bangkitkanSuratMasuk } from './arsip'
import { bangkitkanAset } from './aset'
import { bangkitkanBansos } from './bansos'
import { bangkitkanKesehatan } from './kesehatan'
import { bangkitkanKonsol, bangkitkanRiwayatMasuk } from './konsol'
import { bangkitkanKeuangan } from './keuangan'
import { bangkitkanLaporan } from './laporan'
import { bangkitkanLembaga } from './lembaga'
import { bangkitkanMutasi } from './mutasi'
import { bangkitkanNotifikasi } from './notifikasi'
import { bangkitkanPembangunan } from './pembangunan'
import { bangkitkanPengaduan } from './pengaduan'
import { bangkitkanPenduduk } from './penduduk'
import { bangkitkanPeta } from './peta'
import { bangkitkanSurat } from './surat'
import { bangkitkanWebsite } from './website'

export const SEED_DEMO = 20260924

export function bangkitkanDb(sekarang: Date): DbDemo {
  const dasar = bangkitkanPenduduk(buatAcak(SEED_DEMO), {
    desaId: ID_SUNGAI_SIALANG,
    dusun: DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG),
    acuan: sekarang,
  })
  // Aliran acak terpisah: penduduk dasar tetap identik dengan Tahap 1.
  const hasil = bangkitkanMutasi(buatAcak(SEED_DEMO + 1), {
    desaId: ID_SUNGAI_SIALANG,
    penduduk: dasar.penduduk,
    keluarga: dasar.keluarga,
    pengguna: PENGGUNA_DEMO,
    acuan: sekarang,
  })
  const desaDemo = DESA_DEMO.find((d) => d.id === ID_SUNGAI_SIALANG)
  if (!desaDemo) throw new Error('Desa demo tidak ada')
  // Aliran acak ketiga: penduduk dan mutasi tetap identik dengan tahap sebelumnya.
  const surat = bangkitkanSurat(buatAcak(SEED_DEMO + 2), {
    desa: desaDemo,
    dusun: DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG),
    penduduk: hasil.penduduk,
    mutasi: hasil.mutasi,
    pengguna: PENGGUNA_DEMO,
    acuan: sekarang,
  })
  // Aliran acak keempat dan kelima: data tahap sebelumnya tetap identik.
  const laporanData = bangkitkanLaporan({ desaId: ID_SUNGAI_SIALANG, penduduk: hasil.penduduk, acuan: sekarang })
  const suratMasuk = bangkitkanSuratMasuk(buatAcak(SEED_DEMO + 3), {
    desaId: ID_SUNGAI_SIALANG,
    namaDesa: desaDemo.nama,
    pengguna: PENGGUNA_DEMO,
    acuan: sekarang,
  })
  // Aliran acak keenam: data tahap sebelumnya tetap identik.
  const pengaduan = bangkitkanPengaduan(buatAcak(SEED_DEMO + 5), {
    desaId: ID_SUNGAI_SIALANG,
    dusun: DUSUN_DEMO,
    penduduk: hasil.penduduk,
    pengguna: PENGGUNA_DEMO,
    acuan: sekarang,
  })
  const notifikasi = bangkitkanNotifikasi(buatAcak(SEED_DEMO + 4), {
    desaId: ID_SUNGAI_SIALANG,
    pengguna: PENGGUNA_DEMO,
    penduduk: hasil.penduduk,
    jenisSurat: surat.jenisSurat,
    permohonan: surat.permohonan,
    laporanData,
    pengaduan: pengaduan.pengaduan,
    acuan: sekarang,
  })
  // Aliran acak ketujuh dan kedelapan.
  const bansos = bangkitkanBansos(buatAcak(SEED_DEMO + 6), {
    desa: desaDemo,
    penduduk: hasil.penduduk,
    keluarga: hasil.keluarga,
    mutasi: hasil.mutasi,
    acuan: sekarang,
  })
  const kesehatan = bangkitkanKesehatan(buatAcak(SEED_DEMO + 7), {
    desa: desaDemo,
    dusun: DUSUN_DEMO,
    penduduk: hasil.penduduk,
    acuan: sekarang,
  })
  // Tanpa PRNG: geometri dan kegiatan pembangunan tetap.
  const peta = bangkitkanPeta({ desa: desaDemo, dusun: DUSUN_DEMO })
  const pembangunan = bangkitkanPembangunan({ desa: desaDemo, dusun: DUSUN_DEMO, acuan: sekarang })
  const apbdes = bangkitkanKeuangan({ desa: desaDemo, rincianPembangunan: pembangunan.rincian, acuan: sekarang })
  const aset = bangkitkanAset({ desa: desaDemo })
  // Aliran acak kesembilan.
  const pengurusLembaga = bangkitkanLembaga(buatAcak(SEED_DEMO + 8), {
    desa: desaDemo,
    dusun: DUSUN_DEMO,
    penduduk: hasil.penduduk,
    pengguna: PENGGUNA_DEMO,
    acuan: sekarang,
  })
  // Tanpa PRNG: isi website tetap (SPEC §12.6).
  const website = bangkitkanWebsite({ desa: desaDemo, dusun: DUSUN_DEMO, pengguna: PENGGUNA_DEMO, acuan: sekarang })
  // Aliran acak kesepuluh sampai ketiga belas: data Konsol, riwayat masuk panel, angka Pemantauan, dan Sekretaris Desa desa fiktif (SPEC §11).
  const konsol = bangkitkanKonsol(buatAcak(SEED_DEMO + 9), {
    acuan: sekarang,
    desaPanel: DESA_DEMO,
    acakPemantauan: buatAcak(SEED_DEMO + 11),
    acakKontak: buatAcak(SEED_DEMO + 12),
  })
  const riwayatMasuk = bangkitkanRiwayatMasuk(buatAcak(SEED_DEMO + 10), {
    pengguna: PENGGUNA_DEMO.filter((p) => p.desaId === ID_SUNGAI_SIALANG),
    acuan: sekarang,
  })
  return {
    versiData: VERSI_DATA,
    tanggalAcuan: waktuIsoWib(sekarang),
    desa: [...structuredClone(DESA_DEMO), ...konsol.desa],
    dusun: structuredClone(DUSUN_DEMO),
    pengguna: structuredClone(PENGGUNA_DEMO),
    ...hasil,
    aktivitas: [...hasil.aktivitas, ...surat.aktivitas, ...pengaduan.aktivitas],
    laporanData,
    impor: [],
    // Desa berstatus Persiapan (Tanjung Lamo) memulai dengan katalog bawaan yang belum dilayani (tahap 6C).
    jenisSurat: [...surat.jenisSurat, ...DESA_DEMO.filter((d) => d.status === 'Persiapan').flatMap((d) => katalogDesaBaru(d))],
    permohonan: surat.permohonan,
    pengaturanSurat: DESA_DEMO.map((d) => pengaturanBawaan(d.id)),
    suratMasuk,
    notifikasi,
    pengaduan: pengaduan.pengaduan,
    programBansos: bansos.program,
    penerimaBansos: bansos.penerima,
    posyandu: kesehatan.posyandu,
    pengukuranBalita: kesehatan.pengukuranBalita,
    peta: [peta],
    kegiatan: pembangunan.kegiatan,
    apbdes: [apbdes],
    aset,
    pengurusLembaga,
    artikel: website.artikel,
    pengumuman: website.pengumuman,
    agenda: website.agenda,
    galeri: website.galeri,
    tampilanWebsite: [website.tampilan],
    profilDesa: [website.profil],
    potensi: website.potensi,
    umkm: website.umkm,
    // Tanpa PRNG: data tahap sebelumnya tetap identik.
    akunWarga: AKUN_WARGA_DEMO.map(({ pendudukId, desaId, pin, whatsapp }) => ({ pendudukId, desaId, pin, whatsapp })),
    percobaanMasukWarga: [],
    kirimanWarga: [],
    percobaanVerifikasi: [],
    penggunaKonsol: konsol.penggunaKonsol,
    langganan: konsol.langganan,
    rekamDesa: konsol.rekam,
    riwayatMasuk,
  }
}
