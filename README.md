# Vixo

Vixo is a self-hosted video-sharing platform built with Next.js, TypeScript, Prisma, **MySQL database `Vixo`**, Redis/BullMQ, FFmpeg, HLS.js, and a configurable local/S3 storage layer. It provides real accounts, channels, resumable uploads, adaptive HLS processing, protected playback, search, reactions, comments, subscriptions, playlists, history, notifications, and a creator studio.

## Architecture

```text
Browser / friends via Cloudflared
              │
              ▼
Next.js on 127.0.0.1:5173 ─── MySQL (Vixo metadata)
       │              │
       │              └────── Redis / BullMQ
       │                         │
       │                         ▼
       └── protected media ◄── FFmpeg worker
                 │              │
                 └── local filesystem or S3/MinIO
```

Uploaded files are sent sequentially in 8 MB chunks instead of being buffered as one huge request. A worker probes the source, chooses only non-upscaled renditions from 144p through 2160p, encodes H.264/AAC HLS with aligned four-second segments, creates a master playlist and thumbnail, verifies the stored outputs, and only then marks the video ready.

## Recommended setup: Docker Desktop

Docker is the easiest option because the app, worker, MySQL, Redis, and FFmpeg versions stay consistent.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and make sure it is running.
2. On a new checkout, create your private configuration file:

   ```powershell
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

   Set `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` before creating a new database. If the database is already initialized, keep its existing credentials: editing `.env` alone does not update MySQL's stored password. The current PC's `.env` has already been created with its existing credentials.

3. From this directory, start Vixo:

   ```powershell
   docker compose up -d --build
   ```

4. Open [http://127.0.0.1:5173](http://127.0.0.1:5173).
5. Register, create a channel, and upload a video. The worker progress appears in Creator Studio.

MySQL is initialized with the database name `Vixo`. Persistent Docker volumes hold database data, Redis state, upload files, and encoded media across restarts.

Docker MySQL uses port `3306` only inside the Compose network; it does not reserve your computer's port `3306`. An existing Windows MySQL installation can run alongside it. To inspect startup logs, run `docker compose logs -f`.

The same applies to Redis: it is reachable by Vixo's containers, but is not published to your network. Compose reads settings from `.env` and constructs the internal database connection; the `DATABASE_URL` and `REDIS_URL` entries in the example are for a separate native `npm` setup.

## GitHub and hosting

For the current goal, keep the code in GitHub and run the app, database, video worker, and media storage on your PC. The hosting guide explains the distinction between a GitHub repository and a running server, the limits of free hosting, optional named tunnels, and backups: [Hosting Vixo](docs/hosting.md).

`.env`, media, temporary uploads, database backups, and tunnel credentials are excluded from Git. GitHub Actions runs the project's checks on code changes; it does not run your website or connect to your PC's database.

### Share it with friends through Cloudflared

With Vixo running, open another PowerShell window and run exactly:

```powershell
cloudflared tunnel --url http://127.0.0.1:5173
```

Cloudflared prints a temporary `https://…trycloudflare.com` URL. Share that HTTPS URL with your friends. Vixo validates mutation origins against the forwarded tunnel hostname, so registration, comments, uploads, and other signed-in actions work through the tunnel. Quick Tunnels are a development/testing feature, not a promise of permanent free video hosting. See the [hosting guide](docs/hosting.md) before choosing a public video-delivery service.

Important operational notes:

- A Quick Tunnel is temporary; its URL changes when Cloudflared restarts.
- Anyone with the URL can reach the registration page. Use a named Cloudflare Tunnel with Access policies if you need an invite-only deployment.
- Do not publish MySQL (`3306`), Redis (`6379`), MinIO (`9000`), or the MinIO console to the public internet. Only tunnel port `5173`.
- For continued public use, change all example passwords and use a named tunnel/domain.

## Local setup without Docker

Requirements: Node.js 22+, MySQL 8+, Redis 7+, FFmpeg/FFprobe on PATH.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run dev
```

In a second terminal:

```powershell
npm run worker
npm run cleanup:uploads
```

Run `npm run cleanup:uploads` periodically (for example from Task Scheduler or cron) to remove abandoned temporary uploads after their 24-hour expiry.

The default development URL is `http://127.0.0.1:5173`. The default database URL is:

```text
mysql://vixo:vixo_password@localhost:3306/Vixo
```

Create that database/user first if you are not using Docker.

## Configuration

Copy `.env.example` to `.env` on a new checkout and change values for your environment. Keep `.env` private. Docker Compose uses `MYSQL_*` for the database and overrides the host-based URLs with internal service addresses.

| Variable | Purpose |
| --- | --- |
| `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Docker database initialization and connection; database is `Vixo` |
| `DATABASE_URL` | MySQL connection for native `npm` execution outside Docker |
| `REDIS_URL` | Redis connection for native `npm` execution outside Docker |
| `SESSION_COOKIE_SECURE` | Set `true` for a permanent HTTPS-only public hostname |
| `MAX_UPLOAD_BYTES` | Maximum declared upload size; default 10 GB |
| `UPLOAD_CHUNK_BYTES` | Browser upload chunk size; default 8 MB |
| `VIDEO_CRF` / `VIDEO_PRESET` | H.264 quality/speed controls |
| `HLS_SEGMENT_SECONDS` | HLS segment length; default 4 seconds |
| `DELETE_SOURCE_AFTER_TRANSCODE` | Remove original only after output verification |
| `STORAGE_DRIVER` | `local` or `s3` |
| `LOCAL_STORAGE_PATH` | Encoded media directory for local storage |
| `S3_*` | S3-compatible endpoint, bucket, and credentials |
| `CLOUDFLARE_TUNNEL_TOKEN` | Optional named tunnel; consumed only by `compose.tunnel.yml` |

To use the bundled MinIO service, run `docker compose --profile s3 up --build`, create the `vixo` bucket in the MinIO console, and set the app/worker storage environment to `s3`. In production, keep the bucket private: media is served through Vixo's authorization route so guessing a private playlist URL is insufficient.

## Useful commands

```powershell
npm run typecheck
npm test
npm run lint
npm run build
npm run db:migrate
npm run worker
```

## Security and media behavior

- Passwords use bcrypt with cost 12; sessions are opaque random tokens stored hashed in MySQL and sent in HTTP-only, same-site cookies.
- Mutations enforce same-origin checks compatible with a forwarded Cloudflared hostname.
- Uploads enforce declared size limits, allowed MIME types, and server-side file-signature detection.
- Media object keys reject traversal, and private videos require the owner's active session on every manifest/segment request.
- View counting de-duplicates the same anonymous viewer/video for 30 minutes.
- User comment HTML is stripped; React escapes rendered profile and video text.
- Auth endpoints have Redis-backed rate limits with an in-process fallback.
- Video state and storage records become `READY` only after HLS outputs are uploaded and verified.

For a durable public deployment, add HTTPS at the edge, strong secrets, database backups, central logging, Redis persistence, S3 lifecycle rules, and a Cloudflare Access or application invite policy appropriate to your audience.
