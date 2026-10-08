import { describe, expect, it } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { hapusSesi, pulihkanSesi, simpanSesi } from './sesi'

describe('sesi lokal', () => {
  it('menyimpan, memulihkan, dan memasang token di pemanggil API', () => {
    simpanSesi('demo.pgn_rosmiati')
    expect(pulihkanSesi()).toBe('demo.pgn_rosmiati')
    expect(ambilTokenSesi()).toBe('demo.pgn_rosmiati')
  })
  it('hapus sesi', () => {
    simpanSesi('demo.pgn_rosmiati')
    hapusSesi()
    expect(pulihkanSesi()).toBeNull()
    expect(ambilTokenSesi()).toBeNull()
  })
})
