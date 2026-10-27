import { sql as dsql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GOLONGAN_TABEL } from '../../src/penggolongan'
import { buatDbUji, type DbUji } from '../basisdata'
import { sisipkanDesaContoh } from '../data-contoh'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_a', 2)
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_b', 3)
})
afterAll(async () => {
  await uji?.tutup()
})

const PERAN = ['sinfodes_desa', 'sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik'] as const
const HAK = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const
type Peran = (typeof PERAN)[number]
type Hak = (typeof HAK)[number]
const SEMUA: readonly Hak[] = HAK

/** Hak tabel yang sah per peran untuk tabel identitas (SPEC-V0.3 §7.3). Yang tidak tercantum: tidak ada hak sama sekali. */
const HARAPAN: Readonly<Record<string, Partial<Record<Peran, readonly Hak[]>>>> = {
  akun_warga: { sinfodes_desa: ['SELECT', 'INSERT', 'UPDATE'] },
  sesi_warga: { sinfodes_desa: ['SELECT', 'INSERT', 'UPDATE'] },
  kunci_masuk_desa: { sinfodes_desa: SEMUA },
  kabupaten_mitra: { sinfodes_kabupaten: ['SELECT'], sinfodes_publik: ['SELECT'] },
  pengguna_kabupaten: { sinfodes_kabupaten: ['SELECT'] },
  sesi_kabupaten: { sinfodes_kabupaten: ['SELECT', 'INSERT', 'UPDATE'] },
  pengguna_konsol: { sinfodes_konsol: ['SELECT'] },
  sesi_konsol: { sinfodes_konsol: ['SELECT', 'INSERT', 'UPDATE'] },
  kunci_masuk_platform: { sinfodes_kabupaten: SEMUA, sinfodes_konsol: SEMUA },
  jejak_audit_platform: { sinfodes_kabupaten: ['INSERT'], sinfodes_konsol: ['INSERT'] },
}

const kodePg = (e: unknown): string | undefined => {
  for (let x = e as { code?: string; cause?: unknown } | undefined; x; x = x.cause as typeof x) if (x.code) return x.code
  return undefined
}
const galatDari = (janji: Promise<unknown>) => janji.then(() => null, (e: unknown) => e)

describe('tabel identitas: penggolongan dan hak (SPEC-V0.3 §7.3)', () => {
  it('setiap tabel identitas tercantum di penggolongan', () => {
    for (const tabel of Object.keys(HARAPAN)) expect(GOLONGAN_TABEL, tabel).toHaveProperty(tabel)
  })

  it('hak tabel tiap peran persis seperti yang diharapkan: peran lain tidak punya hak apa pun', async () => {
    for (const [tabel, perPeran] of Object.entries(HARAPAN)) {
      for (const peran of PERAN) {
        for (const hak of HAK) {
          const ada = (await uji.sqlMigrasi`select has_table_privilege(${peran}, ${tabel}, ${hak}) as ada`)[0].ada as boolean
          expect(ada, `${peran} ${hak} ${tabel}`).toBe(perPeran[peran]?.includes(hak) ?? false)
        }
      }
    }
  })

  it('Konsol hanya boleh memperbarui langkah TOTP terakhir, bukan hash kata sandi atau rahasia TOTP', async () => {
    const punya = async (kolom: string) =>
      (await uji.sqlMigrasi`select has_column_privilege('sinfodes_konsol', 'pengguna_konsol', ${kolom}, 'UPDATE') as ada`)[0].ada as boolean
    expect(await punya('totp_langkah_terakhir')).toBe(true)
    expect(await punya('kata_sandi_hash')).toBe(false)
    expect(await punya('totp_rahasia_sandi')).toBe(false)
    expect(await punya('email')).toBe(false)
  })

  it('peran lain ditolak sungguhan (42501) saat membaca tabel identitas yang bukan miliknya', async () => {
    const baca = (peran: 'desa' | 'kabupaten' | 'konsol' | 'publik', tabel: string) =>
      galatDari(uji.klien.dalamTransaksi(peran, { desaId: 'desa_a' }, (db) => db.execute(dsql.raw(`select count(*) from ${tabel}`))))
    expect(kodePg(await baca('konsol', 'penduduk'))).toBe('42501')
    expect(kodePg(await baca('konsol', 'pengguna_kabupaten'))).toBe('42501')
    expect(kodePg(await baca('kabupaten', 'pengguna_konsol'))).toBe('42501')
    expect(kodePg(await baca('kabupaten', 'sesi_konsol'))).toBe('42501')
    expect(kodePg(await baca('desa', 'pengguna_konsol'))).toBe('42501')
    expect(kodePg(await baca('desa', 'sesi_kabupaten'))).toBe('42501')
    expect(kodePg(await baca('publik', 'sesi_kabupaten'))).toBe('42501')
    expect(await baca('publik', 'kabupaten_mitra')).toBeNull()
    expect(await baca('konsol', 'sesi_konsol')).toBeNull()
  })

  it('Konsol tidak bisa mengganti hash kata sandi akun lewat UPDATE', async () => {
    const galat = await galatDari(
      uji.klien.dalamTransaksi('konsol', {}, (db) => db.execute(dsql`update pengguna_konsol set kata_sandi_hash = 'x'`)),
    )
    expect(kodePg(galat)).toBe('42501')
  })
})

describe('tabel identitas desa-privat: RLS (SPEC-V0.3 §7.4)', () => {
  beforeAll(async () => {
    for (const desa of ['desa_a', 'desa_b']) {
      const pdk = `pdk_${desa}_1`
      await uji.sqlMigrasi`insert into akun_warga (penduduk_id, desa_id, pin_hash, whatsapp_sandi, diubah) values (${pdk}, ${desa}, 'h', 's', now())`
      await uji.sqlMigrasi`insert into sesi_warga (id, desa_id, penduduk_id, token_hash, dibuat, terakhir_aktif)
        values (${`sw_${desa}`}, ${desa}, ${pdk}, ${`th_${desa}`}, now(), now())`
      await uji.sqlMigrasi`insert into kunci_masuk_desa (desa_id, jenis, kunci, gagal, diubah) values (${desa}, 'warga', 'k1', 1, now())`
    }
  })

  const hitung = (desaId: string | undefined, tabel: string) =>
    uji.klien.dalamTransaksi('desa', { desaId }, async (db) => Number((await db.execute<{ n: number }>(dsql.raw(`select count(*)::int as n from ${tabel}`)))[0].n))

  it('tanpa konteks nol baris, dengan konteks hanya baris desanya', async () => {
    for (const tabel of ['akun_warga', 'sesi_warga', 'kunci_masuk_desa']) {
      expect(await hitung(undefined, tabel), `${tabel} tanpa konteks`).toBe(0)
      expect(await hitung('desa_a', tabel), `${tabel} desa_a`).toBe(1)
      expect(await hitung('desa_b', tabel), `${tabel} desa_b`).toBe(1)
      expect(await hitung('desa_lain', tabel), `${tabel} desa lain`).toBe(0)
    }
  })

  it('konteks desa A tidak bisa menulis akun, sesi, atau kunci atas nama desa B', async () => {
    const tulis = (perintah: ReturnType<typeof dsql>) =>
      galatDari(uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) => db.execute(perintah)))
    expect(kodePg(await tulis(dsql`insert into kunci_masuk_desa (desa_id, jenis, kunci, diubah) values ('desa_b', 'warga', 'k2', now())`))).toBe('42501')
    expect(kodePg(await tulis(dsql`insert into sesi_warga (id, desa_id, penduduk_id, token_hash, dibuat, terakhir_aktif)
      values ('sw_x', 'desa_b', 'pdk_desa_b_2', 'th_x', now(), now())`))).toBe('42501')
  })
})

describe('jejak_audit_platform: hanya tambah', () => {
  it('Konsol dan kabupaten bisa INSERT tetapi tidak SELECT, UPDATE, atau DELETE', async () => {
    for (const peran of ['konsol', 'kabupaten'] as const) {
      const sisip = await galatDari(
        uji.klien.dalamTransaksi(peran, {}, (db) =>
          db.execute(dsql`insert into jejak_audit_platform (id, jenis, waktu) values (${`aud_${peran}`}, 'uji', now())`),
        ),
      )
      expect(sisip, peran).toBeNull()
      for (const perintah of ["update jejak_audit_platform set jenis = 'x'", 'delete from jejak_audit_platform', 'select * from jejak_audit_platform']) {
        const galat = await galatDari(uji.klien.dalamTransaksi(peran, {}, (db) => db.execute(dsql.raw(perintah))))
        expect(kodePg(galat), `${peran}: ${perintah}`).toBe('42501')
      }
    }
    expect((await uji.sqlMigrasi`select count(*)::int as n from jejak_audit_platform`)[0].n).toBe(2)
  })
})

describe('kunci_masuk_platform: tiap peran hanya melihat barisnya sendiri', () => {
  it('Konsol dan kabupaten tidak saling melihat atau saling menulis', async () => {
    const sisip = (peran: 'konsol' | 'kabupaten', jenis: string, kunci: string) =>
      galatDari(
        uji.klien.dalamTransaksi(peran, {}, (db) =>
          db.execute(dsql`insert into kunci_masuk_platform (jenis, kunci, gagal, diubah) values (${jenis}, ${kunci}, 1, now())`),
        ),
      )
    expect(await sisip('konsol', 'konsol', 'a')).toBeNull()
    expect(await sisip('kabupaten', 'kabupaten', 'b')).toBeNull()
    expect(kodePg(await sisip('konsol', 'kabupaten', 'c'))).toBe('42501')
    expect(kodePg(await sisip('kabupaten', 'konsol', 'd'))).toBe('42501')
    const hitung = (peran: 'konsol' | 'kabupaten') =>
      uji.klien.dalamTransaksi(peran, {}, async (db) => Number((await db.execute<{ n: number }>(dsql`select count(*)::int as n from kunci_masuk_platform`))[0].n))
    expect(await hitung('konsol')).toBe(1)
    expect(await hitung('kabupaten')).toBe(1)
  })
})
