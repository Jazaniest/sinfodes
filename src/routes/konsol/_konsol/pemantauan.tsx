import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HalamanPemantauan } from '@/features/konsol/pemantauan/HalamanPemantauan'

// Hanya zod dan regex sebaris: bagian rute ini ikut masuk JS awal semua halaman (SPEC §13.4). Pemantau mengabaikan `wilayah`.
export const Route = createFileRoute('/konsol/_konsol/pemantauan')({
  validateSearch: z.object({ wilayah: z.string().regex(/^\d{2}\.\d{2}$/).optional().catch(undefined) }),
  component: HalamanPemantauan,
})
