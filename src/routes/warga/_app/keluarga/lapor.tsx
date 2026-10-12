import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HalamanLapor } from '@/features/warga/keluarga/HalamanLapor'

export const Route = createFileRoute('/warga/_app/keluarga/lapor')({
  validateSearch: z.object({ anggota: z.string().optional().catch(undefined) }),
  component: HalamanLapor,
})
