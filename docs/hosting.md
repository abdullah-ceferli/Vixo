# Hosting Vixo with your data on your PC

## Recommended setup for this project

Keep the GitHub repository as the source-code home. Run the full Vixo stack on your PC with Docker Compose. MySQL database `Vixo`, Redis queue data, uploaded originals, thumbnails, and HLS files are persisted in Docker volumes on your computer. A tunnel or another HTTPS ingress service provides the public address.

```text
GitHub repository ── pull source changes ──> Your PC
                                             │
Friends ── HTTPS address / tunnel ──> Vixo app :5173
                                             ├── MySQL database Vixo
                                             ├── Redis + FFmpeg worker
                                             └── media and upload volumes
```

GitHub stores the code, not the live database or videos. The network provider handles public traffic; it is not the primary persistent store for this local-storage configuration. Your PC, Docker, internet connection, and tunnel must be running for the site to work. Sleep, shutdown, or an internet outage makes the service unavailable even if the repository is online.

## Which hosting option fits?

| Option | Works with this repository as it is? | Persistent data location |
| --- | --- | --- |
| Your PC + Docker + an HTTPS ingress service | Yes | Your PC |
| GitHub Pages | No: static sites only; no Next.js server, MySQL, or worker | Does not host the backend |
| Vercel free functions | Not as configured: 4.5 MB function payload limit versus 8 MB upload chunks, plus a separate long-running worker and persistent media are required | Would require a redesign and external services |
| Render free web service | Not a complete deployment: free instances sleep and have no persistent disk; this stack also needs MySQL, Redis, and its worker | Would require separate persistent services |
| A paid Linux server with persistent storage | A suitable later deployment path | The server, unless you deliberately keep parts on your PC |

These provider facts are documented by [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Vercel Functions](https://vercel.com/docs/functions/limitations), and [Render](https://render.com/docs/free). Their plans and limits can change.

A free hosted frontend talking to a backend on your PC is possible, but this is currently one server-rendered Next.js application. Its pages query MySQL directly on the server, and the APIs use same-origin session cookies. Splitting it would require moving the UI to a client/API boundary, setting a stable backend address, and carefully handling cross-origin authentication. The PC would still need to stay on and stream every video. For this project, a split adds work without making the local data available when your PC is off.

## Environment files

- `.env.example` is a public template and belongs in GitHub.
- `.env` is the private, machine-specific configuration and is ignored by both Git and Docker's build context.
- Compose reads `.env` automatically. It derives the internal MySQL URL from `MYSQL_*` and supplies the rest of the settings to the app and worker.
- `DATABASE_URL` and `REDIS_URL` in the template are only used when running directly with `npm`, against separately configured host services. They do not expose or select the Windows MySQL instance when you use Docker.

On a fresh clone:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Choose unique database passwords before the first startup. Use URL-safe characters for `MYSQL_PASSWORD` because it is embedded into the application's connection URL. Never overwrite the existing PC's `.env` with new example credentials while reusing an initialized MySQL volume. Changing `.env` alone does not change MySQL's user password; password changes must be coordinated with the database.

## Run it and keep the data

```powershell
docker compose up -d --build
docker compose ps
```

Open `http://127.0.0.1:5173`. For an already built stack, `docker compose up -d` is enough; use `--build` after source changes.

`docker compose stop` pauses services while retaining the data. A normal `docker compose down` also retains named volumes. `docker compose down -v` removes the data volumes, so use that only for an intentional data reset.

The project name is fixed to `vixo` so cloning the code into a differently named directory does not accidentally select a new set of empty volumes on the same PC. Do not run two separate checkouts of the same Compose project concurrently.

Next.js page generation is limited to two build workers to reduce build-time RAM use on a personal computer. The video worker processes one video at a time by default. Docker's WSL VM overhead and file cache are separate from the containers' own memory measurements.

## Public address

### Quick Tunnel for testing

Once the local site works, run:

```powershell
cloudflared tunnel --url http://127.0.0.1:5173
```

Open and share the `https://...trycloudflare.com` address printed in the terminal. It changes after restart and works only while that tunnel process and your PC are running. Cloudflare describes [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) as a testing/development feature.

### Optional named Cloudflare Tunnel

The repository includes `compose.tunnel.yml` for a remotely managed tunnel. It does not create a Cloudflare account, domain, or public route for you.

1. Create a tunnel in your Cloudflare account. A published custom hostname requires a domain on Cloudflare.
2. Configure the published route to the internal Docker service `http://app:5173`, not `127.0.0.1:5173` (inside the tunnel container, localhost would mean the tunnel container).
3. Put the tunnel token in your ignored `.env` as `CLOUDFLARE_TUNNEL_TOKEN`. Do not paste it into GitHub or a tracked YAML file.
4. Set `NEXT_PUBLIC_APP_URL` to your real HTTPS hostname. For HTTPS-only use, set `SESSION_COOKIE_SECURE=true`.
5. Start the stack with the overlay:

   ```powershell
   docker compose -f docker-compose.yml -f compose.tunnel.yml up -d --build
   ```

The token stays in local configuration and the running container's environment. The optional tunnel service restarts with the stack; it does not move the database or videos away from your PC. See [Cloudflare's setup instructions](https://developers.cloudflare.com/tunnel/get-started/) for account-side steps.

### Video delivery is a separate hosting decision

Cloudflare's [CDN terms](https://www.cloudflare.com/service-specific-terms-application-services/#content-delivery-network-free-pro-or-business) restrict serving video and large files through the ordinary CDN without specified paid services. A named hostname is not permission for unlimited free video delivery. The included tunnel configuration is a connection option, not a guarantee that a particular video workload is allowed by your plan. Confirm the applicable plan before using this as a public video platform.

For a durable public deployment, use a host and video-delivery service that explicitly support your traffic. If all persistent data must stay on your PC, the ingress provider must permit that workload and your home upload bandwidth must support your viewers. Moving only the UI to a free provider does not remove those limits.

## Prepare and push the code to GitHub

The project includes a workflow that runs client generation, type checks, linting, tests, a production build, and Compose validation. It uses only test connection settings and does not connect to your home database. GitHub Actions is for checks, not a permanently running server.

Create an empty GitHub repository. Start with a private repository if you are still deciding what to publish. On this PC, initialize the local repository if needed:

```powershell
git init -b main
git status --short
git add .
git diff --cached --stat
```

Inspect the staged files before committing. `.env`, `.env.*` variants (except `.env.example`), `storage/`, `tmp/`, `backups/`, `data/`, `.cloudflared/`, logs, build files, and dependencies are ignored. The tracked example contains placeholders; real values belong only in `.env`.

Then commit, add the actual repository URL you created as the `origin` remote, and push `main`. A remote has not been configured or published by this preparation. After pulling future code changes, run `docker compose up -d --build` to rebuild and apply migrations while retaining the same local data volumes.

## Backups are separate from GitHub

Your code repository cannot restore user data or videos. Keep a database dump plus media and original-upload backups on a separate disk. For a simple backup, first wait until all processing finishes and no uploads are in progress, then pause the app and worker so the dump and files are consistent:

```powershell
New-Item -ItemType Directory -Path backups -Force
docker compose stop app worker
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --user="$MYSQL_USER" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' | Out-File -FilePath backups/Vixo.sql -Encoding utf8
docker compose cp app:/app/storage/. ./backups/media
docker compose cp worker:/app/tmp/. ./backups/uploads-and-processing
docker compose up -d
```

Check that the dump and copied folders exist, and test restoration in a separate environment before relying on them. The `backups/` folder is ignored by Git and Docker's build context; copy it off the PC for protection against disk failure. This simple procedure assumes there are no pending jobs; live queue/in-flight job backup requires a fuller snapshot procedure.
