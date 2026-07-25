# StageFront Developer Bible

Version: 1.0

## Product

StageFront is a live entertainment platform connecting artists, fans, producers, and hosts through discovery, performance, and community.

Primary tagline:

> The Front Row for Fans. The Big Stage for Artists.

Brand statement:

> We Don't Build Stars. We Build the Stage Where Stars Are Discovered.

Mission:

> Every artist deserves a stage.

## Brand System

- Stage Gold: `#F4B400`
- Stage Black: `#0B0B0F`
- Spotlight White: `#FFFFFF`
- Royal Blue Accent: `#1E5EFF`
- Primary typeface: Montserrat Bold
- Secondary typeface: Poppins

## Asset Locations

- `/public/images/logos` — wordmarks and horizontal logos
- `/public/images/icons` — app icon, monogram, and spotlight icon
- `/public/images/favicons` — browser and device icons
- `/public/images/hero` — homepage hero artwork
- `/public/images/social` — platform-specific banners and profile art
- `/public/images/artists` — artist portraits and showcase imagery
- `/public/images/founders` — Wall of Founders artwork
- `/public/images/branding` — reusable textures and overlays

See [Asset_Manifest.md](./Asset_Manifest.md) for official filenames and replacement status.

## Logo Rules

- Prefer SVG when available; otherwise use a transparent PNG.
- Never stretch, skew, rotate, recolor, outline, or add effects.
- Maintain clear space equal to the height of the spotlight icon.
- Use gold or white on dark backgrounds and black on light backgrounds.
- Keep filenames stable when replacing assets so website code does not change.

## Website Principles

- Premium, minimal, dark, and cinematic.
- Gold is an accent, not a page-wide fill.
- Text must remain readable over every image.
- Motion should be subtle and purposeful.
- Components must work on mobile.
- Use local StageFront assets; do not depend on temporary external image URLs.

## Development Workflow

1. Build or replace one focused feature.
2. Test locally.
3. Run lint and the production build.
4. Review desktop and mobile layouts.
5. Commit with a clear message.
6. Push to GitHub and verify Vercel.

## Technical Foundation

- Next.js
- TypeScript
- Tailwind CSS
- GitHub
- Vercel
- Supabase planned for authentication, profiles, founding members, and live queue data

## Naming Convention

- Use lowercase kebab-case.
- Use descriptive names such as `stagefront-logo-gold.png`.
- Add dimensions only when a platform requires a specific size.
- Do not use spaces, duplicate punctuation, or names such as `final-final`.

