/**
 * Colokan pengirim pesan WhatsApp (SPEC-V0.3 §6.4). Simulator tidak mengirim apa pun dan tidak menyimpan nomor; penyedia
 * nyata datang di tahap lain (rencana 8F2b Ruling 14).
 */
export type Pengirim = {
  kirimWa(m: { desaId: string; ke: string; pesan: string }): Promise<void>
}

export function buatPengirimSimulator(): Pengirim {
  return {
    async kirimWa() {
      // Sengaja kosong: tidak ada pesan nyata terkirim dan nomor tidak disimpan di mana pun.
    },
  }
}
