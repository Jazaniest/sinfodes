/** Empat tab Detail desa (SPEC §11); bawaannya Ringkasan. */
export const TAB_DETAIL_DESA = ['ringkasan', 'persiapan', 'penggunaan', 'langganan'] as const
export type TabDetailDesa = (typeof TAB_DETAIL_DESA)[number]

export const LABEL_TAB_DETAIL_DESA: Readonly<Record<TabDetailDesa, string>> = {
  ringkasan: 'Ringkasan',
  persiapan: 'Persiapan',
  penggunaan: 'Penggunaan',
  langganan: 'Langganan',
}
