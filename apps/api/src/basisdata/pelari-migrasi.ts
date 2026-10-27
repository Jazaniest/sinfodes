import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type postgres from 'postgres'

export type HasilMigrasi = { diterapkan: string[]; dilewati: string[] }

const checksum = (isi: string): string => createHash('sha256').update(isi).digest('hex')

/**
 * Menerapkan `folder/*.sql` berurutan (SPEC-V0.3 §7.10): maju-saja, tiap berkas satu transaksi, nama dan checksum dicatat
 * di `_migrasi`. Berkas yang sudah diterapkan lalu berubah isinya, atau berkas baru yang urutannya mendahului yang sudah
 * diterapkan, membuat pelari berhenti dengan galat.
 */
export async function jalankanMigrasi(sql: postgres.Sql, folder: string): Promise<HasilMigrasi> {
  await sql`create table if not exists _migrasi (
    nama text primary key,
    checksum text not null,
    diterapkan timestamptz not null default now()
  )`
  const tercatat = new Map((await sql<{ nama: string; checksum: string }[]>`select nama, checksum from _migrasi`).map((b) => [b.nama, b.checksum]))
  const berkas = readdirSync(folder).filter((n) => n.endsWith('.sql')).sort()
  const hasil: HasilMigrasi = { diterapkan: [], dilewati: [] }
  let adaBaru = false

  for (const nama of berkas) {
    const isi = readFileSync(join(folder, nama), 'utf8')
    const sum = checksum(isi)
    const lama = tercatat.get(nama)
    if (lama !== undefined) {
      if (lama !== sum) throw new Error(`Migrasi ${nama} berubah sejak diterapkan. Buat migrasi baru, jangan ubah yang lama.`)
      if (adaBaru) throw new Error(`Migrasi ${nama} sudah diterapkan tetapi berada sesudah migrasi yang belum diterapkan.`)
      hasil.dilewati.push(nama)
      continue
    }
    adaBaru = true
    await sql.begin(async (tx) => {
      await tx.unsafe(isi)
      await tx`insert into _migrasi (nama, checksum) values (${nama}, ${sum})`
    })
    hasil.diterapkan.push(nama)
  }
  return hasil
}
