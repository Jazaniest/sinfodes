import { createFileRoute } from '@tanstack/react-router'
import { HalamanPortalKabupaten } from '@/features/kabupaten/portal/HalamanPortalKabupaten'

export const Route = createFileRoute('/kabupaten/')({ component: HalamanPortalKabupaten })
