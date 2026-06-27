# Wireframe Halaman POS Toko

## 1. Login
```
┌─────────────────────────────────────┐
│           [Logo Toko]               │
│     POS Toko Plastik & Bahan Kue    │
│                                     │
│  Email:    [________________]       │
│  Password: [________________]       │
│                                     │
│         [    MASUK    ]             │
│                                     │
│  Demo: owner@toko.com / password    │
└─────────────────────────────────────┘
```

## 2. Dashboard
```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │  Dashboard                               │
│          │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│ Dashboard│  │Penjual│ │Trans │ │Omzet │ │Hutang│     │
│ Kasir    │  │Hari Ini│ │Hari  │ │Bulan │ │      │     │
│ Produk   │  └──────┘ └──────┘ └──────┘ └──────┘     │
│ ...      │  ┌─────────────────┐ ┌───────────────┐   │
│          │  │ Grafik Penjualan│ │ Stok Menipis  │   │
│          │  │ (Chart.js)      │ │ • Produk A    │   │
│          │  └─────────────────┘ └───────────────┘   │
│          │  ┌─────────────────┐ ┌───────────────┐   │
│          │  │ Produk Terlaris │ │ Piutang       │   │
│          │  └─────────────────┘ └───────────────┘   │
└──────────┴──────────────────────────────────────────┘
```

## 3. Kasir POS
```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │  [Cari produk...] [Scan barcode]         │
│          │  ┌─────────────────────────────────────┐ │
│          │  │ Hasil pencarian produk (grid)       │ │
│          │  └─────────────────────────────────────┘ │
│          │  ┌─────────────────────┐ ┌─────────────┐ │
│          │  │ KERANJANG           │ │ PEMBAYARAN  │ │
│          │  │ Item | Qty | Total  │ │ Subtotal    │ │
│          │  │ ─────────────────── │ │ Diskon      │ │
│          │  │                     │ │ Pajak       │ │
│          │  │                     │ │ TOTAL       │ │
│          │  │                     │ │ [Tunai|QRIS]│ │
│          │  │                     │ │ [  BAYAR  ] │ │
│          │  └─────────────────────┘ └─────────────┘ │
└──────────┴──────────────────────────────────────────┘
```

## 4. Produk
```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │  Produk          [Cari...] [+ Tambah]     │
│          │  ┌──────────────────────────────────────┐ │
│          │  │ Nama | Kategori | Harga | Stok | ⚙  │ │
│          │  │ ...                                  │ │
│          │  └──────────────────────────────────────┘ │
│          │  [< Prev]  Hal 1/5  [Next >]             │
└──────────┴──────────────────────────────────────────┘
```

## 5. Laporan
```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │  Laporan  [Harian|Bulanan|Laba Rugi]     │
│          │  Filter: [Tanggal] [Export PDF] [Excel]  │
│          │  ┌──────────────────────────────────────┐ │
│          │  │ Tabel data laporan                   │ │
│          │  └──────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────┘
```

## Desain UI
- **Warna**: Biru (#2563EB) + Putih
- **Layout**: Sidebar kiri (desktop), drawer (mobile)
- **Dark mode**: Toggle di sidebar footer
- **Komponen**: Shadcn UI cards, tables, forms
- **Responsive**: Grid adaptif sm/lg breakpoints
