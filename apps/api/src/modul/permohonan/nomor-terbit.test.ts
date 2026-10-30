import { tanggalIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { ALFABET_KODE, POLA_KODE_VERIFIKASI } from '@sinfodes/kontrak/surat/verifikasi'
import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../../../test/basisdata'
import { sisipkanDesaContoh } from '../../../test/data-contoh'
import { bacaDesaTerbaru } from '../../basisdata/desa'
import { GalatApp } from '../../galat'
import { alokasiNomorTerbit, kodeVerifikasiBaru } from './nomor-terbit'

const DESA = 'desa_n'
const LAIN = 'desa_m'
const FORMAT = '{klasifikasi}/{urut}/{kodeDesa}/{bulanRomawi}/{tahun}'
const SKD = { id: 'js_skd', kode: 'SKD', klasifikasi: '470' }
const SKU = { id: 'js_sku', kode: 'SKU', klasifikasi: '500' }
const perTahun = { formatNomor: FORMAT, urutan: 'per-tahun' } as const
const perJenis = { formatNomor: FORMAT, urutan: 'per-jenis' } as const

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  for (const desa of [DESA, LAIN]) {
    await sisipkanDesaContoh(uji.sqlMigrasi, desa, 2)
    for (const j of [SKD, SKU]) {
      await uji.sqlMigrasi.unsafe(
        `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
         values ('${j.id}_${desa}', '${desa}', '${j.kode}', 'Jenis ${j.kode}', '${j.klasifikasi}', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`,
      )
    }
  }
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  await uji.sqlMigrasi`delete from permohonan where desa_id in (${DESA}, ${LAIN})`
})

let cacah = 0
const idJenis = (j: { id: string }, desa = DESA) => `${j.id}_${desa}`
/** Surat sudah terbit (Selesai, atau Dibatalkan) lewat peran pemilik: sisip tidak dijaga pemicu. */
async function sisipTerbit(m: { jenis: { id: string }; urut: number; tahun?: number; dibatalkan?: boolean; kode?: string; desa?: string }) {
  cacah += 1
  const desa = m.desa ?? DESA
  const tahun = m.tahun ?? 2026
  const status = m.dibatalkan ? 'dibatalkan' : 'selesai'
  const pembatalan = m.dibatalkan ? `'{"oleh":{"id":"u1","nama":"P"},"pada":"2026-10-30T10:00:00+07:00","catatan":"Salah"}'::jsonb` : 'null'
  await uji.sqlMigrasi.unsafe(
    `insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada, ditutup_pada,
       terbit_nomor, terbit_tahun, terbit_urut, terbit_kode, terbit_pada, terbit_penandatangan, terbit_mode, terbit_lembar_sandi, terbit_tata_letak, terbit_kop, pembatalan)
     values ('pn_${cacah}', '${desa}', 'dsn_${desa}', ${tahun}, ${cacah}, '${idJenis(m.jenis, desa)}', 'loket', 'pdk_${desa}_1', 'v1.abc', '${status}', now(), now(),
       'N-${cacah}', ${tahun}, ${m.urut}, '${m.kode ?? `SS-AAAA-${String(cacah).padStart(4, '2')}`}', now(), '{"id":"u1","nama":"Kades","peran":"kades","nip":null}'::jsonb,
       'tte', 'v1.lembar', '{}'::jsonb, '{}'::jsonb, ${pembatalan})`,
  )
}
const alokasi = (jenis: typeof SKD, pengaturan: { formatNomor: string; urutan: 'per-tahun' | 'per-jenis' }, tanggal = '2026-10-30', desa = DESA) =>
  uji.klien.dalamTransaksi('desa', { desaId: desa }, (db) =>
    alokasiNomorTerbit(db, { desaId: desa, jenis, pengaturan, tanggal, kodeDesa: 'SS' }),
  )

describe('alokasiNomorTerbit (rencana 8F2b Tugas 5, Ruling 6-7)', () => {
  it('nomor pertama tahun itu bernilai 1 dan berformat sesuai pengaturan (bulan Romawi dari tanggal WIB)', async () => {
    expect(await alokasi(SKD, perTahun)).toEqual({ tahun: 2026, urut: 1, nomor: '470/001/SS/X/2026' })
    expect(await alokasi(SKU, perTahun, '2026-12-05')).toEqual({ tahun: 2026, urut: 1, nomor: '500/001/SS/XII/2026' })
    const kustom = { formatNomor: '{urut}/{kodeJenis}/{tahun}', urutan: 'per-tahun' } as const
    expect(await alokasi(SKD, kustom)).toEqual({ tahun: 2026, urut: 1, nomor: '001/SKD/2026' })
  })

  it('berikutnya naik satu', async () => {
    await sisipTerbit({ jenis: SKD, urut: 1 })
    expect((await alokasi(SKD, perTahun)).urut).toBe(2)
    await sisipTerbit({ jenis: SKD, urut: 2 })
    await sisipTerbit({ jenis: SKD, urut: 3 })
    expect((await alokasi(SKD, perTahun)).urut).toBe(4)
  })

  it('mode per-tahun menghitung lintas jenis; per-jenis hanya jenisnya', async () => {
    await sisipTerbit({ jenis: SKD, urut: 1 })
    await sisipTerbit({ jenis: SKD, urut: 2 })
    await sisipTerbit({ jenis: SKU, urut: 3 })
    expect((await alokasi(SKU, perTahun)).urut).toBe(4)
    expect((await alokasi(SKD, perTahun)).urut).toBe(4)
    expect((await alokasi(SKU, perJenis)).urut).toBe(4)
    expect((await alokasi(SKD, perJenis)).urut).toBe(3)
  })

  it('per-jenis: jenis yang belum pernah terbit mulai dari 1 walau jenis lain sudah banyak', async () => {
    await sisipTerbit({ jenis: SKD, urut: 1 })
    await sisipTerbit({ jenis: SKD, urut: 2 })
    expect((await alokasi(SKU, perJenis)).urut).toBe(1)
  })

  it('nomor surat dibatalkan tidak dipakai ulang', async () => {
    await sisipTerbit({ jenis: SKD, urut: 1 })
    await sisipTerbit({ jenis: SKD, urut: 2, dibatalkan: true })
    expect((await alokasi(SKD, perTahun)).urut).toBe(3)
    expect((await alokasi(SKD, perJenis)).urut).toBe(3)
  })

  it('tahun baru mulai dari 1 lagi, tahun lama tidak terganggu', async () => {
    await sisipTerbit({ jenis: SKD, urut: 7 })
    expect((await alokasi(SKD, perTahun, '2027-01-01')).urut).toBe(1)
    await sisipTerbit({ jenis: SKD, urut: 1, tahun: 2027 })
    expect((await alokasi(SKD, perTahun, '2026-12-31')).urut).toBe(8)
    expect((await alokasi(SKD, perTahun, '2027-02-01')).urut).toBe(2)
  })

  it('pergantian tahun mengikuti WIB, bukan UTC (16.59 dan 17.00 UTC)', async () => {
    await sisipTerbit({ jenis: SKD, urut: 9 })
    const akhir = tanggalIsoWib(new Date('2026-12-31T16:59:00Z'))
    const awal = tanggalIsoWib(new Date('2026-12-31T17:00:00Z'))
    expect([akhir, awal]).toEqual(['2026-12-31', '2027-01-01'])
    expect(await alokasi(SKD, perTahun, akhir)).toMatchObject({ tahun: 2026, urut: 10, nomor: '470/010/SS/XII/2026' })
    expect(await alokasi(SKD, perTahun, awal)).toMatchObject({ tahun: 2027, urut: 1, nomor: '470/001/SS/I/2027' })
  })

  it('desa lain tidak ikut dihitung', async () => {
    await sisipTerbit({ jenis: SKD, urut: 5, desa: LAIN })
    expect((await alokasi(SKD, perTahun)).urut).toBe(1)
  })
})

describe('kunci nomor (rencana 8F2b Tugas 5, bukti deterministik)', () => {
  const tidur = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
  const sedangMenunggu = async (janji: Promise<unknown>) => (await Promise.race([janji.then(() => false), tidur(600).then(() => true)])) === true

  it('pemanggil kedua menunggu transaksi yang memegang kunci desa dan tahun yang sama, lalu membaca nomor yang baru ditulis', async () => {
    // Transaksi penahan: memegang kunci yang sama, menulis surat bernomor 1, belum commit.
    const penahan = await uji.sqlMigrasi.reserve()
    try {
      await penahan`begin`
      await penahan`select pg_advisory_xact_lock(hashtextextended(${`permohonan-nomor-terbit:${DESA}:2026`}, 0))`
      cacah += 1
      await penahan.unsafe(
        `insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada, ditutup_pada,
           terbit_nomor, terbit_tahun, terbit_urut, terbit_kode, terbit_pada, terbit_penandatangan, terbit_mode, terbit_lembar_sandi, terbit_tata_letak, terbit_kop)
         values ('pn_tahan', '${DESA}', 'dsn_${DESA}', 2026, ${cacah}, '${idJenis(SKD)}', 'loket', 'pdk_${DESA}_1', 'v1.abc', 'selesai', now(), now(),
           'N-1', 2026, 1, 'SS-AAAA-3333', now(), '{"id":"u1","nama":"Kades","peran":"kades","nip":null}'::jsonb, 'tte', 'v1.lembar', '{}'::jsonb, '{}'::jsonb)`,
      )
      const penunggu = alokasi(SKD, perTahun)
      expect(await sedangMenunggu(penunggu), 'pemanggil kedua harus menunggu kunci').toBe(true)
      await penahan`commit`
      expect((await penunggu).urut).toBe(2)
    } finally {
      await penahan`rollback`.catch(() => undefined)
      penahan.release()
    }
  })

  it('kunci desa lain atau tahun lain tidak menahan', async () => {
    const penahan = await uji.sqlMigrasi.reserve()
    try {
      await penahan`begin`
      await penahan`select pg_advisory_xact_lock(hashtextextended(${`permohonan-nomor-terbit:${DESA}:2026`}, 0))`
      expect(await sedangMenunggu(alokasi(SKD, perTahun, '2027-03-01'))).toBe(false)
      expect(await sedangMenunggu(alokasi(SKD, perTahun, '2026-10-30', LAIN))).toBe(false)
    } finally {
      await penahan`rollback`.catch(() => undefined)
      penahan.release()
    }
  })

  it('delapan penanda tangan serentak (jenis campuran, kedua mode) mendapat nomor 1-8 tanpa lubang dan tanpa ganda', async () => {
    for (const pengaturan of [perTahun, perJenis]) {
      await uji.sqlMigrasi`delete from permohonan where desa_id = ${DESA}`
      const ids: string[] = []
      for (let i = 0; i < 8; i++) {
        cacah += 1
        const id = `pp_${cacah}`
        ids.push(id)
        const jenis = i % 2 === 0 ? SKD : SKU
        await uji.sqlMigrasi.unsafe(
          `insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, tahap, masuk_pada)
           values ('${id}', '${DESA}', 'dsn_${DESA}', 2026, ${cacah}, '${idJenis(jenis)}', 'loket', 'pdk_${DESA}_1', 'v1.abc', 'perlu-ttd', 'tanda-tangan', now())`,
        )
      }
      // Seperti tandatangani: alokasi nomor dan kode lalu UPDATE baris sendiri, semuanya dalam satu transaksi permintaan.
      const hasil = await Promise.all(
        ids.map((id, i) =>
          uji.klien.dalamTransaksi('desa', { desaId: DESA }, async (db) => {
            const jenis = i % 2 === 0 ? SKD : SKU
            const n = await alokasiNomorTerbit(db, { desaId: DESA, jenis, pengaturan, tanggal: '2026-10-30', kodeDesa: 'SS' })
            const kode = await kodeVerifikasiBaru(db, DESA, 'SS', Math.random)
            await db.execute(dsqlNaik(id, n.tahun, n.urut, n.nomor, kode))
            return { jenis: jenis.kode, urut: n.urut, kode }
          }),
        ),
      )
      const urutan = (kode?: string) => hasil.filter((h) => kode === undefined || h.jenis === kode).map((h) => h.urut).sort((a, b) => a - b)
      if (pengaturan === perTahun) expect(urutan()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      else {
        expect(urutan('SKD')).toEqual([1, 2, 3, 4])
        expect(urutan('SKU')).toEqual([1, 2, 3, 4])
      }
      expect(new Set(hasil.map((h) => h.kode)).size).toBe(8)
    }
  })
})

function dsqlNaik(id: string, tahun: number, urut: number, nomor: string, kode: string) {
  return dsql`update permohonan set status = 'selesai', tahap = null, ditutup_pada = now(), terbit_nomor = ${nomor}, terbit_tahun = ${tahun}, terbit_urut = ${urut},
    terbit_kode = ${kode}, terbit_pada = now(), terbit_penandatangan = '{"id":"u1","nama":"Kades","peran":"kades","nip":null}'::jsonb, terbit_mode = 'tte',
    terbit_lembar_sandi = 'v1.lembar', terbit_tata_letak = '{}'::jsonb, terbit_kop = '{}'::jsonb where id = ${id}`
}

describe('kodeVerifikasiBaru (rencana 8F2b Ruling 8)', () => {
  /** Sumber acak yang menghasilkan huruf ke-`urutan(panggilan)` alfabet: kode pertama semua 'A', kedua semua 'B', dan seterusnya. */
  const acakBerlapis = () => {
    let n = 0
    return () => (Math.floor(n++ / 8) + 0.5) / ALFABET_KODE.length
  }
  const kodeBaru = (acak: () => number, desa = DESA) => uji.klien.dalamTransaksi('desa', { desaId: desa }, (db) => kodeVerifikasiBaru(db, desa, 'SS', acak))

  it('menghasilkan kode berpola dari sumber acak', async () => {
    expect(await kodeBaru(acakBerlapis())).toBe('SS-AAAA-AAAA')
    expect(await kodeBaru(Math.random)).toMatch(POLA_KODE_VERIFIKASI)
  })

  it('kode yang sudah ada di desa itu memaksa kode lain', async () => {
    await sisipTerbit({ jenis: SKD, urut: 1, kode: 'SS-AAAA-AAAA' })
    await sisipTerbit({ jenis: SKD, urut: 2, kode: 'SS-BBBB-BBBB' })
    expect(await kodeBaru(acakBerlapis())).toBe('SS-CCCC-CCCC')
  })

  it('kode yang sama di desa lain bukan bentrok', async () => {
    await sisipTerbit({ jenis: SKD, urut: 1, kode: 'SS-AAAA-AAAA', desa: LAIN })
    expect(await kodeBaru(acakBerlapis())).toBe('SS-AAAA-AAAA')
  })

  it('sepuluh kali selalu bentrok: 500 dengan pesan tetap', async () => {
    for (let i = 0; i < 10; i++) await sisipTerbit({ jenis: SKD, urut: i + 1, kode: `SS-${ALFABET_KODE[i].repeat(4)}-${ALFABET_KODE[i].repeat(4)}` })
    const galat = await kodeBaru(acakBerlapis()).catch((e: unknown) => e)
    expect(galat).toBeInstanceOf(GalatApp)
    expect(galat).toMatchObject({ status: 500, kode: 'SERVER', message: 'Kode verifikasi tidak bisa dibuat. Coba lagi.' })
  })
})

describe('bacaDesaTerbaru (rencana 8F2b Ruling 8 dan 10)', () => {
  it('dibaca dari tabel desa dalam transaksi yang sama, bukan dari cache: kode surat dan lambang terbaru', async () => {
    await uji.sqlMigrasi`update desa set kode_surat = 'KB', lambang = 'data:image/png;base64,AAAA' where id = ${DESA}`
    try {
      const d = await uji.klien.dalamTransaksi('desa', { desaId: DESA }, (db) => bacaDesaTerbaru(db, DESA))
      expect(d).toMatchObject({ id: DESA, kodeSurat: 'KB', lambang: 'data:image/png;base64,AAAA' })
    } finally {
      await uji.sqlMigrasi`update desa set kode_surat = '470', lambang = null where id = ${DESA}`
    }
  })
})
