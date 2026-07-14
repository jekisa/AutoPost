# PRD: Instagram Auto-Post App (AutoPost)

## 1. Ringkasan Produk

Aplikasi web berbasis **Next.js** untuk mengotomasi publish konten (gambar, carousel, video/reels) ke akun Instagram Business melalui **Instagram Content Publishing API** (Meta Graph API). Target pengguna awal: internal Nvolve dan akun-akun yang dikelola (misal `jekisauwani`), dengan kemungkinan ekspansi ke multi-akun untuk klien digital agency Nvolve di masa depan.

## 2. Latar Belakang & Konteks Teknis (sudah tervalidasi)

- Meta App: **AutoPost**, tipe app: Business.
- Facebook Page: **Jeki Sauwani** — Page ID: `2017706798289689`
- Instagram Business Account: **jekisauwani** — IG User ID: `17841404036265557`
- Permission yang sudah disetujui: `pages_show_list`, `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
- Alur publish Instagram selalu 2 tahap: **create media container** (`POST /{ig-user-id}/media`) lalu **publish** (`POST /{ig-user-id}/media_publish`).
- `image_url` / `video_url` yang dikirim ke Meta **harus URL publik** yang bisa diakses dari internet (tidak bisa upload file lokal langsung) — aplikasi butuh storage/hosting perantara (misal Vercel Blob, S3, atau Cloudinary) sebelum panggil API Meta.
- Rate limit Meta: maksimum 25 post per akun IG per 24 jam.
- Reels/video butuh polling status container (`status_code`) sampai `FINISHED` sebelum bisa publish.

## 3. Tujuan (Goals)

1. Pengguna bisa upload gambar/carousel/video dari browser, tulis caption, lalu publish ke Instagram tanpa buka Meta Business Suite.
2. Mendukung **jadwal publish** (scheduled post), tidak hanya publish instan.
3. Menyimpan riwayat post (log) beserta status (draft, scheduled, published, failed) untuk keperluan audit dan retry.
4. Arsitektur siap untuk multi-akun IG di masa depan (multi-tenant), meski versi awal cukup 1 akun.

## 4. Non-Goals (di luar scope v1)

- Tidak membangun fitur analytics/insight mendalam (likes, reach, dsb) — cukup status publish.
- Tidak mendukung platform lain (TikTok, Threads, dll) di versi ini — fokus IG saja.
- Tidak membangun App Review submission untuk akses akun klien eksternal (masih single-owner token).

## 5. User Flow Utama

1. **Login** — Admin login ke aplikasi (auth sederhana, lihat §8).
2. **Connect Instagram** — Simpan/kelola access token Meta (long-lived token) dan IG User ID di halaman Settings.
3. **Buat Post Baru**:
   - Upload 1 gambar / beberapa gambar (carousel) / 1 video.
   - Tulis caption (dengan hashtag helper opsional).
   - Pilih: Publish sekarang / Jadwalkan (pilih tanggal & jam).
4. **Proses Backend**:
   - File di-upload ke storage publik → dapat URL publik.
   - Jika publish sekarang: langsung create container → (jika video, poll status) → publish.
   - Jika dijadwalkan: simpan job ke queue/cron, dieksekusi saat waktunya tiba.
5. **Riwayat & Status** — Halaman daftar post dengan status dan link ke post live di Instagram (jika sukses) atau pesan error (jika gagal).

## 6. Fitur Detail

### 6.1 Dashboard
- List semua post: thumbnail, caption (dipotong), status (`draft`/`scheduled`/`published`/`failed`), waktu.
- Filter by status.

### 6.2 Compose / New Post
- Upload media (drag & drop), preview sebelum submit.
- Validasi: aspect ratio & ukuran sesuai requirement Instagram (foto: 4:5 s/d 1.91:1; video/reels: durasi & format sesuai spesifikasi Meta — validasi dasar saja, tidak perlu 100% strict di v1).
- Caption editor dengan counter karakter (limit 2200 karakter Instagram).
- Pilihan jenis post: Single Image / Carousel (2–10 media) / Reels (video).
- Tombol "Publish Now" atau "Schedule".

### 6.3 Scheduler
- Simpan scheduled post ke database dengan `scheduled_at`.
- Cron job / background worker lewat layanan cron eksternal (cron-job.org atau setara) atau node-cron cek setiap beberapa menit, eksekusi post yang waktunya sudah lewat dan belum di-publish. Vercel Cron Jobs tidak dipakai di deployment Hobby plan karena frekuensinya dibatasi 1x per hari.
- Retry otomatis 1x jika gagal karena rate limit atau error sementara, lalu tandai `failed` jika tetap gagal.

### 6.4 Settings / Connection
- Form untuk input & simpan: IG User ID, Page ID, Access Token (long-lived).
- Tombol "Test Connection" → panggil `GET /{ig-user-id}?fields=id,username,name` untuk verifikasi token masih valid.
- Indikator masa berlaku token (long-lived token Meta ~60 hari) + reminder untuk refresh.

### 6.5 Riwayat & Logging
- Setiap aksi publish dicatat: request payload (tanpa token), response dari Meta, timestamp, status.
- Untuk debugging saat publish gagal (misal error Meta API code/message ditampilkan apa adanya ke admin).

## 7. Arsitektur Teknis

- **Framework**: Next.js (App Router), TypeScript.
- **Styling**: Tailwind CSS.
- **Database**: PostgreSQL (misal via Supabase atau Neon) — tabel: `posts`, `media_assets`, `settings`/`ig_accounts`.
- **ORM**: Prisma.
- **File storage**: Vercel Blob atau Cloudinary (untuk dapat URL publik yang dibutuhkan Meta API).
- **Scheduler**: Layanan cron eksternal (cron-job.org atau setara) memanggil API route `/api/cron/publish-scheduled` secara periodik. Alasan: Vercel Hobby plan membatasi frekuensi Vercel Cron Jobs menjadi 1x per hari, sehingga kurang presisi untuk scheduled post.
- **Auth**: NextAuth.js (credential sederhana atau login via email, single-user cukup untuk v1).
- **Integrasi Meta**: Wrapper service `lib/meta/instagram.ts` berisi fungsi:
  - `createMediaContainer(igUserId, { imageUrl | videoUrl, caption, mediaType })`
  - `checkContainerStatus(containerId)`
  - `publishContainer(igUserId, creationId)`
  - `getAccountInfo(igUserId)`

## 8. Data Model (draf)

```
Post {
  id
  caption
  mediaType: IMAGE | CAROUSEL | REELS
  status: DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | FAILED
  scheduledAt: datetime?
  publishedAt: datetime?
  igMediaId: string?      // hasil dari media_publish
  errorMessage: string?
  createdAt, updatedAt
}

MediaAsset {
  id
  postId (FK)
  url            // URL publik hasil upload storage
  order          // urutan untuk carousel
  type: IMAGE | VIDEO
}

IgAccount {
  id
  igUserId
  pageId
  username
  accessToken     // simpan terenkripsi
  tokenExpiresAt
}
```

## 9. Environment Variables

```
DATABASE_URL=
NEXTAUTH_SECRET=
BLOB_READ_WRITE_TOKEN=          # atau kredensial Cloudinary
META_APP_ID=
META_APP_SECRET=
ENCRYPTION_KEY=                 # untuk enkripsi access token di DB
```

## 10. Keamanan

- Access token Meta **wajib dienkripsi** saat disimpan di database (bukan plaintext).
- Jangan pernah expose access token ke client-side / browser — semua panggilan ke Graph API dilakukan dari server (API routes / server actions).
- Validasi ukuran & tipe file saat upload untuk mencegah abuse storage.
- Rate limit internal sederhana untuk mencegah spam publish (selaras dengan limit 25 post/24 jam dari Meta).

## 11. Milestone / Fase Pengerjaan

**Fase 1 — Setup & Koneksi**
- Setup project Next.js + Prisma + database.
- Halaman Settings untuk simpan IG User ID & token, tombol test connection.

**Fase 2 — Publish Instan (single image)**
- Upload gambar → storage publik → create container → publish.
- Halaman riwayat post dasar.

**Fase 3 — Carousel & Video/Reels**
- Support multi-image carousel.
- Support video dengan polling status container.

**Fase 4 — Scheduler**
- Simpan scheduled post + eksekusi via layanan cron eksternal (cron-job.org atau setara), bukan Vercel Cron Jobs pada Hobby plan karena limit frekuensi 1x per hari.
- Notifikasi/status update otomatis.

**Fase 5 — Polish**
- Error handling lebih baik (pesan error Meta diterjemahkan ke bahasa yang jelas).
- UI/UX refinement, dark mode (opsional, selaras gaya portfolio Next.js sebelumnya).

## 12. Open Questions (untuk diputuskan sebelum/selama development)

- Apakah butuh multi-user login (untuk tim Nvolve) atau cukup single admin di v1?
- Storage pilihan: Vercel Blob vs Cloudinary — tergantung budget & preferensi.
- Perlu notifikasi (email/WhatsApp) saat post gagal publish?
- Apakah caption generator berbasis AI (misal draft otomatis dari brief) masuk scope v1 atau fase berikutnya?

## 13. Referensi API Meta (untuk implementasi)

```
POST /{ig-user-id}/media
  image_url | video_url
  caption
  media_type (REELS untuk video, kosongkan untuk single image, CAROUSEL_ITEM untuk item carousel)
  children (khusus parent carousel: array of container IDs)

POST /{ig-user-id}/media_publish
  creation_id

GET /{container-id}?fields=status_code
  // untuk polling video: IN_PROGRESS -> FINISHED / ERROR
```
