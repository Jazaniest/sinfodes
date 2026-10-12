import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HalamanAjukan } from '@/features/warga/ajukan/HalamanAjukan'

export const Route = createFileRoute('/warga/_app/ajukan')({
  validateSearch: z.object({ ulang: z.string().optional().catch(undefined) }),
  component: HalamanAjukan,
})
