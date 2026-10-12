import { createFileRoute } from '@tanstack/react-router'
import { Beranda } from '@/features/warga/Beranda'

export const Route = createFileRoute('/warga/_app/')({ component: () => <Beranda /> })
