# VIDPOD Website Build

**Live URL:** https://www.vidpod.com.au
**Repo:** GitHub Pages, deploys from `main` branch on push
**Cache busting:** `_shared.css` uses `?v=N` query string (currently v=34 on podcast pages)

---

## Copy Management — Notion → Live Site

All website copy lives in Notion. Tommy edits there, then tells Claude to push.

**Hub page:** `3401425b-8960-8147-b538-d310995b76aa` — 🌐 Website Copy

**Child pages (fetch by ID, pull copy, update HTML):**

| Page | Notion ID | HTML file |
|------|-----------|-----------|
| Homepage | `3401425b-8960-81dc-877a-ebe1d11fb5d1` | `index.html` |
| The Numbers Game | `3401425b-8960-8101-be65-d123a93c3db4` | `podcasts/the-numbers-game.html` |
| Let's Talk Teaching | `3401425b-8960-81e5-8445-df18489da92d` | `podcasts/lets-talk-teaching.html` |
| Home Files | `3401425b-8960-8169-b6ea-e7d2b119ef8e` | `podcasts/carlisle-homes.html` |
| Help at Hand | `3401425b-8960-8111-b032-ccdfa161d1ac` | `podcasts/help-at-hand.html` |
| Unconventional Business | `3401425b-8960-8153-8cc5-d5c4545112d5` | `podcasts/unconventional-business.html` |
| The Daily Talk Show | `3401425b-8960-81e0-8ea4-c95e69480974` | `podcasts/the-daily-talk-show.html` |
| Meet Our Founder | `3401425b-8960-8166-aa81-c9cf8410d4a0` | `story.html` |
| Founder Story (template) | `3401425b-8960-8114-83a1-f52eb3be9da8` | `video/founding-story.html` |
| Brand Film (template) | `3401425b-8960-81b3-87f2-dffeb757a081` | `video/brand-film.html` |
| Case Study (template) | `3401425b-8960-8183-a276-f7c3b9de0c04` | `video/case-study.html` |
| Social Content (template) | `3401425b-8960-81aa-8634-ec598ee0a28a` | `video/social-content.html` |
| Product Video (template) | `3401425b-8960-81f0-a697-e4c3091d2a0e` | `video/product-video.html` |
| Event Film (template) | `3401425b-8960-817d-bed6-e0ed5a8513a9` | `video/event-film.html` |

**Workflow:**
1. Tommy edits copy in Notion (each page has section-by-section layout + action checklists)
2. Tommy says: "push the copy from [page name]"
3. Claude fetches the Notion page by ID, extracts the updated text
4. Claude finds the matching HTML elements in the corresponding file and updates them
5. Commit and push — live in ~30 seconds

**Rules:**
- Notion is the source of truth for copy. Don't edit copy directly in HTML without updating Notion.
- Structure/layout changes still happen in HTML. Notion only holds the words.
- YouTube embed codes can be pasted directly into Notion pages — Claude extracts the video ID.

---

## Design Rules — Locked In

These have been iterated and approved. Don't deviate.

**Nav bar (all pages):**
- Fixed position, `padding: 22px 0`, backdrop blur
- Image logos (`img/brand/vidpod-logo-light.png` / `vidpod-logo-dark.png`), not text
- Hamburger menu on mobile (≤860px) with dropdown panel
- Theme toggle button (sun/moon)
- "Let's chat" button → sayhi popup (contact form link + call now)
- `scroll-padding-top: 32px` on `html` for anchor offset

**Typography:**
- Headings: `Archivo Black` (`--font-head`)
- Body: `Inter` (`--font-body`)
- Section heading size: `clamp(29px, 3.7vw, 51px)` — unified across all sections on all pages
- Homepage hero h1: `clamp(40px, 6.4vw, 96px)`

**Theme:**
- Homepage: respects `localStorage('vidpod-theme')`, defaults to system preference
- Podcast pages: forced dark mode (`document.documentElement.dataset.theme = 'dark'`), theme toggle hidden, localStorage untouched so homepage restores user preference
- Story page: standard theme toggle via localStorage (not forced)

**Sections:**
- Section padding: `140px 0` desktop, `90px 0` mobile
- Wrap: `max-width: 1280px`, padding `0 36px` desktop, `0 22px` mobile
- Brand dot: green circle (`--green: #00FFAA`) used as full stop on headings

**Carousels (BTS sections):**
- Pure CSS `@keyframes translateX(-50%)` for auto-scroll (iOS Safari compatible)
- Touch swipe + mouse drag support on desktop
- `cursor: grab` / `cursor: grabbing` affordance
- Click-to-zoom lightbox for images
- No scroll hint pills/chevrons (removed)

---

## Pages — Status

### Homepage (`index.html`)
**Status: Live, actively being built**

| Section | Status | Notes |
|---------|--------|-------|
| Hero | Done | Video background embed, two CTA buttons |
| About | Done | |
| Video work (6 cards) | In progress | Card 1 live (Barefoot Investor), cards 2–6 placeholder. No play buttons — thumbnails stand alone. Click opens video lightbox overlay. |
| Video BTS carousel | Done | Placeholder images (vid-01, vid-02 repeating) |
| Podcast work (6 cards) | Done | Links to individual podcast pages |
| Podcast BTS carousel | Done | Placeholder images |
| Founder section | Done | Links to story.html |
| Contact form | Done | |
| Footer | Done | |

### Story page (`story.html`)
**Status: Nav and fonts updated to match homepage. Content is placeholder-heavy.**

- Nav bar: matches homepage (image logos, hamburger, sayhi popup, theme toggle)
- Section heading sizes: unified to `clamp(29px, 3.7vw, 51px)`
- Featured video (Having a Crack): live YouTube embed
- Viral moments: 1 real (oBikes/Xuwl6vKiTLU), 5 placeholder video slots
- Timeline: content written
- Shows grid: content written
- Press list: content written

### Podcast pages (`podcasts/*.html`)
**Status: All 6 built from canonical template. Content accurate. Assets placeholder.**

All share `podcasts/_shared.css` (v=34) and forced dark mode.

| Page | File | Chips | Listen Links | BTS Photos | Video Embed |
|------|------|-------|-------------|------------|-------------|
| Let's Talk Teaching | `lets-talk-teaching.html` | 3 seasons · 18+ eps · Since 2023 | Spotify ✅ Apple ✅ | Placeholder | Placeholder |
| The Numbers Game | `the-numbers-game.html` | 5+ seasons · 270+ eps · Since 2021 | Spotify ✅ Apple ✅ | Placeholder | Placeholder |
| Home Files (Carlisle) | `carlisle-homes.html` | 2 seasons · 12 eps · Since 2024 | Spotify ✅ Apple ✅ | Placeholder | Placeholder |
| Help at Hand | `help-at-hand.html` | Members only · Branded series | **No listen strip** (private/paywall) | Placeholder | Placeholder |
| Unconventional Business | `unconventional-business.html` | 3 seasons · HubSpot Network | Spotify ✅ Apple ✅ | Placeholder | Placeholder |
| The Daily Talk Show | `the-daily-talk-show.html` | 1,022 eps · 3 years daily · 2018–2021 | Spotify ✅ Apple ✅ | Placeholder | Placeholder |

**Podcast listen links with inline SVG brand icons** (Spotify green, Apple gradient).

### Video template pages (`video/*.html`)
**Status: Built but not linked from homepage (cards now use lightbox instead). Will be built out later.**

Existing pages: `founding-story.html`, `brand-film.html`, `case-study.html`, `social-content.html`, `product-video.html`, `event-film.html`

These share `video/_shared.css` and follow a template structure. They'll eventually be linked from the video cards or a separate nav.

---

## What Tommy Needs to Supply

### Video section — homepage cards (5 remaining)

Card 1 (Barefoot Investor) is done. Cards 2–6 need:

- [ ] **Card 2** — YouTube embed URL + client/brand name + video category (e.g. "Brand film") + one-line project description
- [ ] **Card 3** — YouTube embed URL + client/brand name + video category + one-line description
- [ ] **Card 4** — YouTube embed URL + client/brand name + video category + one-line description
- [ ] **Card 5** — YouTube embed URL + client/brand name + video category + one-line description
- [ ] **Card 6** — YouTube embed URL + client/brand name + video category + one-line description

### Podcast pages — all 6

- [ ] **BTS photos** — 6+ real behind-the-scenes photos per show (currently using placeholder repeats)
- [ ] **YouTube embed video** — one hero/featured video per podcast page (currently placeholder)
- [ ] **About section photo** — one photo per podcast page for the about grid
- [ ] **Client quotes** — real quotes for Help at Hand and Unconventional Business (currently using Tommy placeholders)

### Story page

- [ ] **Viral video YouTube IDs** — 5 placeholder slots need real YouTube URLs:
  - 7-Eleven $3 coffee rip-off
  - 1,000 Steps count
  - Domino's 100 pepperoni
  - The e-scooter sequel (oBike follow-up)
- [ ] **Hero photo** — verify `img/about/tommy.jpg` is the right shot

### Homepage BTS carousels

- [ ] **Video BTS photos** — real set of 6+ photos (currently vid-01.jpg and vid-02.jpg repeating)
- [ ] **Podcast BTS photos** — real set of 6+ photos (currently pod-01.jpg and pod-02.jpg repeating)

### Video template pages (future)

- [ ] Template design and content for individual video project pages (founding-story, brand-film, etc.)
- [ ] Decision on whether these pages get linked from video cards or elsewhere

---

## Technical Notes

- **No build step.** Plain HTML/CSS/JS, deployed via GitHub Pages.
- **`.nojekyll`** file present to prevent Jekyll processing.
- **YouTube embeds** use `rel=0&modestbranding=1&playsinline=1` to keep them clean.
- **Video lightbox** autoplays on open, stops on close (iframe removed from DOM).
- **Mobile card grid** goes single-column at ≤520px for video cards.
- **Podcast pages** use `process-3` or `process-4` class for journey steps depending on count.
- **Cache busting** — bump `?v=N` on `_shared.css` link when making shared style changes.

---

## Learned Rules — From Build Sessions

- No scroll hint chevrons/pills on carousels. Removed and not coming back.
- Play buttons removed from video cards. Thumbnails stand alone.
- Category filter buttons use `<button>` not `<a href="#">` (prevents page jump).
- Podcast "Other Shows" grids must use correct artwork filenames (e.g. `help-at-hand.jpg` not `tdts.jpg`).
- Help at Hand has no listen strip (private podcast).
- UB journey: 3 seasons only, no "What's next" step.
- TDTS: Tommy AND Josh's show equally — never frame as just Tommy's origin story.
- TNG hosts: Jason Robinson (CPA Accountant) and Nick Reilly (Planner). Not Nick Bracks/Martin Mulcare.
- TDTS dates: Feb 2018 – May 2021, 1,022 episodes. Not "10 years since 2014".
- `scroll-padding-top: 32px` — went through 90px → 64px → 32px. Settled.
- WebFetch is blocked for podcast domains. Use Claude in Chrome MCP to scrape if needed (Tommy opens tabs manually).

---

## Pre-Launch Checklist

- [ ] Run site through [SchemaReports.com](https://schemareports.com) for SEO audit and structured data review
- [ ] Add JSON-LD structured data (LocalBusiness, Podcast schema, etc.) based on findings
- [ ] Set up Formspree (or alternative) for contact form
- [ ] Final copy review pass (all pages via Notion)
- [ ] Replace all placeholder BTS photos and video embeds
- [ ] Test all pages on mobile (iOS Safari + Android Chrome)

---

*Last updated: April 12, 2026*
