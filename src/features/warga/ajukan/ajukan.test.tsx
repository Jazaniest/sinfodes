import { screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { pakaiBerkasNode } from '@/test/berkas-node'
import { renderWarga } from '@/test/render'
import { contohSesiWarga } from '@/test/sesi'
import { AjukanSurat } from './AjukanSurat'

pakaiApiTiruan({ dbSegarTiapUji: true })
pakaiBerkasNode()

/** Pengganti kanvas: foto "dikecilkan" menjadi 200 KB JPEG. */
const kecilkan = async (f: File) => new File([new Uint8Array(200 * 1024)], f.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
const fotoKamera = (nama: string) => new File([new Uint8Array(3000 * 1024)], nama, { type: 'image/png' })
const permohonanSkdSiti = () =>
  ambilDb().permohonan.filter((p) => p.pemohonId === 'pdk_siti_rahmah' && p.kanal === 'online' && p.status === 'menunggu')

async function unggah(user: UserEvent, syarat: string, nama: string) {
  const input = screen.getByRole('group', { name: syarat }).querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error(`Input foto ${syarat} tidak ada`)
  await user.upload(input, fotoKamera(nama))
  await within(screen.getByRole('group', { name: syarat })).findByText(nama.replace(/\.[^.]+$/, '.jpg'))
}

/** Langkah 1-3 untuk Domisili Siti sendiri. */
async function sampaiLampiran(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: /Surat Keterangan Domisili \(SKD\)/ }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Untuk siapa surat ini?' })).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: 'Saya sendiri (Siti Rahmah)' }))
  await user.click(screen.getByRole('button', { name: 'Lanjut' }))
  await user.type(screen.getByRole('textbox', { name: 'Keperluan' }), 'pembukaan rekening bank')
  await user.click(screen.getByRole('button', { name: 'Lanjut' }))
  expect(screen.getByRole('heading', { level: 1, name: 'Lampirkan foto' })).toBeInTheDocument()
}

describe('Ajukan surat (SPEC §10)', () => {
  it('lima langkah sampai terkirim: nomor tiket dan "Kami kabari lewat WhatsApp"; draf dibuang', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<AjukanSurat kecilkan={kecilkan} />)
    const user = userEvent.setup({ applyAccept: false })
    expect(await screen.findByRole('heading', { level: 1, name: 'Pilih jenis surat' })).toBeInTheDocument()
    const sebelum = permohonanSkdSiti().length
    await sampaiLampiran(user)

    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    expect(screen.getByRole('group', { name: 'KTP' })).toHaveTextContent('Foto KTP wajib dilampirkan.')
    await unggah(user, 'KTP', 'ktp.png')
    await unggah(user, 'KK', 'kk.png')
    await unggah(user, 'Pengantar RT', 'pengantar.png')
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Periksa lalu kirim' })).toBeInTheDocument()
    expect(screen.getByText('pembukaan rekening bank')).toBeInTheDocument()
    expect(screen.getByText('ktp.jpg')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kirim permohonan' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Permohonan terkirim' })).toBeInTheDocument()
    expect(screen.getByText(/^2026-\d{4}$/)).toBeInTheDocument()
    expect(screen.getByText('Kami kabari lewat WhatsApp ke 0812-7740-2231 setiap ada perkembangan.')).toBeInTheDocument()
    expect(permohonanSkdSiti()).toHaveLength(sebelum + 1)
    expect(localStorage.getItem('sinfodes.draf.warga.ajukan.pdk_siti_rahmah')).toBeNull()
  })
  it('kirim gagal: isian dan foto tetap; Kirim ulang berhasil sekali saja (fokus review 1)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<AjukanSurat kecilkan={kecilkan} />)
    const user = userEvent.setup({ applyAccept: false })
    const sebelum = permohonanSkdSiti().length
    await sampaiLampiran(user)
    await unggah(user, 'KTP', 'ktp.png')
    await unggah(user, 'KK', 'kk.png')
    await unggah(user, 'Pengantar RT', 'pengantar.png')
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))

    aturModeJaringan('gagal')
    await user.click(screen.getByRole('button', { name: 'Kirim permohonan' }))
    expect(await screen.findByText('Permohonan belum terkirim')).toBeInTheDocument()
    expect(screen.getByText('ktp.jpg')).toBeInTheDocument()
    expect(screen.getByText('pembukaan rekening bank')).toBeInTheDocument()

    aturModeJaringan('instan')
    await user.click(screen.getByRole('button', { name: 'Kirim ulang' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Permohonan terkirim' })).toBeInTheDocument()
    expect(permohonanSkdSiti()).toHaveLength(sebelum + 1)
  })
  it('draf: formulir yang ditutup dibuka lagi di langkah terakhir; foto diminta dipilih lagi; warga lain tidak melihatnya (fokus review 4)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const pertama = renderWarga(<AjukanSurat kecilkan={kecilkan} />)
    const user = userEvent.setup({ applyAccept: false })
    await sampaiLampiran(user)
    pertama.unmount()

    const kedua = renderWarga(<AjukanSurat kecilkan={kecilkan} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Lampirkan foto' })).toBeInTheDocument()
    expect(screen.getByText('Melanjutkan isian yang tersimpan di HP ini')).toBeInTheDocument()
    expect(screen.getByText('Foto lampiran tidak ikut tersimpan; pilih lagi fotonya.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kembali' }))
    expect(screen.getByRole('textbox', { name: 'Keperluan' })).toHaveValue('pembukaan rekening bank')
    // Sesudah warga berpindah langkah, pesan "pilih lagi fotonya" tidak lagi relevan.
    expect(screen.queryByText('Melanjutkan isian yang tersimpan di HP ini')).not.toBeInTheDocument()
    kedua.unmount()

    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    renderWarga(<AjukanSurat kecilkan={kecilkan} />, {
      ...contohSesiWarga(),
      penduduk: { id: 'pdk_zulkifli', nama: 'Zulkifli', nik: '1405091706848005', keluargaId: 'kk_zulkifli' },
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Pilih jenis surat' })).toBeInTheDocument()
    expect(screen.queryByText('Melanjutkan isian yang tersimpan di HP ini')).not.toBeInTheDocument()
  })
  it('isian wajib yang kosong ditandai sebelum lanjut', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<AjukanSurat kecilkan={kecilkan} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Surat Keterangan Domisili \(SKD\)/ }))
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    expect(screen.getByText('Pilih untuk siapa surat ini.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Saya sendiri (Siti Rahmah)' }))
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    expect(screen.getByText('Keperluan wajib diisi')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Isi keterangan' })).toBeInTheDocument()
  })
  it('Ajukan ulang: mulai di langkah isian dengan isian lama; alasan penolakan tampil', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const skd = ambilDb().jenisSurat.find((j) => j.desaId === 'desa_sungai_sialang' && j.kode === 'SKD')
    if (!skd) throw new Error('SKD tidak ada')
    renderWarga(
      <AjukanSurat
        kecilkan={kecilkan}
        awal={{ jenisId: skd.id, untukId: 'pdk_siti_rahmah', isian: { keperluan: 'pendaftaran sekolah anak' }, alasanDitolak: 'Pengantar RT belum dilampirkan.' }}
      />,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Isi keterangan' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Keperluan' })).toHaveValue('pendaftaran sekolah anak')
    expect(screen.getByText('Mengajukan ulang permohonan yang ditolak')).toBeInTheDocument()
    expect(screen.getByText(/Pengantar RT belum dilampirkan\./)).toBeInTheDocument()
  })
})
