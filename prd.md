# PRD: Instagram Auto-Post App (AutoPost)

## 1. Ringkasan Produk

Aplikasi web berbasis **Next.js** untuk mengotomasi publish konten gambar, carousel, dan video/Reels ke akun Instagram Business melalui **Instagram Content Publishing API** (Meta Graph API). Target pengguna awal: internal Nvolve dan akun-akun yang dikelola, dengan kemungkinan ekspansi ke multi-akun untuk klien digital agency Nvolve di masa depan.

## 2. Latar Belakang & Konteks Teknis

- Meta App: **AutoPost**, tipe app: Business.
- Instagram Business Account dan Facebook Page harus sudah terhubung.
- Permission yang dibutuhkan: `pages_show_list`, `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`.
- Alur publish Instagram selalu 2 tahap: **create media container** (`POST /{ig-user-id}/media`) lalu **publish** (`POST /{ig-user-id}/media_publish`).
- `image_url` / `video_url` yang dikirim ke Meta harus URL publik yang bisa diakses dari internet.
- Rate limit Meta: maksimum 25 post per akun IG per 24 jam.
- Reels/video butuh polling status container (`status_code`) sampai `FINISHED` sebelum bisa publish.

## 3. Tujuan

1. Pengguna bisa upload gambar/carousel/video dari browser, tulis caption, lalu publish ke Instagram tanpa buka Meta Business Suite.
2. Mendukung scheduled post, tidak hanya publish instan.
3. Menyimpan riwayat post dan log beserta status untuk audit dan retry.
4. Arsitektur siap untuk multi-akun IG di masa depan, meski versi awal cukup 1 akun.

## 4. Non-Goals

- Tidak membangun fitur analytics/insight mendalam.
- Tidak mendukung platform lain di versi ini.
- Tidak membangun App Review submission untuk akses akun klien eksternal.

## 5. User Flow Utama

1. Admin login ke aplikasi.
2. Admin menyimpan access token Meta dan IG User ID di Settings.
3. Admin membuat post baru, upload media, isi caption, lalu pilih publish sekarang atau jadwalkan.
4. Backend upload file ke storage publik, membuat media container, melakukan polling bila video, lalu publish.
5. Dashboard menampilkan status, error, retry, dan link live Instagram bila tersedia.

## 6. Fitur Detail

### 6.1 Dashboard
- List semua post: thumbnail, caption, status, waktu.
- Filter by status.

### 6.2 Compose / New Post
- Upload media, preview sebelum submit.
- Validasi ukuran dan tipe file.
- Caption editor dengan limit 2200 karakter.
- Pilihan jenis post: Single Image, Carousel, atau Reels.
- Tombol Publish Now atau Schedule.

### 6.3 Scheduler
- Simpan scheduled post ke database dengan `scheduledAt`.
- Layanan cron eksternal (cron-job.org atau setara) atau node-cron cek setiap beberapa menit, lalu eksekusi post yang waktunya sudah lewat dan belum di-publish.
- Vercel Cron Jobs tidak dipakai di Hobby plan karena frekuensinya dibatasi 1x per hari.
- Retry otomatis 1x jika gagal karena rate limit atau error sementara, lalu tandai `FAILED` jika tetap gagal.

### 6.4 Settings / Connection
- Form untuk input dan simpan IG User ID, Page ID, dan access token.
- Tombol Test Connection memanggil Meta Graph API untuk verifikasi token.
- Access token disimpan terenkripsi.

### 6.5 Riwayat & Logging
- Setiap aksi publish dicatat sebagai PublishLog.
- Log menyimpan request payload tanpa token, response Meta, timestamp, dan status.

## 7. Arsitektur Teknis

- **Framework**: Next.js App Router, TypeScript.
- **Styling**: Tailwind CSS.
- **Database**: MongoDB Atlas.
- **ODM**: Mongoose.
- **Alasan migrasi database**: Migrasi dari Prisma + PostgreSQL/Supabase dilakukan untuk menghindari kerumitan koneksi pooler Supabase dan prepared statement di lingkungan serverless seperti Vercel.
- **File storage**: Vercel Blob atau Cloudinary untuk menyediakan URL publik yang dibutuhkan Meta API.
- **Scheduler**: Layanan cron eksternal (cron-job.org atau setara) memanggil API route `/api/cron/publish-scheduled` secara periodik.
- **Auth**: NextAuth.js Credentials, single-user cukup untuk v1.
- **Integrasi Meta**: Wrapper service `lib/meta/instagram.ts`.

## 8. Data Model

```text
Post {
  _id: ObjectId
  caption: string
  mediaType: IMAGE | CAROUSEL | REELS
  status: DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | FAILED
  scheduledAt: datetime?
  publishedAt: datetime?
  igMediaId: string?
  instagramPermalink: string?
  errorMessage: string?
  mediaAssets: MediaAsset[] // embedded
  createdAt, updatedAt
}

MediaAsset {
  _id: ObjectId
  url: string
  order: number
  type: IMAGE | VIDEO
  createdAt, updatedAt
}

IgAccount {
  _id: ObjectId
  igUserId: string
  pageId: string
  username: string?
  accessToken: string // encrypted
  tokenExpiresAt: datetime?
  createdAt, updatedAt
}

PublishLog {
  _id: ObjectId
  postId: ObjectId?
  action: string
  request: object?
  response: object?
  status: success | failed
  createdAt
}
```

## 9. Environment Variables

```env
MONGODB_URI=
NEXTAUTH_SECRET=
BLOB_READ_WRITE_TOKEN=
META_APP_ID=
META_APP_SECRET=
ENCRYPTION_KEY=
CRON_SECRET=
APP_URL=
```

## 10. Keamanan

- Access token Meta wajib dienkripsi saat disimpan di database.
- Jangan pernah expose access token ke client-side/browser.
- Validasi ukuran dan tipe file saat upload.
- Rate limit internal sederhana selaras dengan limit 25 post/24 jam dari Meta.

## 11. Milestone / Fase Pengerjaan

**Fase 1 - Setup & Koneksi**
- Setup project Next.js + Mongoose + MongoDB Atlas.
- Halaman Settings untuk simpan IG User ID dan token, tombol test connection.

**Fase 2 - Publish Instan**
- Upload gambar ke storage publik, create container, lalu publish.
- Halaman riwayat post dasar.

**Fase 3 - Carousel & Video/Reels**
- Support multi-image carousel.
- Support video dengan polling status container.

**Fase 4 - Scheduler**
- Simpan scheduled post + eksekusi via layanan cron eksternal (cron-job.org atau setara).
- Notifikasi/status update otomatis.

**Fase 5 - Polish**
- Error handling lebih baik.
- UI/UX refinement.

## 12. Open Questions

- Apakah butuh multi-user login atau cukup single admin di v1?
- Storage pilihan: Vercel Blob vs Cloudinary.
- Perlu notifikasi saat post gagal publish?
- Apakah caption generator berbasis AI masuk scope berikutnya?

## 13. Referensi API Meta

```text
POST /{ig-user-id}/media
  image_url | video_url
  caption
  media_type
  children

POST /{ig-user-id}/media_publish
  creation_id

GET /{container-id}?fields=status_code
```
