/** Nomor surat (SPEC §4.4). Surat yang belum ditandatangani belum bernomor (SPEC §7.2). */
export function NomorSurat({ nomor }: { nomor: string | null }) {
  return nomor ? <span className="font-mono">{nomor}</span> : <span className="text-tinta-2">Diberikan saat ditandatangani</span>
}
