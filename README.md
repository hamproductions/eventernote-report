# Eventernote Reports ✨

Comprehensive reporting and analytics for Eventernote attendance data built with Elysia + React.

**Status:** ✅ MVP COMPLETE - Backend, Database, Crawler, and Basic Frontend operational

## Tech Stack

- **Backend:** Elysia (Bun runtime)
- **Frontend:** React 19 + Vike (SSR)
- **Database:** PostgreSQL + Drizzle ORM
- **Styling:** PandaCSS + Park UI
- **State:** TanStack Query

## Prerequisites

- [Bun](https://bun.sh) installed
- PostgreSQL database (local or cloud)
- Your Eventernote user ID

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/eventernote_reports
```

### 3. Set Up Database

```bash
# Generate migration
bun run db:generate

# Run migration
bun run db:migrate

# Optional: Open Drizzle Studio
bun run db:studio
```

### 4. Generate PandaCSS

```bash
bunx panda codegen
```

## Development

```bash
bun dev
```

Server runs at `http://localhost:3000`

## Build

```bash
bun run build
```

Generates:
- `dist/` - Frontend bundle
- `build/server` - Compiled server binary

## Production

```bash
bun run start:prod
```

## API Endpoints

### Get User Events
```
GET /api/events/user/:userId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

### Get Artist Statistics
```
GET /api/stats/artists/:userId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=1000
```

### Get Venue Statistics
```
GET /api/stats/venues/:userId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=1000
```

### Health Check
```
GET /health
```

## Project Structure

```
src/
├── server/           # Backend (Elysia)
│   ├── crawlers/     # Eventernote crawlers
│   ├── routes/       # API routes
│   └── utils/        # Utilities
├── pages/            # Frontend (Vike)
├── components/       # React components
└── shared/           # Shared types/utils
```

## License

MIT
