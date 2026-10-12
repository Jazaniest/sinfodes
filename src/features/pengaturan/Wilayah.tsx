import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciPengaturan, opsiWilayah, simpanWilayah } from '@/api/pengaturan'
import { kunciSesi } from '@/api/sesi'
import { kunciTataKelola } from '@/api/tata-kelola'
import { formDariWilayah, periksaWilayah, type UbahWilayah, type WilayahDesa } from '@/domain/pengaturan/wilayah'
import { namaDusun } from '@/domain/wilayah/alamat'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { TextField } from '@/ui/isian/TextField'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaPengaturan } from './TabPengaturan'

type Props = { onKotor?: (kotor: boolean) => void }
type DusunForm = UbahWilayah['dusun'][number]

/** Pengaturan › Wilayah (SPEC §8): istilah wilayah dan nama-nama di pohon dusun → RW → RT. */
export function Wilayah({ onKotor }: Props) {
  const kueri = useQuery(opsiWilayah())
  return (
    <div className="flex flex-col gap-6">
      <KepalaPengaturan aktif="wilayah" />
      {kueri.isPending ? (
        <BarisKerangka jumlah={8} label="Memuat wilayah desa…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <FormWilayah data={kueri.data} onKotor={onKotor} />
      )}
    </div>
  )
}

function FormWilayah({ data, onKotor }: { data: WilayahDesa; onKotor?: (kotor: boolean) => void }) {
  const queryClient = useQueryClient()
  const awal = useMemo(() => formDariWilayah(data), [data])
  const [form, setForm] = useState<UbahWilayah>(awal)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const wadah = useRef<HTMLDivElement>(null)
  const mengirim = useRef(false)
  const kotor = JSON.stringify(form) !== JSON.stringify(awal)
  const istilah = form.istilah

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const hapusGalat = (kunci: string) =>
    setGalat((g) => {
      const sisa = { ...g }
      delete sisa[kunci]
      return sisa
    })
  const ubahIstilah = (kunci: keyof UbahWilayah['istilah'], nilai: string) => {
    setForm((l) => ({ ...l, istilah: { ...l.istilah, [kunci]: nilai } }))
    hapusGalat(`istilah.${kunci}`)
  }
  const ubahDusun = (i: number, kunci: string, ubah: (d: DusunForm) => DusunForm) => {
    setForm((l) => ({ ...l, dusun: l.dusun.map((d, x) => (x === i ? ubah(d) : d)) }))
    hapusGalat(kunci)
  }
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }

  const simpan = useMutation({
    mutationFn: () => simpanWilayah(form),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciPengaturan.wilayah, baru)
      setForm(formDariWilayah(baru))
      // Istilah dan nama dusun dipakai label alamat di semua halaman; nama ketua dipakai Lembaga Desa (fokus review 5).
      void queryClient.invalidateQueries({ queryKey: kunciSesi })
      void queryClient.invalidateQueries({ queryKey: kunciTataKelola.lembaga })
      tampilkanToast({ pesan: 'Wilayah disimpan. Nama kepala dusun dan ketua RT/RW ikut diperbarui di Lembaga Desa.', nada: 'berhasil' })
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.kode === 'VALIDATION' && Object.keys(e.fields).length > 0) {
        tandai(e.fields)
        tampilkanToast({ pesan: 'Periksa isian yang ditandai.', nada: 'galat' })
        return
      }
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const kirim = () => {
    if (mengirim.current) return
    const g = periksaWilayah(form)
    if (Object.keys(g).length > 0) {
      tandai(g)
      return
    }
    mengirim.current = true
    simpan.mutate()
  }

  const kecilDusun = istilah.dusun.toLocaleLowerCase('id-ID')
  const bagian = [
    { id: 'wilayah-istilah', judul: 'Istilah wilayah' },
    ...form.dusun.map((d, i) => ({ id: `wilayah-${d.id}`, judul: namaDusun({ nomor: data.dusun[i].nomor, nama: d.nama }, istilah) })),
  ]

  return (
    <div ref={wadah}>
      <FormulirBagian
        label="Wilayah desa"
        bagian={bagian}
        aksi={
          <>
            <Tombol
              isDisabled={!kotor || simpan.isPending}
              onPress={() => {
                setForm(awal)
                setGalat({})
              }}
            >
              Batalkan perubahan
            </Tombol>
            <Tombol varian="utama" memuat={simpan.isPending} onPress={kirim}>
              Simpan
            </Tombol>
          </>
        }
      >
        <BagianIsian id="wilayah-istilah" nomor={1} judul="Istilah wilayah">
          <p className="text-teks-kecil text-tinta-2 sm:col-span-2">
            Dipakai di semua label alamat, mis. Dusun, Jorong, Banjar, atau Lingkungan. Menambah atau menghapus dusun, RW, dan RT belum
            tersedia, karena setiap penduduk dan KK terikat ke nomornya.
          </p>
          <TextField label="Istilah untuk dusun" value={istilah.dusun} onChange={(v) => ubahIstilah('dusun', v)} galat={galat['istilah.dusun']} />
          <TextField label="Istilah untuk RW" value={istilah.rw} onChange={(v) => ubahIstilah('rw', v)} galat={galat['istilah.rw']} />
          <TextField label="Istilah untuk RT" value={istilah.rt} onChange={(v) => ubahIstilah('rt', v)} galat={galat['istilah.rt']} />
        </BagianIsian>
        {form.dusun.map((d, i) => {
          const judul = namaDusun({ nomor: data.dusun[i].nomor, nama: d.nama }, istilah)
          return (
            <BagianIsian key={d.id} id={`wilayah-${d.id}`} nomor={i + 2} judul={judul}>
              <TextField
                label={`Nama ${kecilDusun}`}
                value={d.nama}
                onChange={(v) => ubahDusun(i, `dusun.${i}.nama`, (x) => ({ ...x, nama: v }))}
                galat={galat[`dusun.${i}.nama`]}
              />
              <TextField
                label={`Kepala ${kecilDusun}`}
                value={d.kepalaDusun}
                onChange={(v) => ubahDusun(i, `dusun.${i}.kepalaDusun`, (x) => ({ ...x, kepalaDusun: v }))}
                galat={galat[`dusun.${i}.kepalaDusun`]}
              />
              <ul aria-label={`${istilah.rw} di ${judul}`} className="flex flex-col gap-5 sm:col-span-2">
                {d.rw.map((rw, j) => (
                  <li key={rw.nomor} className="border-l-2 border-garis pl-4">
                    <TextField
                      label={`Ketua ${istilah.rw} ${rw.nomor}`}
                      value={rw.ketua}
                      onChange={(v) =>
                        ubahDusun(i, `dusun.${i}.rw.${j}.ketua`, (x) => ({
                          ...x,
                          rw: x.rw.map((r, y) => (y === j ? { ...r, ketua: v } : r)),
                        }))
                      }
                      galat={galat[`dusun.${i}.rw.${j}.ketua`]}
                      className="max-w-sm"
                    />
                    <ul aria-label={`${istilah.rt} di ${istilah.rw} ${rw.nomor}`} className="mt-3 grid gap-3 border-l border-garis pl-4 sm:grid-cols-2">
                      {rw.rt.map((rt, k) => (
                        <li key={rt.nomor}>
                          <TextField
                            label={`Ketua ${istilah.rt} ${rt.nomor}`}
                            value={rt.ketua}
                            onChange={(v) =>
                              ubahDusun(i, `dusun.${i}.rw.${j}.rt.${k}.ketua`, (x) => ({
                                ...x,
                                rw: x.rw.map((r, y) =>
                                  y === j ? { ...r, rt: r.rt.map((t, z) => (z === k ? { ...t, ketua: v } : t)) } : r,
                                ),
                              }))
                            }
                            galat={galat[`dusun.${i}.rw.${j}.rt.${k}.ketua`]}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </BagianIsian>
          )
        })}
      </FormulirBagian>
    </div>
  )
}
