/** "Juara 1", "Juara 3 bersama"; null di luar podium. */
export function labelJuara(peringkat: number, bersama: boolean): string | null {
  return peringkat <= 3 ? `Juara ${peringkat}${bersama ? ' bersama' : ''}` : null
}
