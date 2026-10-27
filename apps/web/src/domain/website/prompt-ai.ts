import { CSP_BINGKAI } from './bingkai-html'
import type { VariabelKontrak } from './kontrak-tema'
import { variabelTema, type TemaDasar } from './tema'

/** Potongan kontrak tema yang disertakan dalam prompt (keputusan 10). */
export type KontrakPrompt = { versi: string; variabel: readonly VariabelKontrak[]; bagian: readonly string[] }

const KALIMAT_FORMAT = 'Jawab dengan satu blok kode saja, tanpa penjelasan.'

/** Aturan CSS kustom: semua larangan keputusan 1 rencana 7G. */
const ATURAN_CSS = [
  '- Semua aturan tetap berlaku setelah dikurung lingkup dengan :where([data-situs-kustom]); tulis seolah-olah di dalam wadah itu.',
  '- Ditolak: @import di mana pun.',
  '- Ditolak: url() selain data:image/png, data:image/jpeg, data:image/webp, data:image/svg+xml, dan foto media desa (/demo/foto/….jpg). Alamat luar dan jalur relatif lain ditolak.',
  '- Ditolak: @font-face dengan src berisi url() di luar aturan di atas; local() boleh.',
  '- Ditolak: expression(, behavior, -moz-binding, dan javascript: (huruf besar-kecil tidak dibedakan).',
  '- Ditolak: karakter \\ di luar komentar.',
  '- Ditolak: @keyframes yang namanya tidak diawali desa-.',
  '- Ditolak: @namespace dan @page.',
  '- Ukuran CSS paling besar 50 KB (byte UTF-8); CSS yang tidak bisa diurai akan ditolak.',
]

/** Aturan Blok HTML: kurungan bingkai keputusan 5 rencana 7G. */
const ATURAN_HTML = [
  `- Kode berjalan di dalam bingkai terkurung dengan CSP: ${CSP_BINGKAI('{asalMedia}')}.`,
  '- Kode tidak boleh membutuhkan jaringan, kuki, penyimpanan, maupun dokumen induk; gambar hanya data URI atau foto media desa (/demo/foto/….jpg).',
  '- Variabel tema tersedia sebagai variabel CSS --desa-* pada :root bingkai.',
  '- Kode HTML paling besar 64 KB (byte UTF-8) dan tanpa skrip dari luar.',
]

/**
 * Prompt berbahasa Indonesia untuk AI pilihan operator (keputusan 10): peran dan nama desa, nilai tema sekarang,
 * nama bagian kontrak, aturan CSS keputusan 1 atau CSP keputusan 5, batas ukuran, format jawaban, dan permintaan
 * operator. Sinfodes tidak memanggil AI apa pun; teks ini hanya disalin ke papan klip.
 */
export function susunPromptAi(opsi: {
  jenis: 'css' | 'html'
  namaDesa: string
  tema: TemaDasar
  kontrak: KontrakPrompt
  permintaan: string
}): string {
  const nilai = variabelTema(opsi.tema)
  const peran = opsi.jenis === 'css' ? 'CSS kustom' : 'kode Blok HTML'
  return [
    `Anda membantu menulis ${peran} untuk website Desa ${opsi.namaDesa} yang dibuat dengan Sinfodes.`,
    '',
    `Tema sekarang, sesuai ${opsi.kontrak.versi}. Hanya variabel CSS berikut yang boleh dipakai:`,
    ...opsi.kontrak.variabel.map((nama) => `- ${nama}: ${nilai[nama] ?? ''}`),
    '',
    `Nama bagian kontrak yang boleh dipakai: ${opsi.kontrak.bagian.join(', ')}.`,
    '',
    'Aturan:',
    ...(opsi.jenis === 'css' ? ATURAN_CSS : ATURAN_HTML),
    '- Tampilan harus nyaman di HP mulai lebar 320 px.',
    '- Periksa kontras teks; wajib memenuhi WCAG AA.',
    '',
    KALIMAT_FORMAT,
    '',
    'Permintaan operator:',
    opsi.permintaan,
  ].join('\n')
}
