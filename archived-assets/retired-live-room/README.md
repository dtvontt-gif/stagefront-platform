# Retired Untamed Vibez live room

The former non-Jungle live room is retired but intentionally remains fully
implemented in the application. Its layout, eight boxes, stage behavior,
permissions, moderation, gifts, wallet support, camera controls, animations,
and Daily room settings have not been deleted.

## Restore it

Set this environment variable to `true` and redeploy:

`NEXT_PUBLIC_RETIRED_LIVE_ROOM_ENABLED=true`

For the Expo mobile app, also build with:

`EXPO_PUBLIC_RETIRED_LIVE_ROOM_ENABLED=true`

With the switch disabled (the default):

- `/live` redirects to `/jungle`.
- `/live/zoo` redirects to `/jungle`.
- Server operations for the retired room return HTTP 410.
- Website and mobile inboxes offer only The Jungle invitations.
- The mobile live picker shows only The Jungle.

The Jungle is the main and only public live room while this archive switch is
off.
