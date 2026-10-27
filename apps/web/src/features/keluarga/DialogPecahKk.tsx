import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { kunciKeluarga, pecahKeluarga } from '@/api/keluarga'
import { segarkanKependudukan } from '@/api/segarkan'
import { HUBUNGAN_ANGGOTA, usulanHubunganPecah, type HubunganAnggota } from '@/domain/keluarga/masukan'
import type { DetailKeluarga } from '@/domain/keluarga/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import { alamatLengkap, namaDusun } from '@/domain/wilayah/alamat'
import { Checkbox } from '@/ui/isian/Checkbox'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { useSesiAdmin } from '../admin/sesi-konteks'

const LANGKAH = ['Anggota yang keluar', 'Kepala dan alamat', 'Pratinjau'] as const

type Props = { detail: DetailKeluarga; isOpen: boolean; onOpenChange: (buka: boolean) => void; onSelesai: (idKkBaru: string) => void }

/** Pecah KK (SPEC §6.5): pilih anggota yang keluar → kepala keluarga baru dan alamat → pratinjau → simpan. */
export function DialogPecahKk({ detail, isOpen, onOpenChange, onSelesai }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const istilah = desa.istilahWilayah
  const queryClient = useQueryClient()
  const { keluarga: kk, anggota } = detail
  const kepalaLama = anggota.find((a) => a.id === kk.kepalaKeluargaId)
  const [langkah, setLangkah] = useState(0)
  const [dipilih, setDipilih] = useState<string[]>([])
  const [kepalaBaruId, setKepalaBaruId] = useState<string | null>(null)
  const [wilayah, setWilayah] = useState({ dusunId: kk.dusunId, rw: kk.rw, rt: kk.rt })
  const [hubungan, setHubungan] = useState<Record<string, HubunganAnggota>>({})

  const keluar = anggota.filter((a) => dipilih.includes(a.id))
  const tinggal = anggota.filter((a) => !dipilih.includes(a.id))
  const kepalaBaru = keluar.find((a) => a.id === kepalaBaruId) ?? keluar.at(0)
  const dusunTerpilih = dusun.find((d) => d.id === wilayah.dusunId)
  const rwTerpilih = dusunTerpilih?.rw.find((w) => w.nomor === wilayah.rw)
  const wilayahLengkap = Boolean(rwTerpilih?.rt.some((t) => t.nomor === wilayah.rt))
  const hubunganDi = (p: Penduduk) => hubungan[p.id] ?? usulanHubunganPecah(p)

  const simpan = useMutation({
    mutationFn: () => {
      if (!kepalaBaru) throw new Error('Pilih anggota yang keluar')
      return pecahKeluarga(kk.id, {
        anggotaIds: keluar.map((a) => a.id),
        kepalaBaruId: kepalaBaru.id,
        ...wilayah,
        hubungan: Object.fromEntries(keluar.filter((a) => a.id !== kepalaBaru.id).map((a) => [a.id, hubunganDi(a)])),
      })
    },
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciKeluarga.detail(baru.keluarga.id), baru)
      void segarkanKependudukan(queryClient)
      tampilkanToast({ pesan: `KK baru atas nama ${kepalaBaru?.nama ?? ''} dibuat.`, nada: 'berhasil' })
      onSelesai(baru.keluarga.id)
    },
  })

  const bolehLanjut = langkah === 0 ? keluar.length > 0 : langkah === 1 ? wilayahLengkap : true
  const aksi = (
    <>
      {langkah > 0 ? (
        <Tombol onPress={() => setLangkah(langkah - 1)} isDisabled={simpan.isPending}>
          Kembali
        </Tombol>
      ) : (
        <Tombol onPress={() => onOpenChange(false)}>Batal</Tombol>
      )}
      {langkah < 2 ? (
        <Tombol varian="utama" isDisabled={!bolehLanjut} onPress={() => setLangkah(langkah + 1)}>
          Lanjut
        </Tombol>
      ) : (
        <Tombol varian="utama" memuat={simpan.isPending} onPress={() => simpan.mutate()}>
          Simpan
        </Tombol>
      )}
    </>
  )

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      judul="Pecah KK"
      subjudul={`Langkah ${langkah + 1} dari 3 · ${LANGKAH[langkah]}`}
      lebar="lebar"
      aksi={aksi}
    >
      {langkah === 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-tinta-2">Pilih anggota yang keluar dan membentuk KK baru.</legend>
          {anggota.map((a) =>
            a.id === kk.kepalaKeluargaId ? (
              <Checkbox key={a.id} isDisabled isSelected={false}>
                {a.nama} · {a.hubunganKeluarga}
                <span className="text-tinta-2"> (tetap di KK ini; ganti kepala keluarga lebih dulu bila ia yang keluar)</span>
              </Checkbox>
            ) : (
              <Checkbox
                key={a.id}
                isSelected={dipilih.includes(a.id)}
                onChange={(pilih) => setDipilih(pilih ? [...dipilih, a.id] : dipilih.filter((x) => x !== a.id))}
              >
                {a.nama} · {a.hubunganKeluarga}
              </Checkbox>
            ),
          )}
        </fieldset>
      )}

      {langkah === 1 && kepalaBaru && (
        <div className="flex flex-col gap-5">
          <RadioGroup
            label="Kepala keluarga baru"
            arah="menurun"
            pilihan={keluar.map((a) => ({ id: a.id, label: `${a.nama} · ${a.hubunganKeluarga}` }))}
            nilai={kepalaBaru.id}
            onUbah={setKepalaBaruId}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label={istilah.dusun}
              pilihan={dusun.map((d) => ({ id: d.id, label: namaDusun(d, istilah) }))}
              nilai={wilayah.dusunId || null}
              onUbah={(id) => setWilayah({ dusunId: id ?? '', rw: '', rt: '' })}
            />
            <Select
              label={istilah.rw}
              pilihan={(dusunTerpilih?.rw ?? []).map((w) => ({ id: w.nomor, label: w.nomor }))}
              nilai={wilayah.rw || null}
              onUbah={(id) => setWilayah({ ...wilayah, rw: id ?? '', rt: '' })}
              isDisabled={!dusunTerpilih}
            />
            <Select
              label={istilah.rt}
              pilihan={(rwTerpilih?.rt ?? []).map((t) => ({ id: t.nomor, label: t.nomor }))}
              nilai={wilayah.rt || null}
              onUbah={(id) => setWilayah({ ...wilayah, rt: id ?? '' })}
              isDisabled={!rwTerpilih}
            />
          </div>
          {keluar
            .filter((a) => a.id !== kepalaBaru.id)
            .map((a) => (
              <Select
                key={a.id}
                label={`Hubungan ${a.nama} di KK baru`}
                pilihan={HUBUNGAN_ANGGOTA.map((h) => ({ id: h, label: h }))}
                nilai={hubunganDi(a)}
                onUbah={(id) => {
                  const h = HUBUNGAN_ANGGOTA.find((x) => x === id)
                  if (h) setHubungan({ ...hubungan, [a.id]: h })
                }}
              />
            ))}
        </div>
      )}

      {langkah === 2 && kepalaBaru && (
        <div className="flex flex-col gap-5">
          <section aria-labelledby="pratinjau-kk-baru">
            <h3 id="pratinjau-kk-baru" className="text-label font-medium text-tinta-2 uppercase">
              KK baru
            </h3>
            <p className="mt-1">
              Kepala keluarga {kepalaBaru.nama} · {keluar.length} anggota · {alamatLengkap(wilayah, dusun, istilah)}
            </p>
            <ul className="mt-2 list-disc pl-5">
              {keluar.map((a) => (
                <li key={a.id}>
                  {a.nama}: {a.id === kepalaBaru.id ? 'Kepala Keluarga' : hubunganDi(a)}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="pratinjau-kk-lama">
            <h3 id="pratinjau-kk-lama" className="text-label font-medium text-tinta-2 uppercase">
              KK {kepalaLama?.nama ?? ''} tetap
            </h3>
            <p className="mt-1">
              {tinggal.length} anggota: {tinggal.map((a) => a.nama).join(', ')}
            </p>
          </section>
          <p className="text-teks-kecil text-tinta-2">
            Nomor KK baru dibuat otomatis. Perubahan hubungan dicatat di Riwayat masing-masing anggota.
          </p>
          {simpan.isError && <Banner nada="galat">{pesanGalat(simpan.error)}</Banner>}
        </div>
      )}
    </Dialog>
  )
}
