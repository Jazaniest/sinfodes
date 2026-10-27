const bingkai =
  'w-full rounded-1 border border-garis-input bg-lembar text-teks-isian text-tinta placeholder:text-tinta-3 outline-none transition-colors data-[focused]:border-biru data-[focused]:ring-2 data-[focused]:ring-biru/25 data-[invalid]:border-merah data-[disabled]:bg-kertas-2 data-[disabled]:text-tinta-2'

export const gayaLabel = 'text-teks-kecil font-medium text-tinta'
export const gayaInput = `h-kontrol px-3 ${bingkai}`
/** Kotak isian tanpa tinggi tetap (TextArea). `cn` tidak menyelesaikan bentrokan kelas, jadi tinggi tidak boleh ditimpa. */
export const gayaKotakBebas = `px-3 py-2 leading-relaxed ${bingkai}`
/** Pembungkus isian bersegmen (DatePicker, TimeField, NumberField): fokus ada di elemen di dalamnya. */
export const gayaGrup =
  'flex h-kontrol w-full items-center gap-2 rounded-1 border border-garis-input bg-lembar px-3 text-teks-isian text-tinta transition-colors data-[focus-within]:border-biru data-[focus-within]:ring-2 data-[focus-within]:ring-biru/25 data-[invalid]:border-merah data-[disabled]:bg-kertas-2 data-[disabled]:text-tinta-2'
/** Satu segmen tanggal atau jam. Segmen pemisah ("/", ":") tidak bisa difokus. */
export const gayaSegmen =
  'rounded-1 px-0.5 tabular-nums outline-none data-[focused]:bg-biru data-[focused]:text-putih data-[placeholder]:text-tinta-3 data-[type=literal]:px-0 data-[type=literal]:text-tinta-2'
export const gayaKeterangan = 'text-teks-kecil text-tinta-2'
export const gayaGalat = 'text-teks-kecil text-merah'
