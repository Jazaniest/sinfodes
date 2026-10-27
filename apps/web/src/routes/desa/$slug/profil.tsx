import { createFileRoute } from '@tanstack/react-router'
import { ProfilPublik } from '@/features/publik/profil/ProfilPublik'

export const Route = createFileRoute('/desa/$slug/profil')({ component: ProfilPublik })
