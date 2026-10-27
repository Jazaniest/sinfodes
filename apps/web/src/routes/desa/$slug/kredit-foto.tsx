import { createFileRoute } from '@tanstack/react-router'
import { KreditFoto } from '@/features/publik/kredit/KreditFoto'

export const Route = createFileRoute('/desa/$slug/kredit-foto')({ component: KreditFoto })
