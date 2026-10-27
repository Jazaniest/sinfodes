/** Menggabungkan kelas CSS; nilai falsy diabaikan. */
export function cn(...kelas: Array<string | false | null | undefined>): string {
  return kelas.filter(Boolean).join(' ')
}
