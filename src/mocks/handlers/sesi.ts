import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { waktuIsoWib } from '@/domain/format/tanggal'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { cariSesiBantuan, masihBerlaku, PESAN_TIKET_TIDAK_BERLAKU, tokenBantuanUntuk } from '../bantuan'
import { KATA_SANDI_DEMO } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { desaKonteks, konteksPermintaan, tanpaKonteks } from '../konteks-permintaan'
import { butuhPengguna, penggunaDariPermintaan, tokenUntuk } from '../sesi-mock'
import { idBaru } from '../tulis'

const masukSchema = z.object({ email: z.string().min(1), kataSandi: z.string().min(1) })
const tiketSchema = z.object({ tiket: z.string().min(1) })

const penggunaAktif = (email: string) =>
  ambilDb().pengguna.find((p) => p.email === email.trim().toLowerCase() && p.aktif)

/** Isi sesi admin: pengguna, desanya, dan daftar dusunnya; sesi bantuan juga membawa batas aksesnya (SPEC-V0.2 §5.3). */
function sesiUntuk(pengguna: PenggunaSesi) {
  const db = ambilDb()
  const desa = db.desa.find((d) => d.id === pengguna.desaId)
  if (!desa) return null
  const sesi = { jenis: 'admin' as const, pengguna, desa, dusun: db.dusun.filter((d) => d.desaId === desa.id) }
  if (pengguna.peran !== 'bantuan') return sesi
  const akses = cariSesiBantuan(db, pengguna.id.replace(/^bantuan_/, ''))?.akses
  return akses ? { ...sesi, bantuan: { sampai: akses.sampai, sembunyikanDataPribadi: akses.sembunyikanDataPribadi } } : null
}

export const handlerSesi = [
  http.post(
    `${API}/sesi/masuk`,
    denganJaringan(async ({ request }) => {
      const isian = masukSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return balasGalat('VALIDATION', 'Email dan kata sandi wajib diisi.', 422)
      const pengguna = penggunaAktif(isian.data.email)
      if (!pengguna || isian.data.kataSandi !== KATA_SANDI_DEMO) {
        return balasGalat('VALIDATION', 'Email atau kata sandi salah.', 422, { kataSandi: 'Email atau kata sandi salah.' })
      }
      const sesi = sesiUntuk(pengguna)
      if (!sesi) return balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
      // Desa dari alamat (SPEC-V0.2 §4.3). Diperiksa sesudah kata sandi terbukti benar, supaya orang tidak bisa menebak
      // email mana terdaftar di desa mana.
      const k = konteksPermintaan(request)
      if (!tanpaKonteks(k)) {
        const desaAlamat = desaKonteks(ambilDb(), k)
        if (!desaAlamat) return balasGalat('FORBIDDEN', 'Panel desa dibuka dari alamat desa Anda.', 403)
        if (desaAlamat.id !== pengguna.desaId) {
          return balasGalat('FORBIDDEN', `Akun ini terdaftar di Desa ${sesi.desa.nama}.`, 403, { alamatDesa: sesi.desa.slug })
        }
      }
      // Dasar "login per minggu" dan "pengguna aktif" di Konsol (SPEC §11).
      ubahDb((d) => {
        d.riwayatMasuk.push({ penggunaId: pengguna.id, desaId: pengguna.desaId, waktu: waktuIsoWib(new Date()) })
      })
      return HttpResponse.json({ token: tokenUntuk(pengguna.id), sesi })
    }),
  ),
  http.post(
    `${API}/sesi/bantuan`,
    denganJaringan(async ({ request }) => {
      const tidakBerlaku = () => balasGalat('UNAUTHENTICATED', PESAN_TIKET_TIDAK_BERLAKU, 401)
      const isian = tiketSchema.safeParse(await request.json().catch(() => null))
      if (!isian.success) return tidakBerlaku()
      const db = ambilDb()
      const sekarang = new Date()
      const akses = db.aksesBantuan.find((a) => a.tiket?.kode === isian.data.tiket)
      const tiket = akses?.tiket
      // Tiket sekali pakai, berumur 60 detik, dan hanya untuk alamat desa pemberi akses.
      if (!akses || !tiket || new Date(tiket.berlakuSampai).getTime() < sekarang.getTime() || !masihBerlaku(akses, sekarang)) {
        return tidakBerlaku()
      }
      const k = konteksPermintaan(request)
      if (!tanpaKonteks(k) && desaKonteks(db, k)?.id !== akses.desaId) return tidakBerlaku()
      const sesiId = idBaru(db, 'sbt')
      ubahDb((d) => {
        const a = d.aksesBantuan.find((x) => x.id === akses.id)
        if (!a) return
        a.tiket = null
        a.sesi.push({ id: sesiId, olehId: tiket.olehId, olehNama: tiket.olehNama, mulai: waktuIsoWib(sekarang), halaman: [] })
      })
      const token = tokenBantuanUntuk(sesiId)
      const pengguna = penggunaDariPermintaan(new Request(request.url, { headers: { Authorization: `Bearer ${token}` } }))
      const sesi = pengguna && sesiUntuk(pengguna)
      return sesi ? HttpResponse.json({ token, sesi }) : balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
    }),
  ),
  http.get(
    `${API}/sesi`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengguna(request)
      if (pengguna instanceof Response) return pengguna
      const sesi = sesiUntuk(pengguna)
      return sesi ? HttpResponse.json(sesi) : balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)
    }),
  ),
  http.post(
    `${API}/sesi/keluar`,
    denganJaringan(() => new HttpResponse(null, { status: 204 })),
  ),
]
