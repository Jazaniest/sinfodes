import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { ambilTokenSesi } from '@/api/client'
import { HalamanMasukKabupaten } from '@/features/kabupaten/HalamanMasukKabupaten'

export const Route = createFileRoute('/kabupaten/admin/masuk')({
  validateSearch: z.object({ ke: z.string().startsWith('/kabupaten/admin').optional().catch(undefined) }),
  beforeLoad: () => {
    if (ambilTokenSesi('kabupaten')) throw redirect({ to: '/kabupaten/admin' })
  },
  component: HalamanMasukKabupaten,
})
