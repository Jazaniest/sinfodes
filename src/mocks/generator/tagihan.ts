import { tanggalIsoWib } from '@/domain/format/tanggal'
import { hargaTagihan, periodeTagihanMemuat, type PelakuTagihan, type Tagihan } from '@/domain/langganan/tagihan'
import { buktiContohSvg } from '../data/bukti-contoh'
import { PENGGUNA_KONSOL_DEMO } from '../data/desa-konsol'
import { buatTagihan, pilihKodeUnik, tagihanJatuh, terapkanTagihanBaru } from '../tagihan-hitung'
import type { DbDemo } from '../tipe-db'
import type { TagihanLamaDesa } from './konsol'

/**
 * Data tagihan demo (rencana 7D-1 Tugas 2). Semuanya tanpa PRNG, jadi angka data lain tidak bergeser: tagihan v0.1 dikonversi
 * apa adanya, lalu beberapa tagihan contoh ditambahkan di desa tertentu.
 */

const HARI_MS = 86_400_000
const tambahHari = (t: string, hari: number): string => new Date(Date.parse(`${t}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)

const tim = PENGGUNA_KONSOL_DEMO[0]
const PELAKU_TIM: PelakuTagihan = { jenis: 'konsol', id: tim.id, nama: tim.nama }
const PELAKU_DESA_CONTOH: PelakuTagihan = { jenis: 'desa', id: 'contoh', nama: 'Kaur Keuangan' }

type DbTagihan = Pick<DbDemo, 'desa' | 'langganan' | 'tagihan'>

/** Hari sebelum jatuh tempo baru bayar bagi tagihan v0.1 yang belum jatuh tempo menurut aturan lama tetapi sudah menurut aturan baru. */
const HARI_BAYAR_SEBELUM_JATUH_TEMPO = 5

function tandaiLunas(t: Tagihan, diterimaPada: string): void {
  const ditandaiPada = `${diterimaPada}T09:00:00+07:00`
  t.status = 'lunas'
  t.lunas = { diterimaPada, nominalDiterima: t.nominal, ditandaiPada, olehNama: PELAKU_TIM.nama }
  t.riwayat.push({ status: 'lunas', pada: ditandaiPada, oleh: PELAKU_TIM, catatan: null })
}

/** Nomor kwitansi `KW/{tahun lunas}/{urut 4 digit per tahun}`, urut menurut tanggal terima lalu nomor tagihan. */
function nomorkanKwitansi(daftar: Tagihan[]): void {
  const urutPerTahun = new Map<string, number>()
  for (const t of daftar) if (t.status !== 'lunas') t.kwitansi = null
  const lunas = daftar.filter((t) => t.status === 'lunas' && t.lunas)
  lunas.sort((a, b) => a.lunas!.diterimaPada.localeCompare(b.lunas!.diterimaPada) || a.nomor.localeCompare(b.nomor) || a.id.localeCompare(b.id))
  for (const t of lunas) {
    const tahun = t.lunas!.diterimaPada.slice(0, 4)
    const urut = (urutPerTahun.get(tahun) ?? 0) + 1
    urutPerTahun.set(tahun, urut)
    t.kwitansi = { nomor: `KW/${tahun}/${String(urut).padStart(4, '0')}`, terbitPada: t.lunas!.diterimaPada }
  }
}

/**
 * Konversi tagihan v0.1 (keputusan 7D-1 butir 6): yang sudah dibayar menjadi `lunas`, yang belum menjadi `terbit`. Jatuh tempo
 * memakai aturan baru (mulai + 14), jadi tagihan yang belum dibayar pada aturan lama karena belum jatuh tempo, tetapi sudah
 * lewat pada aturan baru, dianggap sudah dibayar sebelum jatuh tempo; hanya tagihan yang sengaja menunggak yang tetap terbit.
 */
export function konversiTagihanLama(lama: readonly TagihanLamaDesa[], db: Pick<DbDemo, 'desa' | 'langganan' | 'tanggalAcuan'>): Tagihan[] {
  const hariIni = db.tanggalAcuan.slice(0, 10)
  const hasil: Tagihan[] = []
  for (const { desaId, tagihan } of lama) {
    const desa = db.desa.find((d) => d.id === desaId)
    const langganan = db.langganan.find((l) => l.desaId === desaId)
    if (!desa || !langganan) continue
    for (const l of tagihan) {
      const periode = periodeTagihanMemuat('triwulan', l.terbit)
      const t = buatTagihan({ desa: db.desa, tagihan: hasil }, { desa, langganan, periode })
      if (l.dibayar !== null) tandaiLunas(t, l.dibayar)
      else if (t.jatuhTempo < hariIni && l.jatuhTempo >= hariIni) tandaiLunas(t, tambahHari(t.jatuhTempo, -HARI_BAYAR_SEBELUM_JATUH_TEMPO))
      hasil.push(t)
    }
  }
  nomorkanKwitansi(hasil)
  return hasil
}

/** Kembalikan tagihan ke keadaan baru terbit (riwayat pertama saja), dengan kode unik yang dipilih ulang. */
function jadikanTerbit(db: DbTagihan, t: Tagihan): void {
  t.status = 'terbit'
  t.bukti = null
  t.lunas = null
  t.kwitansi = null
  t.penolakanTerakhir = null
  t.riwayat = t.riwayat.slice(0, 1)
  t.kodeUnik = pilihKodeUnik({ tagihan: db.tagihan.filter((x) => x !== t) }, t.id)
  t.nominal = t.harga + t.kodeUnik
}

const terbaru = (db: DbTagihan, desaId: string): Tagihan | undefined =>
  db.tagihan.filter((t) => t.desaId === desaId && t.status !== 'dibatalkan').sort((a, b) => a.periode.mulai.localeCompare(b.periode.mulai)).at(-1)

function menungguVerifikasi(db: DbTagihan, desaNama: string, desaId: string, hariIni: string): void {
  const t = terbaru(db, desaId)
  if (!t) throw new Error(`Desa ${desaNama} tidak punya tagihan`)
  jadikanTerbit(db, t)
  const tanggal = [t.terbit, tambahHari(hariIni, -2)].sort().at(-1)!
  const diunggahPada = `${tanggal}T10:00:00+07:00`
  const pengirim = `Pemdes ${desaNama}`
  const dataUrl = buktiContohSvg({ bank: 'Bank Contoh Nusantara', nominal: t.nominal, tanggal, pengirim })
  t.status = 'menunggu-verifikasi'
  t.bukti = {
    berkas: `bukti-transfer-${tanggal}.svg`,
    ukuranKb: Math.max(1, Math.ceil(dataUrl.length / 1024)),
    jenisBerkas: 'gambar',
    dataUrl,
    tanggalTransfer: tanggal,
    namaPengirim: pengirim,
    nominalTransfer: t.nominal,
    nominalCocok: true,
    diunggahPada,
    oleh: PELAKU_DESA_CONTOH,
  }
  t.riwayat.push({ status: 'menunggu-verifikasi', pada: diunggahPada, oleh: PELAKU_DESA_CONTOH, catatan: null })
}

/** Satu tagihan lama Talang Gading yang salah nominal dibatalkan, lalu diganti tagihan benar yang sudah lunas. */
function batalkanBerganti(db: DbTagihan, desaId: string): void {
  const milik = db.tagihan.filter((t) => t.desaId === desaId && t.status === 'lunas').sort((a, b) => a.periode.mulai.localeCompare(b.periode.mulai))
  const asal = milik.at(-3) ?? milik[0]
  if (!asal) return
  const desa = db.desa.find((d) => d.id === desaId)!
  const langganan = db.langganan.find((l) => l.desaId === desaId)!
  const lunas = asal.lunas!
  const dibatalkanPada = `${tambahHari(asal.terbit, 3)}T11:00:00+07:00`
  // Tagihan salah: paket Lengkap padahal desa berlangganan Dasar.
  const hargaSalah = hargaTagihan('Lengkap', asal.periode.jenis)
  const salah: Tagihan = { ...structuredClone(asal), paket: 'Lengkap', harga: hargaSalah, nominal: hargaSalah + asal.kodeUnik }
  salah.status = 'dibatalkan'
  salah.lunas = null
  salah.kwitansi = null
  salah.bukti = null
  salah.dibatalkan = { alasan: 'Salah nominal paket.', pada: dibatalkanPada, olehNama: PELAKU_TIM.nama }
  salah.riwayat = [salah.riwayat[0], { status: 'dibatalkan', pada: dibatalkanPada, oleh: PELAKU_TIM, catatan: 'Salah nominal paket.' }]
  const indeks = db.tagihan.indexOf(asal)
  db.tagihan[indeks] = salah
  const ganti = buatTagihan(db, { desa, langganan, periode: { mulai: asal.periode.mulai, sampai: asal.periode.sampai, label: asal.periode.label } })
  tandaiLunas(ganti, lunas.diterimaPada)
  db.tagihan.splice(indeks + 1, 0, ganti)
}

/**
 * Tagihan contoh (keputusan 7D-1 butir 7 dan 8) setelah penerbitan tagihan yang sudah waktunya:
 * - Sungai Sialang selalu punya satu tagihan `terbit` untuk periode terbaru yang sudah terbit;
 * - Sungai Gelugur dan Kerinci Indah: tagihan terbaru `menunggu-verifikasi` dengan bukti contoh;
 * - Talang Gading: satu tagihan lama `dibatalkan` beserta penggantinya.
 */
export function tambahTagihanContoh(db: DbTagihan, sekarang: Date): void {
  terapkanTagihanBaru(db, tagihanJatuh(db, sekarang))
  const hariIni = tanggalIsoWib(sekarang)
  const sialang = terbaru(db, 'desa_sungai_sialang')
  if (sialang && sialang.status !== 'terbit') jadikanTerbit(db, sialang)
  for (const nama of ['Sungai Gelugur', 'Kerinci Indah']) {
    const desa = db.desa.find((d) => d.nama === nama)
    if (desa) menungguVerifikasi(db, nama, desa.id, hariIni)
  }
  const talang = db.desa.find((d) => d.nama === 'Talang Gading')
  if (talang) batalkanBerganti(db, talang.id)
  nomorkanKwitansi(db.tagihan)
}
