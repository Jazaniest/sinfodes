import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { aturLebarLayar } from '@/test/layar'
import { AturKolom } from './AturKolom'
import { DataTable, type KolomTabel } from './DataTable'
import { Pagination } from './Pagination'
import { useKolomTampil } from './useKolomTampil'

type Baris = { id: string; nama: string; umur: number }
const kolom: KolomTabel<Baris>[] = [
  { id: 'nama', judul: 'Nama', isi: (b) => b.nama, urut: 'nama' },
  { id: 'umur', judul: 'Umur', isi: (b) => `${b.umur} tahun`, urut: 'umur', arahUrut: 'descending', rataKanan: true },
]
const baris: Baris[] = [
  { id: 'a', nama: 'Siti Rahmah', umur: 35 },
  { id: 'b', nama: 'Syahrial', umur: 39 },
]
const dasar = { label: 'Daftar uji', kolom, memuat: false, galat: null, kosong: <p>Tidak ada data uji</p> }

describe('DataTable (SPEC §4.4, §13.1)', () => {
  it('tabel berlabel dengan kepala kolom dan baris', () => {
    render(<DataTable {...dasar} baris={baris} />)
    expect(screen.getByRole('grid', { name: 'Daftar uji' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByRole('columnheader', { name: /Nama/ })).toBeInTheDocument()
  })
  it('urutan aktif ditandai aria-sort; klik kepala kolom lain memanggil onUrut', async () => {
    const onUrut = vi.fn()
    render(<DataTable {...dasar} baris={baris} urutAktif="nama" onUrut={onUrut} />)
    expect(screen.getByRole('columnheader', { name: /Nama/ })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('columnheader', { name: /Umur/ }))
    expect(onUrut).toHaveBeenCalledWith('umur')
  })
  it('klik baris memanggil onBukaBaris', async () => {
    const onBukaBaris = vi.fn()
    render(<DataTable {...dasar} baris={baris} onBukaBaris={onBukaBaris} />)
    await userEvent.click(screen.getByRole('row', { name: /Syahrial/ }))
    expect(onBukaBaris).toHaveBeenCalledWith(baris[1])
  })
  it('memuat → baris kerangka berlabel', () => {
    render(<DataTable {...dasar} baris={undefined} memuat />)
    expect(screen.getByRole('status')).toHaveTextContent('Memuat daftar uji…')
  })
  it('galat → pesan dan Coba lagi', async () => {
    const onCobaLagi = vi.fn()
    render(<DataTable {...dasar} baris={undefined} galat="Server sedang tidak dapat dihubungi." onCobaLagi={onCobaLagi} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Server sedang tidak dapat dihubungi.')
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    expect(onCobaLagi).toHaveBeenCalledOnce()
  })
  it('kosong → elemen kosong yang diberikan', () => {
    render(<DataTable {...dasar} baris={[]} />)
    expect(screen.getByText('Tidak ada data uji')).toBeInTheDocument()
  })
  it('layar < 640px → daftar bertumpuk, baris tetap bisa dibuka', async () => {
    aturLebarLayar(390)
    const onBukaBaris = vi.fn()
    render(<DataTable {...dasar} baris={baris} onBukaBaris={onBukaBaris} barisRingkas={(b) => b.nama} />)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Daftar uji' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Syahrial' }))
    expect(onBukaBaris).toHaveBeenCalledWith(baris[1])
  })
})

describe('Pagination', () => {
  it('"1–25 dari 2.812"; Sebelumnya nonaktif di halaman pertama', async () => {
    const onPage = vi.fn()
    render(<Pagination page={1} pageSize={25} total={2812} onPage={onPage} />)
    expect(screen.getByText('1–25 dari 2.812')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sebelumnya/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /Berikutnya/ }))
    expect(onPage).toHaveBeenCalledWith(2)
  })
  it('halaman terakhir', () => {
    render(<Pagination page={113} pageSize={25} total={2812} onPage={vi.fn()} />)
    expect(screen.getByText('2.801–2.812 dari 2.812')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Berikutnya/ })).toBeDisabled()
  })
  it('mengganti ukuran halaman', async () => {
    const onPageSize = vi.fn()
    render(<Pagination page={1} pageSize={25} total={2812} onPage={vi.fn()} onPageSize={onPageSize} />)
    await userEvent.click(screen.getByRole('button', { name: /Baris per halaman/ }))
    await userEvent.click(screen.getByRole('option', { name: '50' }))
    expect(onPageSize).toHaveBeenCalledWith(50)
  })
})

describe('Atur kolom', () => {
  it('kolom wajib tidak bisa disembunyikan; kolom lain bisa', async () => {
    const onUbah = vi.fn()
    render(
      <AturKolom
        kolom={[{ id: 'nik', judul: 'NIK', wajib: true }, { id: 'agama', judul: 'Agama' }]}
        tampil={new Set(['nik'])}
        onUbah={onUbah}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Atur kolom' }))
    expect(screen.getByRole('checkbox', { name: 'NIK' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'NIK' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agama' }))
    expect(onUbah).toHaveBeenCalledWith('agama', true)
  })
  it('pilihan kolom diingat per tabel', () => {
    const pertama = renderHook(() => useKolomTampil('uji', ['nama']))
    act(() => pertama.result.current[1]('agama', true))
    expect([...pertama.result.current[0]]).toEqual(['nama', 'agama'])
    const kedua = renderHook(() => useKolomTampil('uji', ['nama']))
    expect(kedua.result.current[0].has('agama')).toBe(true)
  })
})
