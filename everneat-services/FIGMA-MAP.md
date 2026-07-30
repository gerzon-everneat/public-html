# Figma → prototype map

Reference for the Everneat Services site. Saves re-deriving node IDs every session.

**File:** `is60g7wqOcvweINNhvNUMT` — *Everneat Services (new website)*
**Link shape:** `https://www.figma.com/design/is60g7wqOcvweINNhvNUMT/Everneat-Services--new-website-?node-id=<NODE>`
(node IDs use `-` in URLs, `:` in the API — `7706-310` = `7706:310`)

All designs live on one page: **Final** (`0:1`).

---

## Pages

| Figma node | Figma frame | Prototype | Live |
|---|---|---|---|
| `7706:310` | HOME V2 | `index.html` | `/everneat-services/` |
| `7756:454` | HOME CLEANING PAGE | `home-cleaning/` | `/home-cleaning/` |
| `7991:6627` | AIRBNB CLEANING PAGE | `airbnb-cleaning/` | `/airbnb-cleaning/` |
| `8007:10293` | Office Cleaning – page *(section)* | `office-cleaning/` | `/office-cleaning/` |
| `8068:163` | Commercial Cleaning – page *(section)* | `commercial-cleaning/` | `/commercial-cleaning/` |
| `8068:1034` | Event Cleaning – page *(section)* | `event-cleaning/` | `/event-cleaning/` |
| `8079:163` | NYC Location Template `{{Neighborhood}}` | `service-areas/nyc/astoria/` | |
| `8112:173` | ARTICLE PAGE | `blog/sample-article/` | |
| `8119:173` | BLOG PAGE | `blog/` | |
| `8190:20920` | PRESS PAGE | `press/` | **BLOCKED** — see traps |
| `8190:21109` | Careers | `careers/` | |
| `8190:22023` | About Company 1 | `about/` | |
| `8190:22067` | Contact | `contact/` | |
| `8178:463` | FAQ LIBRARY – by service | *no page* | FAQ + JSON-LD source |
| `8145:16918` | Help Center – Category | *no page* | |
| `8230:1151` | HANDOFF – Gerzon | *not a page* | build spec |

---

## Image slots by page

Only slots that hold a photograph. `EMPTY` = the design has a flat colour fill, no image.

### HOME V2 `7706:310`
| Node | Slot |
|---|---|
| `7709:366` | hero |
| `8142:16446` | service cards row |
| `8142:16447` / `8142:16460` / `8147:17446` | home / airbnb / office card |
| `8142:15811` | compare-photo |
| `8142:16310` | before/after — **EMPTY** |
| `8142:15581` | phases band (1 photo + 2 colour blocks) |
| `8142:16615` | retail card |
| `8142:16162` | testimonial background |
| `8142:16167` | testimonial avatar |
| `8142:16226` | cleaner avatar, Protocol step 02 |
| `8142:16399` | FAQ image |

### HOME CLEANING `7756:454`
| Node | Slot |
|---|---|
| `7756:456` | NAV-HERO-BANNER |
| `7778:1466` | feature panel (pills) |
| `8007:9236` | compare-photo |
| `7953:1380` | before/after — **EMPTY** |
| `7963:2050` | tailor-strip — 5 thumbs + 1 empty |
| `7814:1765` / `7814:1770` | testimonial bg / avatar |
| `7953:1458` | FAQ image |

### AIRBNB `7991:6627`
| Node | Slot |
|---|---|
| `7991:6629` | NAV-HERO-BANNER |
| `7992:7335` | compare-photo |
| `7991:7147` | before/after — **the only page with real ones** |
| `8007:10236` | tailor-strip |
| `7991:6999` / `7991:7004` | testimonial bg / avatar |
| `7991:7208` | FAQ image |

### OFFICE `8007:10293`
| Node | Slot |
|---|---|
| `8007:12130` | NAV-HERO-BANNER |
| `8007:12241` | feature panel |
| `8007:12761` | before/after — **EMPTY** |
| `8007:12557` | tailor-strip |
| `8007:12613` / `8007:12618` | testimonial bg / avatar |
| `8007:12855` | FAQ frame |

### COMMERCIAL `8068:163`
| Node | Slot |
|---|---|
| `8068:165` | hero |
| `8068:225` | showcase-inner |
| `8096:14265` | before/after — **EMPTY** |
| `8096:14452` | FAQ frame |

### EVENT `8068:1034`
| Node | Slot |
|---|---|
| `8068:1036` | hero |
| `8068:1096` | showcase — **no photo by design**, flat sage + pills |
| `8068:1113` | compare-photo |
| `8118:14873` | before/after — **EMPTY** |
| `8118:14960` | FAQ frame |

### Others
`8079:180` nyc-hero — SVG map, no photograph · `8261:24237` NYC compare · `8112:214` article featured · `8119:204` blog featured

---

## Traps

**1. "Home 7756:454" in the handoff is the home-cleaning page, not the homepage.**
The handoff's page inventory omits the homepage entirely. The homepage is HOME V2 `7706:310`.

**2. `8392:24599` "Gallery of Services" is a standalone artboard, not the homepage cards.**
The real homepage cards are `8142:16446`. The two frames hold *different images*. Auditing the artboard produces wrong conclusions.

**3. Two Office cards are stacked** at the same position in `8142:16446` — `8142:16457` and `8147:17446`. The later one renders on top; that's the one to match.

**4. `dr-hero` (×12) and `nyc-hero` are not images.**
`dr-hero` is a text header block; `nyc-hero` is an SVG map. Name-based scans mislabel them.

**5. Some slots have no `<img>` element at all.**
The cleaner avatar rendered as a CSS gradient circle (`.avatar{…background:linear-gradient(…)}` + `<span class="avatar"></span>`). Image-to-image comparison cannot see these — grep for gradient backgrounds on image-sized boxes.

**6. Press page is BLOCKED.** The handoff asks whether Domino / Martha Stewart / Apartment Therapy / Epicurious / Real Simple / The Kitchn / Design + Decor are *real* placements: *"If not, build a media-kit (no false claims)."* Unresolved.

**7. Before/after photo report is empty in the design** on Home V2, Home Cleaning, Office, Commercial and Event. Only Airbnb has real artwork. Nothing to source from Figma or Drive.

---

## Asset provenance rule

- **`cdn.everneat.co/...`** → came from Drive. Official.
- **local `assets/...`** → Figma export; **no Drive original exists yet**.

Never upload Figma exports to S3 — that's what keeps the CDN path meaningful. When a photo lands in Drive, push it to S3 and switch the reference; the local file goes away.

**Drive:** `https://drive.google.com/drive/folders/1-iKUxJT2FKSM9hwNJlqreiHoZ0ZBR4od`
Folders: Homepage · Home · Airbnb · Office · Commercial · Event · Press Logos

**S3:** `s3://everneat/assets/...` → `https://cdn.everneat.co/assets/...`
Upload with `--cache-control "public, max-age=31536000"`. Pipeline: max 2560px, JPEG q82 progressive.

### Pulling Drive files without blowing context
`download_file_content` returns base64 inline — but oversized results spill to a file on disk instead. Decode from there at zero context cost:

```python
d = json.load(open(spilled_path, encoding='utf-8'))
open(out, 'wb').write(base64.b64decode(d['content']))
```

Files **over ~6 MB fail** with "session expired" and must be downloaded by hand.

---

## Audit method that works

1. **Look at the page first.** Load it and compare against Figma by eye. Measurement confirms; it doesn't discover.
2. Walk **page frames from the page root** — never standalone artboards (trap 2).
3. Grep for **CSS-only placeholders** — image-diffing misses them (trap 5).
4. Then perceptual-hash Figma assets against the prototype and CDN:

```python
def ahash(p, s=16):
    im = Image.open(p).convert('L').resize((s, s), Image.LANCZOS)
    px = list(im.getdata()); a = sum(px) / len(px)
    return int(''.join('1' if v > a else '0' for v in px), 2)
# hamming distance: 0 identical · <=13 same photo, different crop · >60 unrelated
```

Most mismatches found so far were **references pointing at the wrong existing file** — not missing assets.
