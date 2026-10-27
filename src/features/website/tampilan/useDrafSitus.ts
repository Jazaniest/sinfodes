import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { GalatApi } from '@/api/galat'
import { aturLanjut as aturLanjutSitus, buangDraf, kunciWebsite, opsiSitus, pulihkanVersi, simpanDraf, terbitkan as terbitkanSitus } from '@/api/website'
import { daftarBlokHtmlSchema, type BlokHtml } from '@/domain/website/blok'
import { periksaTema } from '@/domain/website/kontras'
import type { LanjutSitus } from '@/domain/website/situs'
import { susunanSchema, type Susunan } from '@/domain/website/susunan'
import { temaDasarSchema, type TemaDasar } from '@/domain/website/tema'

/** Isi yang sedang disunting di Tampilan: tema Dasar, susunan blok, CSS kustom, dan Blok HTML (SPEC-V0.2 11.4-11.5). */
export type IsiDraf = { tema: TemaDasar; susunan: Susunan; cssKustom: string; blokHtml: BlokHtml[] }

/** Status simpan otomatis draf. `bentrok` menghentikan simpanan sampai dimuat ulang. */
export type StatusDraf = 'tersimpan' | 'menyimpan' | 'gagal' | 'tidak-sah' | 'bentrok'

export type DrafSitus = {
  /** Isi yang sedang disunting; null sebelum data situs termuat. */
  isi: IsiDraf | null
  /** Terapkan perubahan pada isi; simpan otomatis 1 detik kemudian bila isinya sah. */
  ubah: (f: (isi: IsiDraf) => IsiDraf) => void
  status: StatusDraf
  tersimpanPada: string | null
  adaDraf: boolean
  /** Ulangi simpanan yang gagal. */
  cobaLagi: () => void
  terbitkan: (catatan: string | null) => Promise<void>
  buang: () => Promise<void>
  pulihkan: (id: string) => Promise<void>
  muatUlang: () => void
  /** Keadaan tingkat Lanjut (7G): aktif menyalakan CSS kustom dan Blok HTML di website publik. */
  lanjut: LanjutSitus
  /** Nyalakan atau matikan tingkat Lanjut; kode yang tersimpan tidak dihapus. */
  aturLanjut: (aktif: boolean) => Promise<void>
}

export const DrafSitusKonteks = createContext<DrafSitus | null>(null)

/** Keadaan draf yang dipakai bersama sub-tab Dasar, Susunan, dan (nanti) Kode. */
export function useDrafSitus(): DrafSitus {
  const keadaan = useContext(DrafSitusKonteks)
  if (!keadaan) throw new Error('useDrafSitus harus dipakai di dalam penyedia DrafSitusKonteks')
  return keadaan
}

const JEDA_MS = 1000

/** Bagian versi situs yang disunting di Tampilan. */
const keIsiDraf = (v: { tema: TemaDasar; susunan: Susunan; cssKustom: string; blokHtml: BlokHtml[] }): IsiDraf => ({
  tema: v.tema, susunan: v.susunan, cssKustom: v.cssKustom, blokHtml: v.blokHtml,
})

/** Cek isian sebelum dikirim: skema tema, kontras, skema susunan, dan daftar Blok HTML (keputusan 4). */
function isianSah(isi: IsiDraf): boolean {
  const tema = temaDasarSchema.safeParse(isi.tema)
  if (!tema.success) return false
  if (periksaTema(tema.data).some((p) => !p.lolos)) return false
  return susunanSchema.safeParse(isi.susunan).success && daftarBlokHtmlSchema.safeParse(isi.blokHtml).success
}

/**
 * Keadaan draf situs (7F-2): satu sumber untuk seluruh Tampilan, simpan otomatis 1 detik setelah perubahan terakhir,
 * penjaga timpa diam-diam (409), dan alur Terbitkan, Buang draf, dan Pulihkan riwayat.
 */
export function useKeadaanDrafSitus(): DrafSitus {
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiSitus())
  const [isi, setIsi] = useState<IsiDraf | null>(null)
  const [status, setStatus] = useState<StatusDraf>('tersimpan')
  const [tersimpanPada, setTersimpanPada] = useState<string | null>(null)
  const [adaDraf, setAdaDraf] = useState(false)
  const isiRef = useRef<IsiDraf | null>(null)
  const dasarId = useRef<string | null>(null)
  const jadwal = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tertunda = useRef<IsiDraf | null>(null)
  const bentrok = useRef(false)
  const termuat = useRef(false)

  const pasang = useCallback((isiBaru: IsiDraf, drafId: string | null, disimpanPada: string | null) => {
    isiRef.current = isiBaru
    setIsi(isiBaru)
    dasarId.current = drafId
    setAdaDraf(drafId !== null)
    setTersimpanPada(disimpanPada)
  }, [])

  // Muat awal: draf yang sudah ada, atau salinan terbit bila belum ada draf.
  useEffect(() => {
    if (termuat.current || !kueri.data) return
    termuat.current = true
    const { terbit, draf } = kueri.data
    pasang(keIsiDraf(draf ?? terbit), draf?.id ?? null, draf?.diperbarui ?? null)
  }, [kueri.data, pasang])

  const kirim = useCallback(
    async (dikirim: IsiDraf) => {
      if (!isianSah(dikirim)) {
        setStatus('tidak-sah')
        return
      }
      setStatus('menyimpan')
      try {
        const draf = await simpanDraf(dasarId.current, dikirim)
        dasarId.current = draf.id
        setAdaDraf(true)
        setTersimpanPada(draf.diperbarui)
        setStatus('tersimpan')
        queryClient.setQueryData(kunciWebsite.situs, (lama: { terbit: unknown; draf: unknown } | undefined) =>
          lama ? { ...lama, draf } : lama,
        )
      } catch (e) {
        if (e instanceof GalatApi && e.status === 409) {
          bentrok.current = true
          setStatus('bentrok')
          return
        }
        setStatus('gagal')
      }
    },
    [queryClient],
  )

  const ubah = useCallback(
    (f: (isi: IsiDraf) => IsiDraf) => {
      const lama = isiRef.current
      if (!lama) return
      const baru = f(lama)
      isiRef.current = baru
      setIsi(baru)
      if (bentrok.current) return
      if (!isianSah(baru)) {
        if (jadwal.current) clearTimeout(jadwal.current)
        jadwal.current = null
        tertunda.current = null
        setStatus('tidak-sah')
        return
      }
      tertunda.current = baru
      setStatus('menyimpan')
      if (jadwal.current) clearTimeout(jadwal.current)
      jadwal.current = setTimeout(() => {
        jadwal.current = null
        const kirimSekarang = tertunda.current
        tertunda.current = null
        if (kirimSekarang) void kirim(kirimSekarang)
      }, JEDA_MS)
    },
    [kirim],
  )

  const cobaLagi = useCallback(() => {
    const sekarang = isiRef.current
    if (sekarang && !bentrok.current) void kirim(sekarang)
  }, [kirim])

  const terbitkan = useCallback(
    async (catatan: string | null) => {
      const tayang = await terbitkanSitus(catatan)
      // Keadaan saklar tingkat Lanjut tidak berubah oleh penerbitan, jadi hanya terbit dan draf yang diperbarui.
      queryClient.setQueryData(kunciWebsite.situs, (lama: { terbit: unknown; lanjut?: unknown } | undefined) =>
        lama ? { ...lama, terbit: tayang, draf: null } : { terbit: tayang, draf: null },
      )
      void queryClient.invalidateQueries({ queryKey: kunciWebsite.riwayat })
      pasang(keIsiDraf(tayang), null, null)
      bentrok.current = false
      setStatus('tersimpan')
    },
    [pasang, queryClient],
  )

  const buang = useCallback(async () => {
    const situs = await buangDraf()
    queryClient.setQueryData(kunciWebsite.situs, situs)
    pasang(keIsiDraf(situs.terbit), null, null)
    bentrok.current = false
    setStatus('tersimpan')
  }, [pasang, queryClient])

  const pulihkan = useCallback(
    async (id: string) => {
      const draf = await pulihkanVersi(id)
      queryClient.setQueryData(kunciWebsite.situs, (lama: { terbit: unknown; draf: unknown } | undefined) =>
        lama ? { ...lama, draf } : lama,
      )
      const isiPulih = keIsiDraf(draf)
      pasang(isiPulih, draf.id, draf.diperbarui)
      bentrok.current = false
      // Versi lama bisa saja gagal kontras hari ini (fokus review 4): tandai perlu diperbaiki.
      setStatus(isianSah(isiPulih) ? 'tersimpan' : 'tidak-sah')
    },
    [pasang, queryClient],
  )

  const muatUlang = useCallback(() => {
    bentrok.current = false
    void kueri.refetch().then((r) => {
      const data = r.data
      if (!data) return
      const isiMuat = keIsiDraf(data.draf ?? data.terbit)
      pasang(isiMuat, data.draf?.id ?? null, data.draf?.diperbarui ?? null)
      setStatus(isianSah(isiMuat) ? 'tersimpan' : 'tidak-sah')
    })
  }, [kueri, pasang])

  const aturLanjut = useCallback(
    async (aktif: boolean) => {
      const baru = await aturLanjutSitus(aktif)
      queryClient.setQueryData(kunciWebsite.situs, (lama: { terbit: unknown; draf: unknown; lanjut?: unknown } | undefined) =>
        lama ? { ...lama, lanjut: baru } : lama,
      )
    },
    [queryClient],
  )

  // Meninggalkan halaman saat simpanan masih tertunda tetap mengirim perubahan terakhir (fokus review 2).
  useEffect(
    () => () => {
      if (jadwal.current) clearTimeout(jadwal.current)
      const terakhir = tertunda.current
      tertunda.current = null
      if (terakhir) void kirim(terakhir)
    },
    [kirim],
  )

  return {
    isi,
    ubah,
    status,
    tersimpanPada,
    adaDraf,
    cobaLagi,
    terbitkan,
    buang,
    pulihkan,
    muatUlang,
    lanjut: kueri.data?.lanjut ?? { aktif: false, pertamaDiaktifkan: null },
    aturLanjut,
  }
}
