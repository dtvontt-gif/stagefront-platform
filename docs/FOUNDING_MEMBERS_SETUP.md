# Founding Member Setup

## 1. Create the database table

1. Open the StageFront project in Supabase.
2. Open **SQL Editor**.
3. Create a new query.
4. Copy everything from `supabase/founding_members.sql`.
5. Run the query.

The included Row Level Security rules allow public registration but keep emails private. Only members who explicitly opt in are readable through the Wall of Founders endpoint.

## 2. Add local environment variables

Create `.env.local` in the root of `stagefront-platform`:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-publishable-key
```

Find both values in Supabase under **Project Settings → API**. Use the anon/publishable key, never the service-role key.

Restart `npm run dev` after saving `.env.local`.

## 3. Add Vercel environment variables

In the Vercel project:

1. Open **Settings → Environment Variables**.
2. Add `SUPABASE_URL`.
3. Add `SUPABASE_ANON_KEY`.
4. Apply them to Production, Preview, and Development.
5. Redeploy the project.

Never commit `.env.local` or private keys to GitHub.
