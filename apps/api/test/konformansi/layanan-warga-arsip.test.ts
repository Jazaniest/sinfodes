// Skenario menyeluruh tahap 8F3 di server sungguhan lewat `panggilApi` dan modul `api/*` web yang sama: warga mengajukan surat dari
// HP beserta foto, petugas membukanya, surat diproses dan ditandatangani, muncul di arsip dan Buku Agenda, surat masuk dicatat
// dengan pindaian, lalu surat dibatalkan. Butir per rute ada di src/modul/{warga,arsip,buku,permohonan}/*.test.ts.
import { AKUN_UJI } from '@sinfodes/demo/uji-akun'
import { UKURAN_SEMUA_BARIS } from '@sinfodes/kontrak/buku/schema'
import { describe, expect, it } from 'vitest'
import { urlBerkasLampiran, urlBerkasScan } from '@/api/berkas'
import { catatSuratMasuk, daftarSuratKeluar, daftarSuratMasuk, semuaSuratKeluar } from '@/api/arsip'
import { ambilIsiBuku } from '@/api/buku'
import { GalatApi } from '@/api/galat'
import { verifikasiSurat } from '@/api/publik'
import { ambilPermohonan, aturPassphrase, jalankanAksi } from '@/api/surat'
import { ambilKeluargaWarga, ambilRiwayatWarga, daftarJenisSuratWarga, daftarRiwayatWarga, kirimPermohonanWarga } from '@/api/warga'
import { jpegBuatan, pdfBuatan } from '../helpers/berkas-buatan'
import { masukSebagai, masukSebagaiWarga, pakaiApiNyata } from '../api-nyata'

const api = pakaiApiNyata({ segarTiapUji: true })
const sql = () => api.uji.sqlMigrasi

const SYARAT = ['KTP', 'KK', 'Pengantar RT']
const PASSPHRASE = 'sialang2026'
const POLA_NIK = '(^|[^0-9])[0-9]{16}([^0-9]|$)'

const buka = (jalur: string) => fetch(new URL(jalur, api.asal()))
const berkasJpeg = (nama: string) => new File([new Uint8Array(jpegBuatan({ exif: true }))], nama, { type: 'image/jpeg' })

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('layanan warga, arsip, dan Buku Agenda (rencana 8F3 Tugas 11)', () => {
  it('warga mengajukan SKTM dengan tiga foto, petugas membukanya, surat terbit, masuk arsip dan Agenda bersama surat masuk, lalu dibatalkan', async () => {
    // --- Warga mengajukan dari HP; kirim ulang dengan kunci yang sama tidak menggandakan.
    await masukSebagaiWarga('pdk_siti_rahmah')
    const jenis = (await daftarJenisSuratWarga()).find((j) => j.kode === 'SKTM')
    if (!jenis) throw new Error('SKTM tidak ada di katalog warga')
    expect(jenis.syarat).toEqual(SYARAT)
    const data = {
      kunci: 'kirim-konformansi-0001', jenisId: jenis.id, untukId: 'pdk_siti_rahmah',
      isian: { keperluan: 'Kesehatan', instansiTujuan: 'RSUD Selasih' }, lampiran: SYARAT.map((syarat) => ({ syarat })),
    }
    const kirim = await kirimPermohonanWarga(data, SYARAT.map((_, i) => berkasJpeg(`IMG_${i}.jpg`)))
    const ulang = await kirimPermohonanWarga(data, SYARAT.map((_, i) => berkasJpeg(`IMG_${i}.jpg`)))
    expect(ulang).toEqual(kirim)
    expect(await sql()`select count(*)::int as n from permohonan where id = ${kirim.id}`).toEqual([{ n: 1 }])
    const id = kirim.id

    const riwayat = (await daftarRiwayatWarga()).data
    expect(riwayat.find((p) => p.id === id)).toMatchObject({ status: 'menunggu', tiket: kirim.tiket, posisi: 'menunggu diperiksa petugas desa' })
    expect((await ambilRiwayatWarga(id)).terbit).toBeNull()
    expect((await ambilKeluargaWarga()).anggota.map((a) => a.id)).toContain('pdk_nur_aini')

    // --- Petugas membuka foto syarat yang diunggah warga (tipe tetap, tanpa metadata GPS).
    await masukSebagai(AKUN_UJI.operator)
    const dibuka = await ambilPermohonan(id)
    expect(dibuka.permohonan.kanal).toBe('online')
    expect(dibuka.permohonan.lampiran.map((l) => l.syarat)).toEqual(SYARAT)
    for (const l of dibuka.permohonan.lampiran) {
      const res = await buka(urlBerkasLampiran(id, l.id))
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('image/jpeg')
      expect(Buffer.from(await res.arrayBuffer()).toString('latin1')).not.toContain('GPS')
    }

    // --- Diproses, diajukan untuk tanda tangan, diparaf bila perlu, ditandatangani Kepala Desa.
    await jalankanAksi(id, 'proses')
    const diajukan = await jalankanAksi(id, 'ajukan-ttd')
    if (diajukan.permohonan.tahap === 'paraf') {
      await masukSebagai(AKUN_UJI.sekdes)
      await jalankanAksi(id, 'paraf')
    }
    await masukSebagai(AKUN_UJI.kades)
    await aturPassphrase({ kataSandi: 'demo', passphrase: PASSPHRASE })
    const terbit = (await jalankanAksi(id, 'tandatangani', { passphrase: PASSPHRASE })).permohonan.terbit
    if (!terbit) throw new Error('Surat belum terbit')

    // --- Warga membaca detail Selesai dengan lembar suratnya.
    await masukSebagaiWarga('pdk_siti_rahmah')
    const selesai = await ambilRiwayatWarga(id)
    expect(selesai.permohonan).toMatchObject({ status: 'selesai', nomor: terbit.nomor })
    expect(selesai.terbit?.lembar.judul).toBe('SURAT KETERANGAN TIDAK MAMPU')

    // --- Arsip surat keluar: nomor yang sama, kanal online, penanda tangan Kepala Desa.
    await masukSebagai(AKUN_UJI.operator)
    const arsip = await semuaSuratKeluar({ bulan: '2026-09' })
    expect(arsip.find((b) => b.id === id)).toMatchObject({ nomor: terbit.nomor, kanal: 'online', status: 'selesai', untuk: 'Siti Rahmah', penandatangan: { peran: 'kades' } })
    expect((await daftarSuratKeluar({ bulan: '2026-09', jenis: 'SKTM' })).data.some((b) => b.id === id)).toBe(true)

    // --- Surat masuk dicatat dengan pindaian PDF; pindaiannya dibuka lagi byte demi byte.
    const pdf = pdfBuatan('/Info (konformansi)')
    const baru = await catatSuratMasuk(
      {
        diterima: '2026-09-23', nomor: '005/321/Kec-TM/2026', tanggalSurat: '2026-09-21', pengirim: 'Camat Teluk Meranti', perihal: 'Undangan rapat koordinasi',
        disposisiKepada: 'Sekretaris Desa', disposisiInstruksi: 'Hadiri dan laporkan.',
      },
      new File([new Uint8Array(pdf)], 'Undangan Camat.pdf', { type: 'application/pdf' }),
    )
    expect(baru).toMatchObject({ scan: { berkas: 'Undangan Camat.pdf' }, disposisi: { kepada: 'Sekretaris Desa' } })
    expect((await daftarSuratMasuk({ bulan: '2026-09', pageSize: 100 })).data.some((s) => s.id === baru.id)).toBe(true)
    const scan = await buka(urlBerkasScan(baru.id))
    expect(scan.status).toBe(200)
    expect(scan.headers.get('Content-Type')).toBe('application/pdf')
    expect(Buffer.compare(Buffer.from(await scan.arrayBuffer()), pdf)).toBe(0)

    // --- Buku Agenda memuat kedua surat, urut tanggal dicatat.
    const agenda = await ambilIsiBuku('agenda', { page: 1, pageSize: UKURAN_SEMUA_BARIS })
    const baris = (nomor: string, jenisSurat: 'Keluar' | 'Masuk') => agenda.baris.findIndex((b) => b[2] === jenisSurat && b[3] === nomor)
    const iKeluar = baris(terbit.nomor, 'Keluar')
    const iMasuk = baris('005/321/Kec-TM/2026', 'Masuk')
    expect(iKeluar).toBeGreaterThanOrEqual(0)
    expect(iMasuk).toBeGreaterThanOrEqual(0)
    expect(agenda.baris[iKeluar]).toEqual(expect.arrayContaining(['Siti Rahmah', 'Surat Keterangan Tidak Mampu']))
    expect(agenda.baris[iMasuk]).toEqual(expect.arrayContaining(['Camat Teluk Meranti', 'Undangan rapat koordinasi']))
    expect(iMasuk).toBeLessThan(iKeluar)

    // --- Pembatalan: tetap di arsip berstatus Dibatalkan dan di Agenda; verifikasi publik menjawab Dibatalkan.
    await masukSebagai(AKUN_UJI.sekdes)
    expect((await jalankanAksi(id, 'batalkan', { alasan: 'Salah nama pemohon.' })).permohonan.status).toBe('dibatalkan')
    expect((await semuaSuratKeluar({ bulan: '2026-09' })).find((b) => b.id === id)?.status).toBe('dibatalkan')
    expect((await ambilIsiBuku('agenda', { page: 1, pageSize: UKURAN_SEMUA_BARIS })).baris.some((b) => b[3] === terbit.nomor)).toBe(true)
    expect((await verifikasiSurat('sungaisialang', terbit.kodeVerifikasi)).berlaku.status).toBe('dibatalkan')

    // --- Warga masih bisa membaca riwayatnya (Dibatalkan), tetapi tidak menerima lembar.
    await masukSebagaiWarga('pdk_siti_rahmah')
    const batal = await ambilRiwayatWarga(id)
    expect(batal.permohonan.status).toBe('dibatalkan')
    expect(batal.terbit).toBeNull()

    // --- Tidak ada 16 angka berurutan polos di kolom teks mana pun yang ditulis alur ini; berkas tidak polos di tabelnya.
    for (const tabel of ['permohonan', 'riwayat_surat', 'jejak_audit', 'aktivitas', 'surat_masuk']) {
      const [{ n }] = await sql().unsafe(`select count(*)::int as n from ${tabel} where ${tabel}::text ~ '${POLA_NIK}'`)
      expect(n, tabel).toBe(0)
    }
    const [{ n: polos }] = await sql()`select count(*)::int as n from berkas_surat
      where position(decode('ffd8ff', 'hex') in isi) = 1 or position(decode('255044462d', 'hex') in isi) > 0`
    expect(polos).toBe(0)
  })

  it('warga lain tidak melihat permohonan Siti dan kunci kirim dibatasi per warga', async () => {
    await masukSebagaiWarga('pdk_siti_rahmah')
    const jenis = (await daftarJenisSuratWarga()).find((j) => j.kode === 'SKD')
    if (!jenis) throw new Error('SKD tidak ada di katalog warga')
    const data = {
      kunci: 'kirim-konformansi-0002', jenisId: jenis.id, untukId: 'pdk_siti_rahmah', isian: { keperluan: 'Beasiswa' },
      lampiran: SYARAT.map((syarat) => ({ syarat })),
    }
    const { id } = await kirimPermohonanWarga(data, SYARAT.map((_, i) => berkasJpeg(`IMG_${i}.jpg`)))

    await masukSebagaiWarga('pdk_zulkifli')
    const asing = await galatDari(ambilRiwayatWarga(id))
    expect([asing.status, asing.message]).toEqual([404, 'Permohonan tidak ditemukan.'])
    expect((await daftarRiwayatWarga()).data.some((p) => p.id === id)).toBe(false)
    // Kunci yang sama di warga lain adalah pengajuan lain.
    const lain = await kirimPermohonanWarga({ ...data, untukId: 'pdk_zulkifli' }, SYARAT.map((_, i) => berkasJpeg(`IMG_${i}.jpg`)))
    expect(lain.id).not.toBe(id)
  })
})
