import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { sisipkanDesaContoh } from '../../test/data-contoh'
import type { Penyandi } from '../kripto/penyandi'
import { ruang } from '../kripto/ruang'
import { catatAktivitas, catatRiwayat, pelakuKontrak } from './catat'

let uji: DbUji
let penyandi: Penyandi
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_a', 2)
  await sisipkanDesaContoh(uji.sqlMigrasi, 'desa_b', 2)
})
afterAll(async () => {
  await uji?.tutup()
})

const WAKTU = '2026-09-24T09:00:00+07:00'
const OLEH = { id: 'pgn_x', nama: 'Operator Uji' }

describe('pelakuKontrak', () => {
  it('hanya id dan nama pelaku panel', () => {
    expect(pelakuKontrak({ id: 'pgn_rosmiati', nama: 'Rosmiati' })).toEqual({ id: 'pgn_rosmiati', nama: 'Rosmiati' })
  })
})

describe('catatRiwayat', () => {
  it('satu baris per perubahan: potret pelaku, waktu tepat, ID berawalan rwy_, milik desa penduduknya', async () => {
    await uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) =>
      catatRiwayat(
        db,
        penyandi,
        { id: 'pdk_desa_a_1', desaId: 'desa_a' },
        [
          { field: 'pekerjaan', nilaiLama: 'Petani/Pekebun', nilaiBaru: 'Pedagang' },
          { field: 'catatan', nilaiLama: null, nilaiBaru: 'Pindah rumah' },
        ],
        OLEH,
        WAKTU,
      ),
    )
    const baris = await uji.sqlMigrasi`select * from riwayat_penduduk where desa_id = 'desa_a' and penduduk_id = 'pdk_desa_a_1' and field in ('pekerjaan', 'catatan') order by field`
    expect(baris).toHaveLength(2)
    expect(baris[0]).toMatchObject({ field: 'catatan', nilai_lama: null, nilai_baru: 'Pindah rumah', oleh_id: 'pgn_x', oleh_nama: 'Operator Uji' })
    expect(baris[1]).toMatchObject({ field: 'pekerjaan', nilai_lama: 'Petani/Pekebun', nilai_baru: 'Pedagang' })
    expect((baris[0].waktu as Date).getTime()).toBe(new Date(WAKTU).getTime())
    for (const b of baris) expect(b.id).toMatch(/^rwy_[0-9a-f-]{36}$/)
  })

  it('nilai NIK dan telepon disandikan di ruang riwayat desanya dan terbuka kembali; nilai kosong tetap kosong', async () => {
    await uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) =>
      catatRiwayat(
        db,
        penyandi,
        { id: 'pdk_desa_a_2', desaId: 'desa_a' },
        [
          { field: 'nik', nilaiLama: null, nilaiBaru: '140509 520391 8002' },
          { field: 'telepon', nilaiLama: '081234567890', nilaiBaru: null },
        ],
        OLEH,
        WAKTU,
      ),
    )
    const baris = await uji.sqlMigrasi`select field, nilai_lama, nilai_baru from riwayat_penduduk where penduduk_id = 'pdk_desa_a_2' order by field`
    expect(baris).toHaveLength(2)
    const nik = baris.find((b) => b.field === 'nik')
    const telepon = baris.find((b) => b.field === 'telepon')
    expect(nik?.nilai_lama).toBeNull()
    expect(String(nik?.nilai_baru)).toMatch(/^v1\./)
    expect(String(nik?.nilai_baru)).not.toContain('8002')
    expect(penyandi.bukaSandi(nik?.nilai_baru as string, ruang.riwayat('desa_a'))).toBe('140509 520391 8002')
    expect(String(telepon?.nilai_lama)).not.toContain('081234567890')
    expect(penyandi.bukaSandi(telepon?.nilai_lama as string, ruang.riwayat('desa_a'))).toBe('081234567890')
    expect(telepon?.nilai_baru).toBeNull()
  })

  it('tanpa perubahan tidak menulis apa pun', async () => {
    const sebelum = (await uji.sqlMigrasi`select count(*)::int as n from riwayat_penduduk`)[0].n
    await uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) => catatRiwayat(db, penyandi, { id: 'pdk_desa_a_1', desaId: 'desa_a' }, [], OLEH, WAKTU))
    expect((await uji.sqlMigrasi`select count(*)::int as n from riwayat_penduduk`)[0].n).toBe(sebelum)
  })

  it('penduduk desa lain ditolak RLS: konteks desa A tidak bisa menulis riwayat desa B', async () => {
    await expect(
      uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, (db) =>
        catatRiwayat(db, penyandi, { id: 'pdk_desa_b_1', desaId: 'desa_b' }, [{ field: 'nama', nilaiLama: 'A', nilaiBaru: 'B' }], OLEH, WAKTU),
      ),
    ).rejects.toThrow()
  })
})

describe('catatAktivitas', () => {
  it('menyimpan pelaku dan rujukan; keduanya boleh kosong', async () => {
    await uji.klien.dalamTransaksi('desa', { desaId: 'desa_a' }, async (db) => {
      await catatAktivitas(db, { desaId: 'desa_a', dusunId: 'dsn_desa_a', waktu: WAKTU, jenis: 'penduduk-tambah', ringkasan: 'Penduduk ditambahkan · Uji', oleh: OLEH, rujukan: { jenis: 'penduduk', id: 'pdk_desa_a_1' } })
      await catatAktivitas(db, { desaId: 'desa_a', dusunId: null, waktu: WAKTU, jenis: 'penduduk-ekspor', ringkasan: 'Data penduduk diunduh (2 baris)', oleh: null, rujukan: null })
    })
    const baris = await uji.sqlMigrasi`select * from aktivitas where desa_id = 'desa_a' order by jenis desc`
    expect(baris).toHaveLength(2)
    expect(baris[0]).toMatchObject({ jenis: 'penduduk-tambah', dusun_id: 'dsn_desa_a', oleh_id: 'pgn_x', oleh_nama: 'Operator Uji', rujukan_jenis: 'penduduk', rujukan_id: 'pdk_desa_a_1' })
    expect(baris[1]).toMatchObject({ jenis: 'penduduk-ekspor', dusun_id: null, oleh_id: null, oleh_nama: null, rujukan_jenis: null, rujukan_id: null })
    for (const b of baris) expect(b.id).toMatch(/^akt_[0-9a-f-]{36}$/)
  })
})
