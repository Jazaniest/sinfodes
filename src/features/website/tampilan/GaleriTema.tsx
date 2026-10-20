import { Check } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { kunciWebsite, simpanTema } from '@/api/website'
import { GALERI_TEMA, pasangTema, type TemaGaleri } from '@/domain/website/galeri-tema'
import type { TemaDasar } from '@/domain/website/tema'
import { cn } from '@/ui/cn'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { DialogPratinjauTema } from './DialogPratinjauTema'

type Props = {
  /** Tema yang tersimpan (bukan isian formulir yang belum disimpan). */
  data: TemaDasar
  /** Formulir punya perubahan yang belum disimpan. */
  kotor: boolean
  /** Dipanggil setelah tema tersimpan, supaya formulir memuat tema baru seluruhnya. */
  onTerpasang: (tema: TemaDasar) => void
}

/** Galeri tema (SPEC-V0.2 §11.3): delapan kartu dengan pratinjau; memasang tema langsung menyimpannya, pengaturannya tetap bisa diubah. */
export function GaleriTema({ data, kotor, onTerpasang }: Props) {
  const queryClient = useQueryClient()
  const [lihat, setLihat] = useState<TemaGaleri | null>(null)
  const [pilih, setPilih] = useState<TemaGaleri | null>(null)

  const pasang = useMutation({
    mutationFn: (tema: TemaGaleri) => simpanTema(pasangTema(data, tema.id)),
    onSuccess: (baru, tema) => {
      queryClient.setQueryData(kunciWebsite.situs, { terbit: baru })
      onTerpasang(baru.tema)
      setPilih(null)
      tampilkanToast({ pesan: `Tema ${tema.nama} dipasang.`, nada: 'berhasil' })
    },
    onError: (e) => {
      setPilih(null)
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
  })

  return (
    <section aria-labelledby="judul-galeri-tema" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="judul-galeri-tema" className="font-serif text-judul-bagian font-medium">
          Galeri tema
        </h2>
        <p className="text-teks-kecil text-tinta-2">
          Titik awal yang lengkap: pilih satu, lalu ubah pengaturan apa pun di bawah. Logo, sampul, dan halaman masuk warga tidak ikut berganti.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {GALERI_TEMA.map((t) => {
          const dipakai = data.idGaleri === t.id
          return (
            <figure
              key={t.id}
              aria-label={`Tema ${t.nama}`}
              className={cn('flex flex-col overflow-hidden rounded-2 border bg-lembar', dipakai ? 'border-tinta ring-1 ring-tinta' : 'border-garis')}
            >
              <img
                src={t.pratinjau}
                alt={`Pratinjau tema ${t.nama}`}
                loading="lazy"
                width={1280}
                height={800}
                className="aspect-[8/5] w-full border-b border-garis bg-kertas-2 object-cover object-top"
              />
              <figcaption className="flex flex-1 flex-col gap-1 p-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-serif text-judul-bagian leading-tight font-medium">{t.nama}</span>
                  {dipakai && (
                    <span className="inline-flex items-center gap-1 rounded-penuh bg-biru-muda px-2 py-0.5 text-label font-semibold text-biru-tua">
                      <Check aria-hidden size={12} weight="bold" />
                      Dipakai
                    </span>
                  )}
                </span>
                <span className="text-teks-kecil text-tinta-2">{t.keterangan}</span>
              </figcaption>
              <div className="flex flex-wrap gap-2 px-3 pb-3">
                <Tombol ukuran="kecil" onPress={() => setLihat(t)}>
                  Lihat pratinjau<span className="sr-only"> {t.nama}</span>
                </Tombol>
                <Tombol ukuran="kecil" varian={dipakai ? 'sekunder' : 'utama'} onPress={() => setPilih(t)}>
                  Pakai tema ini<span className="sr-only"> {t.nama}</span>
                </Tombol>
              </div>
            </figure>
          )
        })}
      </div>

      <DialogPratinjauTema
        tema={lihat}
        onTutup={() => setLihat(null)}
        onPakai={(t) => {
          setLihat(null)
          setPilih(t)
        }}
      />
      <ConfirmDialog
        isOpen={pilih !== null}
        onOpenChange={(buka) => {
          if (!buka && !pasang.isPending) setPilih(null)
        }}
        judul={pilih ? `Pakai tema ${pilih.nama}?` : ''}
        labelSetuju="Pakai tema"
        memuat={pasang.isPending}
        onSetuju={() => pilih && pasang.mutate(pilih)}
      >
        <div className="flex flex-col gap-2">
          <p>Warna, huruf, sudut, kepadatan, kepala, foto, dan motif diganti. Logo, sampul, foto latar, dan sambutan tetap.</p>
          {kotor && <p className="text-merah">Perubahan yang belum disimpan akan hilang.</p>}
        </div>
      </ConfirmDialog>
    </section>
  )
}
