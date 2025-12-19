# innobi FlowCore (Lite Mode)

A self-hosted, scalable automation platform similar to n8n.
Currently configured for **Lite Mode** (SQLite + In-Memory Queue) for easy local development without Docker.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   npm run build --workspace=@automation/shared
   ```

2. **Setup Database**
   ```bash
   npx prisma db push --schema=apps/api/prisma/schema.prisma
   npx ts-node apps/api/prisma/seed.ts
   ```

3. **Run Application**
   ```bash
   # Runs both API and Web concurrently
   npm run dev
   ```

4. **Login**
   - [http://localhost:3000](http://localhost:3000)
   - Admin: `admin@example.com` / `Admin123!`
   - User: `user@example.com` / `User123!`

## Architecture

- **Frontend**: Next.js 14, Tailwind, Shadcn UI, React Flow
- **Backend**: Express, Memory Queue (Mock BullMQ), Prisma, SQLite
- **Security**: AES-256 Encryption, JWT Auth

## Switching to Production (Docker)

To switch back to Postgres/Redis:
1. Ensure Docker Desktop is running.
2. Edit `.env` to set `USE_REDIS=true` and `DATABASE_URL` to Postgres connection.
3. Edit `apps/api/prisma/schema.prisma` provider to `postgresql`.
4. Run `docker compose up --build`.
