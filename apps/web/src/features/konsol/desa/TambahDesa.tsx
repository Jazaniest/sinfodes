import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol, opsiUsulanAlamat, tambahDesa } from '@/api/konsol'
import { DOMAIN_INDUK } from '@/app/alamat'
import { formatRupiah } from '@/domain/format/angka'
import { galatDariZod } from '@/domain/format/galat-isian'
import { HARGA_TRIWULAN, PAKET, tambahDesaSchema, type Paket } from '@/domain/konsol/schema'
import { daftarProvinsi, kabupatenDi, kecamatanDi } from '@/domain/wilayah/kode-wilayah'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { useTunda } from '@/ui/hooks/useTunda'
import { Banner } from '@/ui/umpan-balik/Banner'
import { StatusAlamat } from './StatusAlamat'

type Hasil = { id: string; nama: string; email: string }
type Props = { onSelesai: (hasil: Hasil) => void; onBatal: () => void }

const PROVINSI = daftarProvinsi()

/**
 * Tambah desa (SPEC §11): nama, wilayah bertingkat (provinsi → kabupaten → kecamatan → kode desa), paket, dan email
 * admin pertama. Isian diperiksa dulu di layar; bentrok kode desa atau email dari server tampil di kolomnya. Admin pertama
 * berperan Sekretaris Desa (tahap 6C).
 */
export function TambahDesa({ onSelesai, onBatal }: Props) {
  const queryClient = useQueryClient()
  const [nama, setNama] = useState('')
  const [provinsi, setProvinsi] = useState<string | null>(null)
  const [kabupaten, setKabupaten] = useState<string | null>(null)
  const [kecamatan, setKecamatan] = useState<string | null>(null)
  const [kodeDesa, setKodeDesa] = useState('')
  const [paket, setPaket] = useState<Paket>('Dasar')
  const [email, setEmail] = useState('')
  // Alamat website (SPEC-V0.2 §4.2): diusulkan dari nama dan kecamatan sampai Tim Sinfodes mengetik sendiri.
  const [alamatSendiri, setAlamatSendiri] = useState<string | null>(null)
  const namaTenang = useTunda(nama.trim(), 300)
  const usulan = useQuery({
    ...opsiUsulanAlamat(namaTenang, kecamatan ?? ''),
    enabled: alamatSendiri === null && namaTenang.length >= 3 && kecamatan !== null,
  })
  const alamat = alamatSendiri ?? usulan.data?.usulan ?? ''
  const [galat, setGalat] = useState<Record<string, string>>({})
  const simpan = useMutation({
    mutationFn: tambahDesa,
    onSuccess: async (hasil) => {
      tampilkanToast({
        pesan: `Undangan terkirim ke ${hasil.email} (tiruan). Di demo, akunnya langsung aktif dengan kata sandi demo. Desa ${hasil.nama} masuk berstatus Persiapan.`,
        nada: 'berhasil',
      })
      await queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
      onSelesai(hasil)
    },
    onError: (e) => setGalat(e instanceof GalatApi && Object.keys(e.fields).length > 0 ? e.fields : { _: pesanGalat(e) }),
  })
  const pilihanKabupaten = provinsi ? kabupatenDi(provinsi) : []
  const pilihanKecamatan = kabupaten ? kecamatanDi(kabupaten) : []

  const kirim = (e: FormEvent) => {
    e.preventDefault()
    const isian = tambahDesaSchema.safeParse({ nama, kecamatan: kecamatan ?? '', kodeDesa, paket, email, alamat })
    if (!isian.success) {
      setGalat(galatDariZod(isian.error))
      return
    }
    setGalat({})
    simpan.mutate(isian.data)
  }

  return (
    <div className="max-w-2xl">
      <PageHeader jejak={[{ label: 'Desa', href: '/konsol/desa' }]} judul="Tambah desa" />
      <form onSubmit={kirim} noValidate className="flex flex-col gap-5 py-6">
        {galat._ && <Banner nada="galat">{galat._}</Banner>}
        <TextField label="Nama desa" value={nama} onChange={setNama} galat={galat.nama} isRequired />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Provinsi"
            pilihan={PROVINSI.map((p) => ({ id: p.kode, label: p.nama }))}
            nilai={provinsi}
            onUbah={(id) => {
              setProvinsi(id)
              setKabupaten(null)
              setKecamatan(null)
            }}
          />
          <Select
            label="Kabupaten/kota"
            pilihan={pilihanKabupaten.map((k) => ({ id: k.kode, label: k.nama }))}
            nilai={kabupaten}
            isDisabled={pilihanKabupaten.length === 0}
            keterangan={provinsi && pilihanKabupaten.length === 0 ? 'Kabupaten provinsi ini belum ada di tabel wilayah demo.' : undefined}
            onUbah={(id) => {
              setKabupaten(id)
              setKecamatan(null)
            }}
          />
          <Select
            label="Kecamatan"
            pilihan={pilihanKecamatan.map((k) => ({ id: k.kode, label: k.nama }))}
            nilai={kecamatan}
            isDisabled={pilihanKecamatan.length === 0}
            keterangan={kabupaten && pilihanKecamatan.length === 0 ? 'Kecamatan kabupaten ini belum ada di tabel wilayah demo.' : undefined}
            galat={galat.kecamatan}
            onUbah={setKecamatan}
          />
        </div>
        <TextField
          label="Kode desa"
          value={kodeDesa}
          onChange={setKodeDesa}
          inputMode="numeric"
          maxLength={4}
          keterangan={kecamatan ? `Kode lengkap: ${kecamatan}.${kodeDesa || '2…'}` : '4 angka dari kode wilayah Kemendagri, mis. 2015.'}
          galat={galat.kodeDesa}
          isRequired
        />
        <div className="flex flex-col gap-1.5">
          <TextField
            label="Alamat website"
            value={alamat}
            onChange={setAlamatSendiri}
            inputClassName="font-mono"
            galat={galat.alamat}
            isRequired
          />
          <p className="text-teks-kecil text-tinta-2">
            Alamat lengkap: <span className="font-mono">{alamat || 'namadesa'}</span>
            <span className="font-mono">.{DOMAIN_INDUK}</span>
          </p>
          <StatusAlamat label={alamat} />
        </div>
        <RadioGroup
          label="Paket"
          pilihan={PAKET.map((p) => ({ id: p, label: `${p} · ${formatRupiah(HARGA_TRIWULAN[p])} per triwulan` }))}
          nilai={paket}
          onUbah={(id) => setPaket(PAKET.find((p) => p === id) ?? 'Dasar')}
        />
        <TextField
          label="Email admin pertama"
          type="email"
          value={email}
          onChange={setEmail}
          keterangan="Admin pertama berperan Sekretaris Desa: ia mengerjakan lima langkah persiapan dan menambah pengguna desa. Undangan dikirim ke email ini."
          galat={galat.email}
          isRequired
        />
        <div className="flex flex-wrap gap-3">
          <Tombol type="submit" varian="utama" memuat={simpan.isPending}>
            Simpan dan kirim undangan
          </Tombol>
          <Tombol onPress={onBatal}>Batal</Tombol>
        </div>
      </form>
    </div>
  )
}
