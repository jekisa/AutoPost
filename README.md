# AutoPost

AutoPost adalah aplikasi web Next.js untuk upload, menjadwalkan, publish, dan memantau engagement konten Instagram Business melalui Meta Graph API. Aplikasi mendukung single image, carousel, dan Reels, lengkap dengan kalender konten, scheduler eksternal, retry, logging, dashboard insights real-time, dan link live Instagram setelah publish berhasil.

## Fitur Utama

- Login admin sederhana dengan NextAuth Credentials.
- Settings koneksi Instagram: IG User ID, Page ID, access token, dan test connection.
- Compose Calendar bulanan untuk menjadwalkan konten dari tanggal yang dipilih.
- Modal compose untuk single image, carousel 2-10 gambar, dan Reels.
- Drag & drop media, preview, validasi ukuran file, durasi video dasar, dan aspect ratio gambar 4:5 sampai 1.91:1.
- Publish sekarang atau schedule post.
- Scheduler untuk memproses post terjadwal lewat cron.
- Dashboard engagement real-time dari Instagram Insights API untuk post yang sudah published.
- Post History table reusable dengan status, retry, pagination, dan link live Instagram.
- Log request/response publish untuk debugging.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- TanStack Table
- Recharts
- Mongoose
- MongoDB Atlas
- NextAuth.js
- Vercel Blob
- Meta Graph API

## Prasyarat

- Node.js 20 atau lebih baru
- MongoDB Atlas database
- Vercel Blob token
- Meta App dengan permission Instagram Content Publishing dan Instagram Insights (`instagram_manage_insights`)
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
MONGODB_URI=
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

4. Jalankan development server:

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`.

5. Opsional: isi data demo ke MongoDB untuk menguji UI.

```bash
npm run seed
```

## Environment Variables

`MONGODB_URI`
: Connection string MongoDB Atlas, misalnya `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/autopost?retryWrites=true&w=majority`.

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

`META_APP_ID` saat ini disiapkan untuk konfigurasi Meta App. Publish dan insights menggunakan access token yang disimpan dari halaman Settings.

`ENCRYPTION_KEY`
: Key untuk enkripsi access token yang disimpan di database.

`CRON_SECRET`
: Secret untuk melindungi endpoint cron. Nilai yang sama harus dikirim oleh layanan cron eksternal sebagai header `Authorization: Bearer {CRON_SECRET}`.

`APP_URL`
: URL aplikasi, misalnya `http://localhost:3000` saat lokal atau domain production saat deploy.

## Workflow Publish

1. Admin login.
2. Buka Settings dan simpan IG User ID, Page ID, dan access token.
3. Buka Compose Calendar.
4. Klik tombol `+` pada tanggal kalender atau `New Post`.
5. Pilih tipe post: Single Image, Carousel, atau Reels.
6. Upload atau drag & drop media.
7. Isi caption.
8. Pilih `Publish Now` atau `Schedule`.
9. File diupload ke Vercel Blob.
10. Backend membuat media container di Meta Graph API.
11. Untuk Reels, backend polling sampai container selesai diproses.
12. Backend publish container ke Instagram.
13. Dashboard menampilkan engagement dari Instagram Insights API untuk post yang sudah published.

## Dashboard Engagement

Dashboard utama (`/`) mengambil insight real-time dari Meta Graph API setiap dibuka melalui endpoint internal:

```text
/api/dashboard/engagement
```

Metric yang dipakai:

- Image/Carousel: `reach`, `likes`, `comments`, `saved`
- Reels: `reach`, `likes`, `comments`, `saved`, `plays`, `shares`

Catatan:

- Metric `impressions` tidak dipakai karena sudah deprecated/tidak tersedia untuk banyak akun dan versi Graph API.
- Post demo dengan `igMediaId` tidak valid akan di-skip dan ditampilkan sebagai data uji/demo, bukan sebagai error teknis.
- Pastikan token Meta punya permission `instagram_manage_insights`.

## Compose Calendar

Route `/compose` menampilkan kalender bulanan. Klik tanggal atau tombol `+` untuk membuka modal compose dengan tanggal schedule otomatis terisi. Pada mobile, kalender menampilkan dot status dan daftar post per tanggal dalam bottom sheet.

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
npm run seed
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

### MongoDB connection gagal

Periksa `MONGODB_URI`. Jika username atau password database berisi karakter khusus seperti `@`, `#`, `:`, `/`, atau `?`, encode dulu agar URI valid. Contoh:

```text
password p@ss:word
menjadi p%40ss%3Aword
```

Pastikan juga IP/network Vercel atau mesin lokal diizinkan oleh MongoDB Atlas Network Access.

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
hooks/
lib/
  meta/
  posts/
models/
public/
scripts/
```

## Catatan Database

Data access layer memakai Mongoose + MongoDB Atlas. Migrasi dari Prisma + PostgreSQL/Supabase dilakukan untuk menghindari kerumitan prepared statement dan pooler Supabase di lingkungan serverless seperti Vercel.

## Catatan Meta API

Instagram Content Publishing API membutuhkan URL media publik. Karena itu file lokal tidak dikirim langsung ke Meta, tetapi diupload dulu ke storage publik seperti Vercel Blob. Alur publish selalu dua tahap: create media container, lalu publish container.
