import { X } from '@phosphor-icons/react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { cn } from '../cn'
import { Tombol } from '../tombol/Tombol'
import { ambilDaftarToast, dengarkanToast, tutupToast, type Toast } from './antrean'

export function PenampungToast({ durasi = 5000 }: { durasi?: number }) {
  const daftar = useSyncExternalStore(dengarkanToast, ambilDaftarToast)
  return (
    // Layar sempit: toast di atas, di bawah header, karena bagian bawah dipakai bilah aksi formulir dan toolbar demo.
    // Layar lebih lebar: di halaman formulir panjang, toast naik di atas bilah aksi supaya tidak menutupi tombol Simpan.
    <section
      aria-label="Notifikasi"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2 print:hidden max-sm:top-16 max-sm:bottom-auto sm:[html[data-bilah-aksi]_&]:bottom-20"
    >
      {daftar.map((t) => (
        <ItemToast key={t.id} toast={t} durasi={durasi} />
      ))}
    </section>
  )
}

function ItemToast({ toast, durasi }: { toast: Toast; durasi: number }) {
  const [dijeda, setDijeda] = useState(false)
  useEffect(() => {
    if (dijeda) return
    const penghitung = setTimeout(() => tutupToast(toast.id), durasi)
    return () => clearTimeout(penghitung)
  }, [dijeda, durasi, toast.id])

  return (
    <div
      role={toast.nada === 'galat' ? 'alert' : 'status'}
      onMouseEnter={() => setDijeda(true)}
      onMouseLeave={() => setDijeda(false)}
      onFocus={() => setDijeda(true)}
      onBlur={() => setDijeda(false)}
      className={cn(
        'pointer-events-auto flex animate-muncul items-start gap-3 rounded-2 border border-garis bg-lembar px-4 py-3 shadow-melayang',
        toast.nada === 'galat' && 'border-l-4 border-l-merah',
        toast.nada === 'berhasil' && 'border-l-4 border-l-hijau',
      )}
    >
      <p className="flex-1 pt-0.5">{toast.pesan}</p>
      {toast.aksi && (
        <Tombol
          varian="teks"
          onPress={() => {
            toast.aksi?.onPress()
            tutupToast(toast.id)
          }}
        >
          {toast.aksi.label}
        </Tombol>
      )}
      <button
        type="button"
        aria-label="Tutup notifikasi"
        onClick={() => tutupToast(toast.id)}
        className="rounded-1 p-1 text-tinta-2 hover:text-tinta"
      >
        <X size={14} />
      </button>
    </div>
  )
}
