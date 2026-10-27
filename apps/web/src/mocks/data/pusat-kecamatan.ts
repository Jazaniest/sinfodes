import type { Titik } from '@/domain/peta/titik'

/**
 * Pusat kecamatan [bujur, lintang] untuk titik perkiraan desa di peta kabupaten (SPEC-V0.2 §8.3 butir 5). Dari OpenStreetMap
 * Nominatim, diverifikasi 19 Okt 2026, dibulatkan 4 desimal. Hanya kecamatan kabupaten mitra demo (Pelalawan dan Siak).
 */
export const PUSAT_KECAMATAN: Readonly<Record<string, Titik>> = {
  '140501': [101.9751, -0.2174], // Ukui
  '140502': [101.8581, 0.3854], // Pangkalan Kerinci
  '140503': [101.9227, 0.0332], // Pangkalan Kuras
  '140504': [102.1104, -0.0546], // Pangkalan Lesung
  '140505': [101.6568, 0.0397], // Langgam
  '140506': [102.1315, 0.4381], // Pelalawan
  '140507': [102.3838, 0.01], // Kerumutan
  '140508': [102.1047, 0.2919], // Bunut
  '140509': [102.7666, 0.3881], // Teluk Meranti
  '140510': [103.1392, 0.6449], // Kuala Kampar
  '140511': [101.6305, 0.4246], // Bandar Sei Kijang
  '140512': [102.1619, 0.1487], // Bandar Petalangan
  '140802': [102.2535, 0.9254], // Sungai Apit
  '140804': [101.6121, 0.6543], // Tualang
}
