import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { renderDenganRouter } from '@/test/router'
import { GalatPublik } from './GalatPublik'

describe('website desa gagal dibuka (fokus review 4)', () => {
  it('slug asing atau desa belum aktif: "Website desa tidak ditemukan", tanpa Coba lagi', async () => {
    await renderDenganRouter(<GalatPublik error={new GalatApi('NOT_FOUND', 'Website desa tidak ditemukan.', 404)} reset={() => {}} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Website desa tidak ditemukan' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Coba lagi' })).not.toBeInTheDocument()
  })
  it('koneksi gagal: pesan galat dengan Coba lagi', async () => {
    await renderDenganRouter(
      <GalatPublik error={new GalatApi('SERVER', 'Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.', 503)} reset={() => {}} />,
    )
    expect(screen.getByText('Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
})
