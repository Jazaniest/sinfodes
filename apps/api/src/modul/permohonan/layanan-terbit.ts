import { tanggalIsoWib, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { periksaIsian, type JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import { susunLembar } from '@sinfodes/kontrak/surat/lembar'
import { tandaTanganSchema, terbitSchema, type Terbit } from '@sinfodes/kontrak/surat/permohonan'
import { samaDenganSiap, tataLetakBerlaku } from '@sinfodes/kontrak/surat/tata-letak-siap'
import { berlakuSampai } from '@sinfodes/kontrak/surat/waktu'
import { catatAudit } from '../../audit'
import { bacaDesaTerbaru, daftarDusunDesa } from '../../basisdata/desa'
import { GalatApp } from '../../galat'
import { galatIsian } from '../../galat-isian'
import { ruang } from '../../kripto/ruang'
import { catatAktivitas, pelakuKontrak } from '../../riwayat/catat'
import { bentukMutasi } from '../mutasi/layanan'
import { bacaMutasiSatu } from '../mutasi/repositori'
import { periksaPassphrase } from '../passphrase/layanan'
import { bentukPenduduk } from '../penduduk/layanan'
import type { RekamPenduduk } from '../penduduk/repositori'
import { bacaPendudukSatu } from '../penduduk/repositori'
import { bacaPengaturanSurat } from '../pengaturan-surat/repositori'
import { PESAN_DATA_TIDAK_UTUH } from './bentuk'
import { hashDokumen } from './dokumen'
import type { KonteksAksi } from './layanan-tulis'
import { alokasiNomorTerbit, kodeVerifikasiBaru } from './nomor-terbit'
import type { RekamPermohonan } from './repositori'
import { ubahKolomPermohonan } from './repositori-tulis'
import { catatRiwayatSurat } from './riwayat-surat'

/**
 * Menerbitkan surat: tanda tangan Kepala Desa (atau Sekretaris Desa atas nama, bila jenisnya mengizinkan) dengan passphrase
 * (rencana 8F2b Tugas 6). Dipanggil `jalankanAksi` sesudah baris permohonan dikunci (FOR UPDATE) dan statusnya diperiksa, jadi
 * urutan kunci tetap: baris permohonan, kunci pengguna (passphrase), kunci nomor (desa, tahun). Urutan kerja: isian lengkap,
 * passphrase (salah/terkunci melempar GalatDisimpan SEBELUM tulis domain apa pun), nomor dan kode, lembar, tata letak dan kop
 * dibekukan dari desa saat itu, hash dan tanda tangan, satu UPDATE, lalu riwayat, aktivitas, jejak audit, dan efek.
 */
export async function terbitkanSurat(k: KonteksAksi, rekam: RekamPermohonan, jenis: JenisSurat, pemohon: RekamPenduduk, badan: unknown): Promise<void> {
  const masukan = tandaTanganSchema.safeParse(badan)
  if (!masukan.success) throw galatIsian(masukan.error)

  // Jenis suratnya bisa diubah sesudah diajukan (mis. isian wajib baru): surat tidak boleh terbit dengan isian kosong.
  const isian = JSON.parse(k.penyandi.bukaSandi(rekam.isianSandi, ruang.permohonanIsian(rekam.desaId))) as Record<string, string>
  const kurang = Object.values(periksaIsian(jenis, isian))
  if (kurang.length > 0) {
    throw new GalatApp('VALIDATION', `Isian surat belum lengkap (${kurang.join(', ')}). Kembalikan ke operator untuk dilengkapi.`, 422)
  }

  await periksaPassphrase({ db: k.db, penyandi: k.penyandi, pelaku: k.pelaku, sekarang: k.sekarang, permohonanId: rekam.id }, masukan.data.passphrase)

  // Desa, pengaturan, dan kode surat dibaca dari basis data saat ini, bukan dari cache alamat 30 detik.
  const desa = await bacaDesaTerbaru(k.db, rekam.desaId)
  const pengaturan = await bacaPengaturanSurat(k.db, rekam.desaId)
  const tanggal = tanggalIsoWib(k.sekarang)
  const nomor = await alokasiNomorTerbit(k.db, { desaId: rekam.desaId, jenis, pengaturan, tanggal, kodeDesa: desa.kodeSurat })
  const kode = await kodeVerifikasiBaru(k.db, rekam.desaId, desa.kodeSurat, k.acak)

  const subjek = rekam.subjekId === null ? null : await bacaPendudukSatu(k.db, rekam.subjekId, null)
  const mutasi = rekam.mutasiId === null ? null : await bacaMutasiSatu(k.db, rekam.mutasiId)
  if ((rekam.subjekId !== null && !subjek) || (rekam.mutasiId !== null && !mutasi)) throw new GalatApp('SERVER', PESAN_DATA_TIDAK_UTUH, 500)
  const lembar = susunLembar({
    jenis,
    isian,
    pemohon: bentukPenduduk(pemohon, k.penyandi),
    subjek: subjek ? bentukPenduduk(subjek, k.penyandi) : null,
    mutasi: mutasi ? bentukMutasi(mutasi.rekam, mutasi.pendudukIds) : null,
    desa,
    dusun: await daftarDusunDesa(k.db),
    tanggal,
  })

  // `siap` dihitung ulang server dari isi tata letak, tidak dipercaya dari yang tersimpan (SPEC §7.8).
  const berlaku = tataLetakBerlaku(jenis, pengaturan)
  const hasil = terbitSchema.safeParse({
    nomor: nomor.nomor,
    tahun: nomor.tahun,
    urut: nomor.urut,
    kodeVerifikasi: kode,
    pada: waktuIsoWib(k.sekarang),
    penandatangan: { id: k.pelaku.id, nama: k.pelaku.nama, peran: k.pelaku.peran === 'kades' ? 'kades' : 'sekdes', nip: k.pelaku.nip },
    mode: pengaturan.modeTandaTangan,
    berlakuSampai: berlakuSampai(tanggal, jenis.masaBerlakuBulan),
    lembar,
    tataLetak: { ...structuredClone(berlaku), siap: samaDenganSiap(berlaku) },
    kop: { lambang: desa.lambang ?? null, lambangKabupaten: desa.lambangKabupaten ?? null },
  })
  if (!hasil.success) throw new GalatApp('SERVER', PESAN_DATA_TIDAK_UTUH, 500)
  const terbit: Terbit = hasil.data

  const hash = hashDokumen(terbit)
  const { tandaTangan } = await k.penandatangan.tandatangani({ desaId: rekam.desaId, hashDokumen: hash, penandatanganId: k.pelaku.id, pada: k.sekarang })

  await ubahKolomPermohonan(k.db, rekam.id, {
    status: 'selesai',
    tahap: null,
    ditutupPada: k.sekarang,
    terbitNomor: terbit.nomor,
    terbitTahun: terbit.tahun,
    terbitUrut: terbit.urut,
    terbitKode: terbit.kodeVerifikasi,
    terbitPada: k.sekarang,
    terbitPenandatangan: terbit.penandatangan,
    terbitMode: terbit.mode,
    terbitBerlakuSampai: terbit.berlakuSampai,
    terbitLembarSandi: k.penyandi.sandikan(JSON.stringify(terbit.lembar), ruang.permohonanLembar(rekam.desaId)),
    terbitTataLetak: terbit.tataLetak,
    terbitKop: terbit.kop,
    hashDokumen: hash,
    tandaTangan,
  })

  const oleh = pelakuKontrak(k.pelaku)
  await catatRiwayatSurat(k.db, rekam, 'tandatangani', oleh, k.sekarang, terbit.nomor)
  await catatAktivitas(k.db, {
    desaId: rekam.desaId,
    dusunId: rekam.dusunId,
    waktu: waktuIsoWib(k.sekarang),
    jenis: 'surat-terbit',
    ringkasan: `Surat terbit · ${jenis.kode} ${terbit.nomor} · ${pemohon.nama}`,
    oleh,
    rujukan: { jenis: 'permohonan', id: rekam.id },
  })
  await catatAudit(k.db, {
    desaId: rekam.desaId,
    jenis: 'surat.terbit',
    pelaku: k.pelaku.id,
    waktu: k.sekarang,
    ringkasan: { permohonanId: rekam.id, nomor: terbit.nomor, mode: terbit.mode },
  })
  await k.efek.suratDitandatangani(k.db, rekam, jenis, { id: pemohon.id, nama: pemohon.nama }, terbit.nomor, oleh)
}
