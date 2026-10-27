import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { JenisSurat } from '@/domain/surat/jenis'
import { susunLembar } from '@/domain/surat/lembar'
import { FORMAT_NOMOR_BAWAAN, formatNomorSurat } from '@/domain/surat/nomor-surat'
import type { DetailPermohonan, Permohonan, Terbit } from '@/domain/surat/permohonan'
import { tataLetakBerlaku } from '@/domain/surat/tata-letak-siap'
import { DOMAIN_INDUK } from '@/app/alamat'
import { domainDesa, tautanVerifikasi } from '@/domain/surat/verifikasi'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import type { PropsLembarSurat } from '@/ui/dokumen/LembarSurat'

/** Kaki surat menandai simulasi TTE di build demo (SPEC §7.5). */
export const MODE_DEMO = import.meta.env.VITE_DEMO === 'true'

export type KonteksLembarLayar = {
  desa: Desa
  dusun: readonly Dusun[]
  /** Isian yang sedang tampil di layar, termasuk yang belum disimpan. */
  isian: Readonly<Record<string, string>>
  hariIni: Date
  /** Asal website desa untuk isi QR, mis. `asalDesa(desa.slug)`. */
  asal: string
}

/** Bahan lembar: detail permohonan tersimpan, atau surat yang sedang dibuat di loket (belum terbit). */
export type BahanLembar = Pick<DetailPermohonan, 'jenis' | 'pemohon' | 'subjek' | 'mutasi' | 'pengaturan' | 'pejabat'> & {
  permohonan: Pick<Permohonan, 'terbit'>
}

/** Kop dari identitas desa sekarang; `lambang` diganti lambang yang dibekukan untuk surat yang sudah terbit. */
const kopDari = (desa: Desa, lambang: Pick<Terbit['kop'], 'lambang' | 'lambangKabupaten'> = {
  lambang: desa.lambang ?? null,
  lambangKabupaten: desa.lambangKabupaten ?? null,
}) => ({
  kabupaten: desa.kabupaten.nama,
  kecamatan: desa.kecamatan.nama,
  desa: desa.nama,
  alamat: desa.alamatKantor,
  kodePos: desa.kodePos,
  surel: desa.surel,
  ...lambang,
})

/**
 * Lembar surat yang sudah terbit, dari isi, tata letak, dan lambang yang dibekukan saat ditandatangani (SPEC-V0.2 12.2):
 * mengganti tata letak atau lambang desa sesudahnya tidak mengubah lembar ini. Dipakai ruang kerja dan layanan warga.
 */
export function lembarTerbit(t: Terbit, desa: Desa, asal: string): Omit<PropsLembarSurat, 'penanda'> {
  const isiQr = tautanVerifikasi(asal, t.kodeVerifikasi)
  return {
    kop: kopDari(desa, t.kop),
    tataLetak: t.tataLetak,
    simulasi: MODE_DEMO,
    isi: t.lembar,
    nomor: t.nomor,
    tandaTangan: {
      tempatTanggal: t.lembar.tempatTanggal,
      jabatan: `Kepala Desa ${desa.nama}`,
      atasNama: t.penandatangan.peran === 'sekdes' ? 'Sekretaris Desa' : null,
      nama: t.penandatangan.nama,
      nip: t.penandatangan.nip,
      mode: t.mode,
      qr: t.mode === 'tte' ? { isi: isiQr, kode: t.kodeVerifikasi } : null,
    },
    verifikasi: { kode: t.kodeVerifikasi, domain: domainDesa(desa.slug, DOMAIN_INDUK), isiQr },
  }
}

/** Lembar dari isi yang dibekukan bila surat sudah terbit; selain itu pratinjau draf dari isian di layar (SPEC §7.4). */
export function dataLembar(d: BahanLembar, k: KonteksLembarLayar): Omit<PropsLembarSurat, 'penanda'> {
  const t = d.permohonan.terbit
  if (t) return lembarTerbit(t, k.desa, k.asal)
  const isi = susunLembar({
    jenis: d.jenis, isian: k.isian, pemohon: d.pemohon, subjek: d.subjek, mutasi: d.mutasi,
    desa: k.desa, dusun: k.dusun, tanggal: tanggalIsoWib(k.hariIni),
  })
  return {
    kop: kopDari(k.desa),
    tataLetak: tataLetakBerlaku(d.jenis, d.pengaturan),
    simulasi: MODE_DEMO,
    isi,
    nomor: null,
    tandaTangan: {
      tempatTanggal: isi.tempatTanggal, jabatan: `Kepala Desa ${k.desa.nama}`, atasNama: null, nama: d.pejabat.kades,
      nip: d.pejabat.nipKades ?? null, mode: d.pengaturan.modeTandaTangan, qr: null,
    },
    verifikasi: null,
  }
}

const NIP_CONTOH = '198507122010011001'

/**
 * Lembar draf yang diberi nomor, kode verifikasi, dan QR contoh, supaya posisi QR dan kode terlihat di pratinjau tata
 * letak (draf biasa tidak punya keduanya). Hanya untuk pratinjau; tidak pernah disimpan.
 */
export function denganContohTerbit(
  l: Omit<PropsLembarSurat, 'penanda'>,
  o: { desa: Desa; asal: string; jenis: Pick<JenisSurat, 'klasifikasi' | 'kode'>; hariIni: Date },
): Omit<PropsLembarSurat, 'penanda'> {
  const kode = `${o.desa.kodeSurat}-ABCD-EFGH`
  const isiQr = tautanVerifikasi(o.asal, kode)
  const nomor = formatNomorSurat(FORMAT_NOMOR_BAWAAN, {
    klasifikasi: o.jenis.klasifikasi, kodeJenis: o.jenis.kode, urut: 1, kodeDesa: o.desa.kodeSurat, tanggal: tanggalIsoWib(o.hariIni),
  })
  return {
    ...l,
    nomor,
    tandaTangan: { ...l.tandaTangan, nip: l.tandaTangan.nip ?? NIP_CONTOH, qr: l.tandaTangan.mode === 'tte' ? { isi: isiQr, kode } : null },
    verifikasi: { kode, domain: domainDesa(o.desa.slug, DOMAIN_INDUK), isiQr },
  }
}
