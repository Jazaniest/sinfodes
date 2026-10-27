import { createFileRoute } from '@tanstack/react-router'
import { HalamanPenggunaKabupaten } from '@/features/kabupaten/pengguna/HalamanPenggunaKabupaten'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/pengguna')({ component: () => <HalamanPenggunaKabupaten /> })
