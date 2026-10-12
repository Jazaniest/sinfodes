import { describe, expect, it } from 'vitest'
import { kelompokLembaga, pengurusSchema, teksMasaBakti, type Pengurus } from './schema'

const p = (id: string, lembaga: Pengurus['lembaga'], urutan: number): Pengurus => ({
  id, desaId: 'desa_sungai_sialang', lembaga, nama: `Nama ${id}`, jabatan: 'Anggota', pendudukId: null, dusunId: null,
  masaBakti: { mulai: 2021, selesai: 2029 }, urutan,
})

describe('aturan lembaga desa (SPEC §8)', () => {
  it('dikelompokkan menurut urutan lembaga; anggota menurut urutan jabatan; lembaga kosong dilewati', () => {
    const daftar = [p('c', 'bpd', 1), p('a', 'perangkat', 1), p('b', 'bpd', 0), p('d', 'perangkat', 0)]
    expect(pengurusSchema.parse(daftar[0])).toEqual(daftar[0])
    expect(kelompokLembaga(daftar).map((k) => [k.lembaga, k.anggota.map((x) => x.id)])).toEqual([
      ['perangkat', ['d', 'a']],
      ['bpd', ['b', 'c']],
    ])
  })
  it('masa bakti: rentang tahun, atau "sejak" bila belum berakhir', () => {
    expect(teksMasaBakti({ mulai: 2021, selesai: 2029 })).toBe('2021–2029')
    expect(teksMasaBakti({ mulai: 2018, selesai: null })).toBe('sejak 2018')
  })
})
