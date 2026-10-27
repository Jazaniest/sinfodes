import { angkaRomawi } from '../format/romawi'
import type { Desa, Dusun } from './schema'

type Istilah = Desa['istilahWilayah']
type Letak = { dusunId: string; rw: string; rt: string }

/** "Dusun I Kampung Tengah" — istilah wilayah diatur per desa (SPEC §4.5). */
export function namaDusun(d: Pick<Dusun, 'nomor' | 'nama'>, istilah: Istilah): string {
  return `${istilah.dusun} ${angkaRomawi(d.nomor)} ${d.nama}`
}

/** "Dusun I" */
export function namaDusunPendek(d: Pick<Dusun, 'nomor'>, istilah: Istilah): string {
  return `${istilah.dusun} ${angkaRomawi(d.nomor)}`
}

function rtRw(l: Letak, istilah: Istilah): string {
  return `${istilah.rt} ${l.rt}/${istilah.rw} ${l.rw}`
}

/** Format KTP: "RT 004/RW 002, Dusun I Kampung Tengah". */
export function alamatLengkap(l: Letak, dusun: readonly Dusun[], istilah: Istilah): string {
  const d = dusun.find((x) => x.id === l.dusunId)
  return d ? `${rtRw(l, istilah)}, ${namaDusun(d, istilah)}` : rtRw(l, istilah)
}

/** Format daftar: "Dusun I · RT 004/RW 002". */
export function alamatPendek(l: Letak, dusun: readonly Dusun[], istilah: Istilah): string {
  const d = dusun.find((x) => x.id === l.dusunId)
  return d ? `${namaDusunPendek(d, istilah)} · ${rtRw(l, istilah)}` : rtRw(l, istilah)
}

/** "14.05.09.2009" → "140509": kode wilayah di NIK warga asli desa ini. */
export function kodeWilayahNik(desa: Pick<Desa, 'kodeDesa'>): string {
  return desa.kodeDesa.replace(/\D/g, '').slice(0, 6)
}
