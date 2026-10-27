import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { JenisSuratWarga } from '@/domain/warga/ajukan'
import type { AnggotaKeluargaWarga } from '@/domain/warga/keluarga'
import { drafAjukanSah, syaratBelumDifoto } from './ajukan'
import { LangkahJenis } from './LangkahJenis'
import { LangkahLampiran } from './LangkahLampiran'
import { LangkahUntuk } from './LangkahUntuk'

const SKD: JenisSuratWarga = {
  id: 'js_ss_skd', kode: 'SKD', nama: 'Surat Keterangan Domisili', subjek: 'pemohon', isian: [],
  syarat: ['KTP', 'KK', 'Pengantar RT'], perkiraanHariKerja: 1,
}
const SKU: JenisSuratWarga = { ...SKD, id: 'js_ss_sku', kode: 'SKU', nama: 'Surat Keterangan Usaha', syarat: ['KTP', 'Foto tempat usaha (opsional)'] }
const SKL: JenisSuratWarga = { ...SKD, id: 'js_ss_skl', kode: 'SKL', nama: 'Surat Keterangan Kelahiran', subjek: 'kelahiran' }

const orang = (id: string, nama: string, hubunganKeluarga: AnggotaKeluargaWarga['hubunganKeluarga'], umurBulan: number): AnggotaKeluargaWarga => ({
  id, nama, nik: null, jenisKelamin: 'P', tempatLahir: 'Teluk Meranti', tanggalLahir: '1991-03-12', hubunganKeluarga, agama: 'Islam',
  golonganDarah: 'O', pendidikan: null, pekerjaan: null, statusPerkawinan: null, namaAyah: '', namaIbu: '', telepon: null, umurBulan,
})
const ANGGOTA = [
  orang('pdk_syahrial', 'Syahrial', 'Kepala Keluarga', 470),
  orang('pdk_siti_rahmah', 'Siti Rahmah', 'Istri', 426),
  orang('pdk_muhammad_alif', 'Muhammad Alif', 'Anak', 34),
]

describe('langkah Ajukan surat (SPEC §10)', () => {
  it('langkah 1: nama jenis lengkap, syarat, dan perkiraan waktu; memilih kartu memilih jenisnya', async () => {
    const onPilih = vi.fn()
    render(<LangkahJenis jenis={[SKD, SKU]} dipilihId={null} onPilih={onPilih} />)
    const kartu = screen.getByRole('button', { name: /Surat Keterangan Domisili \(SKD\)/ })
    expect(kartu).toHaveTextContent('Syarat: KTP, KK, Pengantar RT')
    expect(kartu).toHaveTextContent('Biasanya selesai dalam 1 hari kerja.')
    await userEvent.setup().click(kartu)
    expect(onPilih).toHaveBeenCalledWith(SKD)
  })
  it('langkah 2: diri sendiri atau anggota KK', async () => {
    const onUbah = vi.fn()
    render(<LangkahUntuk jenis={SKD} anggota={ANGGOTA} pendudukId="pdk_siti_rahmah" nilai={null} onUbah={onUbah} />)
    const grup = screen.getByRole('radiogroup', { name: 'Surat ini untuk' })
    expect(within(grup).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual([
      'Syahrial · Kepala Keluarga', 'Saya sendiri (Siti Rahmah)', 'Muhammad Alif · Anak',
    ])
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Syahrial · Kepala Keluarga' }))
    expect(onUbah).toHaveBeenCalledWith('pdk_syahrial')
  })
  it('langkah 2 surat kelahiran: tanpa bayi di bawah 12 bulan, warga diberi tahu cara lainnya (fokus review 3)', () => {
    render(<LangkahUntuk jenis={SKL} anggota={ANGGOTA} pendudukId="pdk_siti_rahmah" nilai={null} onUbah={() => {}} />)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.getByText('Tidak ada bayi di bawah 12 bulan di KK Anda')).toBeInTheDocument()
  })
  it('langkah 4: satu tempat foto per syarat; syarat opsional bertanda "tidak wajib"; galat per syarat tampil', () => {
    render(<LangkahLampiran jenis={SKU} foto={{}} onUbah={() => {}} galat={{ KTP: 'Foto KTP wajib dilampirkan.' }} />)
    expect(screen.getByRole('group', { name: 'KTP' })).toHaveTextContent('Foto KTP wajib dilampirkan.')
    expect(screen.getByRole('group', { name: 'Foto tempat usaha (tidak wajib)' })).toBeInTheDocument()
  })
  it('syarat wajib yang belum difoto; draf dengan bentuk lain diabaikan', () => {
    expect(syaratBelumDifoto(SKU, {})).toEqual(['KTP'])
    expect(drafAjukanSah({ langkah: 'isian', jenisId: 'js_ss_skd', untukId: null, isian: { keperluan: 'x' } })).toBe(true)
    expect(drafAjukanSah({ langkah: 'terbang', jenisId: null, untukId: null, isian: {} })).toBe(false)
    expect(drafAjukanSah({ langkah: 'isian', jenisId: null, untukId: null, isian: { keperluan: 5 } })).toBe(false)
  })
})
