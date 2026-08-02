# Design Gap Audit — images & content

**Started:** 2026-08-02
**Figma:** `is60g7wqOcvweINNhvNUMT` — *Everneat Services (new website)*, page **Final** (`0:1`)
**Scope:** what differs between Figma and the built prototype, so implementation knows what to change.
**Predecessors:** `airbnb-cleaning/DESIGN-AUDIT.md` and `v2/DESIGN-AUDIT.md` (2026-07-24) covered fonts,
colour tokens and backgrounds. This pass is **images and content only**.

Method and node IDs come from `FIGMA-MAP.md`. Comparisons are perceptual-hash
(`ahash`, 16×16), distances read as: **0** identical · **≤13** same photo different crop/encode ·
**14–60** related but different · **>60** unrelated.

## Severity key
- 🔴 High — wrong or invented content facing users
- 🟡 Medium — correct content, wrong plumbing (path/provenance)
- 🟢 Low — housekeeping, no user-visible effect

## Status
| Page | Node | Images | Content | State |
|---|---|---|---|---|
| HOME V2 | `7706:310` | audited | partial | **in progress** |
| HOME CLEANING | `7756:454` | — | — | not started |
| AIRBNB | `7991:6627` | — | — | not started |
| OFFICE | `8007:10293` | — | — | not started |
| COMMERCIAL | `8068:163` | — | — | not started |
| EVENT | `8068:1034` | — | — | not started |
| NYC template | `8079:163` | — | — | not started |
| BLOG / ARTICLE | `8119:173` / `8112:173` | — | — | superseded, see note |
| PRESS | `8190:20920` | — | — | blocked (trap 6) |
| Careers / About / Contact | `8190:21109` / `8190:22023` / `8190:22067` | — | — | not started |

---

# HOME V2 — `7706:310` → `index.html`

## Verified matching — no action

| Slot | Node | Prototype asset | Distance |
|---|---|---|---|
| Hero | `7709:366` | `assets/hero-bg.jpg` | **0** identical |
| Service card — home | `8142:16447` | `assets/card-home.jpg` | **0** identical |
| Service card — airbnb | `8142:16460` | `assets/card-airbnb.jpg` | **0** identical |
| Service card — office | `8147:17446` | `assets/card-office.jpg` | **0** identical |
| FAQ image | `8142:16399` | `cdn…/services/airbnb-cleaning/airbnb-faq.jpg` | **0** identical |
| Retail card | `8142:16615` | `assets/retail.jpg` | **9** same photo, different crop |

Trap 3 confirmed: the two stacked office cards (`8142:16457` / `8147:17446`) are the same photo at
distance 1. The prototype matches the one that renders on top.

---

## Findings

### 1 · Before/after section is invented — the design has nothing there 🔴

`8142:16310` returns `export: null`, `rawImages: []`. Not "an empty frame with a fill" — the node
renders to nothing at all. Trap 7 already recorded that Home V2, Home Cleaning, Office, Commercial
and Event all have an empty before/after report and **only Airbnb has real artwork**.

The prototype nevertheless ships a working before/after on the homepage, borrowing Airbnb's photos:

```
cdn.everneat.co/assets/services/airbnb-cleaning/airbnb-before.jpg
cdn.everneat.co/assets/services/airbnb-cleaning/airbnb-after.jpg
```

So the homepage presents an Airbnb bedroom turnover as its own before/after. **Decision needed** —
this is a content question, not a bug to silently fix:

- **(a)** Source real homepage before/after photography → then this becomes a Drive/S3 task.
- **(b)** Keep the Airbnb pair deliberately, and caption it honestly as a short-let turnover.
- **(c)** Drop the section from the homepage to match the design.

Same question applies to Home Cleaning, Office, Commercial and Event when those pages are audited.

---

### 2 · Hero has a Drive original but ships as a local Figma export 🟡

`FIGMA-MAP.md` sets the provenance rule: `cdn.everneat.co/...` means it came from Drive and is
official; a local `assets/...` path means a Figma export with **no Drive original yet**.

The hero is referenced as local `assets/hero-bg.jpg` — but a Drive original does exist. The Figma
raw image for `7709:366` is **7,439,861 bytes**, byte-for-byte the size of `Kitchen Deep Cleaning.png`
in the Drive folder. So the local path understates provenance.

| | |
|---|---|
| Figma source | 2752×1536 PNG, 7.44 MB |
| Prototype ships | 1920×1072 JPEG, 345 KB (`assets/hero-bg.jpg`) |
| Match | distance **0** |

**Action:** push the Drive original through the pipeline (max 2560px, JPEG q82 progressive) to
`s3://everneat/assets/...`, switch the reference to the CDN path, delete the local file. Note the
Figma source at 2752px **exceeds the 2560px pipeline cap**, so it will be downscaled on the way.

The same check is worth running on the other four local references on this page:
`card-home.jpg`, `card-airbnb.jpg`, `card-office.jpg`, `retail.jpg`, `protect.jpg`,
`avatar-home.jpg`, `cleaner-avatar.jpg`.

---

### 3 · An image in the service-cards row is unused 🟡

`8142:16446` (the row) yields 8 raw images. Three are the service cards, and the stacked office
duplicate accounts for a fourth. But `fig_cards_1` — **1376×768** — is unrelated to every prototype
card (distances 97 / 125 / 128).

Not yet identified: it may be a row background, a fourth card that was cut, or a decorative layer.
**Action:** open `8142:16446` in Figma and identify that layer before deciding whether the prototype
is missing something.

---

### 4 · `assets/faq.jpg` is unused and is a different photo 🟢

The homepage FAQ correctly uses the CDN image (distance 0 to Figma). The local `assets/faq.jpg`
(502×762, 327 KB) is a **different photo** — distance 34 — and nothing on the homepage references it.

**Action:** confirm no other page uses it, then delete. This is the "reference pointing at the wrong
existing file" class the map warns about, caught before it caused a mismatch.

---

### 5 · Days of Protection band no longer corresponds to the design 🟡

`8142:15581` (phases band) returns **`rawImages: []`** with a 2,483-byte export — the design's band
carries no photograph, consistent with the map's "1 photo + 2 colour blocks" where the blocks are
flat fills.

That section has since been rebuilt as a **full-bleed scroll-scrubbed video** (see
`SCROLL-SCRUB-SPEC.md`), which is a deliberate departure from the Figma design, not drift.

**Action:** none on the prototype. Figma should be updated to match the shipped design, or this
divergence recorded so a future audit doesn't "fix" it back.

---

### 6 · CDN paths do not reflect which page uses the asset 🟢

Four homepage images are served from `…/services/airbnb-cleaning/` and one from
`…/services/home-cleaning/`, including the homepage FAQ image which is verified correct.

Cosmetic today, but it makes provenance hard to reason about and invites exactly the wrong-file
mistakes this audit is looking for. **Action:** consider a `services/home/` or shared `home-v2/`
prefix on the next upload pass. No user-visible effect — do not churn URLs just for tidiness.

---

## Not yet done on this page
- **Content/copy diff** — headings, body copy and CTA labels against the Figma text layers.
- Remaining slots: compare-photo `8142:15811`, testimonial bg/avatar `8142:16162` / `8142:16167`,
  cleaner avatar `8142:16226` (trap 5 — this one renders as a CSS gradient, so image diffing is blind
  to it and it needs a grep, not a hash).

## Note on BLOG / ARTICLE
`8119:173` and `8112:173` were built from Figma and have since been rewired to the landing API
(`blog/` and the new `blog/article/?id=`). Their imagery is now CMS-driven, so a Figma image audit no
longer applies to the card/hero slots — only to chrome and layout.
