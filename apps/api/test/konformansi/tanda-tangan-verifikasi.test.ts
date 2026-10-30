// Skenario menyeluruh tahap 8F2b di server sungguhan lewat `panggilApi` dan modul `api/*` web yang sama: surat dari loket sampai
// verifikasi QR, pembatalan, batas antar desa, matriks peran, dan desa Ditangguhkan. Butir per aksi ada di
// src/modul/permohonan/{tandatangan,serah-terima}.test.ts dan src/modul/publik/rute.test.ts.
import { AKUN_DESA_BARU_UJI, AKUN_UJI } from '@sinfodes/demo/uji-akun'
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { verifikasiSurat } from '@/api/publik'
import { ambilPermohonan, aturPassphrase, bacaStatusPassphrase, buatPermohonan, daftarPermohonan, jalankanAksi } from '@/api/surat'
import { masukSebagai, pakaiApiNyata } from '../api-nyata'

const api = pakaiApiNyata({ segarTiapUji: true })
const sql = () => api.uji.sqlMigrasi

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

const PESAN = {
  lihat: 'Peran Anda tidak berhak membuka Layanan Surat.',
  kades: 'Surat ini harus ditandatangani Kepala Desa.',
  batal: 'Hanya Sekretaris Desa dan Kepala Desa yang bisa membatalkan surat.',
  ubah: 'Peran Anda tidak berhak mengubah permohonan.',
  kirim: 'Peran Anda tidak berhak mengirim surat.',
  ttd: 'Peran Anda tidak menandatangani surat.',
  tangguh: 'Langganan desa ditangguhkan. Panel hanya bisa dilihat.',
  belumAda: 'Anda belum menetapkan passphrase tanda tangan.',
} as const
const PASSPHRASE = 'sialang2026'
const ABJAD = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const kodeSalah = (i: number) => `SS-${ABJAD[(i >> 5) & 31]}${ABJAD[i & 31]}ZZ-ZZZZ`
const POLA_NIK = '(^|[^0-9])[0-9]{16}([^0-9]|$)'

describe('SKTM dari loket sampai verifikasi QR (rencana 8F2b Tugas 9)', () => {
  it('Operator mengajukan, Sekdes memaraf, Kades menetapkan passphrase dan menandatangani; serah terima, verifikasi, pembatalan, dan batas antar desa', async () => {
    const [{ id: jenisId }] = await sql()`select id from jenis_surat where desa_id = 'desa_sungai_sialang' and kode = 'SKTM'`
    await masukSebagai(AKUN_UJI.operator)
    const { permohonan: baru } = await buatPermohonan({
      jenisId: jenisId as string, pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null,
      isian: { keperluan: 'Kesehatan', instansiTujuan: 'RSUD Selasih' }, ajukan: true,
    })
    const id = baru.id
    expect(baru).toMatchObject({ status: 'perlu-ttd', terbit: null })
    if (baru.tahap === 'paraf') {
      await masukSebagai(AKUN_UJI.sekdes)
      expect((await jalankanAksi(id, 'paraf')).permohonan.tahap).toBe('tanda-tangan')
    }

    // Kepala Desa belum punya passphrase: status false, tanda tangan 422 tanpa mengubah apa pun.
    await masukSebagai(AKUN_UJI.kades)
    expect(await bacaStatusPassphrase()).toEqual({ diatur: false })
    expect((await galatDari(jalankanAksi(id, 'tandatangani', { passphrase: PASSPHRASE }))).fields).toEqual({ passphrase: PESAN.belumAda })
    expect((await ambilPermohonan(id)).permohonan).toMatchObject({ status: 'perlu-ttd', terbit: null })
    expect(await aturPassphrase({ kataSandi: 'demo', passphrase: PASSPHRASE })).toEqual({ diatur: true })
    expect(await bacaStatusPassphrase()).toEqual({ diatur: true })
    const { permohonan: p } = await jalankanAksi(id, 'tandatangani', { passphrase: PASSPHRASE })
    expect(p.status).toBe('selesai')
    const terbit = p.terbit
    expect(terbit?.lembar.judul).toBe('SURAT KETERANGAN TIDAK MAMPU')
    expect(terbit?.kodeVerifikasi).toMatch(/^SS-/)
    // Detail menampilkan lembar yang dibekukan.
    expect((await ambilPermohonan(id)).permohonan.terbit).toEqual(terbit)

    // Operator menandai sudah diambil dan mengirim WhatsApp (simulator): hanya riwayat, nomor tersamar.
    await masukSebagai(AKUN_UJI.operator)
    expect((await jalankanAksi(id, 'tandai-diambil')).permohonan.diambil?.oleh.nama).toBe('Rosmiati')
    const wa = (await jalankanAksi(id, 'kirim-wa')).permohonan.riwayat.at(-1)
    expect(wa).toMatchObject({ kejadian: 'kirim-wa', catatan: 'Ke 0812-••••-2231' })

    // Verifikasi publik dengan kode itu: berhasil, nama tersamar, tanpa NIK.
    const kode = terbit?.kodeVerifikasi ?? '-'
    const h = await verifikasiSurat('sungaisialang', kode)
    expect(h).toMatchObject({ jenis: expect.any(String), nomor: terbit?.nomor, berlaku: { status: 'berlaku' }, penandatangan: { jabatan: 'Kepala Desa', nama: 'H. Muhammad Nasir' } })
    expect(h.nama).toMatch(/^\S\*+/)
    expect(JSON.stringify(h)).not.toMatch(/[0-9]{16}/)

    // Sekdes membatalkan: verifikasi menampilkan Dibatalkan.
    await masukSebagai(AKUN_UJI.sekdes)
    expect((await jalankanAksi(id, 'batalkan', { alasan: 'Salah nama pemohon.' })).permohonan.status).toBe('dibatalkan')
    expect((await verifikasiSurat('sungaisialang', kode)).berlaku.status).toBe('dibatalkan')

    // Tanjung Lamo (alamat dan akun sendiri): tidak melihat surat itu dan kodenya tidak ditemukan di alamatnya.
    await sql()`update desa set status = 'Aktif' where id = 'desa_tanjung_lamo'`
    await masukSebagai(AKUN_DESA_BARU_UJI)
    expect((await galatDari(ambilPermohonan(id))).kode).toBe('NOT_FOUND')
    expect((await daftarPermohonan({ status: 'selesai', periode: 365 })).data.some((b) => b.id === id)).toBe(false)
    const asing = await galatDari(verifikasiSurat('tanjunglamo', kode))
    expect(asing).toMatchObject({ kode: 'NOT_FOUND', message: 'Kode tidak ditemukan. Periksa kembali, atau hubungi kantor desa.' })
    // Sepuluh kode salah mengunci verifikasi hanya untuk alamat itu (kode asing di atas sudah satu percobaan).
    for (let i = 1; i <= 8; i++) expect((await galatDari(verifikasiSurat('tanjunglamo', kodeSalah(i)))).kode, `salah ke-${i}`).toBe('NOT_FOUND')
    expect((await galatDari(verifikasiSurat('tanjunglamo', kodeSalah(9)))).kode).toBe('RATE_LIMITED')
    api.keAlamat('sungaisialang')
    expect((await verifikasiSurat('sungaisialang', kode)).berlaku.status).toBe('dibatalkan')

    // Pindai NIK: tidak ada 16 angka berurutan polos di kolom teks mana pun yang ditulis alur ini.
    for (const tabel of ['permohonan', 'riwayat_surat', 'jejak_audit', 'aktivitas']) {
      const [{ n }] = await sql().unsafe(`select count(*)::int as n from ${tabel} where ${tabel}::text ~ '${POLA_NIK}'`)
      expect(n, tabel).toBe(0)
    }
  })
})

describe('batas peran pada empat aksi dan dua rute passphrase (rencana 8F2b Tugas 9)', () => {
  it('lima peran: kode status dan pesan persis; Kepala Dusun hanya dusunnya', async () => {
    await sql()`update jenis_surat set boleh_atas_nama = false where id = 'js_ss_skd'`
    const [{ id: ttd }] = await sql()`select id from permohonan where desa_id = 'desa_sungai_sialang' and status = 'perlu-ttd' and tahap = 'tanda-tangan' and jenis_id = 'js_ss_skd' limit 1`
    const dusunKadus = (await sql()`select dusun_id from pengguna where id = ${AKUN_UJI.kadus}`)[0].dusun_id as string
    const selesaiDi = async (dalam: boolean) =>
      (await sql()`select p.id from permohonan p join penduduk d on d.id = p.pemohon_id join dusun s on s.id = p.dusun_id
        where p.desa_id = 'desa_sungai_sialang' and p.status = 'selesai' and d.telepon_sandi is not null and p.diambil is null
          and (p.dusun_id = ${dusunKadus}) = ${dalam} order by p.id limit 1`)[0].id as string
    const dalam = await selesaiDi(true)
    const luar = await selesaiDi(false)

    const tolak = async (janji: Promise<unknown>, status: number, pesan: string, nama: string) => {
      const g = await galatDari(janji)
      expect([g.status, g.message], nama).toEqual([status, pesan])
    }
    const aksi = (id: string, a: Parameters<typeof jalankanAksi>[1]) => jalankanAksi(id, a, { passphrase: PASSPHRASE, alasan: 'Salah ketik.' })

    // Operator: tidak menandatangani dan tidak membatalkan; menandai dan mengirim boleh.
    await masukSebagai(AKUN_UJI.operator)
    await tolak(aksi(ttd, 'tandatangani'), 403, PESAN.kades, 'operator tandatangani')
    await tolak(aksi(dalam, 'batalkan'), 403, PESAN.batal, 'operator batalkan')
    for (const lewat of [bacaStatusPassphrase(), aturPassphrase({ kataSandi: 'demo', passphrase: PASSPHRASE })]) await tolak(lewat, 403, PESAN.ttd, 'operator passphrase')
    expect((await aksi(dalam, 'tandai-diambil')).permohonan.diambil).not.toBeNull()
    expect((await aksi(dalam, 'kirim-wa')).permohonan.riwayat.at(-1)?.kejadian).toBe('kirim-wa')

    // Kaur Keuangan tidak punya hak membuka Layanan Surat sama sekali.
    await masukSebagai(AKUN_UJI.kaurKeuangan)
    for (const a of ['tandatangani', 'batalkan', 'tandai-diambil', 'kirim-wa'] as const) await tolak(aksi(luar, a), 403, PESAN.lihat, `kaur ${a}`)
    await tolak(bacaStatusPassphrase(), 403, PESAN.ttd, 'kaur passphrase')

    // Kepala Dusun: dusunnya sendiri 403 per aksi, di luar dusun 404; passphrase 403.
    await masukSebagai(AKUN_UJI.kadus)
    await tolak(aksi(dalam, 'tandatangani'), 403, PESAN.kades, 'kadus tandatangani')
    await tolak(aksi(dalam, 'batalkan'), 403, PESAN.batal, 'kadus batalkan')
    await tolak(aksi(dalam, 'tandai-diambil'), 403, PESAN.ubah, 'kadus tandai-diambil')
    await tolak(aksi(dalam, 'kirim-wa'), 403, PESAN.kirim, 'kadus kirim-wa')
    for (const a of ['tandatangani', 'batalkan', 'tandai-diambil', 'kirim-wa'] as const) expect((await galatDari(aksi(luar, a))).status, `kadus luar ${a}`).toBe(404)
    await tolak(bacaStatusPassphrase(), 403, PESAN.ttd, 'kadus passphrase')

    // Sekretaris Desa: tanda tangan hanya jenis yang boleh atas nama; membatalkan dan passphrase boleh.
    await masukSebagai(AKUN_UJI.sekdes)
    await tolak(aksi(ttd, 'tandatangani'), 403, PESAN.kades, 'sekdes tandatangani jenis bukan atas nama')
    expect(await bacaStatusPassphrase()).toEqual({ diatur: false })
    expect(await aturPassphrase({ kataSandi: 'demo', passphrase: PASSPHRASE })).toEqual({ diatur: true })
    expect((await aksi(luar, 'batalkan')).permohonan.status).toBe('dibatalkan')

    // Kepala Desa: menandatangani, membatalkan, dan menandai boleh.
    await masukSebagai(AKUN_UJI.kades)
    await aturPassphrase({ kataSandi: 'demo', passphrase: PASSPHRASE })
    expect((await aksi(ttd, 'tandatangani')).permohonan.status).toBe('selesai')
    expect((await aksi(ttd, 'tandai-diambil')).permohonan.diambil?.oleh.nama).toBe('H. Muhammad Nasir')
  })

  it('desa Ditangguhkan menolak empat aksi dan PUT passphrase; GET passphrase tetap boleh', async () => {
    await sql()`update desa set status = 'Ditangguhkan' where id = 'desa_sungai_sialang'`
    const [{ id: ttd }] = await sql()`select id from permohonan where desa_id = 'desa_sungai_sialang' and status = 'perlu-ttd' and tahap = 'tanda-tangan' limit 1`
    const [{ id: selesai }] = await sql()`select id from permohonan where desa_id = 'desa_sungai_sialang' and status = 'selesai' limit 1`
    await masukSebagai(AKUN_UJI.kades)
    expect(await bacaStatusPassphrase()).toEqual({ diatur: false })
    for (const [id, a] of [[ttd, 'tandatangani'], [selesai, 'batalkan'], [selesai, 'tandai-diambil'], [selesai, 'kirim-wa']] as const) {
      const g = await galatDari(jalankanAksi(id as string, a, { passphrase: PASSPHRASE, alasan: 'Salah ketik.' }))
      expect([g.status, g.message], a).toEqual([403, PESAN.tangguh])
    }
    const put = await galatDari(aturPassphrase({ kataSandi: 'demo', passphrase: PASSPHRASE }))
    expect([put.status, put.message]).toEqual([403, PESAN.tangguh])
  })
})
