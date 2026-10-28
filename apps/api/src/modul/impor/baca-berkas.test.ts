import { describe, expect, it } from 'vitest'
import { buatCsvUji, buatXlsxUji } from '../../../test/helpers/berkas-uji'
import { BATAS_IMPOR, bacaBerkasTabel } from './baca-berkas'

const KEPALA = ['NIK', 'Nama Lengkap', 'Tgl. Lahir', 'RT']

/** Galat 422 berfield `berkas` dengan pesan tertentu (atau yang memuat teks tertentu). */
async function tolak(janji: Promise<unknown>, pesan: string | RegExp, status = 422): Promise<void> {
  const galat = await janji.then(
    () => null,
    (e: unknown) => e,
  )
  expect(galat, 'seharusnya ditolak').not.toBeNull()
  expect(galat).toMatchObject({ kode: 'VALIDATION', status })
  expect((galat as Error).message).toMatch(typeof pesan === 'string' ? new RegExp(pesan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : pesan)
  expect((galat as { fields?: Record<string, string> }).fields?.berkas).toBeTruthy()
}

describe('bacaBerkasTabel: xlsx', () => {
  it('lembar pertama: kepala kolom, baris bernomor fisik, semua sel menjadi teks', async () => {
    const isi = buatXlsxUji([KEPALA, ['1405095203918002', 'Siti Rahmah', '12-03-1991', '004'], ['1405090101900001', 'Budi', '01-01-1990', '005']])
    const t = await bacaBerkasTabel('data.xlsx', isi)
    expect(t.kolom).toEqual(KEPALA)
    expect(t.baris).toEqual([
      { nomor: 2, sel: ['1405095203918002', 'Siti Rahmah', '12-03-1991', '004'] },
      { nomor: 3, sel: ['1405090101900001', 'Budi', '01-01-1990', '005'] },
    ])
  })

  it('ekstensi huruf besar diterima; sel tanggal menjadi YYYY-MM-DD; sel kosong menjadi teks kosong', async () => {
    const isi = buatXlsxUji([KEPALA, ['1405095203918002', null, new Date(Date.UTC(1991, 2, 12)), '4']])
    const t = await bacaBerkasTabel('DATA.XLSX', isi)
    expect(t.baris[0].sel).toEqual(['1405095203918002', '', '1991-03-12', '4'])
  })

  it('angka kecil (RT 4) menjadi teks tanpa .0; angka desimal apa adanya', async () => {
    const isi = buatXlsxUji([['RT', 'Nilai'], [4, 1.5]])
    expect((await bacaBerkasTabel('a.xlsx', isi)).baris[0].sel).toEqual(['4', '1.5'])
  })

  it('NIK tersimpan sebagai angka (digit akhir sudah dipotong Excel) → seluruh berkas ditolak, menyebut kolomnya', async () => {
    const isi = buatXlsxUji([KEPALA, [1405095203918000, 'Siti', '12-03-1991', '004']])
    await tolak(bacaBerkasTabel('a.xlsx', isi), /Kolom "NIK" tersimpan sebagai angka.*Teks/)
  })

  it('rumus dan perintah di sel tetap teks, tidak pernah dievaluasi', async () => {
    const isi = buatXlsxUji([KEPALA, ['=CMD|\' /C calc\'!A0', '@SUM(1+1)', '+1+1', '-2+3']])
    expect((await bacaBerkasTabel('a.xlsx', isi)).baris[0].sel).toEqual(['=CMD|\' /C calc\'!A0', '@SUM(1+1)', '+1+1', '-2+3'])
  })

  it('xlsx terpotong, PNG bernama .xlsx, dan berkas biner acak → tidak terbaca (bukan 500)', async () => {
    const sah = buatXlsxUji([KEPALA, ['1', 'a', 'b', 'c']])
    await tolak(bacaBerkasTabel('a.xlsx', sah.slice(0, Math.floor(sah.length / 2))), 'Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.')
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Uint8Array(200)])
    await tolak(bacaBerkasTabel('foto.xlsx', png), 'Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.')
    await tolak(bacaBerkasTabel('acak.xlsx', crypto.getRandomValues(new Uint8Array(500))), 'Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.')
  })

  it('hanya kepala tanpa baris data → ditolak dengan pesan yang bisa ditindaklanjuti', async () => {
    await tolak(bacaBerkasTabel('a.xlsx', buatXlsxUji([KEPALA])), /tidak berisi data/)
  })
})

describe('bacaBerkasTabel: csv', () => {
  const baris = [KEPALA, ['1405095203918002', 'Siti Rahmah', '12-03-1991', '004'], ['1405090101900001', 'Budi', '01-01-1990', '005']]

  it('pemisah koma, titik koma, dan tab dikenali dari baris kepala', async () => {
    for (const pemisah of [',', ';', '\t']) {
      const t = await bacaBerkasTabel('a.csv', buatCsvUji(baris, { pemisah }))
      expect(t.kolom, JSON.stringify(pemisah)).toEqual(KEPALA)
      expect(t.baris.map((b) => b.sel[1]), JSON.stringify(pemisah)).toEqual(['Siti Rahmah', 'Budi'])
    }
  })

  it('BOM UTF-8 dibuang dari kepala kolom pertama; akhir baris CRLF', async () => {
    const t = await bacaBerkasTabel('a.csv', buatCsvUji(baris, { bom: true, akhirBaris: '\r\n' }))
    expect(t.kolom[0]).toBe('NIK')
    expect(t.baris).toHaveLength(2)
  })

  it('Windows-1252 (simpanan CSV Excel Indonesia) dibaca sebagai huruf yang benar', async () => {
    const t = await bacaBerkasTabel('a.csv', buatCsvUji([KEPALA, ['1405095203918002', 'Renée Müller', '12-03-1991', '004']], { sandi: 'windows-1252', pemisah: ';' }))
    expect(t.baris[0].sel[1]).toBe('Renée Müller')
  })

  it('sel berkutip memuat pemisah, kutip ganda, dan baris baru tetap satu sel', async () => {
    const t = await bacaBerkasTabel('a.csv', buatCsvUji([KEPALA, ['1405095203918002', 'Siti, "Rahmah"\nKedua', '12-03-1991', '004']]))
    expect(t.baris[0].sel[1]).toBe('Siti, "Rahmah"\nKedua')
  })

  it('baris kosong dibuang tetapi nomor baris fisik tidak bergeser; baris pendek diisi, baris panjang dipotong ke lebar kepala', async () => {
    const mentah = 'NIK,Nama\n\n1405095203918002\n1405090101900001,Budi,lebih,banyak\n'
    const t = await bacaBerkasTabel('a.csv', new TextEncoder().encode(mentah))
    expect(t.baris).toEqual([
      { nomor: 3, sel: ['1405095203918002', ''] },
      { nomor: 4, sel: ['1405090101900001', 'Budi'] },
    ])
  })

  it('rumus tetap teks; spasi di tepi sel dipangkas', async () => {
    const t = await bacaBerkasTabel('a.csv', new TextEncoder().encode('A,B\n=1+1,  isi  \n'))
    expect(t.baris[0].sel).toEqual(['=1+1', 'isi'])
  })
})

describe('bacaBerkasTabel: penolakan dan batas', () => {
  it('ekstensi lain, ekstensi ganda, tanpa ekstensi, dan .xls lama → Berkas harus .xlsx atau .csv.', async () => {
    const csv = buatCsvUji([KEPALA, ['1', 'a', 'b', 'c']])
    for (const nama of ['foto.png', 'data.xlsx.exe', 'data', 'data.xls', 'data.xlsm', 'data.csv.txt']) {
      await tolak(bacaBerkasTabel(nama, csv), 'Berkas harus .xlsx atau .csv.')
    }
  })

  it('berkas kosong (0 bait) dan csv yang hanya kepala → ditolak', async () => {
    await tolak(bacaBerkasTabel('a.csv', new Uint8Array(0)), 'Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.')
    await tolak(bacaBerkasTabel('a.csv', new TextEncoder().encode('NIK,Nama\n')), /tidak berisi data/)
  })

  it('csv memuat byte NUL (biner) → tidak terbaca', async () => {
    await tolak(bacaBerkasTabel('a.csv', new Uint8Array([0x4e, 0x49, 0x4b, 0x00, 0x0a, 0x31])), 'Berkas tidak terbaca. Pilih berkas .xlsx atau .csv.')
  })

  it('tepat 10 MB lolos pemeriksaan ukuran, 10 MB + 1 bait ditolak', async () => {
    await tolak(bacaBerkasTabel('a.csv', new Uint8Array(BATAS_IMPOR.ukuranBait + 1)), 'Ukuran berkas maksimal 10 MB.')
    // 10 MB berisi baris kepala lalu spasi: lolos ukuran, lalu gagal karena tidak ada data (bukan karena ukuran).
    const besar = new Uint8Array(BATAS_IMPOR.ukuranBait).fill(0x20)
    besar.set(new TextEncoder().encode('NIK,Nama\n'))
    await tolak(bacaBerkasTabel('a.csv', besar), /tidak berisi data/)
  })

  it('tepat 10.000 baris lolos, 10.001 baris ditolak', async () => {
    const buat = (n: number) => buatCsvUji([['NIK', 'Nama'], ...Array.from({ length: n }, (_, i) => [String(1000 + i), `N${i}`])])
    const t = await bacaBerkasTabel('a.csv', buat(BATAS_IMPOR.baris))
    expect(t.baris).toHaveLength(BATAS_IMPOR.baris)
    expect(t.baris.at(-1)?.nomor).toBe(BATAS_IMPOR.baris + 1)
    await tolak(bacaBerkasTabel('a.csv', buat(BATAS_IMPOR.baris + 1)), /lebih dari 10\.000 baris/)
  })

  it('tepat 40 kolom lolos, 41 kolom ditolak', async () => {
    const lebar = (n: number) => buatCsvUji([Array.from({ length: n }, (_, i) => `K${i}`), Array.from({ length: n }, (_, i) => `${i}`)])
    expect((await bacaBerkasTabel('a.csv', lebar(BATAS_IMPOR.kolom))).kolom).toHaveLength(BATAS_IMPOR.kolom)
    await tolak(bacaBerkasTabel('a.csv', lebar(BATAS_IMPOR.kolom + 1)), /lebih dari 40 kolom/)
  })

  it('sel 500 karakter lolos, 501 karakter ditolak', async () => {
    const dengan = (n: number) => buatCsvUji([['A'], ['x'.repeat(n)]])
    expect((await bacaBerkasTabel('a.csv', dengan(BATAS_IMPOR.panjangSel))).baris[0].sel[0]).toHaveLength(BATAS_IMPOR.panjangSel)
    await tolak(bacaBerkasTabel('a.csv', dengan(BATAS_IMPOR.panjangSel + 1)), /lebih dari 500 karakter/)
  })

  it('xlsx dengan 10.001 baris juga ditolak', async () => {
    const isi = buatXlsxUji([['NIK'], ...Array.from({ length: BATAS_IMPOR.baris + 1 }, (_, i) => [`${1000 + i}`])])
    await tolak(bacaBerkasTabel('a.xlsx', isi), /lebih dari 10\.000 baris/)
  })
})
