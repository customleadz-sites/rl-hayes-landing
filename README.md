# R.L. Hayes Roofing & Repairs — Google Ads Landing Pages

**Read this before editing anything.** It records the decisions, the constraints, and the
two things that still need to be turned on before ads run.

---

## The four pages

Each page exists to match one Google Ads ad group. Never point paid traffic at a page
whose headline doesn't repeat the ad's promise — that's what kills conversion rate.

| File | URL (after deploy) | Ad group it's for | Angle |
|---|---|---|---|
| `index.html` | `/` and `/roofing-contractor` | "roofing companies near me", "roofers augusta", "roofing contractor" | Broad trust — reviews, licensed/insured, no upsell |
| `roof-replacement.html` | `/roof-replacement` | "roof replacement", "new roof cost", "roof replacement augusta" | Research intent — pricing honesty, financing, warranty, process |
| `roof-repair.html` | `/roof-repair` | "roof leak repair", "roof repair", "storm damage roof", "emergency roofer" | Emergency intent — call-first, red urgency band, insurance help |
| `rl-hayes.html` | `/rl-hayes` | Branded — people searching "R L Hayes roofing" | Lightest page. They already trust them; booking sits high, no long sell |

`vercel.json` handles clean URLs and the `/roofing-contractor` rewrite.

---

## ⚠️ Two things to do before spending money

### 1. Google Ads conversion tracking — call forwarding LIVE (July 2026)

The `<head>` of all four pages now carries GA4 (`G-RRHRE8E6Z5`), the Google Ads tag
(`AW-16493269497`), and the **website-call phone snippet**
(`AW-16493269497/hXI_CLeV69kcEPmjzbg9`, phone_conversion_number `(706) 955-2976`).
Google swaps the visible number for a forwarding number on ad-click visits — every
button was made number-only text for exactly this reason. Do NOT paste this same
label into `CONVERSIONS.callClick` in main.js — the forwarding number already counts
those calls; firing click events at the same label would double-count.

Still stubbed in `assets/js/main.js` (harmless no-ops until filled): the
`CONVERSIONS.bookingComplete` label — create a Website conversion action in Google
Ads for completed bookings and paste its AW-…/label in. Every phone link is tagged
with `data-loc` (`header`, `hero`, `sticky-bar`, …) so GA4 shows which button
generates the calls.

### 2. Booking conversions — now tracked via Zenbooker's official widget event

Zenbooker's widget-events API (developers.zenbooker.com/docs/widget-events) fires a
`submission` event on a real confirmed booking, and `main.js` listens for it via
`Zenbooker.on("submission", …)` and fires the `bookingComplete` conversion. So create
**three** conversion actions in Google Ads (call click, booking started, booking
completed) and make "Booking Completed" the primary one. Nothing needs to be configured
in the Zenbooker account for this. Weaker signals still tracked:

- `booking_viewed` fires when someone actually scrolls the booking section into view.
- A `postMessage` listener fires `booking_interaction` if Zenbooker posts out of the iframe.

Good news: Zenbooker captures `utm_source` / `utm_medium` / `utm_campaign` and the landing
page URL into its own session data (confirmed in testing). **So tag the Google Ads final
URLs with UTMs** and Kennedy can attribute bookings inside Zenbooker. For true conversion
data in Google Ads, import bookings from Zenbooker or GA4 as an offline/imported conversion.

The widget ID is the same on all four pages:
`https://widget.zenbooker.com/book/1778688127930x942801148640165800?embed=true`

---

## Facts on the page — and where they came from

Everything claimed is sourced. **Do not add claims beyond this list without checking with
the client first.**

| Claim | Source |
|---|---|
| 4.7 stars, 166 Google reviews | Screenshot in `assets/Reviews.png` |
| Licensed, bonded & insured in Georgia | Their own site, rlhayes.com |
| GAF-trained crews | Their own site |
| Warranties on labor and materials | Their own site |
| GreenSky® financing + the legal disclaimer | Their own site (Synovus Bank, NMLS #408043) |
| Free inspections / free itemized estimates | Their own site + intake form |
| Emergency service available | Their own site |
| "Most homes finished in a day or two" | Backed by two of the real Google reviews |
| Service area (30-mi radius, city list) | Intake form + their site |
| Phone (706) 955-2976, office@rlhayes.com, Mon–Fri 8–5 | Their site + intake form |

**All five testimonials are real, verbatim Google reviews** with real names — screenshots
are in `../assets/Review 1–5.png`. Do not edit their wording.

### Deliberately NOT claimed
- **Years in business.** BBB lists them as established 1980 and "30+ years," but the client
  never confirmed it on the intake form. If Kennedy confirms it, adding "Serving Augusta
  since 1980" to the hero trust row would be one of the strongest single upgrades available.
- **Number of jobs completed.** No source.
- **Any specific price or "starting at" number.** No source, and roofing prices vary too much.
- **A magnet/nail sweep.** See below — worth asking about.

### 💡 The one copy insight worth acting on
Their negative Google reviews cluster around **cleanup — nails and debris left in yards**.
So "you get your yard back" is a benefit card on the main page and a FAQ on every page,
worded only as far as their own site supports ("we clean up, final walkthrough with you").
**If they actually run a magnet sweep for nails, say so explicitly** — it directly answers
their single most common complaint and almost nobody else advertises it.

---

## Design — matched to the 2026 rebrand

The client changed their logo and brand mid-build. These pages now match the live
rlhayes.com header exactly (values read from the site's computed styles, July 2026):

| Token | Value | Where it came from |
|---|---|---|
| Primary teal | `#3D8DA4` | site `--primary: 193 46% 44%`; every CTA on their site |
| Secondary green | `#5CA372` | site `--secondary: 139 28% 50%` |
| Header black | `#0A0A0A` | their header background |
| Headings | **Montserrat** 700/800 | their H1s and the "R.L. HAYES" wordmark |
| Body | **Open Sans** 400/600/700 | their body text |
| Buttons | full pill radius | their button style |

**Logo lockup** — the supplied `rl_hayes_logo.png` is the icon only (256×256, black
background). It's processed into `assets/img/logo-mark.png` with the black knocked out to
transparency, and the wordmark is rebuilt in HTML/CSS to match their header:
"R.L. HAYES" in Montserrat 700 teal with `.6px` tracking, over "ROOFING & REPAIRS" in
Open Sans uppercase at `.22em` tracking, white 65%. That's the `.brand` block — same
markup in the header and footer of all four pages, so changing it once per file is enough.

`favicon.png` is the same mark at 128px.

- **Signature motif:** the roof-pitch notch between sections — the `.pitch` class, a
  clip-path chevron. It deliberately echoes the chevron inside the new logo mark.
- **Attention ratio is 1:1 on purpose.** No nav menu, no social links, no footer link farm,
  the logo doesn't link anywhere. The only two actions are *call* and *book*. Removing
  navigation is one of the highest-impact landing-page changes there is — please don't add
  a menu "for completeness."

### Images
All photos are the client's real job photos from `../assets/Photos Page/`, resized and
converted to WebP in `assets/img/`. Total page weight is well under 1 MB.

To re-generate them, the source files are in the client folder — heroes are 1400–1900px
wide at WebP quality 72, gallery images 1000px at quality 74.

**Avoid `../assets/rlhayes van .jpg`** — the van in that photo has their *old* phone number
(706-564-2616) painted on the side, which contradicts the number on the page.

---

## Local preview

```bash
cd "clients/R L Hayes/site"
python3 -m http.server 8899
# then open http://localhost:8899/index.html
```

## Deploy

Static files — no build step. Deploy the `site/` folder to Vercel.
Read the **git-deploy** skill first (git author email, the customleadz-sites org, the
two-lookalike-tokens trap).

Their current site (rlhayes.com) is a separate Replit-built React app. These pages are
standalone ad landing pages — decide with the client whether they live on a subdomain
(e.g. `go.rlhayes.com`) or replace parts of the main site. Ads should point at the
subdomain so the main site's SEO isn't affected. All four pages carry `noindex` for that
reason.
