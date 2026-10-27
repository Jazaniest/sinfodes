import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { keAlamat } from '@/app/alamat'
import { ambilDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { HalamanBuktiLencana } from './HalamanBuktiLencana'

pakaiApiTiruan()

const pasang = (kode: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HalamanBuktiLencana kode={kode} />
    </QueryClientProvider>,
  )

describe('Halaman bukti lencana (rencana 7C-2 Tugas 5)', () => {
  it('kode sah: kalimat, nama desa, penjelasan, tanggal terbit, dan tautan ke website desa', async () => {
    const l = ambilDb().lencana.find((x) => x.desaId === 'desa_sungai_sialang' && x.periode.musim === 'bulanan')!
    pasang(l.kode)
    const judul = await screen.findByRole('heading', { level: 1 })
    expect(judul.textContent).toMatch(/^Juara \d( bersama)? .+ · (Kecamatan|Kabupaten) .+ · .+ 20\d\d$/)
    expect(screen.getByText('Bukti lencana')).toBeInTheDocument()
    expect(screen.getByText(/^Sungai Sialang, Kecamatan Teluk Meranti, Kabupaten Pelalawan$/)).toBeInTheDocument()
    expect(screen.getByText(/^Diterbitkan otomatis oleh Sinfodes pada \d{1,2} [A-Za-z]+ 20\d\d dari jejak aplikasi desa\. Lencana tidak bisa dibeli atau diajukan\.$/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buka website Desa Sungai Sialang' })).toHaveAttribute('href', keAlamat({ jenis: 'desa', label: 'sungaisialang' }))
    expect(screen.queryByText(/Indeks|Tingkatan/)).toBeNull()
  })
  it('kode tidak sah: halaman tidak ditemukan dengan tautan ke landing', async () => {
    pasang('LJ-00000000')
    expect(await screen.findByRole('heading', { level: 1, name: 'Lencana tidak ditemukan' })).toBeInTheDocument()
    expect(screen.getByText('Kode LJ-00000000 tidak terdaftar. Lencana yang sah selalu bisa dibuka di halaman ini.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ke halaman utama Sinfodes' })).toHaveAttribute('href', keAlamat({ jenis: 'induk' }))
  })
})
