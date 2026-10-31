import { TUJUAN_DISPOSISI } from '@sinfodes/kontrak/surat/arsip'
import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GOLONGAN_TABEL } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  // Cetakan sudah disemai dunia demo; uji ini menghitung baris, jadi mulai dari tabel kosong.
  await uji.sqlMigrasi`delete from berkas_surat`
  await uji.sqlMigrasi`delete from surat_masuk`
  await uji.sqlMigrasi`delete from kunci_idempotensi`
  await uji.sqlMigrasi`delete from riwayat_surat`
  await uji.sqlMigrasi`delete from permohonan`
  for (const desa of ['desa_a', 'desa_b']) {
    await sisipkanDesaContoh(uji.sqlMigrasi, desa, 2)
    await uji.sqlMigrasi.unsafe(
      `insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
       values ('js_${desa}', '${desa}', 'SKD', 'Surat Keterangan Domisili', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`,
    )
    await uji.sqlMigrasi.unsafe(
      `insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada)
       values ('pm_${desa}', '${desa}', 'dsn_${desa}', 2026, 1, 'js_${desa}', 'online', 'pdk_${desa}_1', 'v1.abc', 'menunggu', now())`,
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
const lewatDesa = (desaId: string, perintah: string) => galatDari(uji.klien.dalamTransaksi('desa', { desaId }, (db) => db.execute(dsql.raw(perintah))))
const lewatPemilik = (perintah: string) => galatDari(uji.sqlMigrasi.unsafe(perintah))
const punyaHak = async (peran: string, tabel: string, hak: string) =>
  (await uji.sqlMigrasi`select has_table_privilege(${peran}, ${tabel}, ${hak}) as ada`)[0].ada as boolean
const punyaHakKolom = async (peran: string, tabel: string, kolom: string, hak: 'UPDATE' | 'INSERT') =>
  (await uji.sqlMigrasi`select has_column_privilege(${peran}, ${tabel}, ${kolom}, ${hak}) as ada`)[0].ada as boolean
const kolomTabel = async (tabel: string) =>
  (await uji.sqlMigrasi`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${tabel}`).map((b) => b.column_name as string)

type Kolom = Record<string, string>
const sqlSisip = (tabel: string, k: Kolom) => `insert into ${tabel} (${Object.keys(k).join(', ')}) values (${Object.values(k).join(', ')})`

let cacahMasuk = 0
const masuk = (ekstra: Kolom = {}, desaId = 'desa_a'): Kolom => {
  cacahMasuk += 1
  return {
    id: `'sm_${cacahMasuk}'`,
    desa_id: `'${desaId}'`,
    tahun: '2026',
    no_agenda: String(cacahMasuk),
    diterima: `'2026-10-20'`,
    nomor: `'005/12/Kec/2026'`,
    tanggal_surat: `'2026-10-18'`,
    pengirim: `'Camat Uji'`,
    perihal: `'Undangan rapat'`,
    dicatat_oleh: `'{"id":"u1","nama":"Operator"}'::jsonb`,
    dicatat_pada: 'now()',
    ...ekstra,
  }
}
const masukOk = async (ekstra: Kolom = {}, desaId = 'desa_a') => {
  const k = masuk(ekstra, desaId)
  expect(await lewatPemilik(sqlSisip('surat_masuk', k))).toBeNull()
  return k.id.replaceAll("'", '')
}

let cacahBerkas = 0
const berkas = (ekstra: Kolom = {}): Kolom => {
  cacahBerkas += 1
  return {
    id: `'bk_${cacahBerkas}'`,
    desa_id: `'desa_a'`,
    jenis: `'lampiran'`,
    permohonan_id: `'pm_desa_a'`,
    tipe: `'image/jpeg'`,
    ukuran_byte: '10',
    isi: `decode('deadbeef', 'hex')`,
    dibuat: 'now()',
    ...ekstra,
  }
}

describe('tabel surat masuk dan berkas surat (rencana 8F3 Tugas 2)', () => {
  it('kedua tabel digolongkan desa-privat, ber-RLS paksa, kebijakan desa dan pemilik', async () => {
    for (const tabel of ['surat_masuk', 'berkas_surat']) {
      expect(GOLONGAN_TABEL[tabel], tabel).toBe('desa-privat')
      const [b] = await uji.sqlMigrasi`select relrowsecurity as aktif, relforcerowsecurity as paksa from pg_class where relname = ${tabel}`
      expect(b, tabel).toEqual({ aktif: true, paksa: true })
      const kebijakan = await uji.sqlMigrasi`select policyname from pg_policies where schemaname = 'public' and tablename = ${tabel}`
      expect(kebijakan.map((k) => k.policyname).sort(), tabel).toEqual(['desa_sendiri', 'pemilik_skema'])
    }
  })

  it('peran desa hanya SELECT dan INSERT: tanpa UPDATE, DELETE, dan hak kolom; peran lain tanpa hak apa pun', async () => {
    for (const tabel of ['surat_masuk', 'berkas_surat']) {
      expect(await punyaHak('sinfodes_desa', tabel, 'SELECT'), tabel).toBe(true)
      expect(await punyaHak('sinfodes_desa', tabel, 'INSERT'), tabel).toBe(true)
      expect(await punyaHak('sinfodes_desa', tabel, 'UPDATE'), tabel).toBe(false)
      expect(await punyaHak('sinfodes_desa', tabel, 'DELETE'), tabel).toBe(false)
      for (const k of await kolomTabel(tabel)) expect(await punyaHakKolom('sinfodes_desa', tabel, k, 'UPDATE'), `${tabel}.${k}`).toBe(false)
      for (const peran of ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik']) {
        for (const hak of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) expect(await punyaHak(peran, tabel, hak), `${peran} ${hak} ${tabel}`).toBe(false)
      }
    }
  })

  it('percobaan UPDATE dan DELETE oleh peran desa ditolak 42501', async () => {
    const id = await masukOk()
    expect(kodePg(await lewatDesa('desa_a', `update surat_masuk set perihal = 'ubah' where id = '${id}'`))).toBe('42501')
    expect(kodePg(await lewatDesa('desa_a', `delete from surat_masuk where id = '${id}'`))).toBe('42501')
    expect(kodePg(await lewatDesa('desa_a', `update berkas_surat set ukuran_byte = 1`))).toBe('42501')
    expect(kodePg(await lewatDesa('desa_a', `delete from berkas_surat`))).toBe('42501')
  })

  it('baris desa lain tidak terlihat dan tidak bisa ditulis atas nama desa lain', async () => {
    const idMasuk = await masukOk()
    expect(await lewatPemilik(sqlSisip('berkas_surat', berkas({ id: `'bk_rls'` })))).toBeNull()
    const hitung = (desaId: string, tabel: string) =>
      uji.klien.dalamTransaksi('desa', { desaId }, async (db) => Number((await db.execute<{ n: number }>(dsql.raw(`select count(*)::int as n from ${tabel}`)))[0].n))
    expect(await hitung('desa_a', 'surat_masuk')).toBeGreaterThanOrEqual(1)
    expect(await hitung('desa_b', 'surat_masuk')).toBe(0)
    expect(await hitung('desa_a', 'berkas_surat')).toBe(1)
    expect(await hitung('desa_b', 'berkas_surat')).toBe(0)
    const dariB = masuk({ id: `'sm_curang'` }, 'desa_a')
    expect(kodePg(await lewatDesa('desa_b', sqlSisip('surat_masuk', dariB)))).toBe('42501')
    expect(kodePg(await lewatDesa('desa_b', sqlSisip('berkas_surat', berkas({ id: `'bk_curang'` }))))).toBe('42501')
    // Peran desa sendiri boleh menyisipkan dalam konteksnya.
    expect(await lewatDesa('desa_a', sqlSisip('surat_masuk', masuk()))).toBeNull()
    expect(idMasuk).toMatch(/^sm_/)
  })
})

describe('aturan surat_masuk (CHECK dan UNIQUE)', () => {
  it('tanggal surat tidak boleh sesudah tanggal terima; sama dengan hari terima boleh', async () => {
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk({ tanggal_surat: `'2026-10-21'` }))))).toBe('23514')
    await masukOk({ tanggal_surat: `'2026-10-20'` })
  })

  it('tahun harus sama dengan tahun tanggal terima; nomor agenda minimal 1', async () => {
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk({ tahun: '2025' }))))).toBe('23514')
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk({ no_agenda: '0' }))))).toBe('23514')
  })

  it('disposisi: tujuan hanya dari daftar kontrak; instruksi tanpa tujuan ditolak', async () => {
    for (const tujuan of TUJUAN_DISPOSISI) await masukOk({ disposisi_kepada: `'${tujuan}'`, disposisi_instruksi: `'Tindak lanjuti.'` })
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk({ disposisi_kepada: `'Bendahara Rahasia'` }))))).toBe('23514')
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk({ disposisi_instruksi: `'Tindak lanjuti.'` }))))).toBe('23514')
    await masukOk({ disposisi_kepada: `'Kepala Desa'` })
    await masukOk()
  })

  it('pindaian: nama dan ukuran utuh atau kosong bersamaan, ukuran minimal 1', async () => {
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk({ scan_nama: `'surat.pdf'` }))))).toBe('23514')
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk({ scan_ukuran_kb: '12' }))))).toBe('23514')
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk({ scan_nama: `'surat.pdf'`, scan_ukuran_kb: '0' }))))).toBe('23514')
    await masukOk({ scan_nama: `'surat.pdf'`, scan_ukuran_kb: '12' })
  })

  it('16 angka berurutan di nomor, pengirim, perihal, instruksi, dan nama pindaian ditolak; 15 dan 17 angka lolos', async () => {
    const nik = '3175010101010001'
    const tolak = async (ekstra: Kolom) => expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk(ekstra)))), JSON.stringify(ekstra)).toBe('23514')
    await tolak({ nomor: `'ref ${nik}'` })
    await tolak({ pengirim: `'${nik} Camat'` })
    await tolak({ perihal: `'Permohonan NIK ${nik}.'` })
    await tolak({ disposisi_kepada: `'Kepala Desa'`, disposisi_instruksi: `'Cek ${nik}'` })
    await tolak({ scan_nama: `'KTP ${nik}.pdf'`, scan_ukuran_kb: '10' })
    await masukOk({ nomor: `'ref ${nik.slice(1)}'` })
    await masukOk({ nomor: `'ref ${nik}7'` })
  })

  it('panjang teks dibatasi seperti kontrak (nomor 100, pengirim 150, perihal 300, instruksi 500, nama pindaian 100)', async () => {
    const tolak = async (ekstra: Kolom) => expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk(ekstra)))), JSON.stringify(ekstra)).toBe('23514')
    await tolak({ nomor: `'${'a'.repeat(101)}'` })
    await tolak({ pengirim: `'${'a'.repeat(151)}'` })
    await tolak({ perihal: `'${'a'.repeat(301)}'` })
    await tolak({ disposisi_kepada: `'Kepala Desa'`, disposisi_instruksi: `'${'a'.repeat(501)}'` })
    await tolak({ scan_nama: `'${'a'.repeat(101)}'`, scan_ukuran_kb: '1' })
    await masukOk({ nomor: `'${'a'.repeat(100)}'`, pengirim: `'${'a'.repeat(150)}'`, perihal: `'${'a'.repeat(300)}'` })
  })

  it('nomor agenda unik per desa dan tahun; desa lain dan tahun lain boleh memakai nomor yang sama', async () => {
    const dasar = { no_agenda: '900' }
    await masukOk(dasar)
    expect(kodePg(await lewatPemilik(sqlSisip('surat_masuk', masuk(dasar))))).toBe('23505')
    await masukOk(dasar, 'desa_b')
    await masukOk({ ...dasar, tahun: '2027', diterima: `'2027-01-04'`, tanggal_surat: `'2027-01-03'` })
  })
})

describe('aturan berkas_surat (CHECK dan kunci asing)', () => {
  it('lampiran mensyaratkan permohonan dan melarang surat masuk; pindaian kebalikannya', async () => {
    const id = await masukOk()
    const tolak = async (ekstra: Kolom) => expect(kodePg(await lewatPemilik(sqlSisip('berkas_surat', berkas(ekstra)))), JSON.stringify(ekstra)).toBe('23514')
    await tolak({ permohonan_id: 'null' })
    await tolak({ surat_masuk_id: `'${id}'` })
    await tolak({ jenis: `'scan'` })
    await tolak({ jenis: `'scan'`, surat_masuk_id: `'${id}'` })
    expect(await lewatPemilik(sqlSisip('berkas_surat', berkas({ jenis: `'scan'`, permohonan_id: 'null', surat_masuk_id: `'${id}'`, tipe: `'application/pdf'` })))).toBeNull()
    expect(await lewatPemilik(sqlSisip('berkas_surat', berkas()))).toBeNull()
  })

  it('jenis berkas hanya lampiran atau scan; rujukan harus ada (kunci asing)', async () => {
    expect(kodePg(await lewatPemilik(sqlSisip('berkas_surat', berkas({ jenis: `'foto'` }))))).toBe('23514')
    expect(kodePg(await lewatPemilik(sqlSisip('berkas_surat', berkas({ permohonan_id: `'pm_tidak_ada'` }))))).toBe('23503')
    expect(kodePg(await lewatPemilik(sqlSisip('berkas_surat', berkas({ jenis: `'scan'`, permohonan_id: 'null', surat_masuk_id: `'sm_tidak_ada'` }))))).toBe('23503')
  })

  it('tipe hanya JPEG, PNG, WebP, atau PDF', async () => {
    for (const tipe of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) {
      expect(await lewatPemilik(sqlSisip('berkas_surat', berkas({ tipe: `'${tipe}'` }))), tipe).toBeNull()
    }
    for (const tipe of ['image/gif', 'image/svg+xml', 'text/html', 'application/octet-stream']) {
      expect(kodePg(await lewatPemilik(sqlSisip('berkas_surat', berkas({ tipe: `'${tipe}'` })))), tipe).toBe('23514')
    }
  })

  it('ukuran 1 sampai 5.242.880 byte; isi tidak boleh kosong', async () => {
    expect(kodePg(await lewatPemilik(sqlSisip('berkas_surat', berkas({ ukuran_byte: '0' }))))).toBe('23514')
    expect(kodePg(await lewatPemilik(sqlSisip('berkas_surat', berkas({ ukuran_byte: '5242881' }))))).toBe('23514')
    expect(await lewatPemilik(sqlSisip('berkas_surat', berkas({ ukuran_byte: '5242880' })))).toBeNull()
    expect(kodePg(await lewatPemilik(sqlSisip('berkas_surat', berkas({ isi: `''::bytea` }))))).toBe('23514')
  })

  it('isi bytea tersimpan dan terbaca identik', async () => {
    const isi = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 31) % 256))
    await uji.sqlMigrasi`insert into berkas_surat (id, desa_id, jenis, permohonan_id, tipe, ukuran_byte, isi, dibuat)
      values ('bk_isi', 'desa_a', 'lampiran', 'pm_desa_a', 'image/png', 4096, ${isi}, now())`
    const [b] = await uji.sqlMigrasi`select isi from berkas_surat where id = 'bk_isi'`
    expect(Buffer.compare(b.isi as Buffer, isi)).toBe(0)
  })
})

describe('kunci idempotensi untuk permohonan dan indeks terbit', () => {
  const kunci = (ekstra: Kolom): Kolom => ({
    desa_id: `'desa_a'`, pengguna_id: `'pdk_desa_a_1'`, kunci: `'kunci-${Math.random().toString(36).slice(2, 12)}'`, jalur: `'/warga/permohonan'`, sidik_isi: `'abc'`,
    dibuat: 'now()', ...ekstra,
  })

  it('mutasi_id dan permohonan_id tidak boleh terisi bersamaan (CHECK jatuh sebelum kunci asing)', async () => {
    expect(kodePg(await lewatPemilik(sqlSisip('kunci_idempotensi', kunci({ mutasi_id: `'mut_x'`, permohonan_id: `'pm_desa_a'` }))))).toBe('23514')
    expect(await lewatPemilik(sqlSisip('kunci_idempotensi', kunci({ permohonan_id: `'pm_desa_a'` })))).toBeNull()
    expect(await lewatPemilik(sqlSisip('kunci_idempotensi', kunci({})))).toBeNull()
  })

  it('permohonan_id harus menunjuk permohonan yang ada', async () => {
    expect(kodePg(await lewatPemilik(sqlSisip('kunci_idempotensi', kunci({ permohonan_id: `'pm_tidak_ada'` }))))).toBe('23503')
  })

  it('peran desa boleh UPDATE tepat pada mutasi_id dan permohonan_id', async () => {
    for (const k of await kolomTabel('kunci_idempotensi')) {
      expect(await punyaHakKolom('sinfodes_desa', 'kunci_idempotensi', k, 'UPDATE'), k).toBe(['mutasi_id', 'permohonan_id'].includes(k))
    }
    const k = kunci({})
    expect(await lewatDesa('desa_a', sqlSisip('kunci_idempotensi', k))).toBeNull()
    expect(await lewatDesa('desa_a', `update kunci_idempotensi set permohonan_id = 'pm_desa_a' where kunci = ${k.kunci}`)).toBeNull()
  })

  it('indeks permohonan_desa_terbit ada, diawali desa_id, hanya baris terbit', async () => {
    const [b] = await uji.sqlMigrasi`select indexdef from pg_indexes where schemaname = 'public' and indexname = 'permohonan_desa_terbit'`
    expect(b.indexdef).toContain('(desa_id, terbit_pada)')
    expect(b.indexdef).toContain('terbit_pada IS NOT NULL')
  })
})
