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
| HOME V2 | `7706:310` | audited, re-checked 08-03 | partial | **in progress** |
| HOME CLEANING | `7756:454` | FAQ (finding 7 retracted), compare + tailor-strip verified | — | **in progress** |
| AIRBNB | `7991:6627` | before/after, compare, FAQ verified | — | **in progress** |
| OFFICE | `8007:10293` | feature **fixed**, FAQ ok | — | **in progress** |
| COMMERCIAL | `8068:163` | FAQ **fixed**, showcase ok | — | **in progress** |
| EVENT | `8068:1034` | hero **fixed**, compare + FAQ ok | — | **in progress** |
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

### 4 · `assets/faq.jpg` is a different photo, reused on the NYC page 🟢

The homepage FAQ correctly uses the CDN image (distance 0 to Figma). The local `assets/faq.jpg`
(502×762, 327 KB) is a **different photo** — distance 34 — and the homepage does not reference it.

It is **not** dead, though: `service-areas/nyc/astoria/index.html` uses it in the phases band, with
alt text about "living probiotic shield staying active on clean bathroom surfaces". So it is a
genuine asset serving a different page, not a stray file.

**Action:** none on the homepage. When the NYC template is audited (`8079:163`), check that this photo
is what its design actually calls for — a shared local file used by exactly one page is the shape
that later gets deleted by mistake.

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


---

# Re-check — 2026-08-03

Figma was reported updated. Re-ran the HOME V2 slots against the 08-02 baselines.

**HOME V2 is unchanged.** The frame export is byte-identical at **1,506,554 bytes**, the hero
export at **2,147,108**, and `8142:16310` still returns `export: null` with no images — so finding 1
(the invented before/after) stands exactly as written, and findings 2–6 are unaffected.

Byte-identical export sizes are a cheap change detector. Recording them here so the next re-check
does not have to re-download and re-hash a frame that has not moved:

| Node | Frame | export sizeBytes |
|---|---|---|
| `7706:310` | HOME V2 | 1,506,554 |
| `7709:366` | hero | 2,147,108 |
| `8142:16310` | before/after | *null — no export* |
| `8142:15581` | phases band | 2,483 |

---

# HOME CLEANING — `7756:454` → `home-cleaning/`

### 7 · ~~FAQ image was the wrong photo~~ — **RETRACTED, the page was already correct** ⛔

**This finding was wrong and the "fix" has been reverted.** Recorded in full because the mistake is
instructive.

The claim was that home-cleaning's FAQ slot `7953:1458` shipped an unrelated photo at distance 107.
It does not. The Figma image for that slot is `airbnb-compare.jpg` at **distance 0** — the page was
correct all along.

What went wrong: the markup was grepped correctly and the `src` read as `airbnb-compare.jpg`, but the
hash was then run against **`airbnb-faq.jpg`** — a different file in the same CDN folder. That
produced 107, which looked like a real mismatch. The alt text matching the Figma image was taken as
corroboration, when in fact it was corroborating that the page was *already right*.

Reverted: `assets/home-cleaning-faq.jpg` deleted (it was a byte-identical duplicate of a CDN asset
the site already served) and the `src` restored to the CDN path. `loading="lazy"` was kept — the FAQ
sits below the fold, so that part was an independent improvement.

**The lesson, which the very next round then re-learned as a near-miss:** resolve the comparison
target from the markup and hash *that exact URL*. Never substitute a same-folder filename that looks
like the right one. Two of this audit's four "mismatches" so far have been this error, not a defect —
one caught before it shipped, this one caught only a round later.

### Still to do on this page
NAV-HERO-BANNER `7756:456`, feature panel `7778:1466`, compare-photo `8007:9236`, tailor-strip
`7963:2050`, testimonial bg/avatar `7814:1765` / `7814:1770`. Before/after `7953:1380` is EMPTY in
the design (trap 7) yet the page ships the Airbnb pair — **same decision as finding 1**.

Note this page also carries five local `addon-*.jpg` files and `airbnb-avatar.jpg` /
`cleaner-avatar.jpg` that have not been hashed against Figma yet.


---

# Re-check 2 — 2026-08-03 (second reported update)

**HOME V2 unchanged again.** Frame export still **1,506,554 bytes** — byte-identical across all
three checks now (08-02, and twice on 08-03). Findings 1–6 stand untouched.

Blind probing has cost two rounds for no result, so frame-level export sizes are being recorded as
baselines from here on. A frame whose export size is unchanged does not need its slots re-hashed.

## HOME CLEANING — further slots

### Verified matching — no action

| Slot | Node | Prototype | Distance |
|---|---|---|---|
| compare-photo | `8007:9236` | `cdn…/home-cleaning/everneat-airbnb-cleaning-service-nyc.jpg` | **0** identical |
| tailor-strip ×5 | `7963:2050` | `assets/addon-{fridge,oven,laundry,cabinets,windows}.jpg` | **0** identical (all five) |

**Near-miss worth recording:** the compare slot first measured 109 (unrelated) because it was
compared against `airbnb-compare.jpg`. That is not the file the page ships. The correct image is
`everneat-airbnb-cleaning-service-nyc.jpg` — which lives under `home-cleaning/` but is *named*
"airbnb". Finding 6's naming confusion very nearly produced a false positive; always resolve the
`src` from the markup rather than from a plausible-looking filename.

### 8 · Add-on thumbnails are stored three times each 🟢

The five tailor-strip thumbs exist as byte-identical triplicates:

| Image | Copies |
|---|---|
| cabinets · fridge · laundry · oven · windows | `addon-*.jpg`, `airbnb-addon-*.jpg`, `office-addon-*.jpg` |

**5 unique images across 15 files — 10 redundant, ~35 KB.** All three sets are the same bytes, so
the Airbnb and Office pages are shipping copies rather than sharing.

Small in bytes, but it is three places to update when a thumbnail changes, and exactly the shape
that produces a page still showing last season's artwork. **Action:** collapse to one set and
repoint the Airbnb and Office pages. Low priority, zero visual risk.

### Still to do on this page
NAV-HERO-BANNER `7756:456`, feature panel `7778:1466`, testimonial bg/avatar `7814:1765` /
`7814:1770`. Before/after `7953:1380` is EMPTY in the design — same decision as finding 1.


---

# AIRBNB — `7991:6627` → `airbnb-cleaning/`

## Verified matching — no action

| Slot | Node | Prototype | Distance |
|---|---|---|---|
| before/after | `7991:7147` | `airbnb-before.jpg` / `airbnb-after.jpg` | **0** both |
| compare-photo | `7992:7335` | `airbnb-compare.jpg` | **0** identical |
| FAQ image | `7991:7208` | `airbnb-faq.jpg` | **7** same photo, different crop |

The before/after slot returns 4 raw images that resolve to 2 unique photos — the pair, duplicated.
Trap 7 holds: this is the only page where the before/after has real artwork, and the prototype
matches it exactly.

This page is the cleanest audited so far — every slot checked is correct.

### Still to do on this page
NAV-HERO-BANNER `7991:6629`, testimonial bg/avatar `7991:6999` / `7991:7004`. Note the page ships
both `airbnb-hero.jpg` and `airbnb-kitchen.jpg`; only one is in the hero, so the other needs placing.


---

# OFFICE — `8007:10293` → `office-cleaning/`

| Slot | Node | Prototype | Distance |
|---|---|---|---|
| FAQ | `8007:12855` | `cdn…/office-cleaning/office-faq.jpg` | **1** same photo |
| feature panel | `8007:12241` | `assets/office-feature.jpg` | **92 → 0 after fix** |

### 9 · Feature panel was a different photo — **fixed** 🔴 → resolved

Figma's feature panel is two cleaners in a bright white office with iMacs and a backpack vacuum.
The prototype shipped a man with an upright vacuum in a different office. The alt text —
*"An Everneat specialist vacuuming a modern office floor"* — fits both, which is how it went unseen.

Verified before acting, after the retraction of finding 7: `src` resolved from markup (`.feature` →
`assets/office-feature.jpg`), hashed against that exact file (**92, unrelated**), swept every local
asset (closest 74, so the correct image was not in the repo), and confirmed visually side by side.
Figma's node is 2752×1536 — exactly 2× the prototype's 1376×768, so it is the same slot.

**Fix:** replaced `assets/office-feature.jpg` in place at 1376×768, JPEG q82 progressive, 117 KB.
Now distance **0**. The reference and filename are unchanged — only the artwork.

---

# COMMERCIAL — `8068:163` → `commercial-cleaning/`

| Slot | Node | Prototype | Distance |
|---|---|---|---|
| showcase | `8068:225` | `commercial-showcase.jpg` | **0** identical |
| FAQ | `8096:14452` | `commercial-faq.jpg` → `commercial-compare.jpg` | **126 → 0 after fix** |

### 10 · FAQ image was the wrong photo — **fixed** 🔴 → resolved

The FAQ slot's design image is a cleaner at a wall of lockers. The page shipped
`commercial-faq.jpg`, which matches **nothing** in the design (126 / 130 / 154 against all three
Commercial nodes checked).

Because finding 7 was retracted for exactly this shape of claim, the node was rendered before acting
rather than trusted from the map's label. Node `8096:14452` unambiguously shows the FAQ accordion
("How is commercial cleaning priced?" and seven more) with the locker photo beside it. It is the FAQ.

The correct photo was already on the CDN — as **`commercial-compare.jpg`**. A misleading name, not a
missing asset. This is the "reference points at the wrong existing file" class the map predicts.

**Fix:** FAQ `src` repointed to `commercial-compare.jpg`. Distance now **0**.
`commercial-faq.jpg` is no longer referenced by any page.

### ⚠ Open question this creates
`commercial-compare.jpg` is now used **twice on the page** — in the compare section and the FAQ.
`FIGMA-MAP.md` lists **no compare slot for Commercial** (only hero, showcase-inner, before/after
EMPTY, FAQ), so the compare section may be a prototype invention like the before/after in finding 1.

Two photos are now unplaced: `commercial-faq.jpg` (matches no Commercial node) and whatever the
compare section should hold. **Decision needed** — do not resolve by guessing:
- **(a)** the compare section is intended → it needs its own photo, and `commercial-faq.jpg` may be it
- **(b)** the compare section is not in the design → remove it, and the duplicate resolves itself

---

# EVENT — `8068:1034` → `event-cleaning/` — **flagged, not yet hashed**

Markup extraction alone raises two questions before any Figma comparison:

1. **One file fills three slots.** `cdn…/event-cleaning/img-1040.jpg` is the resolved `src` for the
   showcase, feature and compare sections. A generic filename serving three slots is either a
   placeholder that was never replaced, or my section patterns collapsing onto one element — it
   needs checking against the design, not assuming.
2. **The page uses an Office asset.** `assets/office-cleaner-avatar.jpg` appears on the Event page.

Note the map says the Event showcase `8068:1096` has **no photo by design** (flat sage + pills), so
a photo there would be an addition rather than a mismatch.


---

# EVENT — `8068:1034` → `event-cleaning/`

| Slot | Node | Prototype | Distance |
|---|---|---|---|
| compare | `8068:1113` | `cdn…/event-cleaning/img-1040.jpg` | **0** identical |
| FAQ | `8118:14960` | `cdn…/everneat-event-cleaning-duolingo-nyc.jpg` | **4** same photo |
| hero | `8068:1036` | CSS bg → `modern-art-gallery-stockcake.jpg` | **134 → 1 after fix** |

### Both earlier Event flags retract
- *"One file fills three slots"* — wrong. `img-1040.jpg` appears **once**, in the compare section,
  and is correct at distance 0. My section patterns had collapsed onto the same element.
- *"Uses an Office asset"* — `office-cleaner-avatar.jpg` is the shared "Jazmin, lead cleaner"
  portrait in the *how* section. A naming quirk, not a wrong image.

### 11 · Event hero was a stock placeholder — **fixed**, and this is the Figma update 🔴 → resolved

**This is the change that could not be found from HOME V2.** The prototype carried a comment
explaining itself:

> *"Figma's event hero is modern-art-gallery-stockcake.jpg — stock, and the handoff lists stock
> under ASSETS TO REPLACE. Matched to design; swap when real event photography lands."*

The prototype was faithfully matching Figma at a time when Figma held a stock placeholder. **Figma
has since been updated**: node `8068:1036` now holds real Everneat event photography — two cleaners
sweeping and vacuuming a live event space with florals and brand booths. That is the update; it was
never on the homepage, which is why three byte-identical checks of `7706:310` found nothing.

Trap 5 applies here: the hero is a **CSS background**, not an `<img>`. The first comparison used
`assets/event-hero.jpg` — an orphan referenced nowhere — and only resolving `.hero-media`'s
`background:url(...)` found what actually ships.

**Fix:** exported node `8068:1036` at 1920×1072 (matching the home-hero convention, inside the
2560px cap), JPEG q82 progressive, 319 KB. Written over the orphaned `assets/event-hero.jpg`, which
retires the orphan and reuses the intended name. `.hero-media` repointed from the CDN stock file to
`../assets/event-hero.jpg`. Distance **1**.

The stale comment was rewritten — left as-is it asserted the design still held stock, which would
have led the next audit to "correct" this back to the placeholder.
