# Design Audit — Airbnb Cleaning Page

**Audited:** 2026-07-24  
**Figma source:** `is60g7wqOcvweINNhvNUMT` (frame `7991:6627`, AIRBNB CLEANING PAGE 1440px)  
**Live URL:** https://gerzon-everneat.github.io/public-html/everneat-services/airbnb-cleaning/  
**Authority:** Figma has higher authority on colors, backgrounds, and component specs. Body background = `#fff` (white — consistent with v2 global standard).

---

## Severity key
- 🔴 High — visible brand/color/layout deviation, fix before launch
- 🟡 Medium — noticeable discrepancy, fix in next pass
- 🟢 Low — content drift or edge case

---

## Findings — all fixed in this audit pass

### 1 · Font stack — Google Fonts → CDN (PP Editorial New + Aileron) 🔴

| | Before | After |
|---|---|---|
| Serif | `Cormorant Garamond` via Google Fonts | `PP Editorial New` via `cdn.everneat.co` |
| Sans | `Inter` via Google Fonts | `Aileron` via `cdn.everneat.co` |

**Fix:** Removed Google Fonts `<link>` tags. Added `@font-face` declarations matching v2 exactly (PP Editorial New in 200/200i/400/400i, Aileron in 300/400/400i/600/700/800). Consistent with design system established in v2.

---

### 2 · Lime color system — stale olive values 🔴

| Token | Before | After |
|---|---|---|
| `--lime` | `#ccd84a` (olive-yellow) | `#C8FF00` (electric lime) |
| `--lime-deep` | `#c0cd3a` | `#AADC00` |
| `--lime-soft` | `#e8ecab` | `rgba(200,255,0,0.15)` |

All derived uses updated: `--lime` in `.btn--lime`, `.plan-badge`, ticker highlights; `--lime-deep` in `.tick`, `.chk`, `.toggle`; track gradient and matrix column highlight updated to new values.

---

### 3 · Body background — cream → white 🔴

| | Before | After |
|---|---|---|
| `body` | `background:var(--bg)` = `#f4f1ea` (cream) | `background:#fff` |
| Nav | `rgba(244,241,234,.82)` | `rgba(255,255,255,.88)` |

Consistent with v2 and user directive: global body is white; section containers carry their own backgrounds.

---

### 4 · Serif font-weight — 500/600 → 200 (PP Editorial New Ultralight) 🔴

All elements using `--serif` were using `font-weight:500` or `font-weight:600`. PP Editorial New Ultralight (200) is the design system standard. Fixed across:

| Class | Before | After |
|---|---|---|
| `.sec-title` | 500 | 200 |
| `.logo` | 500, no italic | 200, italic |
| `.plan-name` | 500 | 200 |
| `.plan-price .p` | (inherited) | 200 explicit |
| `.sc-n` | (inherited) | 200 explicit |
| `.sc-title` | 500 | 200 |
| `.cta-title` | 500 | 200 |
| `.dr-title` | 500 | 200 |
| `.dr-84 .n` | (inherited) | 200 explicit |
| `.testi-by` | (inherited) | 200 explicit |
| `.price` | (inherited) | 200 explicit |
| `.press.epi` | 600 | 200 |
| `.press.dom` | 600 | 200 |
| `.press.ms` | (no italic, no weight) | italic, 200 |

---

### 5 · Track gradient + matrix highlight — old lime 🟡

| Element | Before | After |
|---|---|---|
| `.track>i` | `linear-gradient(90deg,#c0cd3a,#dbe27a)` | `linear-gradient(90deg,#C8FF00,#AADC00)` |
| `.mtable .c-solo` | `rgba(201,196,43,.10)` | `rgba(200,255,0,.10)` |

---

### 6 · Body text justification 🟡

| Class | Before | After |
|---|---|---|
| `.faq-a` | `text-align:left` | `text-align:justify;text-align-last:left` |
| `.sc-copy` | `text-align:left` | `text-align:justify;text-align-last:left` |

Consistent with Figma spec and v2 audit finding #2.

---

### 7 · Bounce easing on checkbox animation 🟢

`.mock--chk .brow.in .chk` used `cubic-bezier(.34,1.56,.64,1)` (spring/overshoot easing).

**Fix:** Replaced with `cubic-bezier(.22,1,.36,1)` (ease-out-quint). The overshoot effect is preserved via the `checkPop` keyframe itself (scale peaks at 1.22 at 65%).

---

## Sections confirmed matching ✓

- NAV — sticky, links, Book button (dark fill)
- Hero — dark photo overlay, italic uppercase headline, lime fill-words, ticker bar
- Hero-sub — lead paragraph, star rating, press logos row, collage image with pill labels
- Compare — 2-col grid (photo + table), taupe header, butter Solo column, tick/xmark
- Plans — cream section bg, 3 plan cards with lime badge on featured, list items with chk marks
- Pricing matrix — table structure, Solo column highlight, header rate display
- Tailor strip — horizontal scroll, item photos, add pill
- Testimonial — dark photo bg, large quote, byline, stats grid
- How It Works — 5 sticky stack cards, numbered steps, mock UI panels on right
- FAQ — 2-col (photo + accordion), bordered items, open/close state
- CTA — dark bg `#181611`, italic uppercase title, lime CTA button
- Footer — 4-column grid, dark bg, logo (white), legal bar

---

## Action checklist (completed)

| # | Finding | Status |
|---|---|---|
| 1 | Font stack → CDN PP Editorial + Aileron | ✅ Fixed |
| 2 | Lime color system update | ✅ Fixed |
| 3 | Body bg → white | ✅ Fixed |
| 4 | All serif font-weight → 200 + italic | ✅ Fixed |
| 5 | Track gradient + matrix highlight | ✅ Fixed |
| 6 | Text justification (.faq-a, .sc-copy) | ✅ Fixed |
| 7 | Bounce easing on checkPop | ✅ Fixed |
