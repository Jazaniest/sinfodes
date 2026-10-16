import { tanggalIsoWib } from '@/domain/format/tanggal'
import { susunLembar } from '@/domain/surat/lembar'
import type { PengaturanSurat } from '@/domain/surat/pengaturan'
import type { DetailPermohonan, Permohonan, Terbit } from '@/domain/surat/permohonan'
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

const kopDari = (desa: Desa) => ({
  kabupaten: desa.kabupaten.nama,
  kecamatan: desa.kecamatan.nama,
  desa: desa.nama,
  alamat: desa.alamatKantor,
  kodePos: desa.kodePos,
  surel: desa.surel,
  lambang: desa.lambang ?? null,
})

/** Lembar surat yang sudah terbit, dari isi yang dibekukan saat ditandatangani. Dipakai ruang kerja dan layanan warga. */
export function lembarTerbit(
  t: Terbit,
  p: Pick<PengaturanSurat, 'kertas' | 'huruf'>,
  desa: Desa,
  asal: string,
): Omit<PropsLembarSurat, 'penanda'> {
  const isiQr = tautanVerifikasi(asal, t.kodeVerifikasi)
  return {
    kop: kopDari(desa),
    kertas: p.kertas,
    huruf: p.huruf,
    simulasi: MODE_DEMO,
    isi: t.lembar,
    nomor: t.nomor,
    tandaTangan: {
      tempatTanggal: t.lembar.tempatTanggal,
      jabatan: `Kepala Desa ${desa.nama}`,
      atasNama: t.penandatangan.peran === 'sekdes' ? 'Sekretaris Desa' : null,
      nama: t.penandatangan.nama,
      mode: t.mode,
      qr: t.mode === 'tte' ? { isi: isiQr, kode: t.kodeVerifikasi } : null,
    },
    verifikasi: { kode: t.kodeVerifikasi, domain: domainDesa(desa.slug, DOMAIN_INDUK), isiQr },
  }
}

/** Lembar dari isi yang dibekukan bila surat sudah terbit; selain itu pratinjau draf dari isian di layar (SPEC §7.4). */
export function dataLembar(d: BahanLembar, k: KonteksLembarLayar): Omit<PropsLembarSurat, 'penanda'> {
  const t = d.permohonan.terbit
  if (t) return lembarTerbit(t, d.pengaturan, k.desa, k.asal)
  const isi = susunLembar({
    jenis: d.jenis, isian: k.isian, pemohon: d.pemohon, subjek: d.subjek, mutasi: d.mutasi,
    desa: k.desa, dusun: k.dusun, tanggal: tanggalIsoWib(k.hariIni),
  })
  return {
    kop: kopDari(k.desa),
    kertas: d.pengaturan.kertas,
    huruf: d.pengaturan.huruf,
    simulasi: MODE_DEMO,
    isi,
    nomor: null,
    tandaTangan: {
      tempatTanggal: isi.tempatTanggal, jabatan: `Kepala Desa ${k.desa.nama}`, atasNama: null, nama: d.pejabat.kades,
      mode: d.pengaturan.modeTandaTangan, qr: null,
    },
    verifikasi: null,
  }
}
