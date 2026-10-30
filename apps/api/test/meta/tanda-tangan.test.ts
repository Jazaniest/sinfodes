import { BATAS_VERIFIKASI } from '@sinfodes/kontrak/publik/verifikasi'
import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { permohonan } from '../../src/basisdata/skema'
import { GOLONGAN_TABEL } from '../../src/penggolongan'
import { KOLOM_UBAH_PERMOHONAN } from '../../src/modul/permohonan/repositori-tulis'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  // Cetakan sudah disemai dunia demo; uji ini menghitung baris, jadi mulai dari tabel kosong.
  await uji.sqlMigrasi`delete from riwayat_surat`
  await uji.sqlMigrasi`delete from permohonan`
  for (const desa of ['desa_a', 'desa_b']) {
    await sisipkanDesaContoh(uji.sqlMigrasi, desa, 3)
    await uji.sqlMigrasi.unsafe(
      `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
       values ('js_${desa}', '${desa}', 'SKD', 'Surat Keterangan Domisili', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`,
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
const pesanPg = (e: unknown): string => {
  for (let x = e as { code?: string; message?: string; cause?: unknown } | undefined; x; x = x.cause as typeof x) if (x.code && x.message) return x.message
  return ''
}
const galatDari = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p
    return null
  } catch (e) {
    return e
  }
}
const lewatDesa = (desaId: string, perintah: string) => galatDari(uji.klien.dalamTransaksi('desa', { desaId }, (db) => db.execute(dsql.raw(perintah))))
const lewatPemilik = (perintah: string) => galatDari(uji.sqlMigrasi.unsafe(perintah))
const punyaHak = async (peran: string, tabel: string, hak: string) =>
  (await uji.sqlMigrasi`select has_table_privilege(${peran}, ${tabel}, ${hak}) as ada`)[0].ada as boolean
const punyaHakKolom = async (peran: string, tabel: string, kolom: string, hak: 'UPDATE' | 'INSERT') =>
  (await uji.sqlMigrasi`select has_column_privilege(${peran}, ${tabel}, ${kolom}, ${hak}) as ada`)[0].ada as boolean
const kolomTabel = async (tabel: string) =>
  (await uji.sqlMigrasi`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${tabel}`).map((b) => b.column_name as string)

/** Kolom yang boleh diubah peran desa: tujuh kolom penanganan 8F2a ditambah kolom penerbitan, pembatalan, dan serah terima 8F2b. */
const KOLOM_UBAH = [
  'isian_sandi', 'status', 'tahap', 'dikembalikan', 'penolakan', 'ditutup_pada', 'catatan_internal',
  'terbit_nomor', 'terbit_tahun', 'terbit_urut', 'terbit_kode', 'terbit_pada', 'terbit_penandatangan', 'terbit_mode', 'terbit_berlaku_sampai',
  'terbit_lembar_sandi', 'terbit_tata_letak', 'terbit_kop', 'hash_dokumen', 'tanda_tangan', 'pembatalan', 'diambil',
]

type Kolom = Record<string, string>
let cacah = 0
const baru = (ekstra: Kolom = {}, desaId = 'desa_a'): Kolom => {
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
    status: `'perlu-ttd'`,
    tahap: `'tanda-tangan'`,
    masuk_pada: 'now()',
    ...ekstra,
  }
}
const terbit = (urut: number, ekstra: Kolom = {}): Kolom => ({
  terbit_nomor: `'470/${urut}/SS/X/2026'`,
  terbit_tahun: '2026',
  terbit_urut: String(urut),
  terbit_kode: `'SS-AAAA-${String(urut).padStart(4, '2')}'`,
  terbit_pada: 'now()',
  terbit_penandatangan: `'{"id":"u1","nama":"Kades","peran":"kades","nip":"198001012005011001"}'::jsonb`,
  terbit_mode: `'tte'`,
  terbit_lembar_sandi: `'v1.lembar'`,
  terbit_tata_letak: `'{}'::jsonb`,
  terbit_kop: `'{}'::jsonb`,
  ...ekstra,
})
const sqlSisip = (k: Kolom) => `insert into permohonan (${Object.keys(k).join(', ')}) values (${Object.values(k).join(', ')})`
const sisipOk = async (k: Kolom) => {
  expect(await lewatPemilik(sqlSisip(k))).toBeNull()
  return k.id.replaceAll("'", '')
}
/** Surat Selesai (sudah terbit) milik desa_a. */
const suratTerbit = (urut: number, ekstra: Kolom = {}) => sisipOk(baru({ status: `'selesai'`, tahap: 'null', ditutup_pada: 'now()', ...terbit(urut), ...ekstra }))
/** Sisipan di tahap tanda tangan, siap diterbitkan. */
const suratSiapTtd = () => sisipOk(baru())
const catatan = (teks: string) => `'${JSON.stringify({ oleh: { id: 'u1', nama: 'Petugas', peran: 'sekdes' }, pada: '2026-10-30T10:00:00+07:00', catatan: teks })}'::jsonb`
const diambil = `'{"pada":"2026-10-30T11:00:00+07:00","oleh":{"id":"u1","nama":"Petugas","peran":"operator"}}'::jsonb`
const setTerbit = (urut: number) =>
  Object.entries(terbit(urut)).map(([k, v]) => `${k} = ${v}`).join(', ')
const naikkan = (id: string, urut: number) => `update permohonan set status = 'selesai', tahap = null, ditutup_pada = now(), ${setTerbit(urut)} where id = '${id}'`
const bersih = async () => {
  await uji.sqlMigrasi`delete from permohonan`
}

describe('tabel passphrase dan pencacah verifikasi (rencana 8F2b Tugas 2)', () => {
  it('kedua tabel digolongkan desa-privat dan ber-RLS paksa dengan kebijakan desa dan pemilik', async () => {
    for (const tabel of ['passphrase_tanda_tangan', 'percobaan_verifikasi']) {
      expect(GOLONGAN_TABEL[tabel], tabel).toBe('desa-privat')
      const [b] = await uji.sqlMigrasi`select relrowsecurity as aktif, relforcerowsecurity as paksa from pg_class where relname = ${tabel}`
      expect(b, tabel).toEqual({ aktif: true, paksa: true })
      const kebijakan = await uji.sqlMigrasi`select policyname from pg_policies where schemaname = 'public' and tablename = ${tabel}`
      expect(kebijakan.map((k) => k.policyname).sort(), tabel).toEqual(['desa_sendiri', 'pemilik_skema'])
    }
  })

  it('peran lain tanpa hak apa pun pada kedua tabel', async () => {
    for (const tabel of ['passphrase_tanda_tangan', 'percobaan_verifikasi']) {
      for (const peran of ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik']) {
        for (const hak of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) expect(await punyaHak(peran, tabel, hak), `${peran} ${hak} ${tabel}`).toBe(false)
      }
    }
  })

  it('passphrase: peran desa SELECT, INSERT, dan UPDATE hanya pada hash dan diatur_pada; tanpa DELETE', async () => {
    expect(await punyaHak('sinfodes_desa', 'passphrase_tanda_tangan', 'SELECT')).toBe(true)
    expect(await punyaHak('sinfodes_desa', 'passphrase_tanda_tangan', 'INSERT')).toBe(true)
    expect(await punyaHak('sinfodes_desa', 'passphrase_tanda_tangan', 'DELETE')).toBe(false)
    for (const k of await kolomTabel('passphrase_tanda_tangan')) {
      expect(await punyaHakKolom('sinfodes_desa', 'passphrase_tanda_tangan', k, 'UPDATE'), k).toBe(['hash', 'diatur_pada'].includes(k))
    }
  })

  it('pencacah: peran desa hanya membaca (Ruling: dibaca supaya uji "nol baris tanpa konteks" berlaku); hanya fungsi yang menulis', async () => {
    expect(await punyaHak('sinfodes_desa', 'percobaan_verifikasi', 'SELECT')).toBe(true)
    for (const hak of ['INSERT', 'UPDATE', 'DELETE']) expect(await punyaHak('sinfodes_desa', 'percobaan_verifikasi', hak), hak).toBe(false)
  })

  it('passphrase: hash harus argon2id, pengguna harus ada, dan baris desa lain tidak terlihat', async () => {
    const id = 'pgn_ttd_a'
    await uji.sqlMigrasi`insert into pengguna (id, desa_id, nama, jabatan, peran, email, kata_sandi_hash)
      values (${id}, 'desa_a', 'Pengguna A', 'Kepala Desa', 'kades', 'a@uji.example', '$argon2id$x') on conflict do nothing`
    expect(kodePg(await lewatPemilik(`insert into passphrase_tanda_tangan (pengguna_id, desa_id, hash, diatur_pada) values ('${id}', 'desa_a', 'polos', now())`))).toBe('23514')
    expect(kodePg(await lewatPemilik(`insert into passphrase_tanda_tangan (pengguna_id, desa_id, hash, diatur_pada) values ('pgn_tidak_ada', 'desa_a', '$argon2id$x', now())`))).toBe('23503')
    expect(await lewatPemilik(`insert into passphrase_tanda_tangan (pengguna_id, desa_id, hash, diatur_pada) values ('${id}', 'desa_a', '$argon2id$x', now())`)).toBeNull()
    const hitung = (desaId: string) =>
      uji.klien.dalamTransaksi('desa', { desaId }, async (db) => Number((await db.execute<{ n: number }>(dsql`select count(*)::int as n from passphrase_tanda_tangan`))[0].n))
    expect(await hitung('desa_a')).toBe(1)
    expect(await hitung('desa_b')).toBe(0)
    // Peran desa tidak bisa menulis atas nama desa lain.
    expect(kodePg(await lewatDesa('desa_b', `insert into passphrase_tanda_tangan (pengguna_id, desa_id, hash, diatur_pada) values ('${id}', 'desa_a', '$argon2id$y', now())`))).toBe('42501')
    // Ganti hash lewat UPDATE kolom yang diizinkan; kolom lain ditolak.
    expect(kodePg(await lewatDesa('desa_a', `update passphrase_tanda_tangan set pengguna_id = 'x'`))).toBe('42501')
    expect(await lewatDesa('desa_a', `update passphrase_tanda_tangan set hash = '$argon2id$baru', diatur_pada = now()`)).toBeNull()
    await uji.sqlMigrasi`delete from passphrase_tanda_tangan`
  })

  it('kunci_masuk_desa menerima jenis passphrase dan menolak jenis lain', async () => {
    const sisip = (jenis: string) =>
      lewatPemilik(`insert into kunci_masuk_desa (desa_id, jenis, kunci, gagal, kali_terkunci, diubah) values ('desa_a', '${jenis}', 'k-${jenis}', 0, 0, now())`)
    expect(await sisip('passphrase')).toBeNull()
    expect(await sisip('panel')).toBeNull()
    expect(await sisip('warga')).toBeNull()
    expect(kodePg(await sisip('lain'))).toBe('23514')
    await uji.sqlMigrasi`delete from kunci_masuk_desa`
  })
})

describe('hak kolom permohonan untuk penerbitan (rencana 8F2b Tugas 2)', () => {
  it('peran desa boleh UPDATE tepat pada kolom penanganan dan penerbitan; tidak pada kolom tetap', async () => {
    for (const k of await kolomTabel('permohonan')) expect(await punyaHakKolom('sinfodes_desa', 'permohonan', k, 'UPDATE'), k).toBe(KOLOM_UBAH.includes(k))
    for (const k of ['desa_id', 'dusun_id', 'jenis_id', 'pemohon_id', 'subjek_id', 'mutasi_id', 'kanal', 'no_urut', 'masuk_pada', 'tahun', 'id', 'lampiran']) {
      expect(await punyaHakKolom('sinfodes_desa', 'permohonan', k, 'UPDATE'), k).toBe(false)
    }
  })

  it('daftar kolom ubah di repositori-tulis sama dengan hak kolom basis data (hak dan kolom yang ditulis aksi terkunci satu sama lain)', async () => {
    const dariKode = KOLOM_UBAH_PERMOHONAN.map((k) => permohonan[k].name).sort()
    const dariDb: string[] = []
    for (const k of await kolomTabel('permohonan')) if (await punyaHakKolom('sinfodes_desa', 'permohonan', k, 'UPDATE')) dariDb.push(k)
    expect(dariKode).toEqual(dariDb.sort())
    expect(dariKode).toEqual([...KOLOM_UBAH].sort())
  })

  it('INSERT kolom terbit tetap tertutup dan tidak ada DELETE', async () => {
    for (const k of ['terbit_nomor', 'terbit_kode', 'hash_dokumen', 'tanda_tangan', 'pembatalan', 'diambil']) {
      expect(await punyaHakKolom('sinfodes_desa', 'permohonan', k, 'INSERT'), k).toBe(false)
    }
    expect(await punyaHak('sinfodes_desa', 'permohonan', 'DELETE')).toBe(false)
  })
})

describe('pemicu beku permohonan (rencana 8F2b Tugas 2, Ruling 11)', () => {
  it('surat hanya bisa terbit dari status Perlu TTD tahap tanda tangan, lewat peran desa maupun pemilik', async () => {
    const MENUNGGU = 'Surat hanya bisa terbit dari tahap tanda tangan.'
    const menunggu = await sisipOk(baru({ status: `'menunggu'`, tahap: 'null' }))
    const g1 = await lewatPemilik(naikkan(menunggu, 1))
    expect(kodePg(g1)).toBe('23514')
    expect(pesanPg(g1)).toContain(MENUNGGU)
    const paraf = await sisipOk(baru({ tahap: `'paraf'` }))
    const g2 = await lewatDesa('desa_a', naikkan(paraf, 2))
    expect(kodePg(g2)).toBe('23514')
    expect(pesanPg(g2)).toContain(MENUNGGU)
    const ttd = await suratSiapTtd()
    expect(await lewatDesa('desa_a', naikkan(ttd, 3))).toBeNull()
    const ttd2 = await suratSiapTtd()
    expect(await lewatPemilik(naikkan(ttd2, 4))).toBeNull()
    await bersih()
  })

  it('hash_dokumen dan tanda_tangan hanya boleh terisi bersama nomor terbit', async () => {
    const id = await suratSiapTtd()
    for (const kolom of ['hash_dokumen', 'tanda_tangan']) {
      const g = await lewatDesa('desa_a', `update permohonan set ${kolom} = 'x' where id = '${id}'`)
      expect(kodePg(g), kolom).toBe('23514')
      expect(pesanPg(g), kolom).toContain('Hash dan tanda tangan hanya bisa diisi saat surat terbit.')
    }
    expect(await lewatDesa('desa_a', `${naikkan(id, 10).replace(' where', `, hash_dokumen = 'h', tanda_tangan = 'sim1.t' where`)}`)).toBeNull()
    const [b] = await uji.sqlMigrasi`select hash_dokumen, tanda_tangan from permohonan where id = ${id}`
    expect(b).toEqual({ hash_dokumen: 'h', tanda_tangan: 'sim1.t' })
    await bersih()
  })

  it('surat terbit beku: kolom penerbitan, isian, dan waktu tutup ditolak berubah, oleh peran desa maupun pemilik', async () => {
    const id = await suratTerbit(20, { hash_dokumen: `'h'`, tanda_tangan: `'sim1.t'` })
    const BEKU = 'Surat yang sudah terbit tidak bisa diubah.'
    const ubahan: Record<string, string> = {
      terbit_nomor: `'470/99/SS/X/2026'`, terbit_tahun: '2025', terbit_urut: '99', terbit_kode: `'SS-ZZZZ-ZZZZ'`, terbit_pada: `now() + interval '1 hour'`,
      terbit_penandatangan: `'{"nama":"Lain"}'::jsonb`, terbit_mode: `'basah'`, terbit_berlaku_sampai: `'2030-01-01'`, terbit_lembar_sandi: `'v1.lain'`,
      terbit_tata_letak: `'{"a":1}'::jsonb`, terbit_kop: `'{"lambang":"x"}'::jsonb`, hash_dokumen: `'h2'`, tanda_tangan: `'sim1.t2'`, isian_sandi: `'v1.lain'`,
      ditutup_pada: `now() + interval '1 hour'`, dikembalikan: catatan('x'), penolakan: catatan('x'),
    }
    for (const [kolom, nilai] of Object.entries(ubahan)) {
      for (const lewat of ['desa', 'pemilik'] as const) {
        const perintah = `update permohonan set ${kolom} = ${nilai} where id = '${id}'`
        const g = lewat === 'desa' ? await lewatDesa('desa_a', perintah) : await lewatPemilik(perintah)
        expect(kodePg(g), `${lewat} ${kolom}`).toBe('23514')
        expect(pesanPg(g), `${lewat} ${kolom}`).toContain(BEKU)
      }
    }
    // catatan_internal tetap boleh diubah.
    expect(await lewatDesa('desa_a', `update permohonan set catatan_internal = 'Sudah diserahkan' where id = '${id}'`)).toBeNull()
    await bersih()
  })

  it('Selesai boleh menjadi Dibatalkan dengan pembatalan; kebalikannya, pembatalan tanpa pindah status, dan ubah pembatalan ditolak', async () => {
    const id = await suratTerbit(30)
    const g1 = await lewatDesa('desa_a', `update permohonan set pembatalan = ${catatan('Salah nama')} where id = '${id}'`)
    expect(kodePg(g1)).toBe('23514')
    expect(pesanPg(g1)).toContain('Pembatalan hanya bisa diisi bersama perpindahan status ke Dibatalkan.')
    expect(await lewatDesa('desa_a', `update permohonan set status = 'dibatalkan', pembatalan = ${catatan('Salah nama')} where id = '${id}'`)).toBeNull()
    const g2 = await lewatDesa('desa_a', `update permohonan set status = 'selesai', pembatalan = null where id = '${id}'`)
    expect(kodePg(g2)).toBe('23514')
    expect(pesanPg(g2)).toContain('Status surat terbit tidak bisa dikembalikan.')
    const g3 = await lewatPemilik(`update permohonan set pembatalan = ${catatan('Lain')} where id = '${id}'`)
    expect(kodePg(g3)).toBe('23514')
    expect(pesanPg(g3)).toContain('Pembatalan tidak bisa diubah.')
    // Surat yang dibatalkan tetap membawa surat terbitnya, dan kolom beku tetap beku.
    const g4 = await lewatPemilik(`update permohonan set terbit_nomor = 'X' where id = '${id}'`)
    expect(kodePg(g4)).toBe('23514')
    await bersih()
  })

  it('status loncat dari Selesai ke status lain ditolak', async () => {
    const id = await suratTerbit(40)
    for (const status of ['menunggu', 'diproses', 'ditolak']) {
      const g = await lewatPemilik(`update permohonan set status = '${status}' where id = '${id}'`)
      expect(kodePg(g), status).toBe('23514')
    }
    await bersih()
  })

  it('diambil boleh diisi sekali; diisi ulang atau dikosongkan ditolak', async () => {
    const id = await suratTerbit(50)
    expect(await lewatDesa('desa_a', `update permohonan set diambil = ${diambil} where id = '${id}'`)).toBeNull()
    const lain = `'{"pada":"2026-10-31T11:00:00+07:00","oleh":{"id":"u2","nama":"Lain","peran":"operator"}}'::jsonb`
    const g1 = await lewatDesa('desa_a', `update permohonan set diambil = ${lain} where id = '${id}'`)
    expect(kodePg(g1)).toBe('23514')
    expect(pesanPg(g1)).toContain('Surat hanya bisa ditandai diambil sekali.')
    const g2 = await lewatPemilik(`update permohonan set diambil = null where id = '${id}'`)
    expect(kodePg(g2)).toBe('23514')
    await bersih()
  })

  it('baris tanpa surat terbit tetap bebas diubah lewat kolom penanganan', async () => {
    const id = await sisipOk(baru({ status: `'menunggu'`, tahap: 'null' }))
    expect(await lewatDesa('desa_a', `update permohonan set status = 'diproses', catatan_internal = 'Cek berkas' where id = '${id}'`)).toBeNull()
    await bersih()
  })
})

describe('fungsi verifikasi_surat dan peran publik (rencana 8F2b Tugas 2, Ruling 12-13)', () => {
  const panggil = (desaId: string, kode: string, sekarang: Date) =>
    uji.klien.dalamTransaksi('publik', {}, async (db) => {
      const baris = await db.execute<Record<string, unknown>>(dsql`select * from verifikasi_surat(${desaId}, ${kode}, ${sekarang.toISOString()}::timestamptz)`)
      return baris[0]
    })
  const T0 = new Date('2026-10-30T03:00:00Z')

  it('SECURITY DEFINER dengan search_path terkunci, EXECUTE hanya untuk peran publik', async () => {
    const [f] = await uji.sqlMigrasi`select p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as pemilik from pg_proc p where p.proname = 'verifikasi_surat'`
    expect(f.prosecdef).toBe(true)
    expect(f.proconfig).toContain('search_path=public, pg_temp')
    expect(f.pemilik).toBe('sinfodes_migrasi')
    const fungsi = 'verifikasi_surat(text, text, timestamptz)'
    for (const peran of ['sinfodes_desa', 'sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_migrasi']) {
      const [b] = await uji.sqlMigrasi`select has_function_privilege(${peran}, ${fungsi}, 'EXECUTE') as ada`
      if (peran !== 'sinfodes_migrasi') expect(b.ada, peran).toBe(false)
    }
    expect((await uji.sqlMigrasi`select has_function_privilege('sinfodes_publik', ${fungsi}, 'EXECUTE') as ada`)[0].ada).toBe(true)
    const [umum] = await uji.sqlMigrasi`select count(*)::int as n from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where p.proname = 'verifikasi_surat' and a.grantee = 0 and a.privilege_type = 'EXECUTE'`
    expect(umum.n).toBe(0)
  })

  it('ambang, jendela, dan lama kunci di fungsi sama dengan BATAS_VERIFIKASI kontrak', async () => {
    const [f] = await uji.sqlMigrasi`select pg_get_functiondef(p.oid) as def from pg_proc p where p.proname = 'verifikasi_surat'`
    const ambil = (nama: string) => Number(new RegExp(`${nama}\\s+constant\\s+integer\\s*:=\\s*(\\d+)`).exec(f.def as string)?.[1])
    expect(ambil('c_gagal')).toBe(BATAS_VERIFIKASI.gagal)
    expect(ambil('c_jendela_detik') * 1000).toBe(BATAS_VERIFIKASI.jendelaMs)
    expect(ambil('c_kunci_detik') * 1000).toBe(BATAS_VERIFIKASI.kunciMs)
  })

  it('peran publik tidak membaca permohonan, penduduk, passphrase, maupun pencacah', async () => {
    for (const tabel of ['permohonan', 'penduduk', 'jenis_surat', 'passphrase_tanda_tangan', 'percobaan_verifikasi', 'riwayat_surat']) {
      const g = await galatDari(uji.klien.dalamTransaksi('publik', {}, (db) => db.execute(dsql.raw(`select 1 from ${tabel}`))))
      expect(kodePg(g), tabel).toBe('42501')
    }
  })

  it('menemukan surat Selesai dengan hasil minimal tanpa NIP, id, lembar, atau alasan', async () => {
    await uji.sqlMigrasi`delete from percobaan_verifikasi`
    await suratTerbit(60, { terbit_kode: `'SS-7K3M-Q9TD'`, terbit_berlaku_sampai: `'2027-01-30'`, subjek_id: `'pdk_desa_a_2'` })
    const b = await panggil('desa_a', 'SS-7K3M-Q9TD', T0)
    expect(b).toMatchObject({
      hasil: 'ditemukan', jenis_nama: 'Surat Keterangan Domisili', nomor: '470/60/SS/X/2026', nama: 'Warga 2', status: 'selesai', pembatalan_pada: null,
    })
    expect(b.penandatangan).toEqual({ nama: 'Kades', peran: 'kades' })
    expect(String(b.berlaku_sampai)).toContain('2027')
    expect(Object.keys(b).sort()).toEqual(
      ['berlaku_sampai', 'hasil', 'jenis_nama', 'nama', 'nomor', 'pembatalan_pada', 'penandatangan', 'status', 'terbit_pada'],
    )
    await bersih()
  })

  it('surat Dibatalkan tetap ditemukan dengan waktu pembatalan; permohonan lain tidak punya kode yang bisa ditemukan', async () => {
    await uji.sqlMigrasi`delete from percobaan_verifikasi`
    const id = await suratTerbit(70, { terbit_kode: `'SS-BBBB-CCCC'` })
    await lewatPemilik(`update permohonan set status = 'dibatalkan', pembatalan = ${catatan('Salah nama')} where id = '${id}'`)
    const b = await panggil('desa_a', 'SS-BBBB-CCCC', T0)
    expect(b).toMatchObject({ hasil: 'ditemukan', status: 'dibatalkan' })
    expect(b.pembatalan_pada).toBeTruthy()
    // Permohonan yang belum terbit tidak punya kode; kode yang tak ada menjawab tidak-ada.
    await sisipOk(baru())
    expect((await panggil('desa_a', 'SS-DDDD-EEEE', T0)).hasil).toBe('tidak-ada')
    await bersih()
  })

  it('kode milik desa lain menjawab tidak-ada dan menaikkan pencacah desa yang ditanya', async () => {
    await uji.sqlMigrasi`delete from percobaan_verifikasi`
    await sisipOk(baru({ status: `'selesai'`, tahap: 'null', ditutup_pada: 'now()', ...terbit(80, { terbit_kode: `'SS-FFFF-GGGG'` }) }, 'desa_b'))
    expect((await panggil('desa_a', 'SS-FFFF-GGGG', T0)).hasil).toBe('tidak-ada')
    expect((await panggil('desa_b', 'SS-FFFF-GGGG', T0)).hasil).toBe('ditemukan')
    const baris = await uji.sqlMigrasi`select desa_id, cardinality(gagal_pada)::int as n from percobaan_verifikasi order by desa_id`
    expect(baris.map((x) => ({ ...x }))).toEqual([{ desa_id: 'desa_a', n: 1 }])
    await bersih()
  })

  it('sepuluh kode salah dalam sepuluh menit mengunci; kode benar pun terkunci; pulih sesudah sepuluh menit; desa lain tidak ikut', async () => {
    await uji.sqlMigrasi`delete from percobaan_verifikasi`
    await suratTerbit(90, { terbit_kode: `'SS-HHHH-JJJJ'` })
    for (let i = 1; i <= BATAS_VERIFIKASI.gagal - 1; i++) {
      expect((await panggil('desa_a', `SS-AAAA-${String(i).padStart(4, '2')}`, new Date(T0.getTime() + i * 1000))).hasil, `salah ke-${i}`).toBe('tidak-ada')
    }
    // Kesepuluh membuat verifikasi terkunci pada saat itu juga.
    const kesepuluh = new Date(T0.getTime() + 10_000)
    expect((await panggil('desa_a', 'SS-AAAA-9999', kesepuluh)).hasil).toBe('terkunci')
    expect((await panggil('desa_a', 'SS-HHHH-JJJJ', new Date(kesepuluh.getTime() + 5 * 60_000))).hasil).toBe('terkunci')
    expect((await panggil('desa_b', 'SS-HHHH-JJJJ', new Date(kesepuluh.getTime() + 5 * 60_000))).hasil).toBe('tidak-ada')
    const [kunci] = await uji.sqlMigrasi`select cardinality(gagal_pada)::int as n, terkunci_sampai from percobaan_verifikasi where desa_id = 'desa_a'`
    expect(kunci.n).toBe(0)
    // Sesudah kunci habis, kode benar ditemukan dan hitungan mulai dari kosong.
    const pulih = new Date(kesepuluh.getTime() + BATAS_VERIFIKASI.kunciMs + 1000)
    expect((await panggil('desa_a', 'SS-HHHH-JJJJ', pulih)).hasil).toBe('ditemukan')
    await bersih()
  })

  it('kegagalan lebih tua dari jendela tidak dihitung', async () => {
    await uji.sqlMigrasi`delete from percobaan_verifikasi`
    for (let i = 1; i <= 9; i++) await panggil('desa_a', `SS-AAAA-${String(i).padStart(4, '3')}`, new Date(T0.getTime() + i * 1000))
    const jauh = new Date(T0.getTime() + BATAS_VERIFIKASI.jendelaMs + 60_000)
    expect((await panggil('desa_a', 'SS-AAAA-4444', jauh)).hasil).toBe('tidak-ada')
    const [b] = await uji.sqlMigrasi`select cardinality(gagal_pada)::int as n from percobaan_verifikasi where desa_id = 'desa_a'`
    expect(b.n).toBe(1)
  })

  it('dua belas tebakan salah serentak menghasilkan tepat satu kunci', async () => {
    await uji.sqlMigrasi`delete from percobaan_verifikasi`
    const hasil = await Promise.all(
      Array.from({ length: 12 }, (_, i) => panggil('desa_a', `SS-AAAA-${String(i).padStart(4, '5')}`, new Date(T0.getTime() + 20 * 60_000 + i))),
    )
    const hitungan = (h: string) => hasil.filter((x) => x.hasil === h).length
    expect(hitungan('tidak-ada')).toBe(BATAS_VERIFIKASI.gagal - 1)
    expect(hitungan('terkunci')).toBe(12 - (BATAS_VERIFIKASI.gagal - 1))
  })
})
