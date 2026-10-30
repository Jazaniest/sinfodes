import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { samarkanTelepon } from '@sinfodes/kontrak/format/telepon'
import type { JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import { alasanSchema } from '@sinfodes/kontrak/surat/permohonan'
import { catatAudit } from '../../audit'
import { GalatApp } from '../../galat'
import { galatIsian } from '../../galat-isian'
import { ruang } from '../../kripto/ruang'
import { catatAktivitas, pelakuKontrak } from '../../riwayat/catat'
import type { RekamPenduduk } from '../penduduk/repositori'
import type { KonteksAksi } from './layanan-tulis'
import type { RekamPermohonan } from './repositori'
import { ubahKolomPermohonan } from './repositori-tulis'
import { catatRiwayatSurat } from './riwayat-surat'

export const PESAN_TANPA_WHATSAPP = 'Pemohon belum punya nomor WhatsApp. Tambahkan nomornya di profil penduduk.'

/**
 * Membatalkan surat yang sudah terbit (Kepala Desa atau Sekretaris Desa). Surat tetap membawa surat terbitnya dan nomornya tidak
 * dipakai ulang; `ditutup_pada` tetap waktu tanda tangan. Pemicu `permohonan_beku` membatasi perubahannya pada status dan
 * pembatalan. Dipanggil `jalankanAksi` sesudah baris dikunci dan status (Selesai) diperiksa.
 */
export async function batalkanSurat(k: KonteksAksi, rekam: RekamPermohonan, jenis: JenisSurat, badan: unknown): Promise<void> {
  const isian = alasanSchema.safeParse(badan)
  if (!isian.success) throw galatIsian(isian.error)
  const oleh = pelakuKontrak(k.pelaku)
  await ubahKolomPermohonan(k.db, rekam.id, { status: 'dibatalkan', pembatalan: { oleh, pada: waktuIsoWib(k.sekarang), catatan: isian.data.alasan } })
  await catatRiwayatSurat(k.db, rekam, 'batalkan', oleh, k.sekarang, isian.data.alasan)
  await catatAktivitas(k.db, {
    desaId: rekam.desaId,
    dusunId: rekam.dusunId,
    waktu: waktuIsoWib(k.sekarang),
    jenis: 'surat-dibatalkan',
    ringkasan: `Surat dibatalkan · ${jenis.kode} ${rekam.terbitNomor ?? ''}`,
    oleh,
    rujukan: { jenis: 'permohonan', id: rekam.id },
  })
  await catatAudit(k.db, {
    desaId: rekam.desaId,
    jenis: 'surat.batal',
    pelaku: k.pelaku.id,
    waktu: k.sekarang,
    ringkasan: { permohonanId: rekam.id, nomor: rekam.terbitNomor },
  })
}

/** Menandai surat sudah diambil pemohon (sekali). Hanya riwayat; tanpa jejak audit. */
export async function tandaiDiambil(k: KonteksAksi, rekam: RekamPermohonan): Promise<void> {
  const oleh = pelakuKontrak(k.pelaku)
  await ubahKolomPermohonan(k.db, rekam.id, { diambil: { pada: waktuIsoWib(k.sekarang), oleh } })
  await catatRiwayatSurat(k.db, rekam, 'tandai-diambil', oleh, k.sekarang)
}

/**
 * Mengirim kabar surat terbit ke WhatsApp pemohon lewat colokan `Pengirim` (simulator: tidak mengirim apa pun). Nomor dibuka
 * dari sandi hanya untuk memanggil pengirim; riwayat memuat nomor tersamar saja, dan pesan tidak memuat NIK (Ruling 14).
 */
export async function kirimWhatsApp(k: KonteksAksi, rekam: RekamPermohonan, jenis: JenisSurat, pemohon: RekamPenduduk): Promise<void> {
  if (pemohon.teleponSandi === null) throw new GalatApp('VALIDATION', PESAN_TANPA_WHATSAPP, 422)
  const telepon = k.penyandi.bukaSandi(pemohon.teleponSandi, ruang.telepon(pemohon.desaId))
  await k.pengirim.kirimWa({
    desaId: rekam.desaId,
    ke: telepon,
    pesan: `${jenis.nama} Anda (nomor ${rekam.terbitNomor ?? '-'}) sudah terbit. Silakan ambil di kantor desa.`,
  })
  await catatRiwayatSurat(k.db, rekam, 'kirim-wa', pelakuKontrak(k.pelaku), k.sekarang, `Ke ${samarkanTelepon(telepon)}`)
}
