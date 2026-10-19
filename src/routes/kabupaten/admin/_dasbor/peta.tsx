import { createFileRoute } from '@tanstack/react-router'
import { PetaKabupaten } from '@/features/kabupaten/peta/PetaKabupaten'

export const Route = createFileRoute('/kabupaten/admin/_dasbor/peta')({ component: () => <PetaKabupaten /> })
