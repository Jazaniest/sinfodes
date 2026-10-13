import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { KreditFoto } from './KreditFoto'

pakaiApiTiruan()

describe('Kredit foto (SPEC §9, K8)', () => {
  it('setiap foto: judul asli bertaut ke Wikimedia Commons, pembuat, dan lisensi bertaut', async () => {
    renderPublik(<KreditFoto />)
    expect(screen.getByRole('heading', { level: 1, name: 'Kredit foto' })).toBeInTheDocument()
    expect(await screen.findAllByRole('listitem')).toHaveLength(15)
    expect(screen.getByRole('link', { name: 'Bekudo Bono.jpg' })).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Bekudo_Bono.jpg')
    expect(screen.getByText('Domiyanto1977')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'CC BY-SA 4.0' })[0]).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/')
    expect(screen.getAllByRole('link', { name: 'CC0' })).toHaveLength(3)
  })
})
