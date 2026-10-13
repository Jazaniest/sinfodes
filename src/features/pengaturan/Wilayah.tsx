import { Plus } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciPengaturan, opsiWilayah, simpanWilayah } from '@/api/pengaturan'
import { kunciSesi } from '@/api/sesi'
import { kunciTataKelola } from '@/api/tata-kelola'
import {
  dusunKosong, formDariWilayah, nomoriSusunan, periksaWilayah, rwKosong, type DusunForm, type UbahWilayah, type WilayahDesa,
} from '@/domain/pengaturan/wilayah'
import { namaDusun } from '@/domain/wilayah/alamat'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { gayaGalat } from '@/ui/isian/gaya'
import { TextField } from '@/ui/isian/TextField'
import { BagianIsian, FormulirBagian } from '@/ui/tata-letak/FormulirBagian'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaPengaturan } from './TabPengaturan'

type Props = { onKotor?: (kotor: boolean) => void }

const ikonTambah = <Plus aria-hidden size={16} />

/**
 * Pengaturan › Wilayah (SPEC §8): istilah wilayah dan nama-nama di pohon dusun → RW → RT. Selama desa belum punya penduduk,
 * dusun, RW, dan RT juga bisa ditambah dan dihapus (tahap 6C).
 */
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
  const terbuka = !data.susunanTerkunci
  const awal = useMemo(() => formDariWilayah(data), [data])
  const [form, setForm] = useState<UbahWilayah>(awal)
  const [galat, setGalat] = useState<Record<string, string>>({})
  // Isian yang baru ditambahkan difokuskan saat dipasang. Baris RW dan RT berkunci urutan, jadi isian lain tidak dipasang ulang.
  const [fokusBaru, setFokusBaru] = useState<string | null>(null)
  const kunciBaru = useRef(0)
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

  /** Tambah atau hapus dusun, RW, dan RT: nomor diurutkan ulang, dan galat lama dibuang karena urutannya bergeser. */
  const ubahSusunan = (ubah: (dusun: DusunForm[]) => DusunForm[], fokus: string | null) => {
    setForm((l) => ({ ...l, dusun: nomoriSusunan(ubah(l.dusun)) }))
    setGalat({})
    setFokusBaru(fokus)
  }
  const ubahRwDusun = (i: number, ubah: (rw: DusunForm['rw']) => DusunForm['rw']) => (dusun: DusunForm[]) =>
    dusun.map((d, n) => (n === i ? { ...d, rw: ubah(d.rw) } : d))
  // Sesudah menghapus, fokus pindah ke tombol tambah di atasnya, bukan hilang ke awal halaman.
  const fokuskan = (id: string) => document.getElementById(id)?.focus()
  const tambahDusun = () => {
    kunciBaru.current += 1
    ubahSusunan((d) => [...d, dusunKosong(kunciBaru.current)], `dusun.${form.dusun.length}.nama`)
  }
  const hapusDusun = (i: number) => {
    ubahSusunan((d) => d.filter((_, n) => n !== i), null)
    fokuskan('tambah-dusun')
  }
  const tambahRw = (i: number) => ubahSusunan(ubahRwDusun(i, (rw) => [...rw, rwKosong()]), `dusun.${i}.rw.${form.dusun[i].rw.length}.ketua`)
  const hapusRw = (i: number, j: number) => {
    ubahSusunan(ubahRwDusun(i, (rw) => rw.filter((_, y) => y !== j)), null)
    fokuskan(`tambah-rw-${i}`)
  }
  const tambahRt = (i: number, j: number) =>
    ubahSusunan(
      ubahRwDusun(i, (rw) => rw.map((w, y) => (y === j ? { ...w, rt: [...w.rt, { nomor: '000', ketua: '' }] } : w))),
      `dusun.${i}.rw.${j}.rt.${form.dusun[i].rw[j].rt.length}.ketua`,
    )
  const hapusRt = (i: number, j: number, k: number) => {
    ubahSusunan(ubahRwDusun(i, (rw) => rw.map((w, y) => (y === j ? { ...w, rt: w.rt.filter((_, z) => z !== k) } : w))), null)
    fokuskan(`tambah-rt-${i}-${j}`)
  }

  const simpan = useMutation({
    mutationFn: () => simpanWilayah(form),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciPengaturan.wilayah, baru)
      setForm(formDariWilayah(baru))
      // Istilah dan dusun dipakai label alamat di semua halaman; nama ketua dipakai Lembaga Desa (fokus review 5 tahap 3C).
      void queryClient.invalidateQueries({ queryKey: kunciSesi })
      void queryClient.invalidateQueries({ queryKey: kunciTataKelola.lembaga })
      tampilkanToast({
        pesan: terbuka
          ? 'Wilayah disimpan. Dusun, RW, dan RT baru langsung bisa dipakai untuk data penduduk.'
          : 'Wilayah disimpan. Nama kepala dusun dan ketua RT/RW ikut diperbarui di Lembaga Desa.',
        nada: 'berhasil',
      })
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
  // Selama terbuka, nomor dusun mengikuti urutannya di formulir; sesudah terkunci, nomor yang tersimpan.
  const judulDusun = (i: number, nama: string) => namaDusun({ nomor: terbuka ? i + 1 : data.dusun[i].nomor, nama }, istilah).trim()
  const bagian = [
    { id: 'wilayah-istilah', judul: 'Istilah wilayah' },
    ...form.dusun.map((d, i) => ({ id: `wilayah-${d.id}`, judul: judulDusun(i, d.nama) })),
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
            {`Dipakai di semua label alamat, mis. Dusun, Jorong, Banjar, atau Lingkungan. ${
              terbuka
                ? `Selama desa belum punya data penduduk, ${kecilDusun}, ${istilah.rw}, dan ${istilah.rt} masih bisa ditambah dan dihapus; nomornya mengikuti urutan.`
                : `${istilah.dusun}, ${istilah.rw}, dan ${istilah.rt} tidak bisa ditambah atau dihapus lagi, karena setiap penduduk dan KK terikat ke nomornya. Namanya tetap bisa diubah.`
            }`}
          </p>
          <TextField label="Istilah untuk dusun" value={istilah.dusun} onChange={(v) => ubahIstilah('dusun', v)} galat={galat['istilah.dusun']} />
          <TextField label="Istilah untuk RW" value={istilah.rw} onChange={(v) => ubahIstilah('rw', v)} galat={galat['istilah.rw']} />
          <TextField label="Istilah untuk RT" value={istilah.rt} onChange={(v) => ubahIstilah('rt', v)} galat={galat['istilah.rt']} />
        </BagianIsian>
        {form.dusun.map((d, i) => {
          const judul = judulDusun(i, d.nama)
          return (
            <BagianIsian key={d.id} id={`wilayah-${d.id}`} nomor={i + 2} judul={judul}>
              <TextField
                label={`Nama ${kecilDusun}`}
                value={d.nama}
                onChange={(v) => ubahDusun(i, `dusun.${i}.nama`, (x) => ({ ...x, nama: v }))}
                galat={galat[`dusun.${i}.nama`]}
                autoFocus={fokusBaru === `dusun.${i}.nama`}
              />
              <TextField
                label={`Kepala ${kecilDusun}`}
                value={d.kepalaDusun}
                onChange={(v) => ubahDusun(i, `dusun.${i}.kepalaDusun`, (x) => ({ ...x, kepalaDusun: v }))}
                galat={galat[`dusun.${i}.kepalaDusun`]}
              />
              <ul aria-label={`${istilah.rw} di ${judul}`} className="flex flex-col gap-5 sm:col-span-2">
                {d.rw.map((rw, j) => (
                  <li key={j} className="border-l-2 border-garis pl-4">
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
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
                        autoFocus={fokusBaru === `dusun.${i}.rw.${j}.ketua`}
                        className="w-full max-w-sm"
                      />
                      {terbuka && (
                        <Tombol varian="teks" ukuran="kecil" isDisabled={d.rw.length === 1} onPress={() => hapusRw(i, j)}>
                          {`Hapus ${istilah.rw} ${rw.nomor}`}
                        </Tombol>
                      )}
                    </div>
                    <ul aria-label={`${istilah.rt} di ${istilah.rw} ${rw.nomor}`} className="mt-3 grid gap-3 border-l border-garis pl-4 sm:grid-cols-2">
                      {rw.rt.map((rt, k) => (
                        <li key={k} className="flex items-end gap-2">
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
                            autoFocus={fokusBaru === `dusun.${i}.rw.${j}.rt.${k}.ketua`}
                            className="min-w-0 flex-1"
                          />
                          {terbuka && (
                            <Tombol
                              varian="teks"
                              ukuran="kecil"
                              aria-label={`Hapus ${istilah.rt} ${rt.nomor}`}
                              isDisabled={rw.rt.length === 1}
                              onPress={() => hapusRt(i, j, k)}
                            >
                              Hapus
                            </Tombol>
                          )}
                        </li>
                      ))}
                    </ul>
                    {terbuka && (
                      <Tombol id={`tambah-rt-${i}-${j}`} varian="teks" ukuran="kecil" ikon={ikonTambah} className="mt-2" onPress={() => tambahRt(i, j)}>
                        {`Tambah ${istilah.rt}`}
                      </Tombol>
                    )}
                  </li>
                ))}
              </ul>
              {terbuka && (
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <Tombol id={`tambah-rw-${i}`} ukuran="kecil" ikon={ikonTambah} onPress={() => tambahRw(i)}>
                    {`Tambah ${istilah.rw}`}
                  </Tombol>
                  <Tombol varian="teks" ukuran="kecil" aria-label={`Hapus ${judul}`} onPress={() => hapusDusun(i)}>
                    {`Hapus ${kecilDusun}`}
                  </Tombol>
                </div>
              )}
            </BagianIsian>
          )
        })}
        {terbuka && (
          <div className="flex flex-col items-start gap-2 py-6">
            {form.dusun.length === 0 && (
              <p className="text-tinta-2">{`Belum ada ${kecilDusun}. Tambahkan ${kecilDusun} pertama beserta ${istilah.rw} dan ${istilah.rt}-nya.`}</p>
            )}
            <Tombol id="tambah-dusun" ikon={ikonTambah} onPress={tambahDusun}>
              {`Tambah ${kecilDusun}`}
            </Tombol>
            {galat.dusun && <p className={gayaGalat}>{galat.dusun}</p>}
          </div>
        )}
      </FormulirBagian>
    </div>
  )
}
