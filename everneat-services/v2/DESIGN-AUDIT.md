# Design Audit — Everneat Services v2

**Audited:** 2026-07-24  
**Figma source:** `is60g7wqOcvweINNhvNUMT` (frame `7706:310`, HOME V2 1440px)  
**Live URL:** https://gerzon-everneat.github.io/public-html/everneat-services/v2/  
**Authority:** Figma has higher authority on colors, backgrounds, and component specs. User override on record: body background = `#fff` (white — global bg is intentionally white; section-level card containers carry their own backgrounds).

---

## Severity key
- 🔴 High — visible brand/color/layout deviation, fix before launch
- 🟡 Medium — noticeable discrepancy, fix in next pass
- 🟢 Low — content drift or edge case

---

## Findings

### 1 · Lime / accent color — system-wide 🔴

| | Figma | Live |
|---|---|---|
| CTA buttons (Find your service, Book my Cleaning) | Bright electric lime — closely reads as `#C8FF00` or `#CCFF00` family | `--lime: #ccd84a` — muted olive-yellow |
| Hero fill words (home / regular / 1 week) | Same bright lime | `var(--lime)` = `#ccd84a` |
| Compare tick mark circles | Bright lime fill | `--lime-deep: #c0cd3a` |
| Probiotic shield progress bar (How-It-Works card 03) | Bright lime gradient | `linear-gradient(90deg,#c0cd3a,#dbe27a)` |
| Days of Protection label bar | Warm lime gradient | `rgba(201,196,43,0.82)→rgba(222,224,168,0.82)` |
| Toggle (card 05) | Bright lime | `var(--lime-deep)` |

**Action:** Update CSS variables to align with Figma design system.  
Proposed values (verify against Figma file before applying):
```css
--lime: #C8FF00;
--lime-deep: #AADC00;
--lime-soft: rgba(200,255,0,0.15);
```
Update all derived uses: `--lime` in `.btn--lime`, `.fill`, `--lime-deep` in `.tick`, `.track>i`, `.toggle`, `.chk`.

---

### 2 · Body text justification missing — Published + Retail sections 🔴

| | Figma | Live |
|---|---|---|
| "Everything We Do Is Published" body paragraph | `text-align: justify` | `text-align: left` (default) |
| "Keep The Cleaning Working Between Visits" body paragraph | `text-align: justify` | `text-align: left` (default) |
| FAQ answer text | `text-align: justify` | `text-align: left` (default) |

Figma shows even right-edge text across these sections — consistent justified body copy.

**Action:** Add `text-align:justify;text-align-last:left` to:
- `.pub-copy p`
- `.retail-copy p`
- `.faq-a`
- `.sec-intro` (verify in Figma — possibly applies globally)

---

### 3 · Days of Protection — label bar (prot-bar) saturation 🟡

| | Figma | Live |
|---|---|---|
| Bottom label bar background | Lime-green gradient (more saturated) | `rgba(201,196,43,0.82)→rgba(222,224,168,0.82)` (olive/muted) |

The Figma prot-bar reads as a true lime green, not the current warm olive. Once the lime CSS variables are updated (finding #1), update the gradient to use the new lime values:

**Action (after #1):**
```css
.prot-bar { background: linear-gradient(to right, rgba(200,255,0,0.75), rgba(200,255,0,0.45)); }
```

---

### 4 · Compare section — "sec-intro" paragraph color 🟡

| | Figma | Live |
|---|---|---|
| Intro paragraph ("Every time you book a cleaner…") | Text appears to match body ink color (`--ink` level) | `color:var(--ink2)` = `#57524a` (lighter) |

Looking at Figma 03-compare, the intro text appears slightly darker/stronger than the secondary `--ink2` level.

**Action:** Verify in Figma. If confirmed, change `.sec-intro` to `color: var(--ink)` or apply justified alignment first and check visually.

---

### 5 · Hero — photo overlay darkness 🟢

| | Figma | Live |
|---|---|---|
| Overlay | Very subtle — background image is bright and well-lit, details clearly visible | `linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.20) 50%,rgba(0,0,0,.30))` |

Figma 01-hero shows a crisp, bright kitchen image with minimal darkening. The live overlay may be slightly heavier than intended at the top of the gradient.

**Action (low priority):** Consider reducing the overlay:
```css
background: linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.15) 50%, rgba(0,0,0,.28));
```

---

### 6 · Published section — "Read The Protocol™" button style 🟢

| | Figma | Live |
|---|---|---|
| Button | Pill with dark outline, transparent fill | `.btn--ghost` — transparent bg, 1px dark border |

Figma 05-published shows the protocol button as an outlined oval/pill. Live uses `.btn--ghost` which matches. ✓ *Confirmed match — no action needed.*

---

### 7 · Mock card content drift (content, not design) 🟢

| Mock | Figma | Live | Note |
|---|---|---|---|
| Chat with Nova — quoted price | $104 / visit | $130 / visit | Copy may be intentional |
| Cleaner Dispatch copy | "knows your listing" | "knows your home" | Airbnb vs Home context |

These are copy-level differences, not design mismatches. Flag with content owner if the Figma is the canonical source.

---

## Action checklist

| # | Finding | File(s) to edit | Effort |
|---|---|---|---|
| 1 | Update `--lime`, `--lime-deep`, `--lime-soft` CSS variables | `index.html` `:root` | S |
| 2 | Add `text-align:justify;text-align-last:left` to `.pub-copy p`, `.retail-copy p`, `.faq-a` | `index.html` CSS | S |
| 3 | Update `.prot-bar` gradient saturation (after #1) | `index.html` CSS | XS |
| 4 | Verify `.sec-intro` color against Figma | — | XS |
| 5 | Soften hero overlay gradient (optional) | `index.html` CSS | XS |
| 6 | Verify copy — Nova quote price + cleaner dispatch line | `index.html` HTML | — |

---

## Sections confirmed matching ✓

- NAV — logo, links, sticky cream bg, Book button style
- Hero — layout, cap font, headline structure, ticker bar
- Services cards — 3-column grid, tag style (uppercase via CSS), hover scale
- Compare — white bg, table header taupe bg, butter column bg, tick/xmark marks, border/radius
- Days of Protection — cream section bg (`--cream`), 3-column image bands, label step text, scroll-scrub animation
- Everything Published — layout (2-col), blueprint card, bp-item typography
- Retail — 2-col layout, image radius, button style (dark fill)
- Testimonial — dark photo bg, quote size, avatar, stats row
- How-It-Works — card layout (2-col mock + copy), step number in serif italic, 5 cards total
- FAQ — 2-col layout, bordered accordion items, first-open state
- CTA — dark bg `#181611`, large italic uppercase title in white, lime CTA + text link
- Footer — 4-column grid, divider, logo in white, legal bar, social links
