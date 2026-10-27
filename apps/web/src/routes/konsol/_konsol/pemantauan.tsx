import { createFileRoute, redirect } from '@tanstack/react-router'

// Pemantauan pindah ke dasbor kabupaten (SPEC-V0.2 §8.3); tautan lama Konsol diarahkan ke Ringkasan.
export const Route = createFileRoute('/konsol/_konsol/pemantauan')({
  beforeLoad: () => {
    throw redirect({ to: '/konsol' })
  },
})
