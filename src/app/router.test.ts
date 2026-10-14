import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { buatRouter } from './router'

const parameter = (href: string) => new URL(href, 'http://demo.test').searchParams

describe('router aplikasi (tahap 6D)', () => {
  it('filter Daftar desa dan Pemantauan ditulis tanpa kutip (minor 6A dan 6B)', () => {
    const router = buatRouter(new QueryClient())
    const desa = router.buildLocation({ to: '/konsol/desa', search: { provinsi: '14', kabupaten: '14.10' } })
    expect(desa.href).not.toContain('%22')
    expect(parameter(desa.href).get('kabupaten')).toBe('14.10')
    const pemantauan = router.buildLocation({ to: '/konsol/pemantauan', search: { wilayah: '14.01' } })
    expect(pemantauan.href).toBe('/konsol/pemantauan?wilayah=14.01')
  })
})
