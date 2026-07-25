# StageFront Asset Manifest

Version: 1.0

This is the source of truth for brand asset names and locations. Replace an asset without changing its official filename whenever possible.

## Logos — `/public/images/logos`

| Official filename | Purpose | Status |
|---|---|---|
| `stagefront-logo-gold.png` | Primary logo reference | Available; white background, transparent replacement recommended |
| `stagefront-logo-white.png` | One-color logo reference | Available; white background, transparent replacement recommended |
| `stagefront-logo-black.png` | Logo on light backgrounds | Needed |
| `stagefront-horizontal-logo.png` | Website navigation and wide layouts | Needed |

## Icons — `/public/images/icons`

| Official filename | Purpose | Status |
|---|---|---|
| `stagefront-spotlight-icon.png` | Standalone spotlight A symbol | Needed |
| `stagefront-app-icon.png` | App launcher icon | Needed |
| `stagefront-profile-icon.png` | Social profile image | Needed |
| `stagefront-sf-monogram.png` | Compact SF brand mark | Needed |

## Favicons — `/public/images/favicons`

| Official filename | Purpose | Status |
|---|---|---|
| `favicon.ico` | Browser fallback | Needed |
| `favicon-16x16.png` | Small browser tab | Needed |
| `favicon-32x32.png` | Standard browser tab | Needed |
| `apple-touch-icon.png` | Apple home-screen icon | Needed |
| `icon-192x192.png` | PWA icon | Needed |
| `icon-512x512.png` | PWA icon | Needed |

## Hero — `/public/images/hero`

| Official filename | Purpose | Status |
|---|---|---|
| `stagefront-hero-background.png` | Homepage cinematic background | Needed |
| `stagefront-hero-overlay.png` | Optional text-readability overlay | Future |

## Social — `/public/images/social`

| Official filename | Purpose | Status |
|---|---|---|
| `stagefront-youtube-banner.png` | YouTube channel banner | Needed |
| `stagefront-facebook-cover.png` | Facebook page cover | Needed |
| `stagefront-discord-banner.png` | Discord community banner | Needed |
| `stagefront-tiktok-profile.png` | TikTok profile image | Future |

## Replacement Procedure

1. Confirm the image matches the approved identity.
2. Rename it to the exact official filename.
3. Place it in the matching folder.
4. Preserve transparency for logos and icons.
5. Check the image at its real display size.
6. Update this manifest.
7. Test the website locally before committing.

## Current Asset Review

`stagefront-logo-gold.png` is correctly named and stored, but its current white background makes it unsuitable for direct use over the dark StageFront navigation or hero. Keep it as the approved visual reference until a true transparent version replaces it.

`stagefront-logo-white.png` has the same limitation and should also be replaced with a transparent export before website integration.

The original identity boards are preserved for reference in `/public/images/branding`:

- `stagefront-brand-board-original.png`
- `stagefront-brand-board-production-reference.png`
