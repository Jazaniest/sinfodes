import { useState } from 'react'

/**
 * Kunci idempotensi untuk satu formulir mutasi (SPEC-V0.3 §5.4 butir 4). Mengirim ulang isian yang sama (jaringan lambat, klik
 * dua kali, ulangi sesudah galat jaringan) memakai kunci yang sama, sehingga server tidak mencatat kejadian dua kali; isian yang
 * berubah mendapat kunci baru. Server yang menolak isian (422) tidak menyimpan kunci, jadi memperbaiki isian lalu mengirim
 * ulang selalu diproses. Fungsi yang dikembalikan stabil antar-render dan hanya dipanggil dari penangan kejadian.
 */
export function useKunciKirim(): (masukan: unknown) => string {
  const [kunciUntuk] = useState(() => {
    let terakhir: { isi: string; kunci: string } | null = null
    return (masukan: unknown): string => {
      const isi = JSON.stringify(masukan)
      if (terakhir?.isi !== isi) terakhir = { isi, kunci: crypto.randomUUID() }
      return terakhir.kunci
    }
  })
  return kunciUntuk
}
