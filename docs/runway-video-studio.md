# StageFront AI Video Studio

Route: `/create/video`

## Server environment

Set `RUNWAYML_API_SECRET` in Vercel for Preview and Production. It is a server-only secret; never prefix it with `NEXT_PUBLIC_`.

The studio uses Runway Gen-4.5 for text-to-video and optional image-to-video. BytePlus and ModelArk environment variables are not used.

## API flow

1. `POST /api/video/generate` validates the idea, duration, and optional HTTPS first-frame image URL.
2. The server calls Runway text-to-video or image-to-video and returns the task ID.
3. The browser polls `GET /api/video/status/[id]` every five seconds.
4. The server retrieves the Runway task and normalizes its status for the UI.
5. When Runway succeeds, the first output URL is shown in the video player and as an MP4 link.

Output is vertical `720:1280`, MP4, and 2–10 seconds. Runway output URLs are temporary, so a production generation-history feature should copy completed assets to durable storage.

Real-person reference assets must follow Runway's current authorization and identity requirements. The app does not attempt to bypass provider controls.
