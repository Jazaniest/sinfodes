import { Check } from '@phosphor-icons/react'
import { useState } from 'react'
import { GALERI_TEMA, pasangTema, type TemaGaleri } from '@/features/website/galeri-tema'
import { samaDenganGaleri } from '@/domain/website/galeri-dasar'
import { SUSUNAN_BERANDA_TEMA } from '@/domain/website/susunan'
import { cn } from '@/ui/cn'
import { Checkbox } from '@/ui/isian/Checkbox'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { DialogPratinjauTema } from './DialogPratinjauTema'
import { useDrafSitus } from './useDrafSitus'

/** Galeri tema (SPEC-V0.2 11.3): delapan kartu dengan pratinjau; memasang tema mengubah draf, pengaturannya tetap bisa diubah. */
export function GaleriTema() {
  const { isi, ubah } = useDrafSitus()
  const [lihat, setLihat] = useState<TemaGaleri | null>(null)
  const [pilih, setPilih] = useState<TemaGaleri | null>(null)
  const [pakaiSusunan, setPakaiSusunan] = useState(false)
  if (!isi) return null

  const pasang = (tema: TemaGaleri) => {
    ubah((i) => ({
      ...i,
      tema: pasangTema(i.tema, tema.id),
      ...(pakaiSusunan ? { susunan: { ...i.susunan, beranda: structuredClone(SUSUNAN_BERANDA_TEMA[tema.id]) } } : {}),
    }))
    setPilih(null)
    setPakaiSusunan(false)
    tampilkanToast({ pesan: `Tema ${tema.nama} dipasang di draf. Terbitkan untuk menerapkannya.`, nada: 'berhasil' })
  }

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
          const dipakai = samaDenganGaleri(isi.tema) === t.id
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
          if (!buka) {
            setPilih(null)
            setPakaiSusunan(false)
          }
        }}
        judul={pilih ? `Pakai tema ${pilih.nama}?` : ''}
        labelSetuju="Pakai tema"
        onSetuju={() => {
          if (pilih) pasang(pilih)
        }}
      >
        <div className="flex flex-col gap-3">
          <p>Warna, huruf, sudut, kepadatan, kepala, foto, dan motif diganti. Logo, sampul, foto latar, dan sambutan tetap.</p>
          <Checkbox isSelected={pakaiSusunan} onChange={setPakaiSusunan}>
            Juga pakai susunan beranda tema ini
          </Checkbox>
          <p className="text-teks-kecil text-tinta-2">Bila dicentang, susunan beranda diganti saran tema. Halaman tambahan dan menu tetap.</p>
        </div>
      </ConfirmDialog>
    </section>
  )
}
