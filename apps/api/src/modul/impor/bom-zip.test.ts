import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buatXlsxUji, palsukanUkuranZip } from '../../../test/helpers/berkas-uji'
import { BATAS_IMPOR, bacaBerkasTabel } from './baca-berkas'
import { bacaDirektoriZip, periksaBomZip } from './bom-zip'

const MB = 1024 * 1024

describe('bacaDirektoriZip', () => {
  it('membaca nama dan ukuran terurai dari direktori pusat tanpa membuka isinya', () => {
    const zip = zipSync({ 'a.txt': strToU8('halo'), 'dir/b.txt': new Uint8Array(1000) })
    const entri = bacaDirektoriZip(zip)
    expect(entri).not.toBeNull()
    expect(entri?.map((e) => [e.nama, e.ukuranTerurai]).sort()).toEqual([['a.txt', 4], ['dir/b.txt', 1000]])
  })

  it('bukan ZIP (tanda tangan salah, terlalu pendek, kosong) → null', () => {
    expect(bacaDirektoriZip(new Uint8Array(0))).toBeNull()
    expect(bacaDirektoriZip(strToU8('NIK,Nama\n1,a'))).toBeNull()
    expect(bacaDirektoriZip(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBeNull()
  })

  it('ZIP terpotong sebelum direktori pusat → null', () => {
    const zip = zipSync({ 'a.txt': strToU8('halo dunia') })
    expect(bacaDirektoriZip(zip.slice(0, zip.length - 10))).toBeNull()
  })
})

describe('periksaBomZip', () => {
  it('jumlah ukuran terurai yang diumumkan sampai 60 MB lolos, lebih dari itu ditolak', () => {
    const lolos = zipSync({ 'a.bin': new Uint8Array(BATAS_IMPOR.terurai) })
    expect(() => periksaBomZip(lolos)).not.toThrow()
    const lewat = zipSync({ 'a.bin': new Uint8Array(BATAS_IMPOR.terurai + 1) })
    expect(() => periksaBomZip(lewat)).toThrowError(/terlalu besar setelah dibuka/)
  })

  it('dua entri yang masing-masing kecil tetapi berjumlah lebih dari 60 MB ditolak', () => {
    const zip = zipSync({ 'a.bin': new Uint8Array(40 * MB), 'b.bin': new Uint8Array(40 * MB) })
    expect(() => periksaBomZip(zip)).toThrowError(/terlalu besar setelah dibuka/)
  })

  it('lebih dari 200 entri ditolak', () => {
    const banyak = Object.fromEntries(Array.from({ length: BATAS_IMPOR.entriZip + 1 }, (_, i) => [`f${i}.txt`, strToU8('x')]))
    expect(() => periksaBomZip(zipSync(banyak))).toThrowError(/terlalu banyak bagian/)
    const pas = Object.fromEntries(Array.from({ length: BATAS_IMPOR.entriZip }, (_, i) => [`f${i}.txt`, strToU8('x')]))
    expect(() => periksaBomZip(zipSync(pas))).not.toThrow()
  })
})

describe('bom ZIP lewat bacaBerkasTabel', () => {
  it('bom jujur (ukuran diumumkan besar) ditolak sebelum pustaka dipanggil', async () => {
    const bom = zipSync({ 'xl/workbook.xml': new Uint8Array(100 * MB) })
    expect(bom.length).toBeLessThan(BATAS_IMPOR.ukuranBait)
    await expect(bacaBerkasTabel('a.xlsx', bom)).rejects.toMatchObject({ kode: 'VALIDATION', status: 422 })
  })

  it('bom dengan ukuran palsu (diumumkan 1 KB, nyatanya 200 MB) ditolak tanpa menghabiskan memori', async () => {
    const asli = zipSync({ ...{ 'xl/workbook.xml': strToU8('<workbook/>') }, 'xl/worksheets/sheet1.xml': new Uint8Array(200 * MB) })
    const palsu = palsukanUkuranZip(asli, 1000)
    expect(palsu.length).toBeLessThan(BATAS_IMPOR.ukuranBait)
    const rssSebelum = process.memoryUsage().rss
    const hasil = await Promise.race([
      bacaBerkasTabel('a.xlsx', palsu).then(
        () => 'diterima',
        (e: unknown) => ((e as { status?: number }).status === 422 ? 'ditolak-422' : `galat-lain:${String(e)}`),
      ),
      new Promise<string>((res) => setTimeout(() => res('menggantung'), 40_000)),
    ])
    const tumbuhMb = (process.memoryUsage().rss - rssSebelum) / MB
    expect(hasil).toBe('ditolak-422')
    expect(tumbuhMb, 'pertumbuhan memori proses (MB)').toBeLessThan(150)
  }, 60_000)

  it('xlsx sah tetap terbaca setelah semua pagar', async () => {
    const t = await bacaBerkasTabel('a.xlsx', buatXlsxUji([['NIK'], ['1405095203918002']]))
    expect(t.baris).toEqual([{ nomor: 2, sel: ['1405095203918002'] }])
  })
})
