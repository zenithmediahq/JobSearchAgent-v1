# Job Search Agent v0 Rebuild

This is a v0-generated Next.js rebuild of the Job Search Agent app.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL
- Vercel AI SDK
- JSearch/RapidAPI fallback mock jobs

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in Supabase keys:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the SQL file in Supabase:

```text
scripts/001_create_tables.sql
```

5. Optional API keys:

```env
RAPIDAPI_KEY=your_rapidapi_key_for_jsearch
OPENAI_API_KEY=your_openai_key
```

Without `RAPIDAPI_KEY`, the job search route returns mock jobs.

6. Run locally:

```bash
pnpm dev
```

7. Check build:

```bash
pnpm build
```

## Current status

This is not the final product yet. It is a UI/auth/database foundation.

Known gaps compared to the original Python app:

- No Platsbanken / JobTech integration yet
- No real CV file upload parsing yet
- No ATS scanner yet
- No application pack generator yet
- No CSV export yet
- Job search is still generic/mock unless JSearch is configured

## First stabilization fixes applied

- Removed duplicated JSX in `components/job-card.tsx`
- Fixed duplicated conditional JSX in `app/dashboard/tools/page.tsx`
- Fixed interview question request body to include CV text
- Fixed interview feedback request body to match the backend schema
- Added `.env.example`
- Added this setup README
