/**
 * Pustaka motif pita website desa (SPEC-V0.2 §11.1). Gambar ubinnya ada di `src/ui/website/motif.ts`.
 *
 * Nama dan asal diperiksa ke Wikipedia bahasa Indonesia saat tahap 7E-1 (sumber tiap butir di komentar `ASAL_MOTIF`).
 * Motif larangan keraton (parang, kawung, udan liris, semen, sawat) dan motif bermakna sakral tidak dimasukkan.
 */
export const ID_MOTIF = [
  'pucuk-rebung',
  'siku-keluang',
  'garis',
  'itik-pulang-petang',
  'awan-larat',
  'tumpal',
  'mega-mendung',
  'truntum',
  'gigi-haruan',
  'tampuk-manggis',
  'sisik-ikan',
] as const
export type IdMotif = (typeof ID_MOTIF)[number]

export const LABEL_MOTIF: Readonly<Record<IdMotif, string>> = {
  'pucuk-rebung': 'Pucuk rebung',
  'siku-keluang': 'Siku keluang',
  garis: 'Garis',
  'itik-pulang-petang': 'Itik pulang petang',
  'awan-larat': 'Awan larat',
  tumpal: 'Tumpal',
  'mega-mendung': 'Mega mendung',
  truntum: 'Truntum',
  'gigi-haruan': 'Gigi haruan',
  'tampuk-manggis': 'Tampuk manggis',
  'sisik-ikan': 'Sisik ikan',
}

export const ASAL_MOTIF: Readonly<Record<IdMotif, string>> = {
  // id.wikipedia.org "Pucuak rabuang": khas Minangkabau, Palembang, Jambi, Aceh, Riau, dan Lampung.
  'pucuk-rebung': 'Minangkabau, Palembang, Jambi, dan Riau',
  // Motif v0.1. Yang ditemukan hanya ragam gerak "siku keluang" pada tari zapin Melayu (id.wikipedia.org "Tari Zapin");
  // rujukan ragam hias tertulis belum ditemukan, jadi asalnya ditulis selebar "Melayu" saja.
  'siku-keluang': 'Melayu',
  garis: 'Netral, untuk daerah mana pun',
  // id.wikipedia.org "Itik pulang petang": identik dengan Minangkabau (ukiran dan songket); ragam serupa dikenal di rumpun Melayu.
  'itik-pulang-petang': 'Minangkabau, Sumatera Barat',
  // id.wikipedia.org "Rumah adat Selaso Jatuh Kembar" (Riau): awan larat sebagai simbol alam semesta pada tangga, pintu, dan jendela.
  'awan-larat': 'Melayu Riau',
  // id.wikipedia.org "Pucuak rabuang" dan "Sinjang tumpal": dikenal umum di kepulauan Indonesia, di Lampung sebagai tepi kain.
  tumpal: 'Nusantara',
  // id.wikipedia.org "Batik Megamendung": ikon batik Cirebon.
  'mega-mendung': 'Cirebon, Jawa Barat',
  // id.wikipedia.org "Batik Truntum": diciptakan Kanjeng Ratu Kencana, permaisuri Pakubuwana III (Surakarta); dipakai orang tua pengantin.
  truntum: 'Surakarta, Jawa Tengah',
  // id.wikipedia.org "Sasirangan": motif tradisional sasirangan Banjar yang boleh dipakai semua orang.
  'gigi-haruan': 'Banjar, Kalimantan Selatan',
  // id.wikipedia.org "Batik Jambi" (tampuk manggis) dan "Sasirangan"; juga ungkapan Melayu Indragiri Hulu, Riau.
  'tampuk-manggis': 'Jambi dan Riau',
  // id.wikipedia.org "Batik Palembang" memuat Motif Sisik Ikan; pola sisik dikenal luas di berbagai daerah.
  'sisik-ikan': 'Umum di Nusantara',
}
