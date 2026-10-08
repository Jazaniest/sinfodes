import { beforeAll, describe, expect, it } from 'vitest'
import { hitungUmur } from '@/domain/format/tanggal'
import { keluargaSchema, type Keluarga } from '@/domain/keluarga/schema'
import { dataBelumLengkap } from '@/domain/penduduk/filter'
import { periksaNik } from '@/domain/penduduk/nik'
import { pendudukSchema, type Penduduk } from '@/domain/penduduk/schema'
import { DUSUN_DEMO, ID_SUNGAI_SIALANG } from '../data/desa-demo'
import { buatAcak } from '../prng'
import { bangkitkanPenduduk, hitungJumlahPerKelompok, KELOMPOK_UMUR, TARGET_PENDUDUK } from './penduduk'

const ACUAN = new Date('2026-09-24T02:00:00Z')
const bangkitkan = () =>
  bangkitkanPenduduk(buatAcak(20260924), { desaId: ID_SUNGAI_SIALANG, dusun: DUSUN_DEMO, acuan: ACUAN })
const umur = (p: Penduduk) => hitungUmur(p.tanggalLahir, ACUAN).tahun

let penduduk: Penduduk[]
let keluarga: Keluarga[]
let perId: Map<string, Penduduk>
beforeAll(() => {
  ;({ penduduk, keluarga } = bangkitkan())
  perId = new Map(penduduk.map((p) => [p.id, p] as const))
})

describe('jumlah dan komposisi (SPEC §12.3)', () => {
  it('2.812 jiwa, 1.431 laki-laki, 1.381 perempuan, 806 KK', () => {
    expect(penduduk).toHaveLength(TARGET_PENDUDUK.jiwa)
    expect(penduduk.filter((p) => p.jenisKelamin === 'L')).toHaveLength(TARGET_PENDUDUK.laki)
    expect(penduduk.filter((p) => p.jenisKelamin === 'P')).toHaveLength(TARGET_PENDUDUK.perempuan)
    expect(keluarga).toHaveLength(TARGET_PENDUDUK.kk)
  })
  it('piramida umur persis sesuai target', () => {
    const jumlah = KELOMPOK_UMUR.map(([min, max]) => penduduk.filter((p) => umur(p) >= min && umur(p) <= max).length)
    expect(jumlah).toEqual(hitungJumlahPerKelompok(TARGET_PENDUDUK.jiwa))
  })
  it('balita 211 orang (dipakai modul Kesehatan)', () => expect(penduduk.filter((p) => umur(p) <= 4)).toHaveLength(211))
  it('tepat 12 penduduk dengan data belum lengkap', () =>
    expect(penduduk.filter((p) => dataBelumLengkap(p, ACUAN))).toHaveLength(12))
  it('mayoritas Islam (91–96%)', () => {
    const islam = penduduk.filter((p) => p.agama === 'Islam').length / penduduk.length
    expect(islam).toBeGreaterThan(0.91)
    expect(islam).toBeLessThan(0.96)
  })
  it('famili lain tidak lebih dari 5%', () =>
    expect(penduduk.filter((p) => p.hubunganKeluarga === 'Famili Lain').length / penduduk.length).toBeLessThanOrEqual(0.05))
})

describe('aturan konsistensi (SPEC §12.4)', () => {
  it('semua data valid terhadap skema', () => {
    penduduk.forEach((p) => expect(pendudukSchema.safeParse(p).success, p.id).toBe(true))
    keluarga.forEach((k) => expect(keluargaSchema.safeParse(k).success, k.id).toBe(true))
  })
  it('setiap penduduk berada di tepat satu KK', () => {
    const hitung = new Map<string, number>()
    for (const k of keluarga) for (const id of k.anggotaIds) hitung.set(id, (hitung.get(id) ?? 0) + 1)
    const perKk = new Map(keluarga.map((k) => [k.id, k] as const))
    for (const p of penduduk) {
      expect(hitung.get(p.id)).toBe(1)
      expect(perKk.get(p.keluargaId)?.anggotaIds).toContain(p.id)
    }
  })
  it('setiap KK punya tepat satu kepala keluarga', () => {
    for (const k of keluarga) {
      const kepala = k.anggotaIds.filter((id) => perId.get(id)?.hubunganKeluarga === 'Kepala Keluarga')
      expect(kepala).toEqual([k.kepalaKeluargaId])
    }
  })
  it('anak minimal 15 tahun lebih muda dari kepala keluarga dan istri', () => {
    for (const k of keluarga) {
      const anggota = k.anggotaIds.map((id) => perId.get(id)!)
      const orangTua = anggota.filter((a) => a.hubunganKeluarga === 'Kepala Keluarga' || a.hubunganKeluarga === 'Istri')
      for (const anak of anggota.filter((a) => a.hubunganKeluarga === 'Anak')) {
        for (const o of orangTua) expect(umur(o) - umur(anak)).toBeGreaterThanOrEqual(15)
      }
    }
  })
  it('suami dan istri sama-sama berstatus kawin', () => {
    for (const k of keluarga) {
      const istri = k.anggotaIds.map((id) => perId.get(id)!).find((a) => a.hubunganKeluarga === 'Istri')
      if (!istri) continue
      expect(perId.get(k.kepalaKeluargaId)?.statusPerkawinan).toBe(istri.statusPerkawinan)
      expect(['Kawin Tercatat', 'Kawin Belum Tercatat']).toContain(istri.statusPerkawinan)
    }
  })
  it('alamat anggota sama dengan alamat KK', () => {
    for (const k of keluarga) {
      for (const id of k.anggotaIds) expect(perId.get(id)).toMatchObject({ dusunId: k.dusunId, rw: k.rw, rt: k.rt })
    }
  })
  it('NIK unik, cocok dengan tanggal lahir dan jenis kelamin, nomor urut 8001–9999', () => {
    const semuaNik = penduduk.flatMap((p) => (p.nik ? [p.nik] : []))
    expect(new Set(semuaNik).size).toBe(semuaNik.length)
    for (const p of penduduk) {
      if (!p.nik) continue
      expect(periksaNik(p.nik, ACUAN)).toMatchObject({
        status: 'valid',
        tanggalLahir: p.tanggalLahir,
        jenisKelamin: p.jenisKelamin,
      })
      const urut = Number(p.nik.slice(12))
      expect(urut).toBeGreaterThanOrEqual(8001)
      expect(urut).toBeLessThanOrEqual(9999)
    }
  })
  it('hanya bayi di bawah 3 bulan yang belum punya NIK', () => {
    for (const p of penduduk) expect(p.nik === null).toBe(hitungUmur(p.tanggalLahir, ACUAN).bulan < 3)
  })
  it('nomor KK unik dengan nomor urut 8001–9999', () => {
    expect(new Set(keluarga.map((k) => k.nomorKk)).size).toBe(keluarga.length)
    for (const k of keluarga) expect(Number(k.nomorKk.slice(12))).toBeGreaterThanOrEqual(8001)
  })
  it('keluarga persona ada dengan NIK dan nomor KK tetap (SPEC §12.9)', () => {
    const siti = penduduk.find((p) => p.nik === '1405095203918002')
    expect(siti).toMatchObject({ nama: 'Siti Rahmah', hubunganKeluarga: 'Istri', rw: '002', rt: '004' })
    expect(keluarga.find((k) => k.id === siti?.keluargaId)?.nomorKk).toBe('1405092011238004')
    const zulkifli = penduduk.find((p) => p.nik === '1405091706848005')
    expect(zulkifli).toMatchObject({ nama: 'Zulkifli', pekerjaan: 'Wiraswasta' })
    expect(keluarga.find((k) => k.id === zulkifli?.keluargaId)?.nomorKk).toBe('1405091803198004')
  })
  it('seed dan tanggal acuan yang sama menghasilkan data identik', () =>
    expect(JSON.stringify(bangkitkan())).toBe(JSON.stringify({ penduduk, keluarga })))
})
