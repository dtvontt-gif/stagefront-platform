# StageFront Recovered Feature Requirements

Version: 1.0

These requirements were recovered from the founder's earlier StageFront
planning conversation.

## 1. Wall of Founders Override

An administrator needs to correct Wall of Founders visibility when a member:

- forgot to request public recognition during registration; or
- selected public recognition accidentally and later asks to be removed.

The override changes only `show_on_wall`. It never removes Founding Member
status, changes the founder number, or deletes the registration.

Required controls:

- Search by founder number, name, email, or username.
- Show current Wall visibility.
- Add to Wall.
- Remove from Wall.
- Optional reason.
- Confirmation before saving.
- Audit record containing administrator, action, timestamp, and reason.

## 2. Host Social Links and Live Directory

A member with the host role may connect:

- TikTok profile
- TikTok LIVE URL
- YouTube
- Instagram
- Facebook
- Discord
- personal website
- another approved livestream destination

The host dashboard includes an `I'm Live` control. Active approved hosts appear
in a public Live Now directory so fans can discover and visit their broadcasts.

Safety and quality requirements:

- Only the authenticated host or an administrator can edit a host profile.
- Social and livestream URLs are validated.
- Administrators can approve, suspend, or remove a public host listing.
- Live status expires automatically unless renewed.
- The public directory clearly identifies the destination before a visitor
  leaves StageFront.

## 3. Payments

StageFront needs three visibly separate payment paths:

### Community Donation

Voluntary support for community growth and platform development.

### Sponsorship

Support for contest prizes, talent shows, episodes, showcases, or another
defined StageFront opportunity. Collect sponsor contact information and the
opportunity the sponsor wants to support.

### Entry Fee

Payment for a defined contest or Original Artist Showcase registration. Tie the
payment to the member and event and show rules, price, eligibility, and refund
terms before checkout.

Implementation requirements:

- Use PayPal checkout.
- Keep separate PayPal flows for community donations, sponsorships, and entry
  fees.
- Keep secret keys server-side.
- Store provider payment IDs rather than card details.
- Record payment purpose separately.
- Provide success and cancellation pages.
- Add receipts and an administrator payment view.
- Do not describe donations as tax-deductible without appropriate legal status.

## Required Build Order

1. Supabase authentication and member accounts.
2. Admin roles and protected dashboard.
3. Wall visibility override and audit log.
4. Host profile editor and Live Now directory.
5. Payment-provider connection and three payment paths.
