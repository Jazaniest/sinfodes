import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GOLONGAN_TABEL } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  // Cetakan sudah disemai dunia demo; uji ini menghitung baris, jadi mulai dari tabel kosong.
  await uji.sqlMigrasi`delete from riwayat_surat`
  await uji.sqlMigrasi`delete from permohonan`
  for (const desa of ['desa_a', 'desa_b']) {
    await sisipkanDesaContoh(uji.sqlMigrasi, desa, 2)
    await uji.sqlMigrasi.unsafe(
      `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
       values ('js_${desa}', '${desa}', 'SKD', 'Jenis SKD', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`,
    )
    await uji.sqlMigrasi.unsafe(
      `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
       values ('js2_${desa}', '${desa}', 'SKU', 'Jenis SKU', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`,
    )
  }
})
afterAll(async () => {
  await uji?.tutup()
})

const kodePg = (e: unknown): string | undefined => {
  for (let x = e as { code?: string; cause?: unknown } | undefined; x; x = x.cause as typeof x) if (x.code) return x.code
  return undefined
}
const galatDari = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p
    return null
  } catch (e) {
    return e
  }
}
const jalankan = (peran: 'desa' | 'kabupaten' | 'konsol' | 'publik', desaId: string | undefined, perintah: string) =>
  galatDari(uji.klien.dalamTransaksi(peran, { desaId }, (db) => db.execute(dsql.raw(perintah))))
const ubah = (desaId: string, perintah: string) => uji.klien.dalamTransaksi('desa', { desaId }, async (db) => (await db.execute(dsql.raw(perintah))).count)
const hitung = (desaId: string | undefined, tabel: string) =>
  uji.klien.dalamTransaksi('desa', { desaId }, async (db) => Number((await db.execute<{ n: number }>(dsql.raw(`select count(*)::int as n from ${tabel}`)))[0].n))
const punyaHak = async (peran: string, tabel: string, hak: string) =>
  (await uji.sqlMigrasi`select has_table_privilege(${peran}, ${tabel}, ${hak}) as ada`)[0].ada as boolean
const punyaHakKolom = async (peran: string, tabel: string, kolom: string, hak: 'UPDATE' | 'INSERT') =>
  (await uji.sqlMigrasi`select has_column_privilege(${peran}, ${tabel}, ${kolom}, ${hak}) as ada`)[0].ada as boolean
const kolomTabel = async (tabel: string) =>
  (await uji.sqlMigrasi`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${tabel}`).map((b) => b.column_name as string)

const TABEL = ['permohonan', 'riwayat_surat'] as const
/** Kolom yang boleh diubah peran desa (rencana 8F2a Tugas 2). */
const KOLOM_UBAH = ['isian_sandi', 'status', 'tahap', 'dikembalikan', 'penolakan', 'ditutup_pada', 'catatan_internal']
/** Kolom yang belum bisa ditulis peran desa di 8F2a (ditulis tahap 8F2b). */
const KOLOM_TERTUTUP = [
  'pembatalan', 'diambil', 'terbit_nomor', 'terbit_tahun', 'terbit_urut', 'terbit_kode', 'terbit_pada', 'terbit_penandatangan', 'terbit_mode',
  'terbit_berlaku_sampai', 'terbit_lembar_sandi', 'terbit_tata_letak', 'terbit_kop', 'hash_dokumen', 'tanda_tangan',
]
const NIK = '1405095203918002'
/** Sama dengan `KEJADIAN_SURAT` kontrak. */
const KEJADIAN = ['diajukan', 'dibuat', 'disimpan', 'proses', 'tolak', 'ajukan-ttd', 'paraf', 'kembalikan', 'tandatangani', 'batalkan', 'tandai-diambil', 'kirim-wa']

type Kolom = Record<string, string>
let cacah = 0
const baru = (desaId: string, ekstra: Kolom = {}): Kolom => {
  cacah += 1
  return {
    id: `'pm_${cacah}'`,
    desa_id: `'${desaId}'`,
    dusun_id: `'dsn_${desaId}'`,
    tahun: '2026',
    no_urut: String(cacah),
    jenis_id: `'js_${desaId}'`,
    kanal: `'loket'`,
    pemohon_id: `'pdk_${desaId}_1'`,
    isian_sandi: `'v1.abc'`,
    status: `'menunggu'`,
    masuk_pada: 'now()',
    ...ekstra,
  }
}
/** Kolom surat terbit lengkap; `urut` menentukan nomor dan kode agar tidak bentrok antar baris. */
const terbit = (urut: number, ekstra: Kolom = {}): Kolom => ({
  terbit_nomor: `'470/${urut}/SS/X/2026'`,
  terbit_tahun: '2026',
  terbit_urut: String(urut),
  terbit_kode: `'SS-KODE-${urut}'`,
  terbit_pada: 'now()',
  terbit_penandatangan: `'{"id":"u1","nama":"Kades","peran":"kades","nip":null}'::jsonb`,
  terbit_mode: `'tte'`,
  terbit_lembar_sandi: `'v1.lembar'`,
  terbit_tata_letak: `'{}'::jsonb`,
  terbit_kop: `'{}'::jsonb`,
  ...ekstra,
})
const sqlSisip = (tabel: string, k: Kolom) => `insert into ${tabel} (${Object.keys(k).join(', ')}) values (${Object.values(k).join(', ')})`
const sisip = (k: Kolom) => galatDari(uji.sqlMigrasi.unsafe(sqlSisip('permohonan', k)))
const sisipOk = async (k: Kolom) => {
  expect(await sisip(k)).toBeNull()
  return k.id.replaceAll("'", '')
}
const catatan = (teks: string) => ({ oleh: { id: 'u1', nama: 'Petugas', peran: 'operator' }, pada: '2026-10-27T10:00:00+07:00', catatan: teks })
const json = (nilai: unknown) => `'${JSON.stringify(nilai).replaceAll("'", "''")}'::jsonb`
const ditutup = { ditutup_pada: 'now()' }

describe('permohonan dan riwayat surat (rencana 8F2a Tugas 2)', () => {
  it('kedua tabel digolongkan desa-privat', () => {
    for (const tabel of TABEL) expect(GOLONGAN_TABEL[tabel], tabel).toBe('desa-privat')
  })

  it('kolom dan tipenya sesuai rencana', async () => {
    const tipe = async (tabel: string) =>
      Object.fromEntries((await uji.sqlMigrasi`select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = ${tabel}`).map((b) => [b.column_name, b.data_type]))
    expect(await tipe('permohonan')).toEqual({
      id: 'text', desa_id: 'text', dusun_id: 'text', tahun: 'integer', no_urut: 'integer', jenis_id: 'text', kanal: 'text', pemohon_id: 'text',
      subjek_id: 'text', mutasi_id: 'text', isian_sandi: 'text', status: 'text', tahap: 'text', dikembalikan: 'jsonb', penolakan: 'jsonb',
      pembatalan: 'jsonb', diambil: 'jsonb', masuk_pada: 'timestamp with time zone', ditutup_pada: 'timestamp with time zone', lampiran: 'jsonb',
      catatan_internal: 'text', terbit_nomor: 'text', terbit_tahun: 'integer', terbit_urut: 'integer', terbit_kode: 'text',
      terbit_pada: 'timestamp with time zone', terbit_penandatangan: 'jsonb', terbit_mode: 'text', terbit_berlaku_sampai: 'date',
      terbit_lembar_sandi: 'text', terbit_tata_letak: 'jsonb', terbit_kop: 'jsonb', hash_dokumen: 'text', tanda_tangan: 'text',
    })
    expect(await tipe('riwayat_surat')).toEqual({
      urutan: 'bigint', id: 'text', desa_id: 'text', permohonan_id: 'text', kejadian: 'text', waktu: 'timestamp with time zone', oleh: 'jsonb', catatan: 'text',
    })
  })

  it('RLS aktif dan dipaksa pada kedua tabel', async () => {
    for (const tabel of TABEL) {
      const [b] = await uji.sqlMigrasi`select relrowsecurity as aktif, relforcerowsecurity as paksa from pg_class where relname = ${tabel}`
      expect(b, tabel).toEqual({ aktif: true, paksa: true })
    }
  })

  it('peran lain tanpa hak apa pun pada kedua tabel', async () => {
    for (const tabel of TABEL) {
      for (const peran of ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik']) {
        for (const hak of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) expect(await punyaHak(peran, tabel, hak), `${peran} ${hak} ${tabel}`).toBe(false)
      }
    }
  })

  it('peran desa: permohonan SELECT dan INSERT per kolom, tanpa DELETE; riwayat_surat SELECT dan INSERT saja', async () => {
    expect(await punyaHak('sinfodes_desa', 'permohonan', 'SELECT')).toBe(true)
    expect(await punyaHak('sinfodes_desa', 'permohonan', 'DELETE')).toBe(false)
    expect(await punyaHak('sinfodes_desa', 'riwayat_surat', 'SELECT')).toBe(true)
    expect(await punyaHak('sinfodes_desa', 'riwayat_surat', 'INSERT')).toBe(true)
    expect(await punyaHak('sinfodes_desa', 'riwayat_surat', 'UPDATE')).toBe(false)
    expect(await punyaHak('sinfodes_desa', 'riwayat_surat', 'DELETE')).toBe(false)
  })

  it('tanpa konteks nol baris, dengan konteks hanya baris desanya', async () => {
    await sisipOk(baru('desa_a'))
    await sisipOk(baru('desa_b'))
    expect(await hitung(undefined, 'permohonan')).toBe(0)
    expect(await hitung('desa_a', 'permohonan')).toBe(1)
    expect(await hitung('desa_b', 'permohonan')).toBe(1)
    expect(await hitung('desa_lain', 'permohonan')).toBe(0)
    expect(await hitung(undefined, 'riwayat_surat')).toBe(0)
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('desa A tidak bisa menyisipkan baris desa B pada kedua tabel', async () => {
    const asing = baru('desa_b')
    expect(kodePg(await jalankan('desa', 'desa_a', sqlSisip('permohonan', asing)))).toBe('42501')
    const sendiri = baru('desa_a')
    expect(await jalankan('desa', 'desa_a', sqlSisip('permohonan', sendiri))).toBeNull()
    const riwayat = (desaId: string) =>
      `insert into riwayat_surat (id, desa_id, permohonan_id, kejadian, waktu, oleh) values ('rs_x', '${desaId}', ${sendiri.id}, 'dibuat', now(), '{"id":"u1","nama":"P","peran":"operator"}'::jsonb)`
    expect(kodePg(await jalankan('desa', 'desa_a', riwayat('desa_b')))).toBe('42501')
    expect(await jalankan('desa', 'desa_a', riwayat('desa_a'))).toBeNull()
    await uji.sqlMigrasi`delete from riwayat_surat`
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('permohonan: hak UPDATE per kolom hanya pada tujuh kolom penanganan', async () => {
    for (const k of await kolomTabel('permohonan')) expect(await punyaHakKolom('sinfodes_desa', 'permohonan', k, 'UPDATE'), k).toBe(KOLOM_UBAH.includes(k))
    const id = await sisipOk(baru('desa_a'))
    for (const k of ['desa_id', 'dusun_id', 'jenis_id', 'pemohon_id', 'kanal', 'no_urut', 'masuk_pada', 'terbit_nomor', 'pembatalan', 'diambil', 'tahun', 'id']) {
      expect(kodePg(await jalankan('desa', 'desa_a', `update permohonan set ${k} = ${k} where id = '${id}'`)), k).toBe('42501')
    }
    expect(await ubah('desa_a', `update permohonan set status = 'diproses' where id = '${id}'`)).toBe(1)
    expect(await ubah('desa_b', `update permohonan set status = 'menunggu' where id = '${id}'`)).toBe(0)
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('permohonan: hak INSERT per kolom menutup surat terbit, pembatalan, dan pengambilan', async () => {
    for (const k of await kolomTabel('permohonan')) expect(await punyaHakKolom('sinfodes_desa', 'permohonan', k, 'INSERT'), k).toBe(!KOLOM_TERTUTUP.includes(k))
    expect(kodePg(await jalankan('desa', 'desa_a', sqlSisip('permohonan', baru('desa_a', { terbit_nomor: `'X'` }))))).toBe('42501')
    expect(kodePg(await jalankan('desa', 'desa_a', sqlSisip('permohonan', baru('desa_a', { pembatalan: json(catatan('x')) }))))).toBe('42501')
    expect(kodePg(await jalankan('desa', 'desa_a', sqlSisip('permohonan', baru('desa_a', { hash_dokumen: `'h'` }))))).toBe('42501')
    expect(await jalankan('desa', 'desa_a', sqlSisip('permohonan', baru('desa_a')))).toBeNull()
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('DELETE permohonan ditolak; riwayat_surat tidak bisa diubah atau dihapus', async () => {
    const id = await sisipOk(baru('desa_a'))
    expect(kodePg(await jalankan('desa', 'desa_a', `delete from permohonan where id = '${id}'`))).toBe('42501')
    await uji.sqlMigrasi.unsafe(
      `insert into riwayat_surat (id, desa_id, permohonan_id, kejadian, waktu, oleh) values ('rs_1', 'desa_a', '${id}', 'dibuat', now(), '{"id":"u1","nama":"P","peran":"operator"}'::jsonb)`,
    )
    expect(kodePg(await jalankan('desa', 'desa_a', `update riwayat_surat set catatan = 'x'`))).toBe('42501')
    expect(kodePg(await jalankan('desa', 'desa_a', `delete from riwayat_surat`))).toBe('42501')
    await uji.sqlMigrasi`delete from riwayat_surat`
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('CHECK dasar: isian tersandi, kanal, status, tahap, nomor urut, lampiran, dan mode', async () => {
    expect(kodePg(await sisip(baru('desa_a', { isian_sandi: `'{"nama":"x"}'` })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { kanal: `'kertas'` })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'baru'` })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { no_urut: '0' })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { lampiran: `'{}'::jsonb` })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'perlu-ttd'`, tahap: `'cap'` })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'selesai'`, ...ditutup, ...terbit(900, { terbit_mode: `'digital'` }) })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'selesai'`, ...ditutup, ...terbit(901, { terbit_urut: '0' }) })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'selesai'`, ...ditutup, ...terbit(902, { terbit_lembar_sandi: `'{"nik":"x"}'` }) })))).toBe('23514')
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('CHECK kesesuaian status: tahap, surat terbit, penolakan, pembatalan, dan waktu tutup', async () => {
    // tahap terisi bila dan hanya bila Perlu TTD
    expect(kodePg(await sisip(baru('desa_a', { status: `'diproses'`, tahap: `'paraf'` })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'perlu-ttd'` })))).toBe('23514')
    expect(await sisip(baru('desa_a', { status: `'perlu-ttd'`, tahap: `'paraf'` }))).toBeNull()
    // surat terbit bila dan hanya bila Selesai atau Dibatalkan
    expect(kodePg(await sisip(baru('desa_a', { status: `'selesai'`, ...ditutup })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'menunggu'`, ...terbit(910) })))).toBe('23514')
    const sebagian = terbit(911)
    delete sebagian.terbit_kode
    expect(kodePg(await sisip(baru('desa_a', { status: `'selesai'`, ...ditutup, ...sebagian })))).toBe('23514')
    expect(await sisip(baru('desa_a', { status: `'selesai'`, ...ditutup, ...terbit(912) }))).toBeNull()
    expect(await sisip(baru('desa_a', { status: `'selesai'`, ...ditutup, ...terbit(913, { terbit_berlaku_sampai: `'2027-01-31'` }) }))).toBeNull()
    expect(kodePg(await sisip(baru('desa_a', { status: `'diproses'`, terbit_berlaku_sampai: `'2027-01-31'` })))).toBe('23514')
    // penolakan bila dan hanya bila Ditolak
    expect(kodePg(await sisip(baru('desa_a', { status: `'ditolak'`, ...ditutup })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'menunggu'`, penolakan: json(catatan('x')) })))).toBe('23514')
    expect(await sisip(baru('desa_a', { status: `'ditolak'`, ...ditutup, penolakan: json(catatan('Berkas buram')) }))).toBeNull()
    // pembatalan bila dan hanya bila Dibatalkan (surat yang dibatalkan tetap membawa surat terbitnya)
    expect(kodePg(await sisip(baru('desa_a', { status: `'dibatalkan'`, ...ditutup, ...terbit(914) })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'selesai'`, ...ditutup, ...terbit(915), pembatalan: json(catatan('x')) })))).toBe('23514')
    expect(await sisip(baru('desa_a', { status: `'dibatalkan'`, ...ditutup, ...terbit(916), pembatalan: json(catatan('Salah nama')) }))).toBeNull()
    // pengambilan hanya pada surat terbit
    expect(kodePg(await sisip(baru('desa_a', { status: `'menunggu'`, diambil: json({ pada: '2026-10-27T10:00:00+07:00', oleh: catatan('x').oleh }) })))).toBe('23514')
    // waktu tutup terisi bila dan hanya bila status tertutup
    expect(kodePg(await sisip(baru('desa_a', { status: `'selesai'`, ...terbit(917) })))).toBe('23514')
    expect(kodePg(await sisip(baru('desa_a', { status: `'menunggu'`, ...ditutup })))).toBe('23514')
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('CHECK tanpa NIK: 16 angka berurutan ditolak pada setiap kolom catatan, 15 dan 17 angka serta angka bersela lolos', async () => {
    const tolak = async (k: Kolom) => expect(kodePg(await sisip(k))).toBe('23514')
    await tolak(baru('desa_a', { catatan_internal: `'NIK ${NIK} salah'` }))
    await tolak(baru('desa_a', { catatan_internal: `'${NIK}'` }))
    await tolak(baru('desa_a', { catatan_internal: `'a${NIK}b'` }))
    await tolak(baru('desa_a', { status: `'diproses'`, dikembalikan: json(catatan(`Cek ${NIK}`)) }))
    await tolak(baru('desa_a', { status: `'ditolak'`, ...ditutup, penolakan: json(catatan(`NIK ${NIK}`)) }))
    await tolak(baru('desa_a', { status: `'dibatalkan'`, ...ditutup, ...terbit(920), pembatalan: json(catatan(`(${NIK}).`)) }))
    for (const lolos of [NIK.slice(0, 15), `${NIK}9`, '1405 0952 0391 8002']) {
      expect(await sisip(baru('desa_a', { catatan_internal: `'Nomor ${lolos}'` })), lolos).toBeNull()
    }
    const id = await sisipOk(baru('desa_a'))
    expect(
      kodePg(
        await galatDari(
          uji.sqlMigrasi.unsafe(
            `insert into riwayat_surat (id, desa_id, permohonan_id, kejadian, waktu, oleh, catatan) values ('rs_n', 'desa_a', '${id}', 'tolak', now(), '{"id":"u1","nama":"P","peran":"operator"}'::jsonb, 'NIK ${NIK}')`,
          ),
        ),
      ),
    ).toBe('23514')
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('CHECK riwayat_surat: kejadian dikenal dan pelaku berupa objek', async () => {
    const id = await sisipOk(baru('desa_a'))
    const riwayat = (kejadian: string, oleh: string) =>
      galatDari(uji.sqlMigrasi.unsafe(`insert into riwayat_surat (id, desa_id, permohonan_id, kejadian, waktu, oleh) values ('rs_${kejadian}', 'desa_a', '${id}', '${kejadian}', now(), '${oleh}'::jsonb)`))
    const oleh = '{"id":"u1","nama":"P","peran":"operator"}'
    expect(kodePg(await riwayat('hapus', oleh))).toBe('23514')
    expect(kodePg(await riwayat('dibuat', '[]'))).toBe('23514')
    for (const kejadian of KEJADIAN) expect(await riwayat(kejadian, oleh), kejadian).toBeNull()
    const urut = await uji.sqlMigrasi`select kejadian from riwayat_surat where permohonan_id = ${id} order by urutan`
    expect(urut.map((b) => b.kejadian)).toEqual(KEJADIAN)
    await uji.sqlMigrasi`delete from riwayat_surat`
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('UNIQUE (desa_id, tahun, no_urut): bentrok di desa dan tahun yang sama, tidak di desa atau tahun lain', async () => {
    await sisipOk(baru('desa_a', { no_urut: '500' }))
    expect(kodePg(await sisip(baru('desa_a', { no_urut: '500' })))).toBe('23505')
    expect(await sisip(baru('desa_b', { no_urut: '500' }))).toBeNull()
    expect(await sisip(baru('desa_a', { no_urut: '500', tahun: '2027' }))).toBeNull()
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('indeks unik parsial: nomor surat per jenis dan tahun, serta kode verifikasi per desa', async () => {
    const selesai = (desaId: string, ekstra: Kolom) => baru(desaId, { status: `'selesai'`, ...ditutup, ...ekstra })
    await sisipOk(selesai('desa_a', terbit(700)))
    // urut terbit yang sama pada jenis dan tahun yang sama
    expect(kodePg(await sisip(selesai('desa_a', terbit(701, { terbit_urut: '700' }))))).toBe('23505')
    // jenis lain, desa lain, dan tahun lain boleh memakai urut yang sama
    expect(await sisip(selesai('desa_a', terbit(702, { terbit_urut: '700', jenis_id: `'js2_desa_a'` })))).toBeNull()
    expect(await sisip(selesai('desa_b', terbit(703, { terbit_urut: '700' })))).toBeNull()
    expect(await sisip(selesai('desa_a', terbit(704, { terbit_urut: '700', terbit_tahun: '2027' })))).toBeNull()
    // kode verifikasi yang sama di desa yang sama
    expect(kodePg(await sisip(selesai('desa_a', terbit(705, { terbit_kode: `'SS-KODE-700'` }))))).toBe('23505')
    expect(await sisip(selesai('desa_b', terbit(706, { terbit_kode: `'SS-KODE-700'` })))).toBeNull()
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('kunci asing: jenis, pemohon, subjek, mutasi, dan dusun harus ada', async () => {
    expect(kodePg(await sisip(baru('desa_a', { jenis_id: `'js_tidak_ada'` })))).toBe('23503')
    expect(kodePg(await sisip(baru('desa_a', { pemohon_id: `'pdk_tidak_ada'` })))).toBe('23503')
    expect(kodePg(await sisip(baru('desa_a', { subjek_id: `'pdk_tidak_ada'` })))).toBe('23503')
    expect(kodePg(await sisip(baru('desa_a', { mutasi_id: `'mut_tidak_ada'` })))).toBe('23503')
    expect(kodePg(await sisip(baru('desa_a', { dusun_id: `'dsn_tidak_ada'` })))).toBe('23503')
    expect(await sisip(baru('desa_a', { subjek_id: `'pdk_desa_a_2'` }))).toBeNull()
    await uji.sqlMigrasi`delete from permohonan`
  })

  it('menghapus jenis yang sudah dipakai gagal (ON DELETE RESTRICT); jenis yang belum dipakai terhapus', async () => {
    await sisipOk(baru('desa_a'))
    expect(kodePg(await galatDari(uji.sqlMigrasi`delete from jenis_surat where id = 'js_desa_a'`))).toBe('23503')
    expect(await galatDari(uji.sqlMigrasi`delete from jenis_surat where id = 'js2_desa_a'`)).toBeNull()
    await uji.sqlMigrasi`delete from permohonan`
    await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
      values ('js2_desa_a', 'desa_a', 'SKU', 'Jenis SKU', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`
  })

  it('urutan riwayat mengikuti urutan sisip dan tidak bisa diisi manual', async () => {
    const id = await sisipOk(baru('desa_a'))
    const oleh = `'{"id":"u1","nama":"P","peran":"operator"}'::jsonb`
    for (const [i, kejadian] of ['dibuat', 'proses', 'ajukan-ttd'].entries()) {
      await uji.sqlMigrasi.unsafe(`insert into riwayat_surat (id, desa_id, permohonan_id, kejadian, waktu, oleh) values ('rs_u${i}', 'desa_a', '${id}', '${kejadian}', now(), ${oleh})`)
    }
    const urut = await uji.sqlMigrasi`select id from riwayat_surat where permohonan_id = ${id} order by urutan`
    expect(urut.map((b) => b.id)).toEqual(['rs_u0', 'rs_u1', 'rs_u2'])
    expect(
      kodePg(await galatDari(uji.sqlMigrasi.unsafe(`insert into riwayat_surat (urutan, id, desa_id, permohonan_id, kejadian, waktu, oleh) values (1, 'rs_m', 'desa_a', '${id}', 'dibuat', now(), ${oleh})`))),
    ).toBe('428C9')
    await uji.sqlMigrasi`delete from riwayat_surat`
    await uji.sqlMigrasi`delete from permohonan`
  })
})
