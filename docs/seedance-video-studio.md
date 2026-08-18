# StageFront AI Video Studio

Prototype route: `/create/video`

## Server environment

Set these in Vercel for Preview first:

- `BYTEPLUS_MODELARK_API_KEY` — server-only ModelArk API key.
- `SEEDANCE_CREATE_TASK_URL` — the current official ModelArk content-generation task endpoint for your BytePlus region/account.
- `SEEDANCE_MODEL_BEST` — model/endpoint ID for the highest-quality Seedance option enabled on the account.
- `SEEDANCE_MODEL_FAST` — model/endpoint ID for the fast Seedance option enabled on the account.
- `SEEDANCE_MODEL_SAVER` — model/endpoint ID for the lower-cost Seedance option enabled on the account.

Do not prefix the API key with `NEXT_PUBLIC_`.

## Current prototype

- Idea-to-video form
- 9:16 TikTok-first output
- 5, 10, or 15 second selector
- Best / Fast / Saver modes
- Optional HTTPS reference image URL
- Server-side provider call so credentials are not exposed
- Returns the generation task ID to the UI

## Next build step

Add a task-status endpoint and polling UI so queued jobs automatically become playable/downloadable when the provider reports success. Then add direct image upload/storage instead of requiring a reference URL.

## Safety / identity

Real-person reference assets must follow the video provider's current authorization and identity requirements. The app should not attempt to bypass those controls.
