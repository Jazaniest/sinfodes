export type Suku = 'Melayu' | 'Jawa' | 'Minang' | 'Batak' | 'Lainnya'
/** Angkatan kelahiran: tua ≤ 1975, tengah 1976-1995, muda ≥ 1996. */
export type Angkatan = 'tua' | 'tengah' | 'muda'

type Kumpulan = Readonly<Record<Angkatan, { L: readonly string[]; P: readonly string[] }>>

export function angkatanDari(tahunLahir: number): Angkatan {
  return tahunLahir <= 1975 ? 'tua' : tahunLahir <= 1995 ? 'tengah' : 'muda'
}

export const MARGA_BATAK = [
  'Simanjuntak', 'Siregar', 'Nainggolan', 'Sitorus', 'Hutapea', 'Sihombing', 'Situmorang', 'Pardede', 'Manurung', 'Tambunan',
] as const

export const NAMA_DEPAN: Readonly<Record<Suku, Kumpulan>> = {
  Melayu: {
    tua: {
      L: ['Muhammad Yusuf', 'Abdul Rahman', 'Ismail', 'Hasan Basri', 'Syamsuddin', 'Jaafar', 'Wan Ahmad', 'Tengku Said',
        'Mukhtar', 'Zainal Abidin', 'Harun', 'Idris', 'Kasim', 'Salim', 'Abdul Majid', 'Hamzah'],
      P: ['Siti Aminah', 'Wan Salmah', 'Rosnah', 'Maimunah', 'Zubaidah', 'Fatimah', 'Aisyah', 'Halimah', 'Khadijah',
        'Rohani', 'Saleha', 'Siti Hawa', 'Wan Zaleha', 'Mariam'],
    },
    tengah: {
      L: ['Zulkifli', 'Syahrial', 'Hendri', 'Rahmat', 'Azhar', 'Jufri', 'Firdaus', 'Afrizal', 'Zulkarnain', 'Ramli',
        'Amran', 'Darwis', 'Rusli', 'Syahrul', 'Fauzi', 'Irwan', 'Khairul', 'Mahmud'],
      P: ['Nurhayati', 'Rosmiati', 'Rosnani', 'Siti Rahmah', 'Yusnidar', 'Nurlela', 'Wan Aisyah', 'Erni', 'Fitriani',
        'Hasnah', 'Mardiana', 'Rahmawati', 'Nurbaya', 'Yuliana'],
    },
    muda: {
      L: ['Muhammad Fadil', 'Rizky Pratama', 'Muhammad Rafi', 'Fauzan', 'Ilham', 'Aditya', 'Reza', 'Muhammad Alif',
        'Arif Hidayat', 'Farhan', 'Habibi', 'Azka', 'Zaki', 'Rafa'],
      P: ['Aulia Putri', 'Nur Aini', 'Putri Ramadhani', 'Nabila', 'Salsabila', 'Syifa', 'Zahra', 'Annisa', 'Dinda',
        'Khairunnisa', 'Nayla', 'Azzahra', 'Alya', 'Humaira'],
    },
  },
  Jawa: {
    tua: {
      L: ['Sutrisno', 'Sukardi', 'Slamet', 'Paijo', 'Suparno', 'Sugiyono', 'Wagiman', 'Sukirno', 'Ngadiman', 'Tukiman',
        'Sarno', 'Parman'],
      P: ['Suparmi', 'Sumini', 'Sri Wahyuni', 'Painem', 'Tukinem', 'Sulastri', 'Suyatmi', 'Sarmi', 'Wagiyem', 'Sukinah'],
    },
    tengah: {
      L: ['Joko Santoso', 'Wahyu Hidayat', 'Agus Setiawan', 'Bambang Susilo', 'Eko Prasetyo', 'Budi Santoso',
        'Heru Purnomo', 'Dwi Cahyono', 'Teguh Wibowo', 'Sigit Purnomo'],
      P: ['Sri Lestari', 'Endang Susilowati', 'Tri Wahyuningsih', 'Siti Kholifah', 'Rini Astuti', 'Wulandari',
        'Puji Rahayu', 'Nur Hidayah', 'Sri Mulyani'],
    },
    muda: {
      L: ['Dimas Saputra', 'Bagus Prakoso', 'Yoga Pratama', 'Galih Pamungkas', 'Rendi Saputra', 'Fajar Nugroho',
        'Aris Munandar', 'Dani Setiawan'],
      P: ['Dewi Anggraini', 'Ayu Lestari', 'Putri Handayani', 'Novita Sari', 'Fitri Wulandari', 'Intan Permatasari',
        'Anisa Rahmawati', 'Mega Utami'],
    },
  },
  Minang: {
    tua: {
      L: ['Syafei', 'Nazaruddin', 'Bustami', 'Zainuddin', 'Alimin', 'Jamaris', 'Asril'],
      P: ['Nurbaiti', 'Yusnimar', 'Rosmaniar', 'Nurlaili', 'Syamsiar', 'Asnidar'],
    },
    tengah: {
      L: ['Syafrizal', 'Yulizar', 'Zulhendri', 'Erizal', 'Andri Yanto', 'Deswandi', 'Hendra Gunawan'],
      P: ['Yulia Rahmi', 'Erlinda', 'Desi Yanti', 'Yenni', 'Rita Novia', 'Efrida'],
    },
    muda: {
      L: ['Rahmad Hidayat', 'Fikri', 'Hafiz', 'Randi', 'Aldo Pratama', 'Rizaldi'],
      P: ['Rahmi Aulia', 'Nadia', 'Fadhila', 'Syafira', 'Vira Anggraini', 'Rani'],
    },
  },
  Batak: {
    tua: {
      L: ['Tigor', 'Marihot', 'Bonar', 'Parlindungan', 'Hotman', 'Manahan'],
      P: ['Tiurma', 'Rosdiana', 'Nurmaida', 'Masniar', 'Rospita', 'Tiamsa'],
    },
    tengah: {
      L: ['Hendra', 'Roy', 'Jonni', 'Rudi', 'Frans', 'Poltak', 'Darwin'],
      P: ['Lasmaria', 'Rosmawati', 'Evi', 'Lamria', 'Hotmaida', 'Rotua'],
    },
    muda: {
      L: ['Daniel', 'Kevin', 'Samuel', 'Yosua', 'Andreas', 'Jonathan'],
      P: ['Grace', 'Yohana', 'Cindy', 'Theresia', 'Monika', 'Agnes'],
    },
  },
  Lainnya: {
    tua: { L: ['Andi Baso', 'La Ode Hasan', 'Andi Mappa'], P: ['Andi Nurhayati', 'Wa Ode Sitti', 'Andi Rukiah'] },
    tengah: { L: ['Andi Syamsul', 'La Ode Rusdi', 'Andi Irfan'], P: ['Andi Fitri', 'Wa Ode Sari', 'Andi Marlina'] },
    muda: { L: ['Andi Rahmat', 'La Ode Fikri', 'Andi Fadli'], P: ['Andi Nabila', 'Wa Ode Putri', 'Andi Rahma'] },
  },
}
