import { formatTanggal } from '@/domain/format/tanggal'
import type { DetailPermohonan } from '@/domain/surat/permohonan'
import { DOMAIN_INDUK } from '@/app/alamat'
import { domainDesa } from '@/domain/surat/verifikasi'

/** Pesan WhatsApp untuk pemohon (SPEC §7.4): surat selesai beserta tautan unduhnya. Pengirimannya masih tiruan. */
export function pesanWhatsApp(d: DetailPermohonan, desa: { nama: string; slug: string }): string {
  const t = d.permohonan.terbit
  if (!t) throw new Error('Surat belum ditandatangani')
  return [
    `Yth. ${d.pemohon.nama},`,
    `${d.jenis.nama} Anda sudah selesai ditandatangani.`,
    `Nomor: ${t.nomor}`,
    `Unduh: https://${domainDesa(desa.slug, DOMAIN_INDUK)}/unduh/${t.kodeVerifikasi}`,
    ...(t.berlakuSampai ? [`Berlaku sampai ${formatTanggal(t.berlakuSampai)}.`] : []),
    `Pemerintah Desa ${desa.nama}`,
  ].join('\n')
}
