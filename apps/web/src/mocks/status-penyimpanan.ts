let terpisah = false

/** Hub tidak terjangkau: data demo disimpan per alamat, jadi perubahan tidak terlihat di alamat lain (SPEC-V0.2 §4.6). */
export function tandaiDataTerpisah(): void {
  terpisah = true
}

export const dataDemoTerpisah = (): boolean => terpisah
