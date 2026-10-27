/** "081277402231" → "0812-••••-2231": nomor tujuan tanpa membuka seluruh nomor (SPEC §7.4). */
export function samarkanTelepon(nomor: string): string {
  const digit = nomor.replace(/\D/g, '')
  return `${digit.slice(0, 4)}-••••-${digit.slice(-4)}`
}
