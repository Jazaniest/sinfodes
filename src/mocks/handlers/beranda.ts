import { http, HttpResponse } from 'msw'
import type { Tindakan } from '@/domain/beranda/schema'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { jadwalBerikut } from '@/domain/kesehatan/schema'
import { hitungMutasiBulan } from '@/domain/mutasi/buku'
import { barisPengaduanSchema } from '@/domain/pengaduan/schema'
import { dataBelumLengkap } from '@/domain/penduduk/filter'
import { ringkasSuratTerbit } from '@/domain/surat/ringkas'
import { hariKerjaBerlalu } from '@/domain/surat/waktu'
import { dataMilik } from '../cakupan'
import { API, denganJaringan } from '../http'
import { butuhPengguna } from '../sesi-mock'

export const handlerBeranda = [
  http.get(
    `${API}/beranda`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const milik = dataMilik(pengguna)
      const sekarang = new Date()
      const hariIni = tanggalIsoWib(sekarang)
      const bulanIni = hariIni.slice(0, 7)
      const hidup = milik.penduduk.filter((p) => p.statusDasar === 'Hidup')
      const petugas = pengguna.peran === 'operator' || pengguna.peran === 'sekdes'
      const belumLengkap = hidup.filter((p) => dataBelumLengkap(p, sekarang)).length
      const mutasiBulanIni = hitungMutasiBulan(milik.mutasi, bulanIni)
      // Pengaduan dalam cakupan pengguna: yang belum dibalas, dan yang terbaru untuk Kades dan Kepala Dusun (SPEC §5.3).
      const pengaduan = milik.db.pengaduan.filter(
        (a) => a.desaId === pengguna.desaId && (milik.dusunSaja === null || a.dusunId === milik.dusunSaja),
      )
      const belumDibalas = pengaduan.filter((a) => a.status === 'baru').length
      const pengaduanTerbaru = [...pengaduan]
        .sort((a, b) => b.masukPada.localeCompare(a.masukPada))
        .slice(0, 5)
        .map((a) => barisPengaduanSchema.parse(a))
      const posyandu = milik.db.posyandu.find((p) => p.desaId === pengguna.desaId && p.dusunId === milik.dusunSaja)
      // Laporan warga terlama dulu: butirnya membuka laporan itu (SPEC §5.3).
      const laporanBaru = milik.laporanData
        .filter((l) => l.status === 'baru')
        .sort((a, b) => a.dibuatPada.localeCompare(b.dibuatPada))
      const kelahiran = laporanBaru.filter((l) => l.isi.jenis === 'kelahiran')
      const perbaikan = laporanBaru.flatMap((l) => (l.isi.jenis === 'perbaikan' ? [l.isi] : []))
      // Surat (SPEC §5.3): permohonan menunggu (terlama dulu) dan surat yang dikembalikan untuk diperbaiki.
      const lebihLama = (a: { masukPada: string }, b: { masukPada: string }) => a.masukPada.localeCompare(b.masukPada)
      const menunggu = milik.permohonan.filter((p) => p.status === 'menunggu').sort(lebihLama)
      const dikembalikan = milik.permohonan.filter((p) => p.status === 'diproses' && p.dikembalikan !== null).sort(lebihLama)
      const kodeJenis = (id: string) => milik.jenisSurat.find((j) => j.id === id)?.kode ?? 'Surat'
      const namaPemohon = (id: string) => milik.penduduk.find((p) => p.id === id)?.nama ?? 'pemohon'
      const perluTtd = (tahap: 'paraf' | 'tanda-tangan') =>
        milik.permohonan.filter((p) => p.status === 'perlu-ttd' && p.tahap === tahap).length
      const tindakan: Tindakan[] = [
        ...(menunggu.length > 0
          ? [{ jenis: 'permohonan-menunggu' as const, jumlah: menunggu.length, tertuaHariKerja: hariKerjaBerlalu(menunggu[0].masukPada, waktuIsoWib(sekarang)) }]
          : []),
        ...(belumDibalas > 0 ? [{ jenis: 'pengaduan-belum-dibalas' as const, jumlah: belumDibalas }] : []),
        ...(kelahiran.length > 0 ? [{ jenis: 'kelahiran-dilaporkan' as const, jumlah: kelahiran.length, laporanId: kelahiran[0].id }] : []),
        ...(perbaikan.length > 0 ? [{ jenis: 'laporan-perbaikan' as const, jumlah: perbaikan.length, pendudukId: perbaikan[0].pendudukId }] : []),
        ...(dikembalikan.length > 0
          ? [
              {
                jenis: 'surat-dikembalikan' as const,
                jumlah: dikembalikan.length,
                permohonanId: dikembalikan[0].id,
                ringkas: `${kodeJenis(dikembalikan[0].jenisId)} · ${namaPemohon(dikembalikan[0].pemohonId)}`,
              },
            ]
          : []),
        ...(belumLengkap > 0 ? [{ jenis: 'data-belum-lengkap' as const, jumlah: belumLengkap }] : []),
      ]
      return HttpResponse.json({
        tindakan: petugas ? tindakan : null,
        bukuHariIni: petugas
          ? milik.aktivitas
              .filter((a) => tanggalIsoWib(new Date(a.waktu)) === hariIni)
              .sort((a, b) => a.waktu.localeCompare(b.waktu))
          : null,
        suratSaya:
          pengguna.peran === 'sekdes'
            ? { tahap: 'paraf', jumlah: perluTtd('paraf') }
            : pengguna.peran === 'kades'
              ? { tahap: 'tanda-tangan', jumlah: perluTtd('tanda-tangan') }
              : null,
        pengaduanTerbaru: pengguna.peran === 'kades' || pengguna.peran === 'kadus' ? pengaduanTerbaru : null,
        posyandu:
          pengguna.peran === 'kadus' && posyandu
            ? { nama: posyandu.nama, tempat: posyandu.tempat, jadwal: jadwalBerikut(posyandu.jadwal, hariIni) }
            : null,
        keadaan: {
          cakupan: milik.dusunSaja === null ? 'desa' : 'dusun',
          dusunId: milik.dusunSaja,
          jiwa: hidup.length,
          kk: milik.keluarga.length,
          laki: hidup.filter((p) => p.jenisKelamin === 'L').length,
          perempuan: hidup.filter((p) => p.jenisKelamin === 'P').length,
          bulanIni: mutasiBulanIni,
          surat: ringkasSuratTerbit(milik.permohonan, sekarang),
        },
      })
    }),
  ),
]
