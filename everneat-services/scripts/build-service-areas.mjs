#!/usr/bin/env node
/**
 * Everneat — Service Areas builder.
 *
 * Fetches the Locations API server-side (here, at build time — this site is static
 * HTML with no request-time server) and writes fully-rendered, SEO-ready pages:
 *
 *   /service-areas/{region}          region directory   — Figma "NYC Hub" 8056:164
 *   /service-areas/{region}/{slug}   location detail    — Figma "NYC Location Template" 8079:163
 *                                                         and "Fairfield County Location Template" 8701:25834
 *
 * Nothing about the directory or the location copy lives in this file: every name,
 * slug, link, count and body block comes from the API. Re-run the script to publish
 * content changes — no page is ever hand-edited.
 *
 *   node everneat-services/scripts/build-service-areas.mjs
 *   node everneat-services/scripts/build-service-areas.mjs --dry     (fetch + report, write nothing)
 */

import { strict as a } from 'node:assert';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..');                  // everneat-services/
const OUT = join(SITE, 'service-areas');

const API_BASE = 'https://vriaxdtfduddjupiwiyx.supabase.co/functions/v1/landing-api/v1/locations';
const TIMEOUT_MS = 8000;
const DRY = process.argv.includes('--dry');

/**
 * ponytail: the API's `map` field points at Snazzy Maps embeds that load a RETIRED
 * Google Maps build (v3.31). They still return 200 but paint an empty grey box, and
 * the dead tile loop pegs the compositor. Preferring them would put a blank rectangle
 * in the hero of every location page, so the designed region map is used instead.
 * Flip this to true once the upstream embeds render — the code path is already here.
 */
const USE_API_MAP_EMBED = false;

/* ------------------------------------------------------------------ regions */
/* Route key, API slug, and the region-level chrome the Figma design fixes.
   `where` phrases are substituted per region; anything that would be a *claim*
   about a place (which locations exist, how many, what they're called) is read
   from the API instead — never written here. */
const REGIONS = [
  {
    key: 'nyc',
    apiSlug: 'nyc',
    label: 'NYC',
    long: 'NYC',
    state: 'NY',
    // Figma 8056:164, verbatim
    where: 'Manhattan, Brooklyn, and Queens',
    heroMap: 'nyc-hero-map.png',
    coverageMap: 'nyc-coverage-map.svg',
    faqImage: 'nyc-faq.png',
    manufacture: 'the probiotic technology we manufacture in Fairfield, CT',
    legendArea: 'Borough served',
  },
  {
    key: 'ct',
    apiSlug: 'connecticut',
    label: 'Connecticut',
    long: 'Fairfield County, CT',
    state: 'CT',
    // Figma 8701:25834, verbatim
    where: 'Fairfield County',
    heroMap: 'ct-hero-map.svg',
    coverageMap: 'ct-hero-map.svg',
    faqImage: 'faq.jpg',
    manufacture: 'the probiotic technology we manufacture right here in Fairfield, CT',
    legendArea: 'Region served',
  },
  {
    key: 'nj',
    apiSlug: 'new-jersey',
    label: 'New Jersey',
    long: 'New Jersey',
    state: 'NJ',
    // No NJ frame exists in Figma; the shared template is used with the region
    // label substituted. No NJ-specific map was designed, so the map card falls
    // back to the API-provided map (see mapSlot()).
    where: 'New Jersey',
    heroMap: null,
    coverageMap: null,
    faqImage: 'faq.jpg',
    manufacture: 'the probiotic technology we manufacture in Fairfield, CT',
    legendArea: 'Area served',
  },
];

/* ------------------------------------------------------------------- utils */
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const up = (n) => '../'.repeat(n);

/** Trusted first-party CMS HTML, but it still crosses a boundary — strip the
 *  things that could execute before it lands in a static page. */
function sanitizeHtml(html) {
  return String(html ?? '')
    .replace(/<\s*(script|style|iframe|object|embed|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, '$1="#"')
    .trim();
}

/** Does an HTML/text field carry anything worth rendering a section for? */
const hasContent = (v) => typeof v === 'string' && v.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim().length > 0;

/** "a, b, c" -> ['a','b','c'], de-duped, blanks dropped. */
const splitList = (v) => String(v ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)
  .filter((s, i, a) => a.indexOf(s) === i);

const validSlug = (s) => typeof s === 'string' && /^[a-z0-9][a-z0-9-]*$/i.test(s.trim());
const validName = (s) => typeof s === 'string' && s.trim().length > 0;

const validUrl = (u) => {
  if (typeof u !== 'string' || !u.trim()) return null;
  try {
    const parsed = new URL(u.trim());
    return /^https?:$/.test(parsed.protocol) ? parsed.href : null;
  } catch { return null; }
};

/**
 * "…and across Manhattan, Brooklyn, and Queens" reads as a stutter when the location
 * IS one of them (the Brooklyn page). Name the region instead in that case.
 */
function elsewhere(name, region) {
  return region.where.toLowerCase().includes(name.toLowerCase())
    ? `the rest of ${region.label}`
    : region.where;
}

/** "A, B, C, and D" */
function namesList(items, max) {
  const n = items.slice(0, max);
  if (n.length === 0) return '';
  if (n.length === 1) return n[0];
  return `${n.slice(0, -1).join(', ')}, and ${n[n.length - 1]}`;
}

/**
 * Split a sorted list into `cols` balanced columns without ever splitting a first
 * letter across two columns — so the A–G / H–N headers stay unambiguous.
 */
function columns(items, cols) {
  const letters = [];
  for (const item of items) {
    const initial = item.name.charAt(0).toUpperCase();
    const last = letters[letters.length - 1];
    if (last && last.initial === initial) last.items.push(item);
    else letters.push({ initial, items: [item] });
  }

  const n = Math.min(cols, letters.length);
  const out = [];
  let remaining = items.length;
  let i = 0;

  for (let c = 0; c < n; c++) {
    const colsLeft = n - c;
    const target = remaining / colsLeft;
    const bucket = [];
    while (i < letters.length) {
      const group = letters[i];
      // Every later column still needs at least one letter group of its own.
      if (bucket.length && letters.length - i <= colsLeft - 1) break;
      // Stop once adding this group would overshoot the target more than stopping undershoots it.
      if (bucket.length
        && Math.abs(bucket.length + group.items.length - target) >= Math.abs(bucket.length - target)) break;
      bucket.push(...group.items);
      remaining -= group.items.length;
      i++;
    }
    out.push(bucket);
  }
  while (i < letters.length) out[out.length - 1].push(...letters[i++].items);
  return out;
}

const rangeLabel = (col) => {
  const first = (col[0]?.name ?? '').charAt(0).toUpperCase();
  const last = (col[col.length - 1]?.name ?? '').charAt(0).toUpperCase();
  return first === last ? first : `${first}–${last}`;
};

/* --------------------------------------------------------------------- api */
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

/** Region directory: published records with a usable slug + name, A→Z by name. */
async function fetchRegionList(region) {
  const data = await fetchJson(`${API_BASE}/${region.apiSlug}?limit=200`);
  const list = Array.isArray(data?.list) ? data.list : [];
  return list
    .filter((l) => l && l.status !== 'draft' && validSlug(l.slug) && validName(l.name))
    .map((l) => ({ ...l, slug: l.slug.trim(), name: l.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** Location detail, region-scoped first, then the un-scoped fallback. */
async function fetchLocation(region, slug) {
  for (const url of [`${API_BASE}/${region.apiSlug}/${slug}`, `${API_BASE}/${slug}`]) {
    try {
      const rec = await fetchJson(url);
      if (rec && !rec.error && validSlug(rec.slug) && validName(rec.name)) return rec;
    } catch { /* try the fallback, then give up */ }
  }
  return null;
}

/* ------------------------------------------------------------------ chrome */
function head({ title, description, canonical, depth, bodyClass = '' }) {
  const R = up(depth);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${canonical ? `\n<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${R}assets/service-areas.css">
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>`;
}

function nav(depth) {
  const R = up(depth);
  const links = [
    [`${R}home-cleaning/`, 'Home'],
    [`${R}office-cleaning/`, 'Office'],
    [`${R}airbnb-cleaning/`, 'Airbnb'],
    [`${R}commercial-cleaning/`, 'Commercial'],
    [`${R}event-cleaning/`, 'Event'],
    ['https://www.everneat.co/', 'Shop Products'],
    [`${R}blog/`, 'Cleaning Guides'],
    [`${R}login/`, 'Login'],
  ];
  const items = (cls) => links.map(([h, t]) => `<a${cls} href="${h}">${t}</a>`).join(cls ? '\n        ' : '\n      ');
  return `<header class="nav">
  <div class="wrap nav-in">
    <a class="logo" href="${R}">everneat</a>
    <nav class="nav-links">
      ${items('')}
    </nav>
    <a class="btn btn--dark nav-book" href="${R}book/">Book&nbsp;&nbsp;&rarr;</a>
    <details class="nav-menu">
      <summary aria-label="Open menu"></summary>
      <div class="nav-drop">
        ${items('')}
        <a class="btn btn--dark" href="${R}book/">Book&nbsp;&nbsp;&rarr;</a>
      </div>
    </details>
  </div>
</header>`;
}

function crumbs(depth, trail) {
  const parts = trail.map((c, i) => {
    const last = i === trail.length - 1;
    const cell = last || !c.href
      ? `<li><span aria-current="page">${esc(c.label)}</span></li>`
      : `<li><a href="${c.href}">${esc(c.label)}</a></li>`;
    return i === 0 ? cell : `<li class="sep" aria-hidden="true">/</li>\n        ${cell}`;
  }).join('\n        ');
  return `<nav aria-label="Breadcrumb">
      <ol class="crumbs">
        ${parts}
      </ol>
    </nav>`;
}

/** Dark CTA + footer. Every footer variant points at /service-areas/{nyc,ct,nj}. */
function footer(depth, ctaCopy) {
  const R = up(depth);
  const S = `${R}service-areas/`;
  return `<footer class="dark">
  <div class="wrap cta">
    <h2 class="cta-title">A cleaning that stays clean.</h2>
    <p class="cta-copy">${ctaCopy}</p>
    <div class="cta-actions">
      <a class="btn btn--lime" href="#services">Find your service&nbsp;&nbsp;&rarr;</a>
      <a class="tlink" href="${R}contact/">Talk to a human</a>
    </div>
  </div>

  <div class="wrap"><hr class="foot-div"></div>

  <div class="wrap foot-cols">
    <div class="f-col">
      <h4>Services</h4>
      <a href="${R}home-cleaning/">Home</a><a href="${R}office-cleaning/">Office</a><a href="${R}airbnb-cleaning/">Airbnb / STR</a><a href="${R}commercial-cleaning/">Commercial</a><a href="${R}event-cleaning/">Event</a>
    </div>
    <div class="f-col">
      <h4>Method</h4>
      <a href="${R}the-protocol/">The Protocol&trade;</a><a href="https://www.everneat.co/">Products</a><a href="${R}blog/">Cleaning Guides</a><a href="${R}happiness-guarantee/">Happiness Guarantee</a>
    </div>
    <div class="f-col">
      <h4>Connect</h4>
      <a href="${R}contact/">Contact</a><a href="${R}about/">About</a><a href="${R}press/">Press</a><a href="${R}careers/">Careers</a>
    </div>
    <div class="f-col">
      <h4>Locations</h4>
      <a href="${S}nyc/">NYC &middot; Manhattan &middot; Brooklyn &middot; Queens</a><a href="${S}ct/">Fairfield County, CT</a><a href="${S}nj/">New Jersey</a><a href="${R}partners/">Become a partner</a>
    </div>
  </div>

  <div class="wrap"><hr class="foot-div"></div>

  <div class="wrap foot-bar">
    <span class="logo">everneat</span>
    <nav class="foot-legal">
      <span>&copy; 2026 Everneat</span><a href="${R}privacy/">Privacy</a><a href="${R}terms/">Terms</a><a href="${R}cookies/">Cookies</a><a href="${R}accessibility/">Accessibility</a>
    </nav>
    <nav class="foot-social">
      <a href="https://www.linkedin.com/company/everneat" rel="noopener">LinkedIn</a><a href="https://everneat.substack.com" rel="noopener">Substack</a><a href="https://www.instagram.com/everneat.co" rel="noopener">Instagram</a>
    </nav>
  </div>
</footer>

<script src="${R}assets/service-areas.js" defer></script>
<booking-widget></booking-widget>
<script src="https://everneat.neatr.ai/embed.js"></script>
</body>
</html>`;
}

const GENERATED = (region, extra = '') =>
  `<!-- Generated by everneat-services/scripts/build-service-areas.mjs from the Everneat Locations API (${region.apiSlug}).\n     Do not hand-edit: re-run the script instead. ${extra} -->\n`;

/* -------------------------------------------------- shared page components */

/** Map card. Prefers the API-provided map (see USE_API_MAP_EMBED); otherwise the
 *  designed region map. Returns '' when neither exists, and the hero goes single-column. */
function mapSlot(region, loc, depth, alt) {
  const R = up(depth);
  const apiMap = USE_API_MAP_EMBED ? validUrl(loc?.map) : null;
  const inner = apiMap
    ? `<div class="map-embed"><iframe src="${esc(apiMap)}" title="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`
    : region.heroMap
      ? `<img src="${R}assets/${region.heroMap}" alt="${esc(alt)}" width="608" height="439" loading="lazy">`
      : '';
  if (!inner) return '';
  return `<div class="map-card">
        ${inner}
        <div class="map-legend">
          <div class="lg"><i class="pin"></i><span>Active service pin</span></div>
          <div class="lg"><i class="served"></i><span>${esc(region.legendArea)}</span></div>
          <div class="lg"><i class="notyet"></i><span>Not yet covered</span></div>
        </div>
      </div>`;
}

/**
 * The API-driven directory: map card + balanced alphabetical columns.
 * `current` (a slug) is marked "you are here" and is not linked to itself.
 * Renders an intentional empty state when the API returns nothing usable.
 */
function directory(region, locations, depth, current) {
  const R = up(depth);
  const S = `${R}service-areas/${region.key}/`;

  const map = region.coverageMap
    ? `<div class="cov-map">
        <img src="${R}assets/${region.coverageMap}" alt="Coverage map of Everneat's ${region.label} service area" width="358" height="307" loading="lazy">
        <div class="cov-map-foot">
          <span class="lg"><i></i>Live service area</span>
          <span class="ct">${locations.length} ${locations.length === 1 ? 'location' : 'locations'}</span>
        </div>
      </div>`
    : '';

  if (!locations.length) {
    return `<div class="cov-grid">
      ${map}
      <div class="cov-empty">
        <h3>Coverage for ${esc(region.label)} is being confirmed.</h3>
        <p>We are not publishing a ${esc(region.label)} location list right now. Book a consultation and we will confirm whether we cover your address.</p>
        <a class="btn btn--dark" href="${R}book/">Book a consultation&nbsp;&nbsp;&rarr;</a>
      </div>
    </div>`;
  }

  const cols = columns(locations, 3).map((col) => {
    const items = col.map((l) => (l.slug === current
      ? `<li class="nbh-here"><strong>${esc(l.name)}</strong><span class="tag">you are here</span></li>`
      : `<li><a href="${S}${esc(l.slug)}/">${esc(l.name)}</a></li>`)).join('\n          ');
    return `<div class="nbh-col">
        <h3>${esc(rangeLabel(col))} <span>${col.length}</span></h3>
        <ul>
          ${items}
        </ul>
      </div>`;
  }).join('\n      ');

  return `<div class="cov-grid">
      ${map}
      ${cols}
    </div>`;
}

/* --------------------------------------------------------- region hub page */
function renderHub(region, locations) {
  const depth = 2;
  const R = up(depth);
  const n = locations.length;
  const count = `${n} ${n === 1 ? 'location' : 'locations'}`;
  // Name the places the API flags as featured first, then fall back to A→Z order.
  const sample = namesList(
    [...locations]
      .sort((a, b) => Number(b.featured === 'true') - Number(a.featured === 'true'))
      .map((l) => l.name),
    4,
  );

  const services = [
    {
      n: '01', k: 'Airbnb &amp; Short-Term Rental', href: `${R}airbnb-cleaning/`, cta: 'See Airbnb cleaning details',
      img: 'card-airbnb.jpg', alt: 'A guest-ready short-term rental',
      lead: 'Turnovers built for volume.',
      body: 'Guest-ready in under three hours, with a scent that protects the 5-star review.',
      where: `For operators across ${esc(region.where)}.`,
    },
    {
      n: '02', k: 'Office &amp; Commercial', href: `${R}office-cleaning/`, cta: 'See office cleaning details',
      img: 'card-office.jpg', alt: 'A freshly serviced office',
      lead: 'Workplaces that care about air.',
      body: 'Room-by-room service on a 30, 38, or 50-point scope, scheduled around your team, whether that is day, morning, or evening.',
      where: sample
        ? `Serving creative offices, wellness studios, and medical practices in ${esc(sample)}.`
        : `Serving creative offices, wellness studios, and medical practices across ${esc(region.where)}.`,
    },
    {
      n: '03', k: 'Home Cleaning', href: `${R}home-cleaning/`, cta: 'See home cleaning details',
      img: 'card-home.jpg', alt: `A spotless ${esc(region.label)} home`,
      lead: 'Regular, deep, move-in and move-out, post-construction.',
      body: 'Plant-based and non-toxic, safe around kids and pets. Every scope is written down before we arrive.',
      where: n ? `Across ${count} in ${esc(region.where)}.` : `Across ${esc(region.where)}.`,
      note: `First time hiring a cleaner? <a href="${R}blog/sample-article/">Read this first.</a>`,
    },
    {
      n: '04', k: 'Event Cleaning', href: `${R}event-cleaning/`, cta: 'See event cleaning details',
      img: 'event-showcase.jpg', alt: 'A reset event space',
      lead: 'Before the event. After the event. Both.',
      body: `Pre-event setup and full post-event reset for venues, private dining, and event spaces across ${esc(region.label)}.`,
      where: 'Available for one-time events and recurring venue contracts.',
    },
  ];

  const svcRows = services.map((s) => `<div class="hub-svc-row">
      <div class="hub-svc-copy">
        <p class="hub-svc-n">${s.n}</p>
        <h3 class="hub-svc-k">${s.k}</h3>
        <p class="hub-svc-lead">${s.lead}</p>
        <p class="hub-svc-body">${s.body}</p>
        <p class="hub-svc-where">${s.where}</p>
        <div class="hub-svc-cta"><a class="btn btn--dark" href="${s.href}">${s.cta}</a></div>${s.note ? `\n        <p class="hub-svc-note">${s.note}</p>` : ''}
      </div>
      <div class="hub-svc-photo"><img src="${R}assets/${s.img}" alt="${s.alt}" loading="lazy"></div>
    </div>`).join('\n    ');

  // Hero quote builder — service × location, both driven by the API list.
  const svcOptions = [
    [`${R}home-cleaning/`, 'home'],
    [`${R}office-cleaning/`, 'office'],
    [`${R}airbnb-cleaning/`, 'Airbnb'],
    [`${R}commercial-cleaning/`, 'commercial'],
    [`${R}event-cleaning/`, 'event'],
  ].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');

  const locOptions = locations
    .map((l) => `<option value="${R}service-areas/${region.key}/${esc(l.slug)}/">${esc(l.name)}</option>`).join('');

  const quoteBuilder = locations.length
    ? `<div class="qb">
        <span class="qb-line">I need a <span class="qb-pick"><span class="qb-val">home</span><select data-qb="service" aria-label="Choose a service">${svcOptions}</select></span> cleaning in <span class="qb-pick"><span class="qb-val">${esc(locations[0].name)}</span><select data-qb="location" aria-label="Choose a location">${locOptions}</select></span></span>
        <a class="qb-go" href="${R}service-areas/${region.key}/${esc(locations[0].slug)}/" aria-label="Go to the selected location">&rarr;</a>
      </div>`
    : `<div class="qb">
        <span class="qb-line">I need a <span class="qb-pick"><span class="qb-val">home</span><select data-qb="service" aria-label="Choose a service">${svcOptions}</select></span> cleaning</span>
        <a class="qb-go" href="${R}book/" aria-label="Book a consultation">&rarr;</a>
      </div>`;

  const tick = [
    ['', 'happiness guaranteed'],
    ['', '+30 000 homes cleaned'],
    [' class="hl"', 'probiotics cleaning that protects for days, not hours'],
    ['', '$2m insured &amp; bonded'],
    ['', 'professional background checked team'],
  ].map(([c, t]) => `<span${c}>${t}</span>`).join('');

  const faqs = [
    [`What areas of ${esc(region.label)} does Everneat clean?`,
      n ? `We publish ${count} across ${esc(region.where)}, all listed on this page. If yours is not there, book a consultation and we&rsquo;ll confirm coverage.`
        : `Coverage across ${esc(region.where)} is confirmed case by case. Book a consultation and we&rsquo;ll tell you whether we reach your address.`],
    [`How much does cleaning cost in ${esc(region.label)}?`,
      'Pricing follows the space and scope, not a flat rate. Home cleanings are quoted by unit size, while Airbnb turnovers and office contracts are quoted from a published, room-by-room Protocol&trade; so you see exactly what you&rsquo;re paying for. Book a consultation for a fixed quote.'],
    ['What is probiotic cleaning?',
      'Probiotic cleaning uses beneficial microbes to break down organic buildup in grout, fabric, and soft surfaces. The microbes keep working for 72 hours after we leave, competing with odor-causing bacteria instead of masking them. The result is cleaner indoor air and no chemical smell.'],
    ['Do you offer same-day or next-day cleaning?',
      'We respond to booking requests in about 4 minutes during service hours, Mon to Sun, 8a to 8p. Same-day availability depends on your location and crew schedule, so ask when you book.'],
    ['Is your cleaning safe for kids and pets?',
      'Yes. Our formulations are plant-based and non-toxic, with no harsh chemical residue on the surfaces your family touches. We manufacture them ourselves in Fairfield, CT.'],
    ['Do you clean Airbnb and short-term rentals?',
      `Yes, STR turnovers are a core service. Every turnover follows the Everneat Protocol&trade;, is guest-ready in under three hours, and is trusted by operators across ${esc(region.where)}.`],
    ['What&rsquo;s included in an office cleaning?',
      'Office service runs on a published 30, 38, or 50-point Protocol&trade; covering every room. We schedule around your team, whether daytime, mornings, or evenings, and treat surfaces with probiotic technology for cleaner air for 72 hours.'],
    [`What makes Everneat different from other ${esc(region.label)} cleaners?`,
      'Two things: a numbered, room-by-room Protocol&trade; we publish before you book, and probiotic technology we manufacture ourselves. Most services clean off checklists they never share and mask odors with chemistry. We publish everything and treat the source.'],
  ].map(([q, a], i) => `<details class="faq-item"${i === 0 ? ' open' : ''}>
        <summary>${q}</summary>
        <div class="faq-a">${a}</div>
      </details>`).join('\n      ');

  return GENERATED(region) + head({
    title: `Cleaning Services in ${region.long} · Everneat`,
    description: `Probiotic home, office, Airbnb, commercial and event cleaning across ${region.where}. Plant-powered biology, zero harsh chemicals, and the published Everneat Protocol™ for every space.`,
    depth,
  }) + `
${nav(depth)}

<!-- ===================== BANNER (Figma 8088:163) ===================== -->
<section class="hub-banner">
  <div class="wrap hub-hero">
    <p class="hub-eyebrow">Probiotic cleaning across ${esc(region.label)}</p>
    <h1 class="hub-h1">Cleaning services in <span class="rg">${esc(region.label)}</span></h1>
    ${quoteBuilder}
    <p class="hub-sub">Live quote in 60 seconds. Pay when the work is done. Happiness guaranteed.</p>
  </div>
  <div class="hub-skyline"><img src="${R}assets/hub-skyline.svg" alt="" aria-hidden="true"></div>
  <div class="ticker" aria-hidden="true"><div class="ticker-track">${tick}${tick}</div></div>
</section>

<div class="wrap">
  ${crumbs(depth, [
    { label: 'Home', href: R },
    { label: 'Service Areas', href: `${R}service-areas/nyc/` },
    { label: region.label },
  ])}
</div>

<!-- ===================== SERVICES ===================== -->
<section class="hub-svc" id="services">
  <div class="wrap">
    <div class="hub-svc-intro">
      <p class="hub-kicker">Services in ${esc(region.label)}</p>
      <h2>Four services. One protocol. ${esc(region.where)}.</h2>
    </div>
    ${svcRows}
  </div>
</section>

<!-- ===================== THE PROTOCOL ===================== -->
<section class="hub-protocol" id="protocol">
  <div class="wrap hub-2col">
    <div class="blueprint">
      <div class="bp-head"><span class="t">The Protocol&trade;</span><span class="h">v4.2 &middot; Home</span></div>
      <hr class="bp-div">
      <div class="bp-group">
        <div class="bp-cap">Kitchen &middot; 12 points</div>
        <div class="bp-item"><span class="bp-n">01</span><span class="bp-t">Counters wiped and probiotic-treated</span><span class="bp-m">8 min</span></div>
        <div class="bp-item"><span class="bp-n">02</span><span class="bp-t">Range, backsplash, hood vent</span><span class="bp-m">12 min</span></div>
        <div class="bp-item"><span class="bp-n">03</span><span class="bp-t">Sink, faucet, disposal scent</span><span class="bp-m">6 min</span></div>
        <div class="bp-item"><span class="bp-n">04</span><span class="bp-t">Cabinet fronts, handles, knobs</span><span class="bp-m">7 min</span></div>
      </div>
      <div class="bp-group">
        <div class="bp-cap">Living areas &middot; 9 points</div>
        <div class="bp-item"><span class="bp-n">13</span><span class="bp-t">Dust to floor, top down</span><span class="bp-m">14 min</span></div>
        <div class="bp-item"><span class="bp-n">14</span><span class="bp-t">Upholstery, probiotic on contact</span><span class="bp-m">6 min</span></div>
        <div class="bp-item"><span class="bp-n">15</span><span class="bp-t">Floors, baseboards, corners</span><span class="bp-m">18 min</span></div>
      </div>
      <div class="bp-group">
        <div class="bp-cap">Bathrooms &middot; 14 points</div>
        <div class="bp-item"><span class="bp-n">22</span><span class="bp-t">Grout, tile, tub scale</span><span class="bp-m">16 min</span></div>
        <div class="bp-item"><span class="bp-n">23</span><span class="bp-t">Fixtures, mirror, glass</span><span class="bp-m">8 min</span></div>
      </div>
    </div>
    <div>
      <p class="hub-kicker">Published, numbered, room-by-room</p>
      <h2>Most cleaners won&rsquo;t show you their checklist.</h2>
      <p>Ours is written down, numbered, and room by room. The same Everneat Protocol&trade; runs every job, from homes and rentals to offices and commercial spaces, and you can read every point before you book.</p>
      <div class="row">
        <a class="btn btn--dark" href="${R}the-protocol/">Read the Protocol&nbsp;&nbsp;&rarr;</a>
        <a class="btn btn--ghost" href="${R}the-protocol/">See a sample checklist&nbsp;&nbsp;&rarr;</a>
      </div>
    </div>
  </div>
</section>

<!-- ===================== THE SCIENCE ===================== -->
<section class="hub-probiotic">
  <div class="wrap hub-2col">
    <div class="pbd">
      <div class="pbd-head"><span class="t">72-hour probiotic shield</span><span class="s">Active</span></div>
      <div class="pbd-track"><i></i></div>
      <div class="pbd-ticks">
        <div><b>T+0h</b><span>Applied</span></div>
        <div><b>24h</b><span>Seeding</span></div>
        <div><b>48h</b><span>Working</span></div>
        <div><b>72h</b><span>Active</span></div>
      </div>
      <hr class="bp-div">
      <div class="bp-item"><span class="bp-n">01</span><span class="bp-t">Plant-based surfactants lift residue</span><span class="bp-m">Clean</span></div>
      <div class="bp-item"><span class="bp-n">02</span><span class="bp-t">Live probiotics seed the surface</span><span class="bp-m">Seed</span></div>
      <div class="bp-item"><span class="bp-n">03</span><span class="bp-t">Shield metabolises new mess as it lands</span><span class="bp-m">72 hrs</span></div>
    </div>
    <div>
      <p class="hub-kicker">The science</p>
      <h2>The clean keeps working after we leave.</h2>
      <p>Probiotic cleaning uses beneficial microbes to break down the organic buildup that hides in grout, fabric, and soft surfaces. The microbes keep working for 72 hours after we leave, competing with odor-causing bacteria instead of masking them with harsh chemistry. The result: cleaner indoor air, no chemical smell, no residue on surfaces your skin touches. We manufacture the formulations in Fairfield, CT and test them across hundreds of ${esc(region.label)} spaces every week.</p>
      <div class="row"><a class="tlink" href="${R}blog/">Learn about probiotic cleaning&nbsp;&rarr;</a></div>
    </div>
  </div>
</section>

<!-- ===================== PROOF ===================== -->
<section class="hub-proof">
  <div class="hub-proof-media" role="img" aria-label="A serene, sunlit bedroom"></div>
  <div class="wrap hub-proof-in">
    <h2>Trusted across ${esc(region.where)}.</h2>
    <p class="lead">Design firms, wellness studios, dental practices, STR operators, creative offices, and families across ${esc(region.where)}.</p>
    <div class="hub-proof-stats">
      <div><b>200+</b><span>apartments and offices serviced weekly</span></div>
      <div><b>${n}</b><span>${esc(region.label)} ${n === 1 ? 'location' : 'locations'} served</span></div>
      <div><b>4.9&#9733;</b><span>average rating, 1,200+ reviews</span></div>
      <div><b>Since 2015</b><span>operating across NYC and CT</span></div>
    </div>
    <div class="hub-featured">
      <span class="lbl">As featured in</span>
      <span class="pr">Domino</span><span class="pr">Martha Stewart</span><span class="pr">Apartment Therapy</span><span class="pr">Epicurious</span><span class="pr">Real Simple</span><span class="pr">The Kitchn</span><span class="pr">Design + Decor</span>
    </div>
  </div>
</section>

<!-- ===================== WHERE WE WORK (API-driven) ===================== -->
<section class="coverage">
  <div class="wrap">
    <h2 class="sec-title">Where we work in ${esc(region.label)}.</h2>
    <p class="cov-sub">We service every location below across ${esc(region.where)}. Each links to local service details. Don&rsquo;t see yours? Book a consultation and we&rsquo;ll confirm coverage.</p>
    ${directory(region, locations, depth, null)}
  </div>
</section>

<!-- ===================== FAQ ===================== -->
<section class="faq">
  <div class="wrap faq-grid">
    <div class="faq-img"><img src="${R}assets/${region.faqImage}" alt="An Everneat-cleaned interior" loading="lazy"></div>
    <div class="faq-list">
      <p class="faq-eyebrow">FAQ</p>
      <h2 class="faq-title">Answers, before you ask.</h2>
      ${faqs}
    </div>
  </div>
</section>

${footer(depth, `Probiotic, plant-powered cleaning across NYC, Fairfield County, and NJ. Quote in 60 seconds. Pay when it&rsquo;s done. Happiness guaranteed.`)}
`;
}

/* ----------------------------------------------------- location detail page */
function renderLocation(region, loc, siblings) {
  const depth = 3;
  const R = up(depth);
  const name = loc.name.trim();
  const stateLabel = validName(loc.quote) ? loc.quote.trim() : region.state;
  const canonical = validUrl(loc.canonical_url_2);

  const title = validName(loc.title_tag)
    ? loc.title_tag.trim()
    : `Cleaning Services in ${name}, ${stateLabel} · Everneat`;
  const description = validName(loc.meta_description)
    ? loc.meta_description.trim()
    : validName(loc.brief_excerpt)
      ? loc.brief_excerpt.trim()
      : `Probiotic home, office, Airbnb, commercial and event cleaning in ${name}, ${stateLabel}. Plant-powered biology and the published Everneat Protocol™.`;

  const services = splitList(loc.services);
  const neighborhoods = splitList(loc.neighborhoods);
  const near = elsewhere(name, region);
  const map = mapSlot(region, loc, depth, `Map of Everneat's service area around ${name}, ${stateLabel}`);

  const svcRows = [
    ['01', 'Airbnb &amp; Short-Term Rental', 'Turnovers built for volume',
      'Guest-ready in under three hours, with a scent that protects the 5-star review.',
      `For operators in ${esc(name)} and across ${esc(near)}.`, `${R}airbnb-cleaning/`, 'Quote my Airbnb Cleaning',
      'An Everneat specialist making a bed in a bright bedroom'],
    ['02', 'Home Cleaning', 'Regular, deep, move-in and move-out, post-construction.',
      'Plant-based and non-toxic, safe around kids and pets. Every scope is written down before we arrive.',
      `Serving homes throughout ${esc(name)}.`, `${R}home-cleaning/`, 'Quote my Home Cleaning',
      'An Everneat specialist smoothing fresh linens during a home clean'],
    ['03', 'Office Cleaning', 'Workplaces that care about their team&rsquo;s health',
      'Room-by-room service on a 30, 38, or 50-point scope, scheduled around your team, whether that is day, morning, or evening.',
      `For offices and studios in ${esc(name)} and nearby ${esc(near)}.`, `${R}office-cleaning/`, 'Quote my Office Cleaning',
      'An Everneat specialist resetting a workspace with probiotic cleaner'],
    ['04', 'Commercial Cleaning', 'Spaces your customers walk into',
      'Recurring, overnight, and post-event resets for retail, salons, studios, clinics, schools, and hospitality.',
      `For commercial spaces in ${esc(name)} and across ${esc(near)}.`, `${R}commercial-cleaning/`, 'Quote my Commercial Cleaning',
      'An Everneat crew servicing a commercial space'],
    ['05', 'Event Cleaning', 'Before, during, and after the event',
      `Pre-event setup and full post-event reset for venues, private dining, and event spaces across ${esc(region.where)}.`,
      `For events and venues in ${esc(name)}.`, `${R}event-cleaning/`, 'Quote my Event Cleaning',
      'An Everneat specialist preparing a venue before an event'],
  ].map(([n, kind, h, body, where, href, cta, alt]) => `<div class="svc-step">
      <div class="svc-in">
        <div class="svc-body">
          <div class="svc-eyebrow"><span class="n">${n}</span><span class="t">${kind}</span></div>
          <h2 class="svc-title">${h}</h2>
          <div class="svc-copy">
            <p>${body}</p>
            <p>${where}</p>
          </div>
          <div class="svc-cta"><a class="btn btn--lime" href="${href}">${cta}&nbsp;&nbsp;&rarr;</a></div>
        </div>
        <div class="svc-img"><img src="${R}assets/nyc-service.png" alt="${alt}" loading="lazy"></div>
      </div>
    </div>`).join('\n\n    ');

  // Optional, API-only sections — rendered only when the field carries content.
  const servicesBlock = services.length
    ? `<section class="locprose">
  <div class="wrap">
    <h2 class="sec-title">What we clean in ${esc(name)}</h2>
    <ul class="chips">
      ${services.map((s) => `<li>${esc(s)}</li>`).join('\n      ')}
    </ul>
  </div>
</section>`
    : '';

  const caseStudy = hasContent(loc.case_study_body)
    ? `<section class="locprose">
  <div class="wrap">
    <div class="prose">${sanitizeHtml(loc.case_study_body)}</div>
  </div>
</section>`
    : '';

  const seoBottom = hasContent(loc.seo_content_bottom)
    ? `<section class="locprose on-cream">
  <div class="wrap">
    <div class="prose">${sanitizeHtml(loc.seo_content_bottom)}</div>
  </div>
</section>`
    : '';

  // `neighborhoods` is the location's own sub-areas — a plain list, since the API
  // publishes no pages for them. The linked directory below is the sibling list.
  const neighborhoodsBlock = neighborhoods.length
    ? `<section class="locprose">
  <div class="wrap">
    <h2 class="sec-title">Inside ${esc(name)}</h2>
    <p class="sec-intro">Everneat covers these areas of ${esc(name)}.</p>
    <ul class="chips">
      ${neighborhoods.map((s) => `<li>${esc(s)}</li>`).join('\n      ')}
    </ul>
  </div>
</section>`
    : '';

  const nearMe = validName(loc.services_near_me)
    ? `<p class="svc-note">${esc(loc.services_near_me)} &middot; <a href="${R}service-areas/${region.key}/">See the whole ${esc(region.label)} service area</a></p>`
    : '';

  return GENERATED(region, `Location: ${loc.slug}.`) + head({
    title,
    description,
    canonical,
    depth,
  }) + `
${nav(depth)}

<!-- ===================== HERO ===================== -->
<section class="lhero">
  <div class="wrap">
    ${crumbs(depth, [
      { label: 'Home', href: R },
      { label: 'Service Areas', href: `${R}service-areas/${region.key}/` },
      { label: region.label, href: `${R}service-areas/${region.key}/` },
      { label: name },
    ])}
    <div class="lhero-grid${map ? '' : ' lhero-grid--solo'}">
      <div class="lhero-copy">
        <h1>Cleaning services in ${esc(name)},<br><span class="borough">${esc(stateLabel)}.</span></h1>
        <p class="lhero-sub">We clean homes and offices across ${esc(name)} and ${esc(near)}, using ${esc(region.manufacture)} and the same numbered Protocol&trade; for every space.</p>
        <div class="lhero-ctas">
          <a class="btn btn--dark" href="${R}book/">Book a consultation&nbsp;&nbsp;&rarr;</a>
          <a class="btn btn--ghost" href="#protocol">Read the Protocol&nbsp;&nbsp;&rarr;</a>
        </div>
      </div>
      ${map}
    </div>
  </div>
</section>

<!-- ===================== LOC INTRO ===================== -->
<section class="locintro">
  <div class="wrap">
    <p class="locintro-lead">The first probiotic cleaning service for homes, offices, events &amp; short-term rentals. Plant-powered biology with zero harsh chemicals in ${esc(name)}<em>.</em></p>
    <div class="proof">
      <div class="rate"><span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span><b>4.9 rating</b></div>
      <div class="seen">
        <span class="lbl">As seen on</span>
        <span class="press epi">epicurious</span>
        <span class="press at">apartment<br>therapy</span>
        <span class="press ms">martha<br>stewart</span>
        <span class="press dom">domino</span>
        <span class="press rs">REAL SIMPLE</span>
      </div>
    </div>
  </div>
</section>

<!-- ===================== SERVICES ===================== -->
<section class="svc" id="services">
  <div class="wrap">

    ${svcRows}

    <p class="svc-note">First time hiring a cleaner? <a href="${R}blog/sample-article/">Read this first.</a></p>
    ${nearMe}
  </div>
</section>

${servicesBlock}

${caseStudy}

<!-- ===================== COMPARE ===================== -->
<section class="compare">
  <div class="wrap">
    <h2 class="sec-title">You&rsquo;ve done enough hoping</h2>
    <p class="sec-intro">Every time you book a cleaner, you&rsquo;re taking a gamble: will they show, get it right, respect your home, and what will it cost? Everneat answers all four before you book. Here&rsquo;s the difference, line by line.</p>

    <div class="cmp-grid">
      <div class="cmp-photo"><img src="${R}assets/compare.jpg" alt="A bright, freshly cleaned living room" loading="lazy"></div>
      <div class="cmp">
        <div class="cmp-row cmp-head">
          <div class="cmp-crit"></div>
          <div class="cmp-ev">With Everneat</div>
          <div class="cmp-alt">A standard cleaning service</div>
        </div>
        ${[
          ['Probiotic treatment that keeps working for 72 hours after we leave', 'Surfaces wiped, odor masked with fragrance'],
          ['Every task published, numbered, and room by room', 'An internal checklist you never get to see'],
          ['A photo report after every visit, so you see what got done', 'You just hope it got done'],
          ['Plant-based and non-toxic, safe around kids and pets', 'Harsh chemicals and a lingering smell'],
          ['Insured, bonded, and background-checked', 'You are trusting a stranger with no guarantee'],
          ['Happiness guarantee. Not thrilled, we re-clean free', 'No recourse when it is wrong'],
          ['Transparent hourly rates', 'Surprise charges per extra room'],
        ].map(([crit, alt]) => `<div class="cmp-row">
          <div class="cmp-crit">${crit}</div>
          <div class="cmp-ev"><span class="tick">&#10003;</span></div>
          <div class="cmp-alt"><span class="xmark">&#10007;</span><span class="cmp-note">${alt}</span></div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </div>
</section>

<!-- ===================== DAYS OF PROTECTION ===================== -->
<section class="protect" id="protection">
  <div class="wrap">
    <h2 class="sec-title">Days of protection</h2>
    <p class="sec-intro">Most cleans are gone by dinner. Everneat keeps working for three days after we leave.</p>

    <div class="phases">
      <div class="phase-bands">
        <div class="band"><img src="${R}assets/protect.jpg" alt="Probiotic surface cleaner sprayed on a kitchen counter" loading="lazy"></div>
        <div class="band g2"><img src="${R}assets/faq.jpg" alt="Living probiotic shield staying active on clean bathroom surfaces" loading="lazy"></div>
        <div class="band g3"><img src="${R}assets/retail.jpg" alt="The Everneat retail line for maintaining the microbiome between visits" loading="lazy"></div>
      </div>
      <div class="phase-tl">
        <div class="tl-node"><div class="tl-dot">1</div></div>
        <div class="tl-node"><div class="tl-dot">2</div></div>
        <div class="tl-node"><div class="tl-dot">3</div></div>
      </div>
      <div class="phase-desc">
        <div class="pb"><h4>0H &middot; Purify</h4><p>Everneat Probiotic Surface Cleaner applied to every surface.</p></div>
        <div class="pb"><h4>24&ndash;48H &middot; Protect</h4><p>Living probiotic shield stays active, metabolizing new mess.</p></div>
        <div class="pb"><h4>72H+ &middot; Maintain</h4><p>Keep up the microbiome with the Everneat retail line between visits.</p></div>
      </div>
    </div>
  </div>
</section>

<!-- ===================== EVERYTHING PUBLISHED ===================== -->
<section class="published" id="protocol">
  <div class="wrap pub-grid">
    <div class="pub-copy">
      <h2 class="sec-title">Everything we do is published.</h2>
      <p>With most services you just hope they hit everything, because the checklist stays in their pocket. Ours is written down, numbered, and room by room. Read every point before we arrive, and see what got done after.</p>
      <a class="btn btn--ghost" href="${R}the-protocol/">Read The Protocol&trade;&nbsp;&nbsp;&rarr;</a>
    </div>
    <div class="blueprint">
      <div class="bp-head"><span class="t">The Everneat Protocol&trade;</span><span class="h">${esc(name)}</span></div>
      <hr class="bp-div">
      <div class="bp-group">
        <div class="bp-cap">Kitchen &middot; 12 points</div>
        <div class="bp-item"><span class="bp-n">01</span><span class="bp-t">Counters wiped, probiotic-treated</span><span class="bp-m">8 min</span></div>
        <div class="bp-item"><span class="bp-n">02</span><span class="bp-t">Range, backsplash, hood vent</span><span class="bp-m">12 min</span></div>
        <div class="bp-item"><span class="bp-n">03</span><span class="bp-t">Sink, faucet, disposal scent</span><span class="bp-m">6 min</span></div>
      </div>
      <hr class="bp-div">
      <div class="bp-group">
        <div class="bp-cap">Bathrooms &middot; 14 points</div>
        <div class="bp-item"><span class="bp-n">22</span><span class="bp-t">Grout, tile, tub scale</span><span class="bp-m">16 min</span></div>
        <div class="bp-item"><span class="bp-n">23</span><span class="bp-t">Fixtures, mirror, glass</span><span class="bp-m">8 min</span></div>
      </div>
    </div>
  </div>
</section>

<!-- ===================== RETAIL BAND ===================== -->
<section class="retail">
  <div class="wrap retail-grid">
    <div class="retail-img"><img src="${R}assets/retail.jpg" alt="The Everneat retail line of probiotic cleaning bottles" loading="lazy"></div>
    <div class="retail-copy">
      <h2 class="sec-title">Keep the cleaning working between visits</h2>
      <p>Same probiotic technology, in a bottle. Top up the microbiome between cleans in bathroom, kitchen, surfaces that work hardest. Less cleaning, cleaner longer.</p>
      <div class="row">
        <a class="btn btn--dark" href="https://www.everneat.co/">Shop the line&nbsp;&nbsp;&rarr;</a>
        <a class="tlink" href="#protection">How it works&nbsp;&rarr;</a>
      </div>
    </div>
  </div>
</section>

<!-- ===================== TESTIMONIAL ===================== -->
<section class="testi">
  <div class="testi-media" role="img" aria-label="A serene, sunlit bedroom"></div>
  <div class="testi-inner wrap">
    <blockquote class="testi-quote">&ldquo;The air in my apartment actually feels different, and it lasts for days. No chemical smell, just clean. I&rsquo;ve stopped thinking about cleaning day.&rdquo;</blockquote>
    <div class="testi-by">
      <img class="testi-av" src="${R}assets/avatar.jpg" alt="Rachel K.">
      <span>Rachel K. &middot; Upper West Side &middot; Home client, 2&times; monthly</span>
    </div>
    <div class="testi-stats">
      <div><b>10,000+</b><span>Homes &amp; spaces cleaned</span></div>
      <div><b>4.9</b><span>Average rating</span></div>
      <div><b>24h</b><span>Re-clean guarantee</span></div>
      <div><b>97%</b><span>Clients who stay with us</span></div>
    </div>
  </div>
</section>

${neighborhoodsBlock}

<!-- ===================== NEARBY (API-driven) ===================== -->
<section class="coverage">
  <div class="wrap">
    <h2 class="sec-title">Nearby locations.</h2>
    <p class="cov-sub">Everneat also serves these locations across ${esc(region.where)}. Each links to local service details.</p>
    ${directory(region, siblings, depth, loc.slug)}
  </div>
</section>

${seoBottom}

<!-- ===================== FAQ ===================== -->
<section class="faq">
  <div class="wrap faq-grid">
    <div class="faq-img"><img src="${R}assets/${region.faqImage}" alt="An Everneat-cleaned interior" loading="lazy"></div>
    <div class="faq-list">
      <p class="faq-eyebrow">FAQ</p>
      <h2 class="faq-title">Answers, before you ask.</h2>
      ${[
        [`Do you clean ${esc(name)}?`,
          `Yes. ${esc(name)} is in our ${esc(region.label)} service area. Book a consultation to schedule.`],
        [`How much does cleaning cost in ${esc(name)}?`,
          'Transparent hourly rates, quoted up front by unit size in chat. No surprise per-room charges, and you pay when it&rsquo;s done.'],
        ['What is probiotic cleaning?',
          'Probiotic cleaning uses beneficial microbes to break down the organic buildup that odor-causing bacteria feed on, in grout, fabric, and soft surfaces. The microbes keep working for about 72 hours after we leave, so you get cleaner air and no chemical smell, not a masking fragrance.'],
        ['Do you offer same-day or next-day cleaning?',
          `Often, yes. Availability in ${esc(name)} depends on the crew schedule that week. Start a chat to see live openings near you.`],
        ['Is your cleaning safe for kids and pets?',
          'Yes. Everything we use is plant-based and non-toxic, with no harsh chemicals or lingering fumes, safe around kids, pets, and sensitive surfaces.'],
        ['Do you clean Airbnb and short-term rentals?',
          'Yes, turnovers are one of our core services. Guest-ready in under three hours, synced to your check-out calendar, with a photo report before check-in.'],
        ['What&rsquo;s included in an office cleaning?',
          'Room-by-room service on a 30, 38, or 50-point published scope, scheduled around your team, day, morning, or evening. Every point is written down before we arrive.'],
        ['What makes Everneat different?',
          'A probiotic treatment that keeps working for 72 hours, a published and numbered Protocol&trade; you can read before we arrive, a photo report after every visit, and a happiness guarantee: not thrilled, we re-clean free within 24 hours.'],
      ].map(([q, a], i) => `<details class="faq-item"${i === 0 ? ' open' : ''}>
        <summary>${q}</summary>
        <div class="faq-a">${a}</div>
      </details>`).join('\n      ')}
    </div>
  </div>
</section>

${footer(depth, `Experience a probiotic-cleaned space. Book your first ${esc(name)} cleaning today. Quote in 60 seconds. Pay when it&rsquo;s done. Happiness guaranteed.`)}
`;
}

/* ------------------------------------------------------- redirect stubs */
/** Keeps the pre-existing /fairfield-county-ct/ and /new-jersey/ URLs alive. */
function redirectStub(toKey, label) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=../${toKey}/">
<link rel="canonical" href="../${toKey}/">
<meta name="robots" content="noindex,follow">
<title>${esc(label)} · Everneat</title>
</head>
<body>
<p>This page has moved to <a href="../${toKey}/">${esc(label)}</a>.</p>
</body>
</html>
`;
}

/* -------------------------------------------------------------------- main */
async function write(file, contents) {
  if (DRY) return;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, contents, 'utf8');
}

async function main() {
  const fetched = [];

  // Fetch everything up front: if the API is unreachable we abort before writing
  // anything, so the live pages keep their last good content and no visitor ever
  // sees an API error.
  for (const region of REGIONS) {
    let list;
    try {
      list = await fetchRegionList(region);
    } catch (err) {
      console.error(`\n✗ ${region.key}: could not read the Locations API — nothing was written.`);
      console.error(`  ${err.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`  ${region.key.padEnd(4)} ${String(list.length).padStart(3)} locations  (${region.apiSlug})`);
    fetched.push({ region, list });
  }

  let pages = 0;
  let missing = 0;

  for (const { region, list } of fetched) {
    await write(join(OUT, region.key, 'index.html'), renderHub(region, list));
    pages++;

    for (const stub of list) {
      const rec = await fetchLocation(region, stub.slug);
      if (!rec) {
        // The directory listed it but the detail endpoint has nothing usable:
        // skip the page rather than publish an empty one.
        console.warn(`     ! ${region.key}/${stub.slug} — no detail record, page skipped`);
        missing++;
        continue;
      }
      await write(join(OUT, region.key, rec.slug, 'index.html'), renderLocation(region, rec, list));
      pages++;
    }
  }

  // Legacy directory names keep working.
  for (const [dir, to, label] of [
    ['fairfield-county-ct', 'ct', 'Fairfield County, CT'],
    ['new-jersey', 'nj', 'New Jersey'],
  ]) {
    await write(join(OUT, dir, 'index.html'), redirectStub(to, label));
    pages++;
  }

  console.log(`\n${DRY ? 'Would write' : 'Wrote'} ${pages} pages${missing ? ` (${missing} skipped: no detail record)` : ''}.`);
}

/* --------------------------------------------------------------- selfcheck */
/** `node build-service-areas.mjs --selfcheck` — the pure helpers, no network. */
function selfcheck() {
  const names = (list) => list.map((x) => x.name);
  const mk = (...n) => n.map((name) => ({ name, slug: name.toLowerCase() }));

  // columns(): balanced, ordered, and never splits a first letter across columns.
  const nyc = mk('Bowery', 'Brooklyn', 'Central Park South', 'Civic Center', 'Hudson Square',
    'Hudson Yards', 'Manhattan', 'NoHo', 'Nolita', 'Queens', 'SoHo', 'Staten Islands',
    'Theatre District', 'Tribeca');
  const c3 = columns(nyc, 3);
  a.equal(c3.length, 3);
  a.equal(c3.flat().length, nyc.length);
  a.deepEqual(c3.flat().map((x) => x.name), names(nyc));            // order preserved
  a.deepEqual(c3.map((c) => c.length), [4, 5, 5]);
  const initials = c3.map((c) => new Set(c.map((x) => x.name[0])));  // no letter in two columns
  a.equal([...initials[0]].some((l) => initials[1].has(l) || initials[2].has(l)), false);

  // Fewer letter groups than columns: one group per column, not one fat column.
  a.deepEqual(columns(mk('Hoboken', 'Jersey City', 'Weehawken'), 3).map((c) => c.length), [1, 1, 1]);
  a.deepEqual(columns(mk('Solo'), 3).map((c) => c.length), [1]);
  a.deepEqual(columns([], 3), []);

  a.equal(rangeLabel(mk('Bowery', 'Civic Center')), 'B–C');
  a.equal(rangeLabel(mk('SoHo')), 'S');

  // elsewhere(): no "Brooklyn and Manhattan, Brooklyn, and Queens" stutter.
  const nycRegion = { where: 'Manhattan, Brooklyn, and Queens', label: 'NYC' };
  a.equal(elsewhere('Brooklyn', nycRegion), 'the rest of NYC');
  a.equal(elsewhere('Bowery', nycRegion), 'Manhattan, Brooklyn, and Queens');

  a.deepEqual(splitList('Home Cleaning, Office Cleaning ,, Home Cleaning'), ['Home Cleaning', 'Office Cleaning']);
  a.deepEqual(splitList(null), []);

  a.equal(validUrl('https://clean.everneat.co/locations/bowery'), 'https://clean.everneat.co/locations/bowery');
  a.equal(validUrl('javascript:alert(1)'), null);
  a.equal(validUrl('not a url'), null);
  a.equal(validUrl(''), null);

  a.equal(sanitizeHtml('<p onclick="x()">hi</p><script>bad()</script>'), '<p>hi</p>');
  a.equal(sanitizeHtml('<a href="javascript:bad()">x</a>'), '<a href="#">x</a>');
  a.equal(hasContent('<p id=""><br></p>'), false);
  a.equal(hasContent('<p>Cleaning in Bowery</p>'), true);

  a.equal(esc('<script>&"'), '&lt;script&gt;&amp;&quot;');
  a.equal(namesList(['A', 'B', 'C', 'D', 'E'], 3), 'A, B, and C');
  a.equal(namesList(['A'], 3), 'A');

  console.log('selfcheck ok');
}

if (process.argv.includes('--selfcheck')) {
  selfcheck();
} else {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
