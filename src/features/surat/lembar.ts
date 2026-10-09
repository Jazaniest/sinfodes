import { tanggalIsoWib } from '@/domain/format/tanggal'
import { susunLembar } from '@/domain/surat/lembar'
import type { DetailPermohonan, Permohonan } from '@/domain/surat/permohonan'
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
  /** Origin aplikasi untuk isi QR, mis. `window.location.origin`. */
  asal: string
}

/** Bahan lembar: detail permohonan tersimpan, atau surat yang sedang dibuat di loket (belum terbit). */
export type BahanLembar = Pick<DetailPermohonan, 'jenis' | 'pemohon' | 'subjek' | 'mutasi' | 'pengaturan' | 'pejabat'> & {
  permohonan: Pick<Permohonan, 'terbit'>
}

/** Lembar dari isi yang dibekukan bila surat sudah terbit; selain itu pratinjau draf dari isian di layar (SPEC §7.4). */
export function dataLembar(d: BahanLembar, k: KonteksLembarLayar): Omit<PropsLembarSurat, 'penanda'> {
  const kop = {
    kabupaten: k.desa.kabupaten.nama,
    kecamatan: k.desa.kecamatan.nama,
    desa: k.desa.nama,
    alamat: k.desa.alamatKantor,
    kodePos: k.desa.kodePos,
    surel: k.desa.surel,
  }
  const jabatan = `Kepala Desa ${k.desa.nama}`
  const umum = { kop, kertas: d.pengaturan.kertas, huruf: d.pengaturan.huruf, simulasi: MODE_DEMO }
  const t = d.permohonan.terbit
  if (t) {
    const isiQr = tautanVerifikasi(k.asal, k.desa.slug, t.kodeVerifikasi)
    return {
      ...umum,
      isi: t.lembar,
      nomor: t.nomor,
      tandaTangan: {
        tempatTanggal: t.lembar.tempatTanggal,
        jabatan,
        atasNama: t.penandatangan.peran === 'sekdes' ? 'Sekretaris Desa' : null,
        nama: t.penandatangan.nama,
        mode: t.mode,
        qr: t.mode === 'tte' ? { isi: isiQr, kode: t.kodeVerifikasi } : null,
      },
      verifikasi: { kode: t.kodeVerifikasi, domain: domainDesa(k.desa.slug), isiQr },
    }
  }
  const isi = susunLembar({
    jenis: d.jenis, isian: k.isian, pemohon: d.pemohon, subjek: d.subjek, mutasi: d.mutasi,
    desa: k.desa, dusun: k.dusun, tanggal: tanggalIsoWib(k.hariIni),
  })
  return {
    ...umum,
    isi,
    nomor: null,
    tandaTangan: { tempatTanggal: isi.tempatTanggal, jabatan, atasNama: null, nama: d.pejabat.kades, mode: d.pengaturan.modeTandaTangan, qr: null },
    verifikasi: null,
  }
}
