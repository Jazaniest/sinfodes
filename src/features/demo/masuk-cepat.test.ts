import { describe, expect, it } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { ambilKunciMasukCepat, tautanMasukCepat, terapkanMasukCepat } from './masuk-cepat'

pakaiApiTiruan({ dbSegarTiapUji: true })

const ss = { jenis: 'desa', label: 'sungaisialang' } as const

describe('masuk cepat demo lintas alamat (SPEC-V0.2 §4.6)', () => {
  it('tautan berisi kunci akun, bukan NIK atau kata sandi', () => {
    expect(tautanMasukCepat(ss, '/admin/surat', 'pgn_rosmiati')).toBe('http://sungaisialang.sinfodes.localhost:3000/admin/surat?demo=pgn_rosmiati')
    expect(tautanMasukCepat(ss, '/admin/surat?status=perlu-ttd', 'pgn_hendri')).toBe(
      'http://sungaisialang.sinfodes.localhost:3000/admin/surat?status=perlu-ttd&demo=pgn_hendri',
    )
  })
  it.each([
    ['?demo=pgn_rosmiati&tab=x', { kunci: 'pgn_rosmiati', sisa: '?tab=x' }],
    ['?demo=pgn_rosmiati', { kunci: 'pgn_rosmiati', sisa: '' }],
    ['?tab=x', { kunci: null, sisa: '?tab=x' }],
    ['', { kunci: null, sisa: '' }],
  ])('ambilKunciMasukCepat(%s)', (s, h) => expect(ambilKunciMasukCepat(s)).toEqual(h))
  it('akun panel di alamat desanya', async () => {
    expect(await terapkanMasukCepat(ss, '/admin', 'pgn_rosmiati')).toBe(true)
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
  })
  it('akun warga di /warga', async () => {
    expect(await terapkanMasukCepat(ss, '/warga', 'pdk_siti_rahmah')).toBe(true)
    expect(ambilTokenSesi('warga')).toBe('warga.pdk_siti_rahmah')
  })
  it('akun Konsol di alamat Konsol', async () => {
    expect(await terapkanMasukCepat({ jenis: 'konsol' }, '/', 'kns_dina')).toBe(true)
    expect(ambilTokenSesi('konsol')).toBe('konsol.kns_dina')
  })
  it('akun kabupaten di alamat kabupatennya (SPEC-V0.2 §8.1)', async () => {
    const pelalawan = { jenis: 'kabupaten', label: 'kab-pelalawan' } as const
    expect(tautanMasukCepat(pelalawan, '/admin', 'kab_rosnani')).toBe('http://kab-pelalawan.sinfodes.localhost:3000/admin?demo=kab_rosnani')
    expect(await terapkanMasukCepat(pelalawan, '/admin', 'kab_wahyu')).toBe(false)
    expect(await terapkanMasukCepat(pelalawan, '/admin', 'kab_rosnani')).toBe(true)
    expect(ambilTokenSesi('kabupaten')).toBe('kab.kab_rosnani')
  })
  it('akun yang tidak cocok dengan alamat atau tidak dikenal tidak dipakai', async () => {
    expect(await terapkanMasukCepat(ss, '/admin', 'kns_dina')).toBe(false)
    expect(await terapkanMasukCepat(ss, '/admin', 'tidak_ada')).toBe(false)
    expect(await terapkanMasukCepat({ jenis: 'desa', label: 'tanjunglamo' }, '/admin', 'pgn_rosmiati')).toBe(false)
    expect(ambilTokenSesi()).toBeNull()
  })
})
