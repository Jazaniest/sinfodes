import type { KelompokPilihanMenu } from '../lapisan/Menu'
import { LABEL_MODE, MODE_TAMPILAN, type ModeTampilan } from './mode'

/** Kelompok `Tampilan` untuk menu akun panel, dasbor kabupaten, dan Konsol. */
export function pilihanMode(mode: ModeTampilan, ubah: (mode: ModeTampilan) => void): KelompokPilihanMenu {
  return {
    judul: 'Tampilan',
    nilai: mode,
    opsi: MODE_TAMPILAN.map((m) => ({ id: m, label: LABEL_MODE[m] })),
    onUbah: (id) => {
      const m = MODE_TAMPILAN.find((x) => x === id)
      if (m) ubah(m)
    },
  }
}
