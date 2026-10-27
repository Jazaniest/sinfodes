import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { gantiKepala, kunciKeluarga } from '@/api/keluarga'
import { segarkanKependudukan } from '@/api/segarkan'
import { HUBUNGAN_ANGGOTA, usulanHubunganKepalaLama, type HubunganAnggota } from '@/domain/keluarga/masukan'
import type { DetailKeluarga } from '@/domain/keluarga/schema'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

type Props = { detail: DetailKeluarga; isOpen: boolean; onOpenChange: (buka: boolean) => void }

/** Ganti kepala keluarga (SPEC §6.5). Hubungan kepala lama diusulkan dari hubungan kepala baru, dan bisa diubah. */
export function DialogGantiKepala({ detail, isOpen, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const { keluarga: kk, anggota } = detail
  const kepalaLama = anggota.find((a) => a.id === kk.kepalaKeluargaId)
  const calon = anggota.filter((a) => a.id !== kk.kepalaKeluargaId)
  const [kepalaBaruId, setKepalaBaruId] = useState<string | null>(null)
  const [hubunganLama, setHubunganLama] = useState<HubunganAnggota>('Famili Lain')
  const kepalaBaru = calon.find((a) => a.id === kepalaBaruId)

  const simpan = useMutation({
    mutationFn: () => gantiKepala(kk.id, { kepalaBaruId: kepalaBaruId ?? '', hubunganKepalaLama: hubunganLama }),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciKeluarga.detail(baru.keluarga.id), baru)
      void segarkanKependudukan(queryClient)
      tampilkanToast({ pesan: `Kepala keluarga sekarang ${kepalaBaru?.nama ?? ''}.`, nada: 'berhasil' })
      onOpenChange(false)
    },
  })

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      judul="Ganti kepala keluarga"
      aksi={
        <>
          <Tombol onPress={() => onOpenChange(false)} isDisabled={simpan.isPending}>
            Batal
          </Tombol>
          <Tombol varian="utama" isDisabled={!kepalaBaru} memuat={simpan.isPending} onPress={() => simpan.mutate()}>
            Simpan
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <RadioGroup
          label="Kepala keluarga baru"
          arah="menurun"
          pilihan={calon.map((a) => ({ id: a.id, label: `${a.nama} · ${a.hubunganKeluarga}` }))}
          nilai={kepalaBaruId}
          onUbah={(id) => {
            setKepalaBaruId(id)
            const p = calon.find((a) => a.id === id)
            if (p) setHubunganLama(usulanHubunganKepalaLama(p.hubunganKeluarga))
          }}
        />
        {kepalaLama && (
          <Select
            label={`Hubungan ${kepalaLama.nama} setelah diganti`}
            pilihan={HUBUNGAN_ANGGOTA.map((h) => ({ id: h, label: h }))}
            nilai={hubunganLama}
            onUbah={(id) => {
              const h = HUBUNGAN_ANGGOTA.find((x) => x === id)
              if (h) setHubunganLama(h)
            }}
          />
        )}
        <p className="text-teks-kecil text-tinta-2">Perubahan hubungan dicatat di Riwayat kedua penduduk.</p>
        {simpan.isError && <Banner nada="galat">{pesanGalat(simpan.error)}</Banner>}
      </div>
    </Dialog>
  )
}
