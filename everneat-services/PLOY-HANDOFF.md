# Figma design-gap audit — what changed, page by page

Handoff list for Ploy. Everything below is **already merged into `main`** in this prototype
(PRs #43, #44, #45). Use it to mirror the same changes in the real implementation.

Source of truth for every item is a Figma text node or a node export, never a screenshot —
screenshot OCR misread `$56.50/hr` as `$68.50/hr` once, so all copy here came from
`<text name="...">` and all images were compared by perceptual hash against `download_assets`
output.

**Hash bands used throughout:** 0 identical · ≤13 same photo, different crop · 14–60 related ·
\>60 unrelated photo.

---

## 1. Pages with real content or image changes

### `index.html` — home  ·  Figma `7706:310`

| Change | Detail |
|---|---|
| Before/after photos | Was reusing the **Airbnb** bedroom pair off the CDN. Design has a bathroom-vanity pair (node `8465:24668`). Now `assets/home-before.jpg` (744×900) + `assets/home-after.jpg` (745×900). |
| Hero headline | Holds **one line at ≥1440px**. Removed the `max-width:1080px` that was forcing a wrap. When it does wrap, the second line starts at **"every"** — `.hh-lead` and `.hh-tail` are `white-space:nowrap` at ≥901px, so that is the only available break point. Below 901px it wraps freely with `text-wrap:balance`. |
| Days of Protection | Scroll-scrubbed film. Full spec in `SCROLL-SCRUB-SPEC.md` — read that one, it has the 8 load-bearing rules and the verification traps. |
| Step headers | Sans at weight **800**, not the serif. PP Editorial New only ships 200/400, so asking for 800 there synthesises faux-bold and smears the strokes. |
| Active step | `rgba(201,196,43,.78)` — lime with transparency so the film reads through. Alpha was set by contrast measurement, not by eye: a translucent lime surface is what put the original bar at 1.26:1. |

### `home-cleaning/index.html`  ·  Figma `7756:454`

| Change | Detail |
|---|---|
| Before/after photos | Same fix as home — was pulling the Airbnb pair, now uses `assets/home-before.jpg` / `home-after.jpg`. |
| Copy | "The difference you feel" → **"The difference you'll feel"**. |
| FAQ image | Added `loading="lazy"`. The image itself (`airbnb-compare.jpg`) is correct — an earlier "fix" here was **wrong and got reverted**; see finding 7 in `DESIGN-GAP-AUDIT.md`. |

### `airbnb-cleaning/index.html`  ·  Figma `7991:6627`

Plans and the pricing matrix were **rewritten wholesale** — the design renamed every tier and
changed all the numbers.

| Was | Now |
|---|---|
| Solo Host · 1–2 units · from $99 | **Host** · 1 unit · from **$117** · $58.50/hr |
| (Property Manager) · 6–30 units · Custom | **Property Manager** · 2–9 units · from **$113** · $56.50/hr |
| One-off · single booking | **Enterprise** · 10+ units · from **$110** · $55/hr |

Every bullet under each plan changed too, plus all six matrix rows (Studio → 4BR+) and the
three column rate headers. Full text is in the page; diff it rather than retyping.

> Left open deliberately: `Your quote · 2–4 hrs` and `Park Ave #5E` sit inside a leaked mock
> in the design and are not real copy.

### `commercial-cleaning/index.html`  ·  Figma `8068:163`

FAQ image swapped `commercial-faq.jpg` → `commercial-compare.jpg`.

> Open question for design: `commercial-compare.jpg` is now used **twice** on this page, and the
> asset map lists no compare slot for Commercial.

### `event-cleaning/index.html`  ·  Figma `8068:1034` / hero `8068:1036`

Hero photo replaced. The old `modern-art-gallery-stockcake.jpg` was a **stock placeholder** the
handoff had flagged under ASSETS TO REPLACE; the design now holds real Everneat event
photography. Now `assets/event-hero.jpg` (1920×1072), hash distance **1** to the export.

Note this is a **CSS `background:url()`**, not an `<img>` — it is easy to miss when auditing.

### `careers/index.html`  ·  Figma `8190:21109`

Both photos had been replaced in the design and never synced — hash distance **79** and **127**.

| Slot | Was | Now |
|---|---|---|
| "We invest in the people who clean." | office vacuuming, 541×416 | `careers-bedroom.jpg` 896×1138 |
| Benefits panel | marble kitchen, 720×720 | `careers-office.jpg` 814×768 |

Both crops were *solved*, not eyeballed: slide a window of the design's aspect over the raw
source, pick the offset that minimises hash distance to the node export. Both land at **2**.

Plus four layout fixes:
- `.cr-invest-img img` aspect `574/459` → **`574/729`** — the design slot is portrait; the build
  was cropping the photo to landscape.
- Jobs table `Role` column header was an empty `<span>`. The design has it (node `8190:21147`).
- Jobs grid gutter `24px` → **`56px`**, which makes `1.28fr 1fr 1fr` resolve to the design's
  `469 / 365.5 / 365.5` at 1312 wide.
- Benefit icons rendered at 40px against the design's **49px** box. Artwork was already correct —
  SVG path-data hashes are identical to the Figma vectors — only the size was off.

All copy on this page was already at parity.

### `blog/index.html` + `blog/article/index.html` — new

Live from the landing API, replacing the static list:

```
GET https://vriaxdtfduddjupiwiyx.supabase.co/functions/v1/landing-api/v1/landing/blogs
    ?platform=clean_everneat_co&page=<n>&limit=20
```

- Index: server-side pagination via `?page=`, featured card = first item of page 1, skeletons,
  retry on failure.
- Article: `?id=`, renders `content.html`, builds a TOC from `h2`s with scrollspy, computes read
  time.
- **Category pills and search were removed on purpose** — the API honours only `page`/`limit`,
  and `blogCategories` is null on all 29 records. Do not rebuild them until the API supports it.
- `blog/sample-article/index.html` — link fix only.

---

## 2. Site-wide changes (every page)

All three land on the **same 14 files**:

```
index.html                            home-cleaning/index.html
about/index.html                      office-cleaning/index.html
contact/index.html                    airbnb-cleaning/index.html
press/index.html                      commercial-cleaning/index.html
careers/index.html                    event-cleaning/index.html
blog/index.html                       blog/article/index.html
blog/sample-article/index.html        service-areas/nyc/astoria/index.html
```

| Change | Detail |
|---|---|
| **Lime brand token** | `--lime` `#C8FF00` → **`#C9C42B`**, `--lime-deep` `#AADC00` → `#ABA725`, `--lime-soft` → `rgba(201,196,43,0.15)`. Plus two hard-coded spots per page the token does not reach: the `.cmp-ev` background and the `.track>i` gradient. |
| **Instagram handle** | `instagram.com/everneat` → **`instagram.com/everneat.co`** |
| **"Cleaning Guides" nav link** | to `/blog/`, in both the desktop nav and the mobile drawer |

Pages carrying **only** these site-wide changes (no content or image work of their own):
`about/`, `contact/`, `press/`, `office-cleaning/`, `service-areas/nyc/astoria/`.

> `office-cleaning/` also got a **replaced image asset** — `office-feature.jpg` was swapped in
> place, so the `src` is unchanged and the diff shows nothing. Re-export it.

> LinkedIn (`/company/everneat`, 16 links) and Substack (`everneat.substack.com`, 14 links) were
> **left untouched** — nobody confirmed those handles. Verify before changing.
> The Instagram handle could not be verified either: Instagram returns HTTP 200 for profiles that
> do not exist.

---

## 3. Asset inventory

| File | State |
|---|---|
| `assets/home-before.jpg` (744×900) | **new** |
| `assets/home-after.jpg` (745×900) | **new** |
| `assets/careers-bedroom.jpg` (896×1138) | **new** |
| `assets/careers-office.jpg` (814×768) | **new** |
| `assets/event-hero.jpg` (1920×1072) | **replaced** |
| `assets/office-feature.jpg` | **replaced in place** — same filename, new photo |
| `assets/protect-tech.mp4` (6.47 MB, 12.4 s) | scroll-scrub film, see `SCROLL-SCRUB-SPEC.md` |
| `assets/careers-team.png` | **deleted** |
| `assets/careers-kitchen.png` | **deleted** |

`careers-icon-1/2/3.svg` are unchanged — their path data already matches Figma exactly.

---

## 4. Fix at the design source, not in code

These are errors in the Figma file. Do not implement them.

- `Oven deeo clean` — typo, appears on 2 pages.
- The **Office** frame carries Airbnb/residential copy that does not belong to it.
- The Office/Commercial protocol drawers had an Airbnb-copy leak the build already caught:
  `commercial-cleaning` renamed Figma's "guest amenities" to "supply restock".

## 5. Still open

- **HOME V2** (`7706:310`) content diff never ran — its metadata returns inline instead of
  spilling to a file, so the diff pipeline has no input.
- **Reverse-direction diff** never ran: build copy that is absent from the design.
- Un-hashed image slots: NAV-HERO-BANNER and the testimonial slots on Home Cleaning / Airbnb /
  Office; Commercial hero; the NYC template; About and Contact. Press is blocked by trap 6.
- `FIGMA-MAP.md` trap 7 is stale — disproven for Home V2, still unchecked on the other four pages.

---

## Two traps worth repeating

1. **`download_assets` returns empty for a node that does not exist — it does not error.** I
   claimed the home before/after was invented three times off an empty result for node
   `8142:16310`. That node is not real; the photos are at `8465:24668`. Confirm every node with
   `get_metadata` before concluding anything from an empty export.

2. **Frame export size is not a change detector.** Node `7706:310` returned exactly 1,506,554
   bytes on four consecutive calls while its content had genuinely changed.
