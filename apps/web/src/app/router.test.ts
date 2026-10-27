import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { buatRouter } from './router'

const parameter = (href: string) => new URL(href, 'http://demo.test').searchParams

describe('router aplikasi (tahap 6D)', () => {
  it('filter Daftar desa ditulis tanpa kutip (minor 6A)', () => {
    const router = buatRouter(new QueryClient())
    const desa = router.buildLocation({ to: '/konsol/desa', search: { provinsi: '14', kabupaten: '14.10' } })
    expect(desa.href).not.toContain('%22')
    expect(parameter(desa.href).get('kabupaten')).toBe('14.10')
  })
})
