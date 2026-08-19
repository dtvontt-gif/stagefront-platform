# StageFront AI Video Studio

Prototype route: `/create/video`

## Server environment

Required in Vercel:

- `BYTEPLUS_MODELARK_API_KEY` — server-only ModelArk API key.

The app currently targets BytePlus ModelArk in `ap-southeast-1` and uses model `seedance-1-0-pro-250528`.

Do not prefix the API key with `NEXT_PUBLIC_`.

## Current build

- Idea-to-video form
- TikTok-style vertical prompting
- 2–12 second duration selector
- Text-to-video generation
- Optional first-frame HTTPS image URL for image-to-video
- Server-side ModelArk task creation
- Automatic job-status polling every 5 seconds
- Finished MP4 playback in the page
- Link to open the finished MP4
- API credentials remain server-side

## API flow

1. `POST /api/video/generate` creates an asynchronous Seedance generation task.
2. The browser receives the task ID.
3. `GET /api/video/status/[id]` checks ModelArk task status.
4. The UI polls every five seconds until the task succeeds, fails, expires, or is cancelled.
5. On success, the returned `content.video_url` is shown in the player.

## Next improvements

- Direct image upload/storage instead of requiring an HTTPS image URL.
- Generation history tied to signed-in StageFront members.
- Prompt presets for artist promos, character reveals, music-video scenes, and TikTok shorts.
- Optional upgrade path to newer Seedance models after the current free-credit pipeline is proven.

## Safety / identity

Real-person reference assets must follow the video provider's current authorization and identity requirements. The app must not attempt to bypass those controls.
