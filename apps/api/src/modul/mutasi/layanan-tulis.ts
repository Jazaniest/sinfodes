import { randomUUID } from 'node:crypto'
import { formatTanggal, tanggalIsoWib, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import {
  hasilMutasiSchema, hubunganBayi, masukanDatangSchema, masukanLahirSchema, masukanMeninggalSchema, masukanPindahSchema, type HasilMutasi,
} from '@sinfodes/kontrak/mutasi/masukan'
import { mutasiSchema, type Mutasi } from '@sinfodes/kontrak/mutasi/schema'
import type { HubunganKeluarga } from '@sinfodes/kontrak/penduduk/enum'
import { periksaNik } from '@sinfodes/kontrak/penduduk/nik'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { daftarDusunDesa } from '../../basisdata/desa'
import { pelanggaranUnik } from '../../basisdata/galat-pg'
import { GalatApp } from '../../galat'
import { galatField, galatIsian } from '../../galat-isian'
import { ruang } from '../../kripto/ruang'
import { catatAktivitas, pelakuKontrak } from '../../riwayat/catat'
import { nomorKkBaru } from '../keluarga/nomor'
import { bacaAnggotaHidup } from '../keluarga/repositori'
import { wilayahSah } from '../keluarga/wilayah-sah'
import { kunciLaporan, tandaiLaporan } from '../laporan/repositori'
import { bentukPenduduk } from '../penduduk/layanan'
import { pesanNikGanda, type KonteksTulis } from '../penduduk/layanan-tulis'
import { bacaPendudukSatu, type RekamKeluarga, type RekamPenduduk } from '../penduduk/repositori'
import {
  cariPemilikNik, INDEKS_KK, INDEKS_NIK, kunciKeluarga, perbaruiPenduduk, sisipKeluarga, sisipPenduduk, urutanBerikutnya,
} from '../penduduk/repositori-tulis'
import type { EfekSilang } from './efek-silang'
import { keluarkanDariKk, periksaPengganti } from './operasi-kk'
import { bentukMutasi } from './layanan'
import { bacaMutasiSatu } from './repositori'
import { simpanMutasi } from './repositori-tulis'

export type KonteksMutasiTulis = KonteksTulis & { efek: EfekSilang }

const LAPORAN_SUDAH_DITANGANI = 'Laporan kelahiran ini sudah ditangani.'
const pesanSudahStatus = (nama: string, status: string): string => `${nama} sudah berstatus ${status}`

/**
 * Mencatat kelahiran: bayi tanpa NIK masuk ke KK ibunya (di urutan terakhir) dengan hubungan menurut hubungan ibu. Laporan
 * kelahiran dari warga (bila ada) dikunci lebih dulu, lalu KK ibu; keduanya sampai transaksi selesai.
 */
export async function catatLahir(k: KonteksMutasiTulis, mentah: unknown): Promise<HasilMutasi> {
  const isian = masukanLahirSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const m = isian.data
  const b = m.bayi
  const dusunSaja = cakupanDusun(k.pelaku)

  const laporan = m.laporanId ? await kunciLaporan(k.db, m.laporanId, dusunSaja) : undefined
  if (m.laporanId) {
    if (!laporan || (laporan.isi as { jenis?: string }).jenis !== 'kelahiran') throw galatField('laporanId', 'Laporan kelahiran tidak ditemukan')
    if (laporan.status !== 'baru') throw new GalatApp('CONFLICT', LAPORAN_SUDAH_DITANGANI, 409)
  }

  // KK ibu dikunci lebih dulu, lalu ibu dibaca ulang: statusnya bisa berubah sementara menunggu kunci.
  const ibuAwal = await bacaPendudukSatu(k.db, m.ibuId, dusunSaja)
  const kk = ibuAwal ? await kunciKeluarga(k.db, ibuAwal.keluargaId, dusunSaja) : undefined
  const ibu = kk ? await bacaPendudukSatu(k.db, m.ibuId, dusunSaja) : ibuAwal
  if (!ibu || ibu.jenisKelamin !== 'P' || ibu.statusDasar !== 'Hidup') throw galatField('ibuId', 'Pilih ibu: penduduk perempuan yang masih hidup')
  const ayah = m.ayahId === null ? null : await bacaPendudukSatu(k.db, m.ayahId, dusunSaja)
  if (ayah === undefined || (ayah !== null && (ayah.jenisKelamin !== 'L' || ayah.statusDasar !== 'Hidup'))) {
    throw galatField('ayahId', 'Pilih ayah: penduduk laki-laki yang masih hidup')
  }
  if (b.tanggalLahir > tanggalIsoWib(k.sekarang)) throw galatField('bayi.tanggalLahir', 'Tanggal lahir tidak boleh setelah hari ini')
  if (!kk) throw galatField('ibuId', 'KK ibu tidak ditemukan')

  const waktu = waktuIsoWib(k.sekarang)
  const oleh = pelakuKontrak(k.pelaku)
  const bayi = await sisipPenduduk(k.db, {
    id: `pdk_${randomUUID()}`,
    desaId: k.desa.id,
    nikSandi: null,
    nikIndeks: null,
    nama: b.nama,
    jenisKelamin: b.jenisKelamin,
    golonganDarah: 'Tidak Tahu',
    agama: ibu.agama,
    kewarganegaraan: 'WNI',
    tempatLahir: b.tempatLahir,
    tanggalLahir: b.tanggalLahir,
    nomorAktaLahir: null,
    keluargaId: kk.id,
    hubunganKeluarga: hubunganBayi(ibu.hubunganKeluarga as HubunganKeluarga),
    namaAyah: ayah?.nama ?? '',
    namaIbu: ibu.nama,
    dusunId: kk.dusunId,
    rw: kk.rw,
    rt: kk.rt,
    pendidikan: 'Tidak/Belum Sekolah',
    pekerjaan: 'Belum/Tidak Bekerja',
    statusPerkawinan: 'Belum Kawin',
    statusDasar: 'Hidup',
    statusPenduduk: 'Tetap',
    ktpEl: 'Belum wajib',
    teleponSandi: null,
    catatan: null,
    urutanKk: await urutanBerikutnya(k.db, kk.id),
    dibuatPada: new Date(waktu),
    diubahPada: new Date(waktu),
  })
  const mutasi: Mutasi = mutasiSchema.parse({
    id: `mts_${randomUUID()}`,
    desaId: k.desa.id,
    jenis: 'lahir',
    tanggal: b.tanggalLahir,
    pendudukIds: [bayi.id],
    dicatatOleh: oleh,
    dicatatPada: waktu,
    rincian: {
      jam: b.jam, tempatDilahirkan: b.tempatDilahirkan, tempatLahir: b.tempatLahir, jenisKelahiran: b.jenisKelahiran, anakKe: b.anakKe,
      penolong: b.penolong, beratGram: b.beratGram, panjangCm: b.panjangCm, ibuId: ibu.id, ayahId: ayah?.id ?? null, pelapor: m.pelapor,
    },
  })
  await simpanMutasi(k.db, mutasi)
  if (laporan) await tandaiLaporan(k.db, laporan.id, { status: 'diterapkan', olehId: oleh.id, olehNama: oleh.nama, pada: new Date(waktu), alasan: null })
  await catatAktivitas(k.db, {
    desaId: bayi.desaId, dusunId: bayi.dusunId, waktu, jenis: 'mutasi-lahir', ringkasan: `Kelahiran dicatat · ${bayi.nama}`, oleh, rujukan: { jenis: 'penduduk', id: bayi.id },
  })
  return hasilMutasiSchema.parse({ mutasi, penduduk: [bentukPenduduk(bayi, k.penyandi)] })
}

/**
 * Mencatat kematian: status penduduk menjadi Meninggal dan ia keluar dari KK-nya (tidak lagi anggota Hidup). Kepala keluarga yang
 * meninggal wajib diganti anggota yang tinggal. Penerima bansos atas namanya ditandai lewat efek silang. KK dikunci lebih dulu,
 * lalu statusnya dibaca ulang, jadi dua petugas pada orang yang sama berurutan dan yang kedua ditolak.
 */
export async function catatMeninggal(k: KonteksMutasiTulis, mentah: unknown): Promise<HasilMutasi> {
  const isian = masukanMeninggalSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const m = isian.data
  const dusunSaja = cakupanDusun(k.pelaku)

  const awal = await bacaPendudukSatu(k.db, m.pendudukId, dusunSaja)
  if (!awal) throw galatField('pendudukId', 'Penduduk tidak ditemukan')
  const kk = await kunciKeluarga(k.db, awal.keluargaId, dusunSaja)
  const p = (await bacaPendudukSatu(k.db, m.pendudukId, dusunSaja)) ?? awal
  if (p.statusDasar !== 'Hidup') throw galatField('pendudukId', pesanSudahStatus(p.nama, p.statusDasar))
  if (m.tanggal > tanggalIsoWib(k.sekarang) || m.tanggal < p.tanggalLahir) throw galatField('tanggal', 'Tanggal meninggal harus antara tanggal lahir dan hari ini')
  const anggota = kk ? await bacaAnggotaHidup(k.db, kk.id, dusunSaja) : []
  const salah = kk ? periksaPengganti(anggota, kk.kepalaKeluargaId, [p.id], m.penggantiKepalaId) : null
  if (salah) throw galatField('penggantiKepalaId', salah)

  const waktu = waktuIsoWib(k.sekarang)
  const oleh = pelakuKontrak(k.pelaku)
  const mati = await perbaruiPenduduk(k.db, p.id, { statusDasar: 'Meninggal', diubahPada: new Date(waktu) })
  if (kk) await keluarkanDariKk(k, kk, anggota, [p.id], m.penggantiKepalaId)
  const mutasi: Mutasi = mutasiSchema.parse({
    id: `mts_${randomUUID()}`,
    desaId: k.desa.id,
    jenis: 'meninggal',
    tanggal: m.tanggal,
    pendudukIds: [p.id],
    dicatatOleh: oleh,
    dicatatPada: waktu,
    rincian: { jam: m.jam, tempat: m.tempat, sebab: m.sebab, yangMenerangkan: m.yangMenerangkan, pelapor: m.pelapor },
  })
  await simpanMutasi(k.db, mutasi)
  await k.efek.tandaiPenerimaDitinjau(k.db, [p.id], `Penerima meninggal dunia pada ${formatTanggal(m.tanggal)}`, waktu)
  await catatAktivitas(k.db, {
    desaId: p.desaId, dusunId: p.dusunId, waktu, jenis: 'mutasi-meninggal', ringkasan: `Kematian dicatat · ${p.nama}`, oleh, rujukan: { jenis: 'penduduk', id: p.id },
  })
  return hasilMutasiSchema.parse({ mutasi, penduduk: [bentukPenduduk(mati, k.penyandi)] })
}

/**
 * Mencatat kepindahan keluar desa satu orang atau beberapa anggota dari KK yang sama: status menjadi Pindah dan mereka keluar
 * dari KK. Kepala yang pindah wajib diganti anggota yang tinggal. Urutan pemeriksaan mengikuti API tiruan; KK dikunci sebelum
 * status dibaca ulang.
 */
export async function catatPindah(k: KonteksMutasiTulis, mentah: unknown): Promise<HasilMutasi> {
  const isian = masukanPindahSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const m = isian.data
  const dusunSaja = cakupanDusun(k.pelaku)
  const ids = [...new Set(m.pendudukIds)]

  const awal: RekamPenduduk[] = []
  for (const id of ids) {
    const p = await bacaPendudukSatu(k.db, id, dusunSaja)
    if (p) awal.push(p)
  }
  if (awal.length !== ids.length) throw galatField('pendudukIds', 'Penduduk tidak ditemukan')
  const idKk = [...new Set(awal.map((p) => p.keluargaId))]
  // Hanya satu KK yang dikunci; lintas KK ditolak di bawah, jadi tidak ada penulisan yang perlu dikunci.
  const kk = idKk.length === 1 ? await kunciKeluarga(k.db, idKk[0], dusunSaja) : undefined
  const orang: RekamPenduduk[] = []
  for (const p of awal) orang.push(kk ? ((await bacaPendudukSatu(k.db, p.id, dusunSaja)) ?? p) : p)

  const bukanHidup = orang.find((p) => p.statusDasar !== 'Hidup')
  if (bukanHidup) throw galatField('pendudukIds', pesanSudahStatus(bukanHidup.nama, bukanHidup.statusDasar))
  if (idKk.length > 1) throw galatField('pendudukIds', 'Penduduk yang pindah bersama harus dari KK yang sama')
  if (m.tanggal > tanggalIsoWib(k.sekarang)) throw galatField('tanggal', 'Tanggal pindah tidak boleh setelah hari ini')
  const anggota = kk ? await bacaAnggotaHidup(k.db, kk.id, dusunSaja) : []
  const salah = kk ? periksaPengganti(anggota, kk.kepalaKeluargaId, ids, m.penggantiKepalaId) : null
  if (salah) throw galatField('penggantiKepalaId', salah)

  const waktu = waktuIsoWib(k.sekarang)
  const oleh = pelakuKontrak(k.pelaku)
  const pergi: RekamPenduduk[] = []
  for (const p of orang) pergi.push(await perbaruiPenduduk(k.db, p.id, { statusDasar: 'Pindah', diubahPada: new Date(waktu) }))
  if (kk) await keluarkanDariKk(k, kk, anggota, ids, m.penggantiKepalaId)
  const mutasi: Mutasi = mutasiSchema.parse({
    id: `mts_${randomUUID()}`,
    desaId: k.desa.id,
    jenis: 'pindah',
    tanggal: m.tanggal,
    pendudukIds: ids,
    dicatatOleh: oleh,
    dicatatPada: waktu,
    rincian: { tujuan: m.tujuan, alasan: m.alasan },
  })
  await simpanMutasi(k.db, mutasi)
  await k.efek.tandaiPenerimaDitinjau(k.db, ids, `Penerima pindah keluar desa pada ${formatTanggal(m.tanggal)}`, waktu)
  const [pertama] = orang
  await catatAktivitas(k.db, {
    desaId: pertama.desaId, dusunId: pertama.dusunId, waktu, jenis: 'mutasi-pindah',
    ringkasan: `Pindah keluar dicatat · ${pertama.nama}${orang.length > 1 ? ` (${orang.length} orang)` : ''} ke ${m.tujuan.kabupaten}`, oleh, rujukan: { jenis: 'penduduk', id: pertama.id },
  })
  return hasilMutasiSchema.parse({ mutasi, penduduk: pergi.map((p) => bentukPenduduk(p, k.penyandi)) })
}

/**
 * Mencatat kedatangan: pendatang masuk ke KK baru (tepat satu kepala, nomor KK baru hari ini) atau ke KK yang sudah ada (tanpa
 * kepala kedua). NIK asal dipakai dan unik per desa (rencana 8E2 Ruling 8). Anggota disisipkan satu per satu supaya tabrakan
 * indeks NIK dari permintaan serentak dapat dipetakan ke anggota yang bersangkutan (409, bukan 500).
 */
export async function catatDatang(k: KonteksMutasiTulis, mentah: unknown): Promise<HasilMutasi> {
  const isian = masukanDatangSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const m = isian.data
  const dusunSaja = cakupanDusun(k.pelaku)
  const hariIni = tanggalIsoWib(k.sekarang)
  if (m.tanggal > hariIni) throw galatField('tanggal', 'Tanggal datang tidak boleh setelah hari ini')
  for (const [i, a] of m.anggota.entries()) {
    const nik = periksaNik(a.nik, k.sekarang)
    if (nik.status !== 'valid') throw galatField(`anggota.${i}.nik`, nik.status === 'kosong' ? 'NIK wajib diisi' : nik.pesan)
    const pemilik = await cariPemilikNik(k.db, k.penyandi.indeks(a.nik, ruang.nik(k.desa.id)))
    if (pemilik) throw galatField(`anggota.${i}.nik`, pesanNikGanda(pemilik.nama), 'CONFLICT')
    if (m.anggota.findIndex((x) => x.nik === a.nik) !== i) throw galatField(`anggota.${i}.nik`, 'NIK ini sudah dipakai anggota lain di isian ini', 'CONFLICT')
    if (a.tanggalLahir > hariIni) throw galatField(`anggota.${i}.tanggalLahir`, 'Tanggal lahir tidak boleh setelah hari ini')
  }

  const jumlahKepala = m.anggota.filter((a) => a.hubunganKeluarga === 'Kepala Keluarga').length
  const idAnggota = m.anggota.map(() => `pdk_${randomUUID()}`)
  const iKepala = Math.max(0, m.anggota.findIndex((a) => a.hubunganKeluarga === 'Kepala Keluarga'))
  const urutan = [iKepala, ...m.anggota.map((_, i) => i).filter((i) => i !== iKepala)]
  let kk: Pick<RekamKeluarga, 'id' | 'dusunId' | 'rw' | 'rt'>
  let urutanAwal = 0
  if (m.keluarga.jenis === 'ada') {
    const ada = await kunciKeluarga(k.db, m.keluarga.id, dusunSaja)
    if (!ada || (await bacaAnggotaHidup(k.db, ada.id, dusunSaja)).length === 0) throw galatField('keluarga', 'KK tidak ditemukan')
    if (jumlahKepala > 0) throw galatField('anggota', 'KK tujuan sudah punya kepala keluarga')
    kk = ada
    urutanAwal = await urutanBerikutnya(k.db, ada.id)
  } else {
    if (jumlahKepala !== 1) throw galatField('anggota', 'KK baru harus punya tepat satu kepala keluarga')
    if (!wilayahSah(await daftarDusunDesa(k.db), m.keluarga.dusunId, m.keluarga.rw, m.keluarga.rt)) throw galatField('dusunId', 'Wilayah tidak dikenal')
    const nomor = await nomorKkBaru(k.db, k.desa, k.penyandi, k.sekarang)
    kk = { id: `kk_${randomUUID()}`, dusunId: m.keluarga.dusunId, rw: m.keluarga.rw, rt: m.keluarga.rt }
    try {
      // Kunci asing kepala keluarga ditunda sampai transaksi selesai, jadi KK boleh lebih dulu daripada kepalanya.
      await sisipKeluarga(k.db, {
        id: kk.id,
        desaId: k.desa.id,
        nomorKkSandi: k.penyandi.sandikan(nomor, ruang.nomorKk(k.desa.id)),
        nomorKkIndeks: k.penyandi.indeks(nomor, ruang.nomorKk(k.desa.id)),
        kepalaKeluargaId: idAnggota[iKepala],
        dusunId: kk.dusunId,
        rw: kk.rw,
        rt: kk.rt,
        tanggalTerbit: hariIni,
      })
    } catch (e) {
      if (pelanggaranUnik(e, INDEKS_KK)) throw new GalatApp('CONFLICT', 'Nomor KK baru bertabrakan. Ulangi permintaan.', 409)
      throw e
    }
  }

  const waktu = waktuIsoWib(k.sekarang)
  const oleh = pelakuKontrak(k.pelaku)
  const baru: RekamPenduduk[] = []
  for (const [posisi, i] of urutan.entries()) {
    const { nik, telepon, ...bio } = m.anggota[i]
    try {
      baru.push(
        await sisipPenduduk(k.db, {
          ...bio,
          id: idAnggota[i],
          desaId: k.desa.id,
          nikSandi: k.penyandi.sandikan(nik, ruang.nik(k.desa.id)),
          nikIndeks: k.penyandi.indeks(nik, ruang.nik(k.desa.id)),
          teleponSandi: telepon === null ? null : k.penyandi.sandikan(telepon, ruang.telepon(k.desa.id)),
          keluargaId: kk.id,
          dusunId: kk.dusunId,
          rw: kk.rw,
          rt: kk.rt,
          statusDasar: 'Hidup',
          statusPenduduk: m.statusPenduduk,
          urutanKk: urutanAwal + posisi,
          dibuatPada: new Date(waktu),
          diubahPada: new Date(waktu),
        }),
      )
    } catch (e) {
      if (pelanggaranUnik(e, INDEKS_NIK)) throw galatField(`anggota.${i}.nik`, 'NIK sudah terdaftar', 'CONFLICT')
      throw e
    }
  }
  const kepala = baru[0]
  const mutasi: Mutasi = mutasiSchema.parse({
    id: `mts_${randomUUID()}`,
    desaId: k.desa.id,
    jenis: 'datang',
    tanggal: m.tanggal,
    pendudukIds: baru.map((p) => p.id),
    dicatatOleh: oleh,
    dicatatPada: waktu,
    rincian: { nomorSkpwni: m.nomorSkpwni, asal: m.asal, keluargaId: kk.id },
  })
  await simpanMutasi(k.db, mutasi)
  await catatAktivitas(k.db, {
    desaId: kepala.desaId, dusunId: kepala.dusunId, waktu, jenis: 'mutasi-datang', ringkasan: `Kedatangan dicatat · ${kepala.nama} (${baru.length} orang)`, oleh,
    rujukan: { jenis: 'penduduk', id: kepala.id },
  })
  return hasilMutasiSchema.parse({ mutasi, penduduk: baru.map((p) => bentukPenduduk(p, k.penyandi)) })
}

/**
 * Jawaban POST /mutasi/* bagi permintaan ulang berkunci idempotensi: dibentuk dari mutasi yang tersimpan dan keadaan terkini
 * penduduknya, jadi tidak ada salinan jawaban (NIK, telepon) yang disimpan di tempat lain.
 */
export async function pulihkanHasilMutasi(k: KonteksTulis, mutasiId: string): Promise<HasilMutasi> {
  const ditemukan = await bacaMutasiSatu(k.db, mutasiId)
  if (!ditemukan) throw new GalatApp('SERVER', 'Terjadi kesalahan pada server. Coba lagi beberapa saat.', 500)
  const penduduk = []
  for (const id of ditemukan.pendudukIds) {
    const p = await bacaPendudukSatu(k.db, id, null)
    if (p) penduduk.push(bentukPenduduk(p, k.penyandi))
  }
  return hasilMutasiSchema.parse({ mutasi: bentukMutasi(ditemukan.rekam, ditemukan.pendudukIds), penduduk })
}
