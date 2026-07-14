# AutoPost

AutoPost adalah aplikasi web Next.js untuk upload, menjadwalkan, dan publish konten ke Instagram Business melalui Meta Graph API. Aplikasi mendukung single image, carousel, dan Reels, lengkap dengan dashboard status publish, retry, logging, dan link live Instagram setelah publish berhasil.

## Fitur Utama

- Login admin sederhana dengan NextAuth Credentials.
- Settings koneksi Instagram: IG User ID, Page ID, access token, dan test connection.
- Compose post untuk single image, carousel 2-10 gambar, dan Reels.
- Drag & drop media, preview, validasi ukuran file, durasi video dasar, dan aspect ratio gambar 4:5 sampai 1.91:1.
- Publish sekarang atau schedule post.
- Scheduler untuk memproses post terjadwal lewat cron.
- Dashboard riwayat post dengan status, error message, retry, dan link live Instagram jika tersedia.
- Log request/response publish untuk debugging.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- NextAuth.js
- Vercel Blob
- Meta Graph API

## Prasyarat

- Node.js 20 atau lebih baru
- PostgreSQL database, misalnya Supabase atau Neon
- Vercel Blob token
- Meta App dengan permission Instagram Content Publishing
- Instagram Business Account dan Facebook Page yang sudah terhubung

## Setup Lokal

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari contoh:

```bash
cp .env.example .env
```

Di Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Isi environment variable di `.env`.

```env
DATABASE_URL=
NEXTAUTH_SECRET=
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=
ADMIN_PASSWORD_HASH=
NEXTAUTH_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=
META_APP_ID=
META_APP_SECRET=
ENCRYPTION_KEY=
CRON_SECRET=
APP_URL=http://localhost:3000
```

4. Generate Prisma Client:

```bash
npx prisma generate
```

5. Sinkronkan schema database:

```bash
npx prisma db push
```

6. Jalankan development server:

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`.

## Environment Variables

`DATABASE_URL`
: Connection string PostgreSQL untuk runtime. Jika memakai Supabase di Vercel, gunakan Transaction Pooler dengan format `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`. Jika password database berisi karakter khusus seperti `@`, `#`, `:`, `/`, atau `?`, encode dulu password-nya agar URL valid.

`DIRECT_URL`
: Connection string PostgreSQL direct untuk Prisma migration. Format Supabase: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`.

`NEXTAUTH_SECRET`
: Secret untuk NextAuth. Gunakan string random panjang.

`ADMIN_EMAIL`
: Email admin untuk login.

`ADMIN_PASSWORD_HASH`
: Hash password admin. Nilainya harus hash bcrypt, bukan plain text. Generate dengan `npm run hash-password -- password-baru`.

`ADMIN_PASSWORD`
: Password plain untuk development lokal. Untuk production, kosongkan ini dan gunakan `ADMIN_PASSWORD_HASH`.

`BLOB_READ_WRITE_TOKEN`
: Token Vercel Blob untuk upload media agar Meta bisa membaca file melalui URL publik.

`META_APP_ID` dan `META_APP_SECRET`
: Kredensial Meta App.

`ENCRYPTION_KEY`
: Key untuk enkripsi access token yang disimpan di database.

`CRON_SECRET`
: Secret untuk melindungi endpoint cron. Nilai yang sama harus dikirim oleh layanan cron eksternal sebagai header `Authorization: Bearer {CRON_SECRET}`.

`APP_URL`
: URL aplikasi, misalnya `http://localhost:3000` saat lokal atau domain production saat deploy.

## Workflow Publish

1. Admin login.
2. Buka Settings dan simpan IG User ID, Page ID, dan access token.
3. Buka Compose.
4. Pilih tipe post: Single Image, Carousel, atau Reels.
5. Upload atau drag & drop media.
6. Isi caption.
7. Pilih `Publish Now` atau `Schedule`.
8. File diupload ke Vercel Blob.
9. Backend membuat media container di Meta Graph API.
10. Untuk Reels, backend polling sampai container selesai diproses.
11. Backend publish container ke Instagram.
12. Dashboard menampilkan status dan link live Instagram jika permalink berhasil diambil.

## Menjalankan Scheduler

Endpoint cron ada di:

```text
/api/cron/publish-scheduled
```

Scheduler production tidak memakai Vercel Cron Jobs karena Vercel Hobby plan membatasi cron hanya 1x per hari. Gunakan layanan cron eksternal seperti cron-job.org yang gratis untuk memanggil endpoint ini secara berkala.

Setup di cron-job.org:

1. Buat akun di cron-job.org.
2. Buat cronjob baru.
3. Isi URL dengan `https://{domain-project}/api/cron/publish-scheduled`.
4. Set interval, rekomendasi setiap 5 menit.
5. Di bagian Advanced, tambahkan HTTP header `Authorization: Bearer {CRON_SECRET}` sesuai isi environment variable `CRON_SECRET` di project.

Test manual endpoint:

```bash
curl -X POST https://{domain-project}/api/cron/publish-scheduled -H 'Authorization: Bearer {CRON_SECRET}'
```

Jika nanti upgrade ke Vercel Pro, scheduler opsional bisa dipindah kembali ke Vercel Cron Jobs dengan menambahkan kembali konfigurasi `crons` di `vercel.json`.

Untuk worker lokal, gunakan:

```bash
npm run scheduler
```

## Script NPM

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run scheduler
npm run prisma:generate
npm run prisma:migrate
```

## Validasi Media

Image:
- Format: JPG, PNG, WebP
- Maksimal 8 MB
- Aspect ratio: 4:5 sampai 1.91:1

Carousel:
- 2 sampai 10 gambar
- Urutan preview menjadi urutan publish carousel

Reels:
- Format: MP4 atau MOV
- Maksimal 100 MB
- Durasi dasar: 3 detik sampai 15 menit

## Troubleshooting

### Prisma: invalid port number in database URL

Periksa `DATABASE_URL`. Jika password mengandung karakter khusus, ubah menjadi URL-encoded. Contoh:

```text
password p@ss:word
menjadi p%40ss%3Aword
```

### Prisma schema engine error saat `db push`

Pastikan `DATABASE_URL` valid dan database bisa diakses dari mesin lokal. Coba jalankan:

```bash
npx prisma validate
npx prisma generate
npx prisma db push
```

### Build Next.js gagal di Windows atau drive tertentu

Jika Turbopack gagal membuat junction/symlink, coba build dengan webpack:

```bash
npx next build --webpack
```

Jika masih gagal pada route dengan bracket seperti `[...nextauth]`, jalankan minimal:

```bash
npm run lint
npx tsc --noEmit
```

untuk validasi kode TypeScript dan linting.

## Struktur Project

```text
app/
  api/
  compose/
  login/
  settings/
components/
lib/
  meta/
  posts/
prisma/
scripts/
```

## Catatan Meta API

Instagram Content Publishing API membutuhkan URL media publik. Karena itu file lokal tidak dikirim langsung ke Meta, tetapi diupload dulu ke storage publik seperti Vercel Blob. Alur publish selalu dua tahap: create media container, lalu publish container.
