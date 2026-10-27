import type { JenisSurat } from './jenis'
import type { PengaturanSurat } from './pengaturan'
import { ID_TATA_LETAK_SIAP, type IdTataLetakSiap, type TataLetakSurat, type UnsurTandaTangan } from './tata-letak'

/** Baris kop bawaan; sisipan diganti saat render (`isiBarisKop`). */
export const barisKopBawaan = (): string[] => ['PEMERINTAH KABUPATEN {kab}', 'KECAMATAN {kec}', 'DESA {desa}', '{alamat}']

const URUTAN_BAWAAN: UnsurTandaTangan[] = ['tempat-tanggal', 'jabatan', 'nama', 'nip']

const STANDAR: TataLetakSurat = {
  siap: 'standar',
  kop: { posisiLambang: 'kiri', jumlahLambang: 1, baris: barisKopBawaan(), garis: 'tebal-tipis' },
  kertas: { ukuran: 'A4', margin: { atas: 20, kanan: 20, bawah: 20, kiri: 30 } },
  huruf: { keluarga: 'Tinos', ukuranPt: 12, spasi: 1.15 },
  tandaTangan: { posisi: 'kanan', urutan: URUTAN_BAWAAN, nip: false, tempatCap: false },
  qr: { posisi: 'kiri-bawah' },
}

/** Tiga tata letak siap pakai; `standar` sama dengan lembar v0.1. Selalu salin sebelum diubah. */
export const TATA_LETAK_SIAP: Readonly<Record<IdTataLetakSiap, TataLetakSurat>> = {
  standar: STANDAR,
  'dua-lambang': { ...STANDAR, siap: 'dua-lambang', kop: { ...STANDAR.kop, jumlahLambang: 2, garis: 'ganda' } },
  'rata-tengah': {
    ...STANDAR,
    siap: 'rata-tengah',
    kop: { ...STANDAR.kop, posisiLambang: 'tengah', garis: 'tunggal' },
    tandaTangan: { ...STANDAR.tandaTangan, posisi: 'tengah' },
    qr: { posisi: 'bawah-tanda-tangan' },
  },
}

/** Salinan dalam: tata letak yang diedit di formulir tidak boleh mengubah bawaan bersama. */
export const salinTataLetak = (t: TataLetakSurat): TataLetakSurat => structuredClone(t)

/** Pengecualian jenis bila ada; selain itu tata letak desa. Satu-satunya tempat aturan pengecualian. */
export const tataLetakBerlaku = (jenis: Pick<JenisSurat, 'tataLetak'>, pengaturan: Pick<PengaturanSurat, 'tataLetak'>): TataLetakSurat =>
  jenis.tataLetak ?? pengaturan.tataLetak

const kapital = (teks: string) => teks.toLocaleUpperCase('id-ID')

/** Baris kop dengan sisipan terisi. Nama wilayah ditulis kapital seperti kop v0.1; teks lain, termasuk markup, apa adanya. */
export function isiBarisKop(baris: readonly string[], nilai: { kab: string; kec: string; desa: string; alamat: string }): string[] {
  return baris.map((b) =>
    b
      .replaceAll('{kab}', () => kapital(nilai.kab))
      .replaceAll('{kec}', () => kapital(nilai.kec))
      .replaceAll('{desa}', () => kapital(nilai.desa))
      .replaceAll('{alamat}', () => nilai.alamat),
  )
}

/** Bentuk yang dibandingkan: tanpa `siap`, dan dua lambang tidak peduli posisi lambang (diabaikan di kop). */
function bentukBanding(t: TataLetakSurat): string {
  const salin = { ...t, siap: null, kop: { ...t.kop, posisiLambang: t.kop.jumlahLambang === 2 ? 'kiri' : t.kop.posisiLambang } }
  return JSON.stringify(salin, (_k, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )
}

/** Tata letak siap pakai yang isinya sama persis dengan `t`, atau null bila sudah diubah. */
export function samaDenganSiap(t: TataLetakSurat): IdTataLetakSiap | null {
  const bentuk = bentukBanding(t)
  return ID_TATA_LETAK_SIAP.find((id) => bentukBanding(TATA_LETAK_SIAP[id]) === bentuk) ?? null
}
