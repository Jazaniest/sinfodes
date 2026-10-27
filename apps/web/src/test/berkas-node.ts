import { File as FileNode } from 'node:buffer'
import { afterAll, beforeAll, vi } from 'vitest'

/**
 * FormData dan File milik jsdom tidak bisa dikirim lewat fetch Node ke MSW ("Tidak dapat terhubung ke server").
 * Uji UI yang mengirim foto memakai kelas milik Node selama berkas uji itu berjalan.
 */
export function pakaiBerkasNode(): void {
  beforeAll(async () => {
    const FormDataNode = (await new Response(new URLSearchParams('a=1')).formData()).constructor as typeof FormData
    vi.stubGlobal('FormData', FormDataNode)
    vi.stubGlobal('File', FileNode)
  })
  afterAll(() => {
    vi.unstubAllGlobals()
  })
}
