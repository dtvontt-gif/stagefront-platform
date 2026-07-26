# StageFront Developer Bible

## Payments

StageFront uses three official PayPal payment links:

- Community donations: `https://www.paypal.com/ncp/payment/TJJ4VKY927A6J`
- Event sponsorships: `https://www.paypal.com/ncp/payment/6235Y7RCZFU72`
- Competition and showcase entry fee ($40): `https://www.paypal.com/ncp/payment/TNTG33EFH58FY`

Payment buttons live in `components/SupportStageFront.tsx`. External payment
links must open in a new tab with `rel="noopener noreferrer"`. StageFront does
not collect or store payment-card information.

Version: 1.1

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
- Supabase for authentication, profiles, founding members, host presence, and live queue data

## Founding Member Administration

- Founding Member status and Wall of Founders visibility are separate values.
- An administrator may add or remove a member from the public Wall without
  changing or deleting that member's Founding Member status.
- Member numbers, registration dates, usernames, roles, and badges must remain
  unchanged when Wall visibility is overridden.
- Every administrator override must record who changed it, when it changed, and
  an optional reason.
- Public users may never update Wall visibility directly.
- The administrator dashboard must require an authenticated account with an
  explicit admin role.

## Host Profiles and Live Presence

- Members registered as hosts may maintain a public host profile.
- Supported profile links include TikTok, YouTube, Instagram, Facebook, Discord,
  and a personal website.
- Hosts may publish a TikTok LIVE or other approved livestream URL.
- Hosts may switch an `I'm Live` status on or off from their authenticated
  dashboard.
- The public Live Now directory lists only approved hosts whose live status is
  active.
- Each live card links viewers to the host's stream and social profiles.
- Live status should expire automatically after a configured period unless the
  host renews it, preventing stale listings.

## Payments and Support

StageFront keeps three payment purposes separate:

1. Community donation - voluntary support for StageFront and its community.
2. Show sponsorship - funding prizes, showcases, episodes, or community events.
3. Entry fee - payment tied to a specific contest or Original Artist Showcase
   registration.

- Every checkout records its payment purpose and related event when applicable.
- Donations must not be presented as tax-deductible unless StageFront has the
  required legal status and documentation.
- Sponsorships require sponsor contact information and follow-up details.
- Entry fees must display the event, amount, refund terms, and eligibility rules
  before payment.
- Payment secrets must remain server-side and must never be stored in public
  source code.
- PayPal is the selected checkout provider.
- Community donations, sponsorships, and entry fees must use distinct PayPal
  checkout links or distinct server-created orders so StageFront can identify
  the purpose of every payment.
- For automated payment confirmation, StageFront will use a PayPal Developer
  application and verified webhooks. Credentials must be stored only in
  Vercel environment variables and never pasted into documentation or source
  control.

## Live Hub

- Public route: `/live`
- Homepage component: `components/LiveNowSection.tsx`
- Live host cards: `components/LiveHosts.tsx`
- Public host data: `/api/hosts`
- Administrator control: `/admin`

Only hosts with `host_published = true`, `is_live = true`, and a valid TikTok
Live URL receive a Watch Live button. External TikTok links open in a new tab
so the StageFront page remains available.

## Naming Convention

- Use lowercase kebab-case.
- Use descriptive names such as `stagefront-logo-gold.png`.
- Add dimensions only when a platform requires a specific size.
- Do not use spaces, duplicate punctuation, or names such as `final-final`.
