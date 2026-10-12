/** Tautan obrolan WhatsApp (SPEC §9): "081266031140" → "https://wa.me/6281266031140", dengan pesan pembuka opsional. */
export function tautanWhatsapp(nomor: string, pesan?: string): string {
  const angka = nomor.replace(/\D/g, '').replace(/^0/, '62')
  return `https://wa.me/${angka}${pesan ? `?text=${encodeURIComponent(pesan)}` : ''}`
}
