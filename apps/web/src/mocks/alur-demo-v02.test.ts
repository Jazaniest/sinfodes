// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilNotifikasi } from '@/api/notifikasi'
import { ambilKwitansiKonsol, ambilRingkasanKonsol, cariTagihanKonsol, daftarTagihanKonsol, tandaiLunas } from '@/api/konsol'
import { ambilBuktiLencana, ambilRingkasanInduk } from '@/api/induk'
import { ambilKwitansiDesa, ambilLangganan, kirimBukti } from '@/api/langganan'
import {
  ambilDetailSiaran, ambilPapanIndeks, ambilPemantauanKabupaten, ambilRingkasanKabupaten, daftarSiaranKabupaten, kirimSiaran,
} from '@/api/kabupaten'
import { ambilIdentitasPublik, verifikasiSurat } from '@/api/publik'
import { ambilDetailSiaranDesa, tandaiSiaranDibaca, tandaiTindakLanjut } from '@/api/siaran'
import { arsipkanJenisSurat, buatPermohonan, jalankanAksi, tambahJenisSurat, ubahJenisSurat } from '@/api/surat'
import { ambilRiwayatWarga } from '@/api/warga'
import { ambilSitus, aturLanjut, simpanDraf, terbitkan } from '@/api/website'
import { asalDesa } from '@/app/alamat'
import { portalKabupatenSchema } from '@/domain/kabupaten/portal'
import { TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
import { pasangTema } from '@/domain/website/galeri-dasar'
import { susunanBawaan } from '@/domain/website/susunan'
import { ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from '@sinfodes/demo/data/desa-demo'
import { PENGGUNA_KONSOL_DEMO } from '@sinfodes/demo/data/desa-konsol'
import { ambilDb } from '@/mocks/db'
import { SKENARIO_DEMO, tautanSkenario } from '@/features/demo/skenario'
import { lembarTerbit } from '@/features/surat/lembar'
import {
  AKUN_KABUPATEN_UJI, AKUN_KONSOL_UJI, AKUN_UJI, AKUN_WARGA_UJI, masukKabupatenSebagai, masukKonsolSebagai, masukSebagai, masukSebagaiWarga,
  pakaiApiTiruan,
} from '@/test/api-tiruan'

/**
 * Penutup v0.2 (SPEC-V0.2 §15): enam alur utama berurutan pada SATU dunia demo. Tidak ada reset antaruji, jadi alur 4 berjalan
 * di atas hasil alur 2 dan 3 dan tabrakan antarfitur (siaran dan tagihan pada pengguna yang sama) ikut teruji.
 */
pakaiApiTiruan()

const SIARAN = {
  judul: 'Rapat evaluasi BLT-DD',
  isi: 'Mohon hadir.',
  tindakLanjut: { tenggat: '2026-10-01' },
  sasaran: { jenis: 'kecamatan' as const, kode: ['14.05.09'] },
}
const CATATAN_TINDAK = 'Sudah dibahas dalam musyawarah dusun.'
const nama = (daftar: readonly string[]) => [...daftar].sort((a, b) => a.localeCompare(b, 'id'))
const AGUSTUS = '2026-08'

/** Portal publik kabupaten mitra; alamatnya lewat host, bukan sesi. */
async function portalMitra(label: string) {
  const r = await fetch(`http://${label}.sinfodes.localhost/api/v1/kabupaten/portal`)
  const p = portalKabupatenSchema.parse(await r.json())
  if (!p.mitra) throw new Error(`${label} seharusnya mitra`)
  return p
}
async function statusDenganToken(jalur: string, token: string): Promise<number> {
  return (await fetch(`http://localhost:3000/api/v1${jalur}`, { headers: { Authorization: `Bearer ${token}` } })).status
}
const kunciDilarang = (nilai: unknown): string[] => {
  const ketemu = new Set<string>()
  const telusur = (n: unknown) => {
    if (Array.isArray(n)) n.forEach(telusur)
    else if (n !== null && typeof n === 'object') {
      for (const [k, v] of Object.entries(n)) {
        if (['tingkatan', 'indeks', 'skor', 'klasemen'].includes(k)) ketemu.add(k)
        telusur(v)
      }
    }
  }
  telusur(nilai)
  return [...ketemu]
}

describe('alur demo v0.2: satu dunia, enam alur berurutan', () => {
  let siaranId = ''

  it('1. alamat dan sesi: sesi panel tidak berlaku di Konsol maupun kabupaten, masuk cepat tanpa NIK, QR surat ke subdomain desa', async () => {
    // Slot sesi terpisah: panel desa masuk, Konsol dan kabupaten tetap kosong.
    masukSebagai(AKUN_UJI.sekdes)
    await expect(ambilRingkasanKonsol()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    await expect(ambilRingkasanKabupaten()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    // Kontrol: token yang tepat membuka alamatnya sendiri, sehingga 401 di bawah memang soal alamat.
    expect(await statusDenganToken('/beranda', `demo.${AKUN_UJI.sekdes}`)).toBe(200)
    expect(await statusDenganToken('/konsol/ringkasan', `konsol.${AKUN_KONSOL_UJI.tim}`)).toBe(200)
    expect(await statusDenganToken('/kabupaten/ringkasan', `kab.${AKUN_KABUPATEN_UJI.admin}`)).toBe(200)
    // Token panel yang dipaksa ke API alamat lain, dan sebaliknya, ditolak.
    expect(await statusDenganToken('/konsol/ringkasan', `demo.${AKUN_UJI.sekdes}`)).toBe(401)
    expect(await statusDenganToken('/kabupaten/ringkasan', `demo.${AKUN_UJI.sekdes}`)).toBe(401)
    expect(await statusDenganToken('/beranda', `konsol.${AKUN_KONSOL_UJI.tim}`)).toBe(401)
    expect(await statusDenganToken('/beranda', `kab.${AKUN_KABUPATEN_UJI.admin}`)).toBe(401)

    // Pembuat alamat membaca window.location (jsdom); lingkungan uji ini node, jadi hanya bagian ini yang diberi window.
    vi.stubGlobal('window', { location: { hostname: 'localhost', protocol: 'http:', port: '3000', origin: 'http://localhost:3000' } })
    try {
      // Tautan masuk cepat semua skenario: kuncinya ID akun, tidak ada NIK.
      const akun = { admin: PENGGUNA_DEMO.filter((p) => p.desaId === ID_SUNGAI_SIALANG), konsol: PENGGUNA_KONSOL_DEMO }
      const tautan = SKENARIO_DEMO.flatMap((s) => s.langkah.flatMap((l) => l.tombol.map((t) => tautanSkenario(t, akun))))
      expect(tautan.length).toBeGreaterThan(15)
      const semuaNik = ambilDb().penduduk.flatMap((p) => (p.nik ? [p.nik] : []))
      expect(semuaNik.length).toBeGreaterThan(100)
      for (const url of tautan) {
        expect(url, url).not.toMatch(/nik=|\b\d{16}\b/i)
        expect(semuaNik.some((nik) => url.includes(nik)), url).toBe(false)
      }

      // QR surat yang sudah terbit menunjuk halaman verifikasi di subdomain desa.
      const terbit = ambilDb().permohonan.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.terbit)?.terbit
      const desa = ambilDb().desa.find((d) => d.id === ID_SUNGAI_SIALANG)
      if (!terbit || !desa) throw new Error('Surat terbit atau desa demo tidak ada')
      const isiQr = lembarTerbit(terbit, desa, asalDesa('sungaisialang')).verifikasi?.isiQr ?? ''
      const url = new URL(isiQr)
      expect(url.hostname).toBe('sungaisialang.sinfodes.localhost')
      expect(url.pathname).toBe('/verifikasi')
      expect(url.searchParams.get('kode')).toBe(terbit.kodeVerifikasi)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('2. kabupaten: Admin Pelalawan mengirim siaran, Kades Sungai Sialang membaca dan menindaklanjuti, Admin Siak tidak melihatnya', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const baru = await kirimSiaran(SIARAN, null)
    siaranId = baru.id
    masukSebagai(AKUN_UJI.kades)
    expect((await ambilNotifikasi()).data[0]).toMatchObject({ jenis: 'siaran-kabupaten', rujukan: { jenis: 'siaran', id: baru.id } })
    await tandaiSiaranDibaca(baru.id)
    await tandaiTindakLanjut(baru.id, CATATAN_TINDAK)
    expect(await ambilDetailSiaranDesa(baru.id)).toMatchObject({ id: baru.id })
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const status = (await ambilDetailSiaran(baru.id)).desa.find((d) => d.id === ID_SUNGAI_SIALANG)
    expect(status).toMatchObject({ status: 'ditindaklanjuti', tindakLanjut: { catatan: CATATAN_TINDAK } })
    // Admin Siak: siaran Pelalawan tidak ada di daftarnya dan detailnya 404.
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    expect((await daftarSiaranKabupaten()).data.map((s) => s.id)).not.toContain(baru.id)
    await expect(ambilDetailSiaran(baru.id)).rejects.toMatchObject({ status: 404 })
  })

  it('3. peringkat: juara 1 Juara Umum Pelalawan Agustus 2026 sama di dasbor, portal, landing, dan lencana; bukti 200; publik tanpa tingkatan', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const papan = await ambilPapanIndeks({})
    expect(papan).toMatchObject({ kategori: 'umum', periode: { kode: AGUSTUS } })
    const dasbor = nama(papan.peringkat.filter((p) => p.peringkat === 1).map((p) => p.desa.nama))
    expect(dasbor.length).toBeGreaterThan(0)

    const portal = await portalMitra('kab-pelalawan')
    const dariPortal = nama(portal.podium.kategori.find((k) => k.kategori === 'umum')!.juara.filter((j) => j.peringkat === 1).map((j) => j.desa.nama))

    const induk = await ambilRingkasanInduk()
    const mitra = induk.juara?.kabupatenMitra.find((m) => m.kabupaten.nama === 'Pelalawan')
    const dariLanding = nama((mitra?.juaraUmum ?? []).filter((j) => j.peringkat === 1).map((j) => j.desa.nama))

    const db = ambilDb()
    const kodeLencana = db.lencana
      .filter((l) => l.kategori === 'umum' && l.tingkat === 'kabupaten' && l.wilayah.kode === '14.05' && l.periode.kode === AGUSTUS && l.peringkat === 1)
      .map((l) => l.kode)
    const bukti = await Promise.all(kodeLencana.map((k) => ambilBuktiLencana(k)))
    const dariLencana = nama(bukti.map((b) => b.desa.nama))

    expect(dariPortal).toEqual(dasbor)
    expect(dariLanding).toEqual(dasbor)
    expect(dariLencana).toEqual(dasbor)
    for (const b of bukti) expect(b).toMatchObject({ peringkat: 1, kategori: 'umum', tingkat: 'kabupaten', periode: { kode: AGUSTUS } })
    expect(kunciDilarang([portal, induk.juara, bukti])).toEqual([])
  })

  it('4. tagihan di atas alur 2: bukti, lunas, kwitansi di desa, notifikasi tagihan dan siaran berdampingan, kabupaten tidak melihat tagihan', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const tagihan = (await ambilLangganan()).berjalan!
    expect(tagihan.status).toBe('terbit')
    await kirimBukti(
      tagihan.id,
      { tanggalTransfer: '2026-09-23', namaPengirim: 'Pemdes Sungai Sialang', nominalTransfer: tagihan.nominal },
      new File([new Uint8Array(2048)], 'bukti.png', { type: 'image/png' }),
    )
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect((await cariTagihanKonsol(String(tagihan.nominal))).data.map((t) => t.id)).toEqual([tagihan.id])
    const lunas = await tandaiLunas(tagihan.id, { diterimaPada: '2026-09-24', nominalDiterima: tagihan.nominal })
    expect(lunas.status).toBe('lunas')
    expect((await ambilKwitansiKonsol(tagihan.id)).nomor).toBe(lunas.kwitansi!.nomor)

    masukSebagai(AKUN_UJI.kaurKeuangan)
    const kwitansi = await ambilKwitansiDesa(tagihan.id)
    expect(kwitansi).toMatchObject({ nomor: lunas.kwitansi!.nomor, nominal: tagihan.nominal, desa: { nama: 'Sungai Sialang' } })
    expect((await ambilNotifikasi()).data.find((n) => n.judul === 'Pembayaran diterima')).toMatchObject({
      jenis: 'tagihan', rujukan: { jenis: 'tagihan', id: tagihan.id },
    })
    // Kades menerima siaran (alur 2) dan tagihan; keduanya tetap utuh dan beridentitas sendiri-sendiri.
    masukSebagai(AKUN_UJI.kades)
    const kotak = (await ambilNotifikasi()).data
    expect(kotak.find((n) => n.jenis === 'siaran-kabupaten' && n.rujukan?.id === siaranId)).toMatchObject({ judul: SIARAN.judul })
    expect(kotak.find((n) => n.judul === 'Pembayaran diterima')).toMatchObject({ jenis: 'tagihan', rujukan: { jenis: 'tagihan', id: tagihan.id } })
    expect(new Set(kotak.map((n) => n.id)).size).toBe(kotak.length)
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await ambilLangganan()).berjalan).toBeNull()

    // Kabupaten tidak punya jalan ke tagihan, dan tidak ada jejak tagihan di data yang dilihatnya.
    aturTokenSesi(null, 'konsol')
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    await expect(daftarTagihanKonsol({})).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    expect(await statusDenganToken('/konsol/tagihan', `kab.${AKUN_KABUPATEN_UJI.admin}`)).toBe(401)
    const lihatKabupaten = JSON.stringify([await ambilRingkasanKabupaten(), await ambilPemantauanKabupaten(), await portalMitra('kab-pelalawan')])
    for (const kunci of [lunas.kwitansi!.nomor, tagihan.id, 'kwitansi', 'nominalTransfer']) expect(lihatKabupaten.includes(kunci), kunci).toBe(false)
  })

  it('5. tampilan: tema galeri ke draf lalu terbit, CSS ber-@import ditolak, mematikan tingkat Lanjut menghapus CSS dari respons publik', async () => {
    masukSebagai(AKUN_UJI.operator)
    const awal = await ambilSitus()
    const warnaAwal = (await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama
    const tema = pasangTema(awal.terbit.tema, 'pesisir')
    expect(tema.warnaUtama.toUpperCase()).not.toBe(warnaAwal.toUpperCase())

    const draf = await simpanDraf(null, { tema, susunan: awal.terbit.susunan })
    expect(draf.tema.idGaleri).toBe('pesisir')
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama).toBe(warnaAwal)
    await terbitkan('Pasang tema Pesisir.')
    expect((await ambilIdentitasPublik('sungaisialang')).tema.warnaUtama.toUpperCase()).toBe(tema.warnaUtama.toUpperCase())

    const ditolak = await simpanDraf(null, { tema, susunan: susunanBawaan(), cssKustom: '@import "x.css";', blokHtml: [] }).catch((e: unknown) => e)
    expect(ditolak).toMatchObject({ status: 422, fields: { cssKustom: 'Baris 1: @import tidak diizinkan.' } })

    await simpanDraf(null, { tema, susunan: susunanBawaan(), cssKustom: '.kartu { color: red }', blokHtml: [] })
    await terbitkan('Dengan CSS kustom.')
    await aturLanjut(true)
    expect((await ambilIdentitasPublik('sungaisialang')).cssKustom).toContain(':where([data-situs-kustom])')
    await aturLanjut(false)
    expect((await ambilIdentitasPublik('sungaisialang')).cssKustom).toBeNull()
  })

  it('6. surat: jenis buatan desa bertata letak dua lambang ditandatangani, jenisnya diarsipkan, kode verifikasi tetap sah dengan tata letak saat terbit', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const j = await tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' })
    await ubahJenisSurat(j.id, { aktif: true, tataLetak: TATA_LETAK_SIAP['dua-lambang'] })
    masukSebagai(AKUN_UJI.operator)
    const { permohonan } = await buatPermohonan({ jenisId: j.id, pemohonId: AKUN_WARGA_UJI.siti, subjekId: null, mutasiId: null, isian: {}, ajukan: false })
    await jalankanAksi(permohonan.id, 'ajukan-ttd', { isian: {} })
    masukSebagai(AKUN_UJI.kades)
    const terbit = (await jalankanAksi(permohonan.id, 'tandatangani', { passphrase: 'sialang2026' })).permohonan.terbit
    expect(terbit?.tataLetak.siap).toBe('dua-lambang')

    masukSebagai(AKUN_UJI.operator)
    await arsipkanJenisSurat(j.id)
    expect(await verifikasiSurat('sungaisialang', terbit!.kodeVerifikasi)).toMatchObject({
      jenis: 'Surat Pengantar Kerja', nomor: terbit!.nomor, berlaku: { status: 'berlaku' },
    })
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await ambilRiwayatWarga(permohonan.id)).terbit?.tataLetak.siap).toBe('dua-lambang')
  })
})
