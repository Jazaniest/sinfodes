import { describe, expect, it } from 'vitest'
import {
  ambilKwitansiKonsol, ambilRingkasanKonsol, ambilTagihanKonsol, batalkanTagihan, cariTagihanKonsol, daftarTagihanKonsol, tandaiLunas, tolakBukti,
} from '@/api/konsol'
import { ambilKwitansiDesa } from '@/api/langganan'
import { formatAngka } from '@/domain/format/angka'
import { barisTagihanKonsolSchema, kwitansiSchema, type Tagihan } from '@/domain/langganan/tagihan'
import { boleh } from '@/domain/pengguna/hak-akses'
import { AKUN_KABUPATEN_UJI, AKUN_KONSOL_UJI, AKUN_UJI, masukKabupatenSebagai, masukKonsolSebagai, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { ID_SUNGAI_SIALANG } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'
import { pastikanTagihan } from '../tagihan'

pakaiApiTiruan({ dbSegarTiapUji: true })

// Salinan, karena objek di `ambilDb()` berubah di tempat saat handler menulis.
const MENUNGGU = (): Tagihan[] => structuredClone(ambilDb().tagihan.filter((t) => t.status === 'menunggu-verifikasi'))
const terbitSungaiSialang = (): Tagihan => ambilDb().tagihan.find((t) => t.desaId === ID_SUNGAI_SIALANG && t.status === 'terbit')!
/** Desa contoh (rekaman) tidak punya akun panel; untuk uji notifikasi, tagihan Sungai Sialang dijadikan menunggu verifikasi. */
function menungguSungaiSialang(): Tagihan {
  const id = terbitSungaiSialang().id
  ubahDb((d) => {
    const x = d.tagihan.find((y) => y.id === id)!
    x.status = 'menunggu-verifikasi'
    x.bukti = {
      berkas: 'bukti.png', ukuranKb: 2, jenisBerkas: 'gambar', dataUrl: null, tanggalTransfer: '2026-09-23', namaPengirim: 'Pemdes Sungai Sialang',
      nominalTransfer: x.nominal, nominalCocok: true, diunggahPada: '2026-09-24T08:00:00+07:00', oleh: { jenis: 'desa', id: 'pgn_nurhayati', nama: 'Nurhayati' },
    }
    x.riwayat.push({ status: 'menunggu-verifikasi', pada: '2026-09-24T08:00:00+07:00', oleh: x.bukti.oleh, catatan: null })
  })
  return structuredClone(ambilDb().tagihan.find((y) => y.id === id)!)
}
const rupiahTitik = (n: number): string => formatAngka(n)
const masukTim = () => masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
const kwitansiTerbesar = (tahun: string): number =>
  Math.max(0, ...ambilDb().tagihan.flatMap((t) => (t.kwitansi?.nomor.startsWith(`KW/${tahun}/`) ? [Number(t.kwitansi.nomor.slice(-4))] : [])))

describe('GET /konsol/tagihan', () => {
  it('tanpa tab: Menunggu verifikasi bila ada isinya, dengan jumlah per tab (2 sesuai data contoh)', async () => {
    masukTim()
    const d = await daftarTagihanKonsol({})
    expect(d.tab).toBe('menunggu')
    expect(d.jumlah.menunggu).toBe(2)
    expect(d.jumlah.lewat).toBe(1)
    expect(d.data).toHaveLength(2)
    expect(d.meta).toMatchObject({ page: 1, total: 2 })
    for (const b of d.data) {
      expect(barisTagihanKonsolSchema.safeParse(b).success).toBe(true)
      expect(b.status).toBe('menunggu-verifikasi')
    }
    const semua = ambilDb().tagihan
    expect(d.jumlah.semua).toBe(semua.length)
    expect(d.jumlah.lunas).toBe(semua.filter((t) => t.status === 'lunas').length)
    // Menunggu: unggahan terlama dulu.
    const unggah = d.data.map((b) => b.bukti!.diunggahPada)
    expect(unggah).toEqual([...unggah].sort())
  })
  it('tanpa tab dan tanpa tagihan menunggu: tab Belum dibayar', async () => {
    ubahDb((d) => {
      for (const t of d.tagihan) if (t.status === 'menunggu-verifikasi') t.status = 'lunas'
    })
    masukTim()
    expect((await daftarTagihanKonsol({})).tab).toBe('belum')
  })
  it('tab=lewat berisi Sungai Rambai, terlama jatuh tempo dulu; daftar tidak membawa isi berkas bukti', async () => {
    masukTim()
    const d = await daftarTagihanKonsol({ tab: 'lewat' })
    expect(d.data).toHaveLength(1)
    expect(d.data[0].desa).toMatchObject({ nama: 'Sungai Rambai' })
    const m = await daftarTagihanKonsol({ tab: 'menunggu' })
    expect(m.data.every((b) => b.bukti?.dataUrl === null)).toBe(true)
  })
  it('tab=semua memuat yang dibatalkan, terbit terbaru dulu, dan berhalaman', async () => {
    masukTim()
    const hal1 = await daftarTagihanKonsol({ tab: 'semua', page: 1, pageSize: 10 })
    expect(hal1.data).toHaveLength(10)
    expect(hal1.meta.total).toBe(ambilDb().tagihan.length)
    const terbit = hal1.data.map((b) => b.terbit)
    expect(terbit).toEqual([...terbit].sort().reverse())
    const semua = await daftarTagihanKonsol({ tab: 'semua', page: 1, pageSize: 500 })
    expect(semua.data.some((b) => b.status === 'dibatalkan')).toBe(true)
  })
  it('tab tidak dikenal: 422', async () => {
    masukTim()
    await expect(daftarTagihanKonsol({ tab: 'acak' as never })).rejects.toMatchObject({ status: 422 })
  })
  it('akun desa dan kabupaten tidak bisa membukanya', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    await expect(daftarTagihanKonsol({})).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    masukSebagai(AKUN_UJI.kades)
    await expect(daftarTagihanKonsol({})).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    await expect(ambilTagihanKonsol(terbitSungaiSialang().id)).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })
})

describe('GET /konsol/tagihan/cari', () => {
  it('empat format nominal menemukan tagihan yang sama; potongan nominal tidak menemukan apa pun', async () => {
    masukTim()
    const t = terbitSungaiSialang()
    for (const q of [rupiahTitik(t.nominal), String(t.nominal), `Rp${rupiahTitik(t.nominal)}`, `Rp ${rupiahTitik(t.nominal)}`]) {
      const h = await cariTagihanKonsol(q, 'menunggu')
      expect(h.data.map((b) => b.id)).toEqual([t.id])
    }
    expect((await cariTagihanKonsol(rupiahTitik(t.nominal).slice(0, -1))).data).toEqual([])
  })
  it('nama desa atau nomor tagihan dicocokkan di tab yang aktif, tanpa membedakan huruf besar-kecil', async () => {
    masukTim()
    const h = await cariTagihanKonsol('rambai', 'lewat')
    expect(h.data.map((b) => b.desa.nama)).toEqual(['Sungai Rambai'])
    expect((await cariTagihanKonsol('rambai', 'menunggu')).data).toEqual([])
    const nomor = terbitSungaiSialang().nomor
    expect((await cariTagihanKonsol(nomor.toLowerCase(), 'belum')).data.map((b) => b.id)).toContain(terbitSungaiSialang().id)
  })
  it('kata kunci kosong: tidak ada hasil', async () => {
    masukTim()
    expect((await cariTagihanKonsol('  ')).data).toEqual([])
  })
})

describe('GET /konsol/tagihan/:id', () => {
  it('detail memuat desa, bukti beserta isi berkasnya, dan riwayatBukti', async () => {
    masukTim()
    const t = MENUNGGU()[0]
    const d = await ambilTagihanKonsol(t.id)
    expect(d.id).toBe(t.id)
    expect(d.desa.id).toBe(t.desaId)
    expect(d.bukti?.dataUrl).toBe(t.bukti!.dataUrl)
    expect(d.riwayatBukti).toEqual([])
  })
  it('ID tidak ada: 404', async () => {
    masukTim()
    await expect(ambilTagihanKonsol('tgh_tidak_ada')).rejects.toMatchObject({ status: 404 })
  })
})

describe('Tandai lunas', () => {
  it('menjadi lunas dengan kwitansi berikutnya, riwayat bertambah, dan notifikasi ke pemegang Langganan desa itu', async () => {
    masukTim()
    const t = menungguSungaiSialang()
    const urutBerikut = kwitansiTerbesar('2026') + 1
    const hasil = await tandaiLunas(t.id, { diterimaPada: '2026-09-24', nominalDiterima: t.bukti!.nominalTransfer })
    const nomor = `KW/2026/${String(urutBerikut).padStart(4, '0')}`
    expect(hasil).toMatchObject({ status: 'lunas', kwitansi: { nomor, terbitPada: '2026-09-24' } })
    expect(hasil.lunas).toMatchObject({ diterimaPada: '2026-09-24', nominalDiterima: t.bukti!.nominalTransfer, olehNama: 'Dina' })
    expect(hasil.riwayat.at(-1)).toMatchObject({ status: 'lunas', oleh: { jenis: 'konsol', id: 'kns_dina', nama: 'Dina' } })
    expect(hasil.riwayat).toHaveLength(t.riwayat.length + 1)
    const penerima = ambilDb().pengguna.filter((p) => p.desaId === t.desaId && p.aktif && boleh(p.peran, 'langganan.lihat'))
    expect(penerima.length).toBeGreaterThan(0)
    const notif = ambilDb().notifikasi.filter((n) => n.jenis === 'tagihan' && n.judul === 'Pembayaran diterima')
    expect(notif.map((n) => n.penggunaId).sort()).toEqual(penerima.map((p) => p.id).sort())
    expect(notif.every((n) => n.isi === `Kwitansi ${nomor} sudah bisa diunduh.` && n.rujukan?.id === t.id && !n.dibaca)).toBe(true)
  })
  it('kwitansi berikutnya melanjutkan urutan', async () => {
    masukTim()
    const [a, b] = MENUNGGU()
    const x = await tandaiLunas(a.id, { diterimaPada: '2026-09-24', nominalDiterima: a.nominal })
    const y = await tandaiLunas(b.id, { diterimaPada: '2026-09-24', nominalDiterima: b.nominal })
    expect(Number(y.kwitansi!.nomor.slice(-4))).toBe(Number(x.kwitansi!.nomor.slice(-4)) + 1)
  })
  it('lunas dua kali (dua tab): yang kedua 409 dan tidak ada kwitansi ganda', async () => {
    masukTim()
    const t = MENUNGGU()[0]
    await tandaiLunas(t.id, { diterimaPada: '2026-09-24', nominalDiterima: t.nominal })
    const sebelum = ambilDb().tagihan.flatMap((x) => (x.kwitansi ? [x.kwitansi.nomor] : [])).length
    await expect(tandaiLunas(t.id, { diterimaPada: '2026-09-24', nominalDiterima: t.nominal })).rejects.toMatchObject({
      status: 409, message: 'Tagihan ini tidak menunggu verifikasi.',
    })
    await expect(tolakBukti(t.id, { alasan: 'Nominal tidak sesuai' })).rejects.toMatchObject({ status: 409, message: 'Tagihan ini tidak menunggu verifikasi.' })
    expect(ambilDb().tagihan.flatMap((x) => (x.kwitansi ? [x.kwitansi.nomor] : [])).length).toBe(sebelum)
  })
  it('dari status selain Menunggu verifikasi: 409', async () => {
    masukTim()
    await expect(tandaiLunas(terbitSungaiSialang().id, { diterimaPada: '2026-09-24', nominalDiterima: 1000 })).rejects.toMatchObject({ status: 409 })
  })
  it('isian salah: tanggal setelah hari ini, sebelum tanggal transfer, nominal 0, tanpa tanggal', async () => {
    masukTim()
    const t = MENUNGGU()[0]
    const e = async (diterimaPada: string, nominalDiterima: number) => {
      try {
        await tandaiLunas(t.id, { diterimaPada, nominalDiterima })
      } catch (x) {
        return x as { status: number; fields: Record<string, string> }
      }
      throw new Error('seharusnya gagal')
    }
    expect((await e('2026-09-25', 1000)).fields.diterimaPada).toBe('Tanggal diterima tidak boleh sesudah hari ini.')
    expect((await e('2020-01-01', 1000)).fields.diterimaPada).toBe('Tanggal diterima tidak boleh sebelum tanggal transfer.')
    expect((await e('2026-09-24', 0)).fields.nominalDiterima).toBe('Nominal harus lebih dari 0.')
    const kosong = await e('', 1000)
    expect(kosong.status).toBe(422)
    expect(kosong.fields.diterimaPada).toBe('Pilih tanggal diterima.')
    expect(ambilDb().tagihan.find((x) => x.id === t.id)!.status).toBe('menunggu-verifikasi')
  })
})

describe('Tolak bukti', () => {
  it('alasan 9 karakter: 422; alasan sah: kembali terbit, bukti lama ke riwayatBukti, penolakanTerakhir terisi, notifikasi', async () => {
    masukTim()
    const t = menungguSungaiSialang()
    await expect(tolakBukti(t.id, { alasan: 'Sembilan.' })).rejects.toMatchObject({ status: 422, fields: { alasan: 'Isi alasan paling sedikit 10 karakter.' } })
    const hasil = await tolakBukti(t.id, { alasan: 'Nominal tidak sesuai tagihan' })
    expect(hasil).toMatchObject({ status: 'terbit', bukti: null, penolakanTerakhir: { alasan: 'Nominal tidak sesuai tagihan', olehNama: 'Dina' } })
    expect(hasil.riwayatBukti).toHaveLength(1)
    expect(hasil.riwayatBukti[0].berkas).toBe(t.bukti!.berkas)
    expect(hasil.kodeUnik).toBe(t.kodeUnik)
    expect(hasil.riwayat.at(-1)).toMatchObject({ status: 'terbit', oleh: { jenis: 'konsol' }, catatan: 'Nominal tidak sesuai tagihan' })
    const notif = ambilDb().notifikasi.filter((n) => n.judul === 'Bukti pembayaran ditolak')
    expect(notif.length).toBeGreaterThan(0)
    expect(notif.every((n) => n.isi === 'Nominal tidak sesuai tagihan' && n.jenis === 'tagihan' && n.rujukan?.id === t.id)).toBe(true)
  })
  it('dari status selain Menunggu verifikasi: 409', async () => {
    masukTim()
    await expect(tolakBukti(terbitSungaiSialang().id, { alasan: 'Nominal tidak sesuai' })).rejects.toMatchObject({ status: 409 })
  })
})

describe('Batalkan', () => {
  it('tagihan terbit: dibatalkan, kode unik lepas, dan penerbitan malas menerbitkan pengganti periode yang sama', async () => {
    masukTim()
    const t = terbitSungaiSialang()
    await expect(batalkanTagihan(t.id, { alasan: 'Pendek' })).rejects.toMatchObject({ status: 422 })
    const hasil = await batalkanTagihan(t.id, { alasan: 'Paket desa diubah ke Dasar' })
    expect(hasil).toMatchObject({ status: 'dibatalkan', dibatalkan: { alasan: 'Paket desa diubah ke Dasar', olehNama: 'Dina' } })
    expect(hasil.riwayat.at(-1)).toMatchObject({ status: 'dibatalkan', oleh: { jenis: 'konsol' } })
    pastikanTagihan(new Date())
    const pengganti = ambilDb().tagihan.filter((x) => x.desaId === t.desaId && x.periode.mulai === t.periode.mulai && x.status === 'terbit')
    expect(pengganti).toHaveLength(1)
    expect(pengganti[0].id).not.toBe(t.id)
    expect(pengganti[0].kodeUnik).not.toBe(t.kodeUnik)
    expect(ambilDb().notifikasi.filter((n) => n.judul === 'Tagihan dibatalkan').every((n) => n.isi === 'Paket desa diubah ke Dasar')).toBe(true)
  })
  it('tagihan menunggu verifikasi bisa dibatalkan; lunas dan dibatalkan: 409', async () => {
    masukTim()
    const menunggu = MENUNGGU()[0]
    expect((await batalkanTagihan(menunggu.id, { alasan: 'Tagihan dobel terbit' })).status).toBe('dibatalkan')
    await expect(batalkanTagihan(menunggu.id, { alasan: 'Tagihan dobel terbit' })).rejects.toMatchObject({ status: 409, message: 'Tagihan ini sudah tidak bisa dibatalkan.' })
    const lunas = ambilDb().tagihan.find((x) => x.status === 'lunas')!
    await expect(batalkanTagihan(lunas.id, { alasan: 'Tagihan dobel terbit' })).rejects.toMatchObject({ status: 409 })
  })
})

describe('Kwitansi', () => {
  it('Konsol: data kwitansi untuk tagihan lunas, 404 untuk yang belum', async () => {
    masukTim()
    const lunas = ambilDb().tagihan.find((x) => x.status === 'lunas' && x.kwitansi)!
    const k = await ambilKwitansiKonsol(lunas.id)
    expect(kwitansiSchema.safeParse(k).success).toBe(true)
    expect(k).toMatchObject({ nomor: lunas.kwitansi!.nomor, nominal: lunas.lunas!.nominalDiterima, nomorTagihan: lunas.nomor, periode: lunas.periode.label })
    await expect(ambilKwitansiKonsol(terbitSungaiSialang().id)).rejects.toMatchObject({ status: 404 })
  })
  it('desa: 200 untuk tagihan lunas desa sendiri, 404 untuk terbit dan untuk desa lain', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const lunas = ambilDb().tagihan.find((x) => x.desaId === ID_SUNGAI_SIALANG && x.status === 'lunas')!
    expect((await ambilKwitansiDesa(lunas.id)).nomor).toBe(lunas.kwitansi!.nomor)
    await expect(ambilKwitansiDesa(terbitSungaiSialang().id)).rejects.toMatchObject({ status: 404 })
    const lain = ambilDb().tagihan.find((x) => x.desaId !== ID_SUNGAI_SIALANG && x.status === 'lunas')!
    await expect(ambilKwitansiDesa(lain.id)).rejects.toMatchObject({ status: 404 })
  })
  it('Operator desa: 403', async () => {
    masukSebagai(AKUN_UJI.operator)
    const lunas = ambilDb().tagihan.find((x) => x.desaId === ID_SUNGAI_SIALANG && x.status === 'lunas')!
    await expect(ambilKwitansiDesa(lunas.id)).rejects.toMatchObject({ status: 403 })
  })
})

describe('Ringkasan Konsol', () => {
  it('butir bukti-menunggu dengan jumlah 2, paling atas', async () => {
    masukTim()
    const r = await ambilRingkasanKonsol()
    expect(r.perhatian[0]).toEqual({ jenis: 'bukti-menunggu', jumlah: 2 })
  })
})
