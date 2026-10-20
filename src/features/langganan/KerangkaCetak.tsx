import { Printer } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tombol } from '@/ui/tombol/Tombol'

/**
 * Kepala halaman cetak dokumen langganan (tagihan, kwitansi): tautan kembali dan tombol cetak di layar saja. Pratinjau tampil di
 * layar yang sama dengan hasil cetaknya; "Simpan sebagai PDF" ada di dialog cetak peramban.
 */
export function KerangkaCetak({ kembali, children }: { kembali: { label: string; href: string }; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Tautan href={kembali.href} nada="redup" className="text-label font-medium uppercase">
          {kembali.label}
        </Tautan>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-teks-kecil text-tinta-2">Pilih “Simpan sebagai PDF” di jendela cetak.</p>
          <Tombol varian="utama" ikon={<Printer aria-hidden size={16} />} onPress={() => window.print()}>
            Cetak atau simpan PDF
          </Tombol>
        </div>
      </div>
      {children}
    </div>
  )
}
