import { http, HttpResponse } from 'msw'
import { hitungUmur, waktuIsoWib } from '@/domain/format/tanggal'
import { dilayani, periksaIsian, saringIsian } from '@/domain/surat/jenis'
import { periksaPemohon } from '@/domain/surat/pemohon'
import type { Permohonan } from '@/domain/surat/permohonan'
import {
  calonUntuk, kirimPermohonanWargaSchema, namaSyarat, nomorTiket, syaratWajib, type JenisSuratWarga,
} from '@/domain/warga/ajukan'
import { periksaFotoKirim, ukuranKb } from '@/domain/warga/foto'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { bacaMultipart, catatKiriman, kirimanSebelumnya } from '../kiriman-warga'
import { kirimNotifikasi } from '../notifikasi'
import { tolakBilaLayananDitutup } from '../penangguhan'
import { butuhWarga } from '../sesi-mock'
import { perkiraanHariKerja } from '../surat-perkiraan'
import { balasField, balasIsianTidakValid, catatAktivitas, idBaru } from '../tulis'
import { catatRiwayatSurat } from './surat-aksi'

/** Ajukan surat dari layanan warga (SPEC §10). */
export const handlerWargaAjukan = [
  http.get(
    `${API}/warga/jenis-surat`,
    denganJaringan(({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const db = ambilDb()
      const sekarang = new Date()
      const data: JenisSuratWarga[] = db.jenisSurat
        .filter((j) => j.desaId === w.penduduk.desaId && j.online && dilayani(j))
        .map((j) => ({
          id: j.id, kode: j.kode, nama: j.nama, subjek: j.subjek, isian: j.isian, syarat: j.syarat,
          perkiraanHariKerja: perkiraanHariKerja(db, j.id, sekarang),
        }))
      return HttpResponse.json(data)
    }),
  ),
  http.post(
    `${API}/warga/permohonan`,
    denganJaringan(async ({ request }) => {
      const w = butuhWarga(request)
      if (w instanceof Response) return w
      const ditutup = tolakBilaLayananDitutup(w.penduduk.desaId)
      if (ditutup) return ditutup
      const { data, berkas } = await bacaMultipart(request)
      const masukan = kirimPermohonanWargaSchema.safeParse(data)
      if (!masukan.success) return balasIsianTidakValid(masukan.error)
      const m = masukan.data
      const db = ambilDb()
      const desaId = w.penduduk.desaId
      // Kirim ulang dengan kunci yang sama: kembalikan permohonan yang sudah tercatat (fokus review 1).
      const lama = kirimanSebelumnya(db, w.penduduk.id, 'permohonan', m.kunci)
      const sudahAda = lama ? db.permohonan.find((x) => x.id === lama.rujukanId) : undefined
      if (sudahAda) return HttpResponse.json({ id: sudahAda.id, tiket: nomorTiket(sudahAda) })

      const jenis = db.jenisSurat.find((j) => j.id === m.jenisId && j.desaId === desaId)
      if (!jenis) return balasField('jenisId', 'Jenis surat ini tidak bisa diajukan online. Datang ke kantor desa.')
      if (!dilayani(jenis)) return balasField('jenisId', 'Jenis surat ini tidak tersedia.', 'CONFLICT')
      if (!jenis.online) return balasField('jenisId', 'Jenis surat ini tidak bisa diajukan online. Datang ke kantor desa.')
      // Hanya untuk anggota KK sendiri yang masih hidup (fokus review 3).
      const sekarang = new Date()
      const anggota = db.penduduk.filter((p) => p.keluargaId === w.penduduk.keluargaId && p.statusDasar === 'Hidup')
      const untuk = anggota.find((p) => p.id === m.untukId)
      if (!untuk) return balasField('untukId', 'Pilih anggota keluarga Anda sendiri.')
      const calon = calonUntuk(jenis.subjek, anggota.map((p) => ({ id: p.id, umurBulan: hitungUmur(p.tanggalLahir, sekarang).bulan })))
      if (!calon.some((c) => c.id === untuk.id)) {
        return balasField(
          'untukId',
          jenis.subjek === 'kelahiran' ? 'Surat kelahiran hanya untuk bayi di bawah 12 bulan.' : 'Surat ini tidak bisa diajukan untuk anggota tersebut.',
        )
      }
      const pemohon = jenis.subjek === 'pemohon' ? untuk : w.penduduk
      const subjek = jenis.subjek === 'pemohon' ? null : untuk
      const cek = periksaPemohon(jenis, pemohon, subjek, null)
      if (cek.blokir) return balasField('untukId', cek.blokir.pesan)

      const isian = saringIsian(jenis, m.isian)
      const galatIsian = Object.entries(periksaIsian(jenis, isian))
      if (galatIsian.length > 0) {
        return balasGalat('VALIDATION', 'Isian surat belum lengkap.', 422, Object.fromEntries(galatIsian.map(([k, v]) => [`isian.${k}`, v])))
      }
      const foto = berkas('lampiran')
      if (foto.length !== m.lampiran.length) return balasField('lampiran', 'Jumlah foto tidak cocok dengan daftar syarat.')
      for (const f of foto) {
        const g = periksaFotoKirim(f)
        if (g) return balasField('lampiran', g)
      }
      const kurang = jenis.syarat.filter((s) => syaratWajib(s) && !m.lampiran.some((l) => l.syarat === s))
      if (kurang.length > 0) return balasField('lampiran', `Foto ${kurang.map(namaSyarat).join(', ')} wajib dilampirkan.`)

      const waktu = waktuIsoWib(sekarang)
      const tahun = waktu.slice(0, 4)
      const noUrut = 1 + Math.max(0, ...db.permohonan.filter((x) => x.desaId === desaId && x.masukPada.startsWith(tahun)).map((x) => x.noUrut))
      const oleh = { id: w.penduduk.id, nama: w.penduduk.nama }
      const p: Permohonan = {
        id: idBaru(db, 'srt'), desaId, dusunId: pemohon.dusunId, noUrut, jenisId: jenis.id, kanal: 'online',
        pemohonId: pemohon.id, subjekId: subjek?.id ?? null, mutasiId: null, isian, status: 'menunggu', tahap: null,
        dikembalikan: null, penolakan: null, pembatalan: null, diambil: null, masukPada: waktu, ditutupPada: null,
        lampiran: m.lampiran.map((l, i) => ({ id: idBaru(db, 'lmp'), syarat: l.syarat, berkas: foto[i].name, ukuranKb: ukuranKb(foto[i].size) })),
        catatanInternal: null, riwayat: [], terbit: null,
      }
      const rujukan = { jenis: 'permohonan' as const, id: p.id }
      ubahDb((d) => {
        d.permohonan.push(p)
        catatRiwayatSurat(d, p, 'diajukan', oleh, waktu)
        catatKiriman(d, { kunci: m.kunci, pendudukId: w.penduduk.id, jenis: 'permohonan', rujukanId: p.id })
        catatAktivitas(d, {
          desaId, dusunId: p.dusunId, waktu, jenis: 'permohonan-masuk', ringkasan: `Permohonan ${jenis.kode} · ${pemohon.nama} (online)`,
          oleh, rujukan,
        })
        kirimNotifikasi(d, {
          desaId, untuk: 'surat.proses', kecuali: null, jenis: 'permohonan-baru', judul: `Permohonan baru: ${jenis.kode} · ${pemohon.nama}`,
          isi: 'Diajukan lewat layanan warga. Periksa kelengkapan berkasnya.', waktu, rujukan,
        })
      })
      return HttpResponse.json({ id: p.id, tiket: nomorTiket(p) }, { status: 201 })
    }),
  ),
]
