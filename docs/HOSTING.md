# Panduan Hosting POS Toko

Panduan deploy aplikasi **POS Toko Plastik & Bahan Kue** ke internet (production).

**Repository:** https://github.com/teenyclaw/pos-toko

---

## Persyaratan Production

| Komponen | Versi |
|----------|-------|
| Node.js | 20 LTS atau lebih baru |
| MySQL | 8.0+ |
| RAM server | Minimal 1 GB (disarankan 2 GB) |

Environment variables wajib:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/nama_database"
NEXTAUTH_URL="https://domain-anda.com"
NEXTAUTH_SECRET="string-random-minimal-32-karakter"
NEXT_PUBLIC_APP_NAME="POS Toko Plastik & Bahan Kue"
NEXT_PUBLIC_APP_URL="https://domain-anda.com"
```

Generate secret aman:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Opsi 1: Vercel + MySQL Cloud (Paling Mudah)

Cocok untuk toko kecil–menengah tanpa mengelola server sendiri.

### Langkah 1 — Siapkan database MySQL

Pilih salah satu provider MySQL managed:

- [Railway](https://railway.app) — MySQL plugin
- [Aiven](https://aiven.io) — MySQL free tier
- VPS MySQL sendiri (lihat Opsi 2)

Buat database, catat connection string format:

```
mysql://user:password@host.railway.app:3306/railway
```

### Langkah 2 — Push ke GitHub

```bash
git clone https://github.com/teenyclaw/pos-toko.git
cd pos-toko
# ... edit .env lokal jika perlu ...
git push origin master
```

### Langkah 3 — Import ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New Project**
2. Import repo `teenyclaw/pos-toko`
3. Framework: **Next.js** (auto-detect)
4. **Environment Variables** — tambahkan semua variabel di atas
5. **Build Command:**

```bash
npx prisma generate && npx prisma migrate deploy && npm run build
```

6. **Install Command:** `npm ci`
7. Klik **Deploy**

### Langkah 4 — Seed data (sekali)

Jalankan dari komputer lokal dengan `DATABASE_URL` production:

```bash
set DATABASE_URL=mysql://...
npm run db:seed
```

Atau gunakan Prisma Studio / phpMyAdmin untuk insert user manual.

### Catatan Vercel

- Pastikan `NEXTAUTH_URL` = URL production exact (dengan `https://`)
- Region Vercel pilih yang dekat user (Singapore untuk Indonesia)
- Backup database rutin via provider MySQL

---

## Opsi 2: VPS (Ubuntu + Nginx + PM2)

Cocok jika ingin kontrol penuh. Contoh: DigitalOcean, Vultr, IDCloudHost, Niagahoster VPS.

### 1. Persiapan server

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Nginx & PM2
sudo apt install -y nginx
sudo npm install -g pm2
```

### 2. Buat database MySQL

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE pos_toko CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'password_kuat_anda';
GRANT ALL PRIVILEGES ON pos_toko.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Clone & build aplikasi

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/teenyclaw/pos-toko.git
cd pos-toko

cp .env.example .env
nano .env   # isi DATABASE_URL, NEXTAUTH_*, NEXT_PUBLIC_*
```

Isi `.env` production:

```env
DATABASE_URL="mysql://pos_user:password_kuat_anda@localhost:3306/pos_toko"
NEXTAUTH_URL="https://pos.domain-anda.com"
NEXTAUTH_SECRET="..."
NEXT_PUBLIC_APP_NAME="POS Toko Plastik & Bahan Kue"
NEXT_PUBLIC_APP_URL="https://pos.domain-anda.com"
```

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run build
```

### 4. Jalankan dengan PM2

```bash
pm2 start npm --name pos-toko -- start
pm2 save
pm2 startup   # ikuti instruksi yang muncul
```

Cek status:

```bash
pm2 status
pm2 logs pos-toko
```

### 5. Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/pos-toko
```

```nginx
server {
    listen 80;
    server_name pos.domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pos-toko /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL (HTTPS) dengan Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pos.domain-anda.com
```

Setelah SSL aktif, update `.env`:

```env
NEXTAUTH_URL="https://pos.domain-anda.com"
NEXT_PUBLIC_APP_URL="https://pos.domain-anda.com"
```

Restart app:

```bash
pm2 restart pos-toko
```

---

## Opsi 3: Laragon + Akses LAN (Development / Toko Lokal)

Untuk kasir di jaringan WiFi toko yang sama:

1. Jalankan `npm run dev` atau `start-dev.bat`
2. Buka dari perangkat lain: `http://IP-KOMPUTER:3000`
3. Pastikan firewall Windows mengizinkan port 3000

**Production di LAN:** gunakan `npm run build && npm start` (lebih cepat dari dev mode).

---

## Update Aplikasi (Setelah Deploy)

```bash
cd /var/www/pos-toko   # atau folder project
git pull origin master
npm ci
npx prisma migrate deploy
npm run build
pm2 restart pos-toko     # jika pakai PM2
```

Di Vercel: push ke GitHub → deploy otomatis.

---

## Backup & Restore

### Backup via aplikasi (Owner)

Menu **Pengaturan** → **Unduh Backup JSON** (data aplikasi).

### Backup database MySQL

```bash
mysqldump -u pos_user -p pos_toko > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
mysql -u pos_user -p pos_toko < backup_20260628.sql
```

---

## Checklist Sebelum Go-Live

- [ ] Ganti password demo (`owner@toko.com`, dll.) atau hapus user demo
- [ ] `NEXTAUTH_SECRET` unik & panjang (min. 32 karakter)
- [ ] `NEXTAUTH_URL` sesuai domain HTTPS
- [ ] Database backup otomatis dijadwalkan
- [ ] SSL/HTTPS aktif
- [ ] Test login, transaksi POS, dan cetak struk
- [ ] Migrasi database: `npx prisma migrate deploy`

---

## Troubleshooting Hosting

| Masalah | Solusi |
|---------|--------|
| Login loop / session hilang | Pastikan `NEXTAUTH_URL` exact match domain (http vs https) |
| Error Prisma di build | Tambahkan `npx prisma generate` sebelum build |
| 502 Bad Gateway (Nginx) | Cek `pm2 status`, pastikan app listen port 3000 |
| Lambat di dev | Gunakan `npm run build && npm start` untuk production |
| MySQL connection refused | Cek firewall, host DB, dan format `DATABASE_URL` |

---

## Akun Demo (Development)

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@toko.com | password |
| Kasir | kasir@toko.com | password |
| Gudang | gudang@toko.com | password |

**Jangan gunakan password demo di production.**
