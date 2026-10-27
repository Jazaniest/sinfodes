import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Mutasi } from '@/domain/mutasi/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { JenisSurat } from '@/domain/surat/jenis'
import { contohPenduduk } from '@/test/contoh'
import { contohJenis } from '@/test/contoh-surat'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { LangkahPemohon } from './LangkahPemohon'

const HARI_INI = new Date('2026-09-24T02:00:00Z')
function pasang(jenis: JenisSurat, pemohon: Penduduk | null, subjek: Penduduk | null = null, mutasi: Mutasi | null = null) {
  return renderPanel(
    <LangkahPemohon jenis={jenis} pemohon={pemohon} subjek={subjek} mutasi={mutasi} onPemohon={vi.fn()} onSubjek={vi.fn()} hariIni={HARI_INI} />,
    contohSesi(),
  )
}

describe('Buat surat langkah 2: pemohon (SPEC §7.4)', () => {
  it('pemohon terpilih: ringkasan datanya, tanpa peringatan bila lengkap', () => {
    pasang(contohJenis('SKD'), contohPenduduk())
    expect(screen.getByRole('combobox', { name: 'Pemohon' })).toHaveValue('Siti Rahmah')
    expect(screen.getByRole('heading', { name: 'Ringkasan pemohon' })).toBeInTheDocument()
    expect(screen.getByText('RT 004/RW 002, Dusun I Kampung Tengah')).toBeInTheDocument()
    expect(screen.queryByText('Periksa data pemohon')).not.toBeInTheDocument()
  })
  it('data belum lengkap → peringatan, tetap boleh lanjut', () => {
    pasang(contohJenis('SKD'), contohPenduduk({ pekerjaan: null }))
    expect(screen.getByText('Periksa data pemohon')).toBeInTheDocument()
    expect(screen.getByText('Pekerjaan belum diisi')).toBeInTheDocument()
  })
  it('pemohon Meninggal → surat tidak bisa dibuat (fokus review 1)', () => {
    pasang(contohJenis('SKD'), contohPenduduk({ statusDasar: 'Meninggal' }))
    expect(screen.getByText('Surat tidak bisa dibuat')).toBeInTheDocument()
    expect(screen.getByText(/berstatus Meninggal/)).toBeInTheDocument()
  })
  it('surat kematian: kolom penduduk yang meninggal, dengan galat bila belum dicatat meninggal', () => {
    pasang(contohJenis('SKM'), contohPenduduk(), contohPenduduk({ id: 'pdk_ahmad', nama: 'Ahmad' }))
    expect(screen.getByRole('combobox', { name: 'Penduduk yang meninggal' })).toHaveValue('Ahmad')
    expect(screen.getByRole('combobox', { name: 'Pemohon (pelapor)' })).toBeInTheDocument()
    expect(screen.getByText('Ahmad belum dicatat meninggal. Catat kematiannya lebih dulu di Mutasi.')).toBeInTheDocument()
  })
  it('isian dari mutasi diberi tahu', () => {
    const lahir: Mutasi = {
      id: 'mts_lahir', desaId: 'desa_sungai_sialang', jenis: 'lahir', tanggal: '2026-09-21', pendudukIds: ['pdk_bayi'],
      dicatatOleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, dicatatPada: '2026-09-24T08:00:00+07:00',
      rincian: {
        jam: '05:20', tempatDilahirkan: 'Puskesmas', tempatLahir: 'Pelalawan', jenisKelahiran: 'Tunggal', anakKe: 3,
        penolong: 'Bidan/Perawat', beratGram: 3050, panjangCm: 49, ibuId: 'pdk_ibu', ayahId: 'pdk_ayah', pelapor: 'Zulkifli',
      },
    }
    pasang(contohJenis('SKL'), contohPenduduk(), contohPenduduk({ id: 'pdk_bayi', nama: 'Nayla', nik: null }), lahir)
    expect(screen.getByRole('combobox', { name: 'Bayi yang diterangkan' })).toHaveValue('Nayla')
    expect(screen.getByText('Isian diambil dari kelahiran yang dicatat 21 September 2026')).toBeInTheDocument()
  })
})
