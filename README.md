# POS Toko Plastik & Bahan Kue

Sistem Point of Sale web untuk toko plastik dan bahan kue. Dibangun dengan Next.js 15, Prisma, MySQL, dan NextAuth.

**Repository:** https://github.com/teenyclaw/pos-toko

## Fitur Utama

- Kasir POS (scan barcode, multi metode bayar, hold transaksi, cetak struk)
- Manajemen produk, stok, pembelian, supplier, pelanggan
- Piutang/hutang & pelunasan
- Laporan penjualan, laba rugi, export PDF/Excel
- Beban operasional, retur penjualan/pembelian
- Multi-satuan, cetak label barcode, backup JSON, PWA

## Instalasi Cepat (Lokal)

```bash
git clone https://github.com/teenyclaw/pos-toko.git
cd pos-toko
npm install
copy .env.example .env
# Edit .env — DATABASE_URL, NEXTAUTH_SECRET

# Buat database MySQL: pos_toko
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Buka http://localhost:3000 — login: `owner@toko.com` / `password`

Atau double-click **`start-dev.bat`** (Windows/Laragon).

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Instalasi lokal detail |
| [docs/HOSTING.md](docs/HOSTING.md) | **Panduan deploy ke hosting (Vercel, VPS, SSL)** |
| [docs/ERD.md](docs/ERD.md) | Diagram database |
| [docs/WIREFRAMES.md](docs/WIREFRAMES.md) | Wireframe UI |

## Scripts

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development server |
| `npm run build` | Build production |
| `npm start` | Jalankan production |
| `npm run db:migrate` | Migrasi database |
| `npm run db:seed` | Data demo |

## Tech Stack

Next.js 15 · TypeScript · Tailwind CSS · Prisma · MySQL · NextAuth · React Query · Chart.js

## Lisensi

MIT
