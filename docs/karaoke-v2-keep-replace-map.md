# StageFront Karaoke Engine v2: keep/replace map

Baseline: `main` at `b7d7edb60a3d3abb0610184131cd8df792327b9f` (August 20, 2026).

The baseline repository does not contain a Stage 1 karaoke implementation. No karaoke routes, worker, transcription/alignment code, ASS generator, FFmpeg renderer, karaoke persistence, download flow, or cleanup task is present. The closest existing feature is the independent Runway AI Video Studio; it must not be treated as Stage 1 karaoke code.

| Area | Existing baseline | v2 decision | Boundary / next work |
| --- | --- | --- | --- |
| Upload flow | `components/VideoStudio.tsx` accepts a small image as a data URI. `app/api/originals/upload-url/route.ts` creates a Supabase signed upload URL for original-artist media. | Keep the signed-upload pattern, not the image/data-URI implementation. | Add authenticated `/api/karaoke-v2/projects` and `/api/karaoke-v2/uploads` routes with audio MIME/size validation and v2-only storage keys. |
| Job tracking | Video Studio starts a Runway task and polls `/api/video/status/[id]`; state lives at the provider. | Keep the client polling pattern; replace provider-specific status handling and add durable karaoke jobs. | Define v2 job states, ownership checks, retries, progress, errors, and idempotency before connecting a worker. |
| Storage | Supabase REST/storage helpers and environment conventions are used throughout the app. There is no karaoke bucket or project persistence. | Keep Supabase integration conventions; add isolated v2 tables and storage prefixes/buckets. | Design migrations and row-level security for projects, revisions, jobs, and assets. Do not reuse original-artist objects or Runway URLs. |
| Downloads | Video Studio exposes Runway's returned MP4 URL. No owned karaoke download route exists. | Replace with authenticated, expiring download URLs for v2-owned artifacts. | Add downloads only after project ownership and artifact retention rules exist. |
| Auth/admin UI | Stage 1's `lib/stagefront-auth.ts`, auth API routes, and `app/admin` provide reusable application identity/admin patterns. | Selectively port the required primitives from `karaoke-stage1-stable` when v2 persistence is added; do not carry over unrelated admin features. | All future project/job routes must enforce owner or admin access. |
| Transcription/timing | Not present. | Build new around the master project schema; the saved project, not ASS/MP4, is the source of truth. | Next engine slice: provider-neutral transcription/alignment interfaces and an importer that produces validated line/token timings. |
| ASS generation | Not present. | Build new as a deterministic exporter from a saved project revision. | Keep ASS output derived and reproducible; never write timing edits back from ASS. |
| MP4 rendering | Existing Runway generation returns provider-hosted MP4 but does not render karaoke. | Build a separate karaoke renderer; do not modify `/api/video/*`. | Render from an immutable project revision plus owned media assets, then register the output asset. |
| Cleanup | No karaoke cleanup/retention task exists. | Build new with explicit retention states and safe, idempotent deletion. | Define retention policy before uploads; delete only unreferenced v2 assets after ownership/reference checks. |

## Foundation added on `karaoke-engine-v2`

- `lib/karaoke-v2/project-schema.ts` defines the versioned master project, media asset references, line/word/syllable timing, render settings, an empty-project factory, and basic timeline validation.
- `app/api/karaoke-v2/route.ts` provides a read-only discovery endpoint. It deliberately advertises no active processing capabilities.

## v2 cleanup

The v2 branch is now a focused standalone foundation. The legacy community platform, Runway and Stripe integrations, Supabase migrations, unrelated pages and APIs, component library, and large image collection remain preserved on `karaoke-stage1-stable` but are intentionally absent here. The v2 root page is a minimal foundation status screen.

The cleanup creates no database objects, storage buckets, workers, or uploads. The v2 API remains read-only and cannot start processing work.
