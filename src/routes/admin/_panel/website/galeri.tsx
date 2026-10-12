import { createFileRoute } from '@tanstack/react-router'
import { HalamanGaleri } from '@/features/website/halaman'

export const Route = createFileRoute('/admin/_panel/website/galeri')({ component: HalamanGaleri })
