import type { LamaAksesJam, RiwayatAkses } from '@sinfodes/kontrak/pengaturan/akses-sinfodes'
import type { PenggunaSesi } from '@sinfodes/kontrak/pengguna/schema'
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import type { Db } from '../basisdata/klien'
import { aksesBantuan, jejakBantuan, sesiBantuan } from '../basisdata/skema'
import { ATURAN_SESI_BANTUAN } from './pelaku'

/**
 * Akses bantuan Tim Sinfodes (SPEC-V0.3 §8.6): status akses, tiket sekali pakai, sesi bantuan, dan jejak halaman. Fungsi di sini
 * berjalan di bawah peran basis data pemanggilnya: desa (RLS ke satu desa) untuk memberi, mencabut, menukar, dan membaca;
 * Konsol hanya untuk `aksesBerlakuDesa` dan `simpanTiket`.
 */

export type AksesRekam = typeof aksesBantuan.$inferSelect
export type SesiBantuanRekam = typeof sesiBantuan.$inferSelect

const JAM_MS = 3600_000
/** Riwayat yang dikirim ke desa: akses terbaru dan halaman terbaru per sesi (setiap GET menambah satu baris jejak). */
const BATAS_AKSES_RIWAYAT = 20
const BATAS_HALAMAN_SESI = 300
const BATAS_JALUR = 300

export const aksesBerlaku = (a: Pick<AksesRekam, 'sampai' | 'dicabut'>, sekarang: Date): boolean =>
  a.dicabut === null && a.sampai.getTime() > sekarang.getTime()

/**
 * Memberi akses baru dan menutup akses yang masih berlaku (yang sudah habis dibiarkan apa adanya). Kunci penasihat per desa
 * membuat dua pemberian serentak berurutan, jadi satu desa tidak pernah punya dua akses berlaku sekaligus.
 */
export async function beriAkses(
  db: Db,
  p: { id: string; desaId: string; diberiOlehId: string; diberiOlehNama: string; lamaJam: LamaAksesJam; sembunyikanDataPribadi: boolean; sekarang: Date },
): Promise<AksesRekam> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${p.desaId}, 0))`)
  await db
    .update(aksesBantuan)
    .set({ dicabut: p.sekarang })
    .where(and(eq(aksesBantuan.desaId, p.desaId), isNull(aksesBantuan.dicabut), gt(aksesBantuan.sampai, p.sekarang)))
  const [baris] = await db
    .insert(aksesBantuan)
    .values({
      id: p.id,
      desaId: p.desaId,
      diberiOlehId: p.diberiOlehId,
      diberiOlehNama: p.diberiOlehNama,
      mulai: p.sekarang,
      sampai: new Date(p.sekarang.getTime() + p.lamaJam * JAM_MS),
      sembunyikanDataPribadi: p.sembunyikanDataPribadi,
      dicabut: null,
    })
    .returning()
  return baris
}

/** Mencabut akses yang sedang berlaku; mengembalikan akses itu, atau null bila tak ada (idempoten). */
export async function cabutAksesBerlaku(db: Db, desaId: string, sekarang: Date): Promise<AksesRekam | null> {
  const [baris] = await db
    .update(aksesBantuan)
    .set({ dicabut: sekarang })
    .where(and(eq(aksesBantuan.desaId, desaId), isNull(aksesBantuan.dicabut), gt(aksesBantuan.sampai, sekarang)))
    .returning()
  return baris ?? null
}

/** Akses yang sedang berlaku untuk desa itu, atau null. Dibaca desa maupun Konsol. */
export async function aksesBerlakuDesa(db: Db, desaId: string, sekarang: Date): Promise<AksesRekam | null> {
  const [baris] = await db
    .select()
    .from(aksesBantuan)
    .where(and(eq(aksesBantuan.desaId, desaId), isNull(aksesBantuan.dicabut), gt(aksesBantuan.sampai, sekarang)))
    .orderBy(desc(aksesBantuan.mulai))
    .limit(1)
  return baris ?? null
}

/** Menyimpan tiket (hanya hash tokennya). Dipanggil Konsol; `umurMs` 60 detik di rute. */
export async function simpanTiket(
  db: Db,
  t: { id: string; desaId: string; aksesId: string; tokenHash: string; olehId: string; olehNama: string; sekarang: Date; umurMs: number },
): Promise<void> {
  await db.execute(sql`insert into tiket_bantuan (id, desa_id, akses_id, token_hash, oleh_id, oleh_nama, dibuat, berlaku_sampai)
    values (${t.id}, ${t.desaId}, ${t.aksesId}, ${t.tokenHash}, ${t.olehId}, ${t.olehNama}, ${t.sekarang.toISOString()}::timestamptz,
      ${new Date(t.sekarang.getTime() + t.umurMs).toISOString()}::timestamptz)`)
}

/**
 * Menandai tiket terpakai dalam satu pernyataan atomik, hanya bila tiket belum dipakai, belum lewat masa berlakunya, dan akses
 * induknya masih berlaku. Dua penukar serentak: tepat satu mendapat baris. RLS membatasi pada desa dari konteks transaksi.
 */
export async function klaimTiket(db: Db, tokenHash: string, sekarang: Date): Promise<{ aksesId: string; olehId: string; olehNama: string } | null> {
  const kini = sekarang.toISOString()
  const baris = await db.execute<{ akses_id: string; oleh_id: string; oleh_nama: string }>(sql`
    update tiket_bantuan t set dipakai = ${kini}::timestamptz
    from akses_bantuan a
    where t.token_hash = ${tokenHash} and t.dipakai is null and t.berlaku_sampai > ${kini}::timestamptz
      and a.id = t.akses_id and a.dicabut is null and a.sampai > ${kini}::timestamptz
    returning t.akses_id, t.oleh_id, t.oleh_nama`)
  const b = baris[0]
  return b ? { aksesId: b.akses_id, olehId: b.oleh_id, olehNama: b.oleh_nama } : null
}

export async function simpanSesiBantuan(
  db: Db,
  s: { id: string; desaId: string; aksesId: string; tokenHash: string; olehId: string; olehNama: string; sekarang: Date },
): Promise<void> {
  await db.insert(sesiBantuan).values({
    id: s.id,
    desaId: s.desaId,
    aksesId: s.aksesId,
    tokenHash: s.tokenHash,
    olehId: s.olehId,
    olehNama: s.olehNama,
    dibuat: s.sekarang,
    terakhirAktif: s.sekarang,
    dicabut: null,
  })
}

/** Sesi bantuan beserta akses induknya lewat hash token. RLS membatasi pencarian pada desa dari alamat permintaan. */
export async function cariSesiBantuanMenurutHash(db: Db, tokenHash: string): Promise<{ sesi: SesiBantuanRekam; akses: AksesRekam } | null> {
  const [b] = await db
    .select({ sesi: sesiBantuan, akses: aksesBantuan })
    .from(sesiBantuan)
    .innerJoin(aksesBantuan, eq(aksesBantuan.id, sesiBantuan.aksesId))
    .where(eq(sesiBantuan.tokenHash, tokenHash))
    .limit(1)
  return b ?? null
}

/**
 * Sesi bantuan masih berlaku? Diperiksa di kode, bukan hanya RLS: desa sama dengan alamat, tidak dicabut, akses induk masih
 * berlaku (dicabut atau habis mengakhiri sesi seketika), belum menganggur 30 menit, belum melewati 8 jam.
 */
export function sesiBantuanBerlaku(d: { sesi: SesiBantuanRekam; akses: AksesRekam }, desaId: string, sekarang: Date): boolean {
  const t = sekarang.getTime()
  return (
    d.sesi.desaId === desaId &&
    d.akses.desaId === desaId &&
    d.sesi.dicabut === null &&
    aksesBerlaku(d.akses, sekarang) &&
    t - d.sesi.terakhirAktif.getTime() < ATURAN_SESI_BANTUAN.menganggurMs &&
    t - d.sesi.dibuat.getTime() < ATURAN_SESI_BANTUAN.mutlakMs
  )
}

/** Pengguna semu sesi bantuan. Email Tim tidak dibawa ke alamat desa: desa tidak berhak membaca akun Konsol. */
export const penggunaSesiBantuan = (s: SesiBantuanRekam): PenggunaSesi => ({
  id: `bantuan_${s.id}`,
  desaId: s.desaId,
  nama: s.olehNama,
  jabatan: 'Tim Sinfodes',
  peran: 'bantuan',
  dusunId: null,
  email: '',
  aktif: true,
  nip: null,
})

export async function geserAktifBantuan(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesiBantuan).set({ terakhirAktif: sekarang }).where(eq(sesiBantuan.id, sesiId))
}

export async function cabutSesiBantuan(db: Db, sesiId: string, sekarang: Date): Promise<void> {
  await db.update(sesiBantuan).set({ dicabut: sekarang }).where(eq(sesiBantuan.id, sesiId))
}

/** Jalur untuk jejak: deretan enam angka atau lebih (NIK, nomor KK) diganti `***`, dipotong 300 karakter. */
export const samarkanJalur = (jalur: string): string => jalur.replace(/\d{6,}/g, '***').slice(0, BATAS_JALUR)

/** Menambah satu baris jejak. Jalur selalu disamarkan di sini, jadi pemanggil tidak bisa lupa. */
export async function catatJejakBantuan(db: Db, j: { desaId: string; sesiId: string; jalur: string; waktu: Date }): Promise<void> {
  await db.insert(jejakBantuan).values({ desaId: j.desaId, sesiId: j.sesiId, jalur: samarkanJalur(j.jalur), waktu: j.waktu })
}

/** Riwayat akses desa untuk layar Pengaturan: 20 akses terbaru, tiap sesinya dengan 300 halaman terbaru (urutan waktu naik). */
export async function riwayatAkses(db: Db, desaId: string, sekarang: Date): Promise<RiwayatAkses[]> {
  const daftar = await db.select().from(aksesBantuan).where(eq(aksesBantuan.desaId, desaId)).orderBy(desc(aksesBantuan.mulai)).limit(BATAS_AKSES_RIWAYAT)
  if (daftar.length === 0) return []
  const sesi = await db
    .select()
    .from(sesiBantuan)
    .where(inArray(sesiBantuan.aksesId, daftar.map((a) => a.id)))
    .orderBy(sesiBantuan.dibuat)
  const halamanPerSesi = new Map<string, { jalur: string; waktu: string }[]>()
  if (sesi.length > 0) {
    const ids = sql.join(sesi.map((s) => sql`${s.id}`), sql`, `)
    const baris = await db.execute<{ sesi_id: string; jalur: string; waktu: Date }>(sql`
      select sesi_id, jalur, waktu from (
        select sesi_id, jalur, waktu, urut, row_number() over (partition by sesi_id order by waktu desc, urut desc) as rn
        from jejak_bantuan where sesi_id in (${ids})
      ) x where rn <= ${BATAS_HALAMAN_SESI} order by waktu asc, urut asc`)
    for (const b of baris) {
      const daftarHalaman = halamanPerSesi.get(b.sesi_id) ?? []
      daftarHalaman.push({ jalur: b.jalur, waktu: new Date(b.waktu).toISOString() })
      halamanPerSesi.set(b.sesi_id, daftarHalaman)
    }
  }
  return daftar.map((a) => ({
    id: a.id,
    mulai: a.mulai.toISOString(),
    sampai: a.sampai.toISOString(),
    berakhir: a.dicabut !== null ? 'dicabut' : aksesBerlaku(a, sekarang) ? null : 'habis',
    diberiOleh: a.diberiOlehNama,
    sesi: sesi
      .filter((s) => s.aksesId === a.id)
      .map((s) => ({ oleh: s.olehNama, mulai: s.dibuat.toISOString(), halaman: halamanPerSesi.get(s.id) ?? [] })),
  }))
}
