import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiPenduduk } from '@/api/penduduk'
import { segarkanSurat } from '@/api/segarkan'
import { buatPermohonan, opsiJenisSurat, opsiSaranSurat } from '@/api/surat'
import { asalDesa } from '@/app/alamat'
import { dilayani, periksaIsian } from '@/domain/surat/jenis'
import { periksaPemohon } from '@/domain/surat/pemohon'
import { Cap } from '@/ui/cap/Cap'
import { LembarSurat } from '@/ui/dokumen/LembarSurat'
import { lebarLembarCm } from '@/ui/dokumen/ukuran-kertas'
import { PratinjauLembar } from '@/ui/dokumen/PratinjauLembar'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { useMediaQuery } from '@/ui/hooks/useMediaQuery'
import { Stepper } from '@/ui/navigasi/Stepper'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { IsianSurat } from '../IsianSurat'
import { dataLembar } from '../lembar'
import { langkahSah, type CariBuatSurat, type Langkah } from './cari-buat'
import { LangkahPemohon } from './LangkahPemohon'
import { PilihJenisSurat } from './PilihJenisSurat'

const LANGKAH = [
  { id: '1', label: 'Jenis surat' },
  { id: '2', label: 'Pemohon' },
  { id: '3', label: 'Isian' },
  { id: '4', label: 'Pratinjau' },
] as const

type Props = {
  cari: CariBuatSurat
  onUbahCari: (ubah: Partial<CariBuatSurat>) => void
  onSelesai: (id: string) => void
  onKotor?: (kotor: boolean) => void
  sekarang?: Date
}

function BilahLangkah({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-garis pt-4">{children}</div>
}

/**
 * Buat surat di loket (SPEC §7.4 layar 2): jenis, pemohon, isian, pratinjau. Isian hanya di memori; data penduduk
 * dan isian awal dari mutasi diambil dari API. Di layar ≥ 1280px pratinjau tampil di samping sejak langkah 2.
 */
export function BuatSurat({ cari, onUbahCari, onSelesai, onKotor, sekarang }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const queryClient = useQueryClient()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const lebar = useMediaQuery('(min-width: 1280px)')
  const panelIsian = useRef<HTMLDivElement>(null)
  /** Kunci kirim yang langsung berlaku: isPending baru terlihat setelah render berikutnya, jadi klik ganda bisa lolos. */
  const mengirim = useRef(false)
  const [isian, setIsian] = useState<Record<string, string> | null>(null)
  const [galat, setGalat] = useState<Record<string, string>>({})

  const daftarJenis = useQuery(opsiJenisSurat())
  const jenis = daftarJenis.data?.data.find((j) => j.kode === cari.jenis && dilayani(j)) ?? null
  const saran = useQuery({ ...opsiSaranSurat(cari.jenis ?? '', cari.pemohon ?? null, cari.subjek ?? null), enabled: jenis !== null })
  const idPemohon = cari.pemohon ?? saran.data?.pemohonId ?? null
  const pemohon = useQuery({ ...opsiPenduduk(idPemohon ?? ''), enabled: idPemohon !== null })
  const subjek = useQuery({ ...opsiPenduduk(cari.subjek ?? ''), enabled: cari.subjek !== undefined })
  const isianAktif = isian ?? saran.data?.isian ?? {}
  const kotor = cari.jenis !== undefined

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const buat = useMutation({
    mutationFn: (ajukan: boolean) => {
      if (!jenis || !idPemohon) throw new Error('Data surat belum lengkap')
      return buatPermohonan({
        jenisId: jenis.id, pemohonId: idPemohon, subjekId: cari.subjek ?? null, mutasiId: saran.data?.mutasi?.id ?? null,
        isian: isianAktif, ajukan,
      })
    },
    onSuccess: (d, ajukan) => {
      void segarkanSurat(queryClient)
      const pesan = !ajukan
        ? 'Draf surat disimpan dengan status Diproses.'
        : d.permohonan.tahap === 'paraf'
          ? 'Surat dibuat dan diajukan ke Sekretaris Desa untuk paraf.'
          : 'Surat dibuat dan diajukan ke Kepala Desa untuk tanda tangan.'
      tampilkanToast({ pesan, nada: 'berhasil' })
      onSelesai(d.permohonan.id)
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.kode === 'VALIDATION') {
        const isianSalah = Object.fromEntries(
          Object.entries(e.fields).flatMap(([kunci, pesan]) => (kunci.startsWith('isian.') ? [[kunci.slice(6), pesan]] : [])),
        )
        if (Object.keys(isianSalah).length > 0) {
          setGalat(isianSalah)
          onUbahCari({ langkah: 3 })
          tampilkanToast({ pesan: 'Isian surat belum lengkap. Periksa isian yang ditandai.', nada: 'galat' })
          return
        }
        if (e.fields.pemohonId || e.fields.subjekId) onUbahCari({ langkah: 2 })
      }
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
  })
  const kirim = (ajukan: boolean) => {
    if (mengirim.current) return
    mengirim.current = true
    buat.mutate(ajukan, {
      onSettled: () => {
        mengirim.current = false
      },
    })
  }

  if (daftarJenis.isPending) return <BarisKerangka jumlah={6} label="Memuat jenis surat…" />
  if (daftarJenis.isError) return <ErrorState pesan={pesanGalat(daftarJenis.error)} onCobaLagi={() => void daftarJenis.refetch()} />

  const cek = jenis && pemohon.data ? periksaPemohon(jenis, pemohon.data, subjek.data ?? null, saran.data?.mutasi ?? null) : null
  const sah = langkahSah(cari, jenis, idPemohon !== null)
  const langkah: Langkah = cek?.blokir ? (Math.min(sah, 2) as Langkah) : sah
  const ke = (n: Langkah) => onUbahCari({ langkah: n })
  const bahan =
    jenis && pemohon.data && saran.data
      ? {
          permohonan: { terbit: null },
          jenis,
          pemohon: pemohon.data,
          subjek: subjek.data ?? null,
          mutasi: saran.data.mutasi,
          pengaturan: saran.data.pengaturan,
          pejabat: saran.data.pejabat,
        }
      : null
  const dataLembarBahan = bahan ? dataLembar(bahan, { desa, dusun, isian: isianAktif, hariIni, asal: asalDesa(desa.slug) }) : null
  const lembar = dataLembarBahan ? <LembarSurat {...dataLembarBahan} penanda={<Cap varian="draf" />} /> : null
  const lebarKertas = dataLembarBahan ? lebarLembarCm(dataLembarBahan.tataLetak) : 21
  const samping = lebar && (langkah === 2 || langkah === 3)
  const lanjutKePratinjau = () => {
    if (!jenis) return
    const salah = periksaIsian(jenis, isianAktif)
    setGalat(salah)
    if (Object.keys(salah).length > 0) {
      fokusIsianSalah(panelIsian.current)
      return
    }
    ke(4)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={[{ label: 'Layanan Surat', href: '/admin/surat' }]}
        judul="Buat surat"
        meta={
          jenis
            ? `${jenis.nama}${pemohon.data ? ` · ${pemohon.data.nama}` : ''}`
            : 'Surat dari loket: pilih jenis, pemohon, isian, lalu periksa pratinjaunya.'
        }
      />
      <Stepper label="Langkah buat surat" langkah={LANGKAH} aktif={String(langkah)} />
      <div className={samping ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-8' : undefined}>
        <section aria-label={LANGKAH[langkah - 1].label} className="flex min-w-0 flex-col gap-6">
          {langkah === 1 && (
            <>
              {pemohon.data && (
                <p>
                  Untuk <strong className="font-medium">{pemohon.data.nama}</strong>
                </p>
              )}
              <PilihJenisSurat
                daftar={daftarJenis.data.data}
                terpilih={cari.jenis ?? null}
                onPilih={(kode) => {
                  setIsian(null)
                  setGalat({})
                  onUbahCari({ jenis: kode, subjek: undefined, langkah: 2 })
                }}
              />
            </>
          )}
          {langkah === 2 && jenis && (
            <>
              <LangkahPemohon
                jenis={jenis}
                pemohon={pemohon.data ?? null}
                subjek={subjek.data ?? null}
                mutasi={saran.data?.mutasi ?? null}
                hariIni={hariIni}
                onPemohon={(p) => onUbahCari({ pemohon: p?.id })}
                onSubjek={(p) => {
                  setIsian(null)
                  onUbahCari({ subjek: p?.id })
                }}
              />
              <BilahLangkah>
                <Tombol onPress={() => ke(1)}>Kembali</Tombol>
                <Tombol varian="utama" isDisabled={!pemohon.data || Boolean(cek?.blokir)} onPress={() => ke(3)}>
                  Lanjut
                </Tombol>
              </BilahLangkah>
            </>
          )}
          {langkah >= 3 && !bahan && <BarisKerangka jumlah={4} label="Memuat data surat…" />}
          {langkah === 3 && jenis && bahan && (
            <div ref={panelIsian} className="flex flex-col gap-6">
              <IsianSurat
                jenis={jenis}
                nilai={isianAktif}
                galat={galat}
                bisaUbah
                onUbah={(kunci, nilai) => {
                  setIsian({ ...isianAktif, [kunci]: nilai })
                  setGalat((lama) => {
                    const sisa = { ...lama }
                    delete sisa[kunci]
                    return sisa
                  })
                }}
              />
              <BilahLangkah>
                <Tombol onPress={() => ke(2)}>Kembali</Tombol>
                <Tombol varian="utama" onPress={lanjutKePratinjau}>
                  Lanjut ke pratinjau
                </Tombol>
              </BilahLangkah>
            </div>
          )}
          {langkah === 4 && lembar && (
            <>
              <PratinjauLembar label="Pratinjau surat" lebarCm={lebarKertas}>{lembar}</PratinjauLembar>
              <BilahLangkah>
                <Tombol isDisabled={buat.isPending} onPress={() => ke(3)}>
                  Kembali
                </Tombol>
                <span className="flex flex-wrap gap-2">
                  <Tombol memuat={buat.isPending && buat.variables === false} isDisabled={buat.isPending} onPress={() => kirim(false)}>
                    Simpan draf
                  </Tombol>
                  <Tombol
                    varian="utama"
                    memuat={buat.isPending && buat.variables === true}
                    isDisabled={buat.isPending}
                    onPress={() => kirim(true)}
                  >
                    Ajukan tanda tangan
                  </Tombol>
                </span>
              </BilahLangkah>
            </>
          )}
        </section>
        {samping &&
          (lembar ? (
            <PratinjauLembar label="Pratinjau surat" lebarCm={lebarKertas}>{lembar}</PratinjauLembar>
          ) : (
            <p className="rounded-2 border border-dashed border-garis p-6 text-tinta-2">Pratinjau surat tampil setelah pemohon dipilih.</p>
          ))}
      </div>
    </div>
  )
}
