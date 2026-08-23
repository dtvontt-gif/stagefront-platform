# StageFront Karaoke Engine v2

This branch is the isolated foundation for StageFront's next-generation karaoke engine.

The full original StageFront platform is preserved on `karaoke-stage1-stable`. Do not merge this branch into Stage 1.

## Current foundation

- Versioned master project schema: `lib/karaoke-v2/project-schema.ts`
- Authenticated project and upload APIs under `/api/karaoke-v2`
- Private source-audio storage with ownership policies
- Project creation, immutable initial revision, job tracking, and asset records
- Sign-in and `/studio` upload experience
- Architecture audit: `docs/karaoke-v2-keep-replace-map.md`

## Supabase setup

1. Run `supabase/001_karaoke_v2_foundation.sql` in the Supabase SQL editor.
   If the foundation was installed before MP4-container support, also run `supabase/002_allow_mp4_source_video.sql`.
2. Copy `.env.example` to `.env.local` and provide the existing project's URL and anon key. These use the same `SUPABASE_URL` and `SUPABASE_ANON_KEY` names as Stage 1.
3. Ensure the intended StageFront users already exist in Supabase Auth.

## Local development

```bash
npm install
npm run dev
```

This milestone queues a preparation job after upload. It does not yet run vocal separation, transcription, alignment, or rendering.
