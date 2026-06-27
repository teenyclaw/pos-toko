# Panduan Instalasi & Deployment

## Persyaratan

- Node.js 20+
- MySQL 8+ (Laragon/XAMPP/Docker)
- npm atau pnpm

## Instalasi Lokal (Laragon)

### 1. Clone & Install Dependencies

```bash
cd c:\laragon\www\pos-toko
npm install
```

### 2. Konfigurasi Environment

```bash
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="mysql://root:@localhost:3306/pos_toko"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ganti-dengan-string-random-panjang-minimal-32-karakter"
```

### 3. Buat Database

Buka phpMyAdmin atau MySQL CLI:

```sql
CREATE DATABASE pos_toko CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Migrasi & Seed

```bash
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka http://localhost:3000

### Akun Demo

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@toko.com | password |
| Kasir | kasir@toko.com | password |
| Gudang | gudang@toko.com | password |

## Struktur Folder

```
pos-toko/
├── docs/                 # ERD, wireframe, dokumentasi
├── prisma/
│   ├── schema.prisma     # Skema database
│   └── seed.ts           # Data awal
├── public/
│   └── manifest.json     # PWA manifest
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (dashboard)/  # Halaman protected
│   │   ├── api/          # API endpoints
│   │   └── login/        # Halaman auth
│   ├── components/       # UI & feature components
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utils, auth, prisma, validations
└── package.json
```

## Deployment Production

### Vercel + PlanetScale/Railway MySQL

1. Push ke GitHub
2. Import project di Vercel
3. Set environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (domain production)
   - `NEXTAUTH_SECRET`
4. Build command: `npx prisma migrate deploy && npm run build`
5. Deploy

### VPS (Ubuntu + PM2)

```bash
# Install Node, MySQL, Nginx
git clone <repo> /var/www/pos-toko
cd /var/www/pos-toko
npm ci
cp .env.example .env
# Edit .env dengan kredensial production

npx prisma migrate deploy
npm run db:seed
npm run build

npm install -g pm2
pm2 start npm --name pos-toko -- start
pm2 save
```

Nginx reverse proxy ke port 3000.

### Backup Database

```bash
mysqldump -u root -p pos_toko > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
mysql -u root -p pos_toko < backup_20260627.sql
```

## Scripts NPM

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Development server |
| `npm run build` | Build production |
| `npm run db:migrate` | Jalankan migrasi |
| `npm run db:seed` | Seed data demo |
| `npm run db:studio` | Prisma Studio GUI |

## Troubleshooting

**Error koneksi MySQL**: Pastikan MySQL Laragon running dan database `pos_toko` sudah dibuat.

**NextAuth error**: Pastikan `NEXTAUTH_SECRET` sudah di-set.

**Prisma client error**: Jalankan `npx prisma generate`.
