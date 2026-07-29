# Quote Assistant — User Stories

Scope capture for the customer-facing quote assistant prototyped in `quote-agent/index.html`.

**Grounding.** Claims are checked against `booking-fe` at commit `91fb0bdf` and cited as `file:line`.
Two independent adversarial reviews were run against this document — one hunting missing scope, one
fact-checking every citation. Their corrections are folded in. Where an earlier draft was wrong, the error is
named in a `⚠ corrected` note rather than quietly deleted, because the wrong version is the one people
remember.

> **Line-number drift.** Citations are pinned to `91fb0bdf`. `QuoteStep.tsx` has already drifted (it lost
> ~84 lines in `cddcaf06`). Re-resolve by symbol, not line, if you are working from a later commit.

---

## Read this before scoping anything

**1. The agent exists, but it cannot serve a stranger today.**
A conversational booking agent ships: 7 tools (`customer-booking-tools.ts:164-211`), a streaming service on
`claude-sonnet-4-6` (`customer-booking-agent.service.ts:38`), and a React surface
(`src/features/customer-booking-agent/`). Backend RBAC gates it to `[ROLE.OWNER, ROLE.ADMIN]`
(`rbac-policy.ts:17`); separately, the frontend route `/admin/agent/test-booking` (`Private.tsx:245`) sits
behind `RequirePermission permission="operations"` (`:241`) — two different mechanisms, both owner/admin.
It is a playground, not a product.

Three things must be built before a stranger can use it. Each is a story, not a caveat:

- **No guest identity.** `confirm_booking` throws `customerId not in context`
  (`customer-booking-tools.ts:458-460`), `read_customer_payment_status` returns all-false without one
  (`:405-416`), and `ctx.customerId` is the JWT owner (`customer-booking-agent.ts:187`). → **AGENT-04**
- **Tenant identity is not server-bound.** `tenantId` comes only from the JWT
  (`customer-booking-agent.ts:44,97,218,252`). → **AGENT-06**
- **A payment gate sits in front of the chat.** `CustomerBookingAgentPage.tsx:195-210` renders
  `PaymentGateCard` instead of the conversation when `Boolean(profileBilling?.customer?.hasPaymentMethod)`
  is false (`:101`). → **AGENT-05**

⚠ **corrected** — an earlier draft claimed PAY-08/09 were **signed-off requirements mandating** that gate,
and made it the decision blocking the whole feature. **That is backwards.** PAY-08/09 are Playwright test IDs
still `test.fixme(true, …)` (`23-00-PLAN.md:145-150`), they appear nowhere in `REQUIREMENTS.md` or
`ROADMAP.md`, and `23-VALIDATION.md:71-72` marks both `⏳ awaiting human-verify`, with `:87` stating live UAT
"awaits Owner sign-off". The `status: signed-off` frontmatter covers *automated* validation only. The real
requirement is `ROADMAP.md:589` ("Pre-agent payment gate (frontend)") — and its scope is **the owner-facing
playground**. A new public surface is not automatically governed by it. AGENT-05 is a genuine product
question about payment timing; it is not a fight with a signed-off requirement.

**2. The prototype's PR #407 story is wrong.** #407 is **merged** (`e361ab09`, *"apply the recurring discount
before tax, not after"*); it fixed a client-side admin-drawer error the public flow never had (the public flow
does not compute discounts client-side — `BookingExperienceV8.tsx:885,901`). `withFreqDiscount()` exists and
is shared (`frequency.ts:81-109`), called only from the admin drawer. The real live defect is **PRICE-01**.

**3. Frequency is not a persisted booking field.** Zero hits for `frequenc` in `booking.model.ts` and
`booking.ts`; cadence survives only in a JSON `wizardSnapshot` (`BookingExperienceV8.tsx:1305`), read back by
string-sniffing (`InfoBooking.tsx:296-301`). Any recurring story is a schema change.

**4. The prototype depicts a product that does not exist.** It sells "Standard Plus" with a tier switcher
(`index.html:410,424`). `Standard Plus`, `detailLevel` and `density` have **zero hits** in `src`.
`lookupTier` (`pricing.service.ts:192-205`) is a pure sqft range lookup. And `FloorPlanField.tsx:22-32`
collects `workstations, desks, seats, stalls, sinks, appliances` which are dropped before the engine — no
`features` key survives into the pricing input (`useWizardPricing.ts:29-35`), and `pricing.service.ts` has no
such concept. **20 desks contribute zero minutes and zero dollars.** Treat the prototype as an interaction
study, not a pricing spec. → **PRICE-09**

**Conventions.** Stable ID, size (S/M/L/XL), acceptance criteria written so they can fail.
⛔ = **blocked by** (upstream). `→ blocks:` = downstream dependents. `↔` = collides with an existing
`.planning` requirement that must be reconciled before this is written into a phase.

---

## Tool coverage matrix

⚠ **corrected** — an earlier version of this table claimed coverage four stories did not deliver.
Honest state:

| Tool | Covered by | Gap |
|---|---|---|
| `read_catalog` | **SAFE-05** | — |
| `list_available_slots` | CONV-01, CONV-02 | zero tests exist today (verified) — CONV-01 carries the test AC |
| `compute_quote` | PRICE-01…04, 06…11, QUOTE-01…04, CONV-07 | — |
| `update_booking_draft` | CONV-06 | — |
| `read_customer_payment_status` | AGENT-04, AGENT-05, BOOK-03 | — |
| `confirm_booking` | BOOK-02…05, LEGAL-01, SAFE-04 | — |
| `read_booking_draft` | **CONV-08** | — |

---

## EPIC A — Make the assistant reachable by a stranger

### AGENT-04 — A guest identity, created on first message (L)
**As an** anonymous visitor, **I want** my quote, draft and booking attributed to me without an account,
**so that** I can be priced and book without signing up first.

- **Given** an anonymous first message, **when** the conversation starts, **then** a guest customer record
  exists and `ctx.customerId` resolves, so `compute_quote` and `confirm_booking` run without throwing
  `customerId not in context` (`customer-booking-tools.ts:458-460`).
- **Given** a guest who later supplies an email matching an existing customer, **when** they confirm,
  **then** the booking attaches to that customer and no duplicate customer record is created.
- **Given** a guest identity, **when** it calls any route whose `rbac-policy.ts` entry excludes the guest role,
  **then** the response is `403`.
- `→ blocks:` AGENT-01, BOOK-04, CONV-04, PRICE-11 (persistence half). `23-RESEARCH.md:423-425` records this
  as open.

### AGENT-05 — Quote first, pay at commit (M) ↔ `ROADMAP.md:589`
**As a** prospective customer, **I want** to see a price before being asked for a card,
**so that** I am not asked to pay to find out what something costs.

- **Given** an anonymous visitor with no payment method, **when** they open the public assistant,
  **then** the conversation renders rather than `PaymentGateCard`
  (`CustomerBookingAgentPage.tsx:101,195-210`).
- **Given** they reach commitment, **when** payment is required, **then** it is requested at that point.
- ⛔ Blocked by the payment-timing decision (open decision 1), which must also settle BOOK-01 and BOOK-03 —
  the three stories currently imply three different payment moments.

### AGENT-06 — Bind tenant identity server-side (L)
**As the** platform, **I want** the tenant derived from the request origin on the server,
**so that** nobody can quote or book against a tenant that is not theirs.

⚠ **corrected** — an earlier draft presented tenant resolution as unsolved. `extractTenantSlug(hostname)`
already ships and is the client-side resolver (`App.tsx:260`, `BookingFlow.tsx:34`, `useTenantId.ts`,
`EmbedCode.tsx:12-17`). **Only the server-side binding is missing.** That reduces the design work and
increases the surface: today public endpoints take `tenantId` from an unauthenticated query param validated
only by `ObjectId.isValid()` (`catalog.ts:53,92`).

- **Given** a public assistant request, **when** the tenant is resolved, **then** it derives from the request
  origin/subdomain server-side, not from a client-supplied parameter.
- **Given** a forged tenant identifier, **when** any tool runs, **then** it returns no catalog, no pricing and
  creates no booking.
- **Given** embeds already shipping `data-tenant` (`EmbedCode.tsx:20`, the off-subdomain branch),
  **when** this lands, **then** they continue to work or are migrated.
- Size raised from M: `catalog.ts` alone is ~2,262 lines with `tenantId` read from query at several points.
- `→ blocks:` SAFE-04 (service-area enforcement is meaningless while tenant is forgeable).

### AGENT-01 — Reach the assistant without an admin account (M)
**As a** prospective customer, **I want** to open the assistant from a public link,
**so that** I can get a price without an account or a phone call.

- **Given** an anonymous visitor, **when** they open the public URL, **then** the conversation starts.
- **Given** any tool call carrying `overrideMinutes`, `manualDiscount`, `customLineItems` or `exemptTax`
  (`pricing.service.ts:49,55,62,66`), **when** validated server-side, **then** the request is **rejected**,
  not silently stripped.
- ⛔ Blocked by AGENT-04, AGENT-05, AGENT-06.

### AGENT-02 — Rate limiting survives the loss of an identity key (M)
**As the** business, **I want** limits that still work when there is no logged-in user,
**so that** an open LLM endpoint is not free inference.

⚠ **corrected** — rate limiting **already ships**: AI-02 (`16-RESEARCH.md:66`), plus `apiLimiter` 100/min per
IP and `adminAgentLimiter` 60/hr keyed `${tenantId}:${userId}` (`rate-limit.ts:25-31,73-87`). The gap is the
key, which evaporates for a guest. Size raised from S: the story carries an undecided budget.

- **Given** an anonymous surface, **when** limits apply, **then** they key on session + IP + tenant and
  clearing browser storage does not reset the counter.
- ⛔ Blocked by open decision 10 (per-tenant LLM budget and exhaustion behaviour). The numeric caps are that
  decision's output; this story cannot be written to a threshold until it lands.

### AGENT-03 — Hand off to the booking form (S)
**As a** customer who does not want to chat, **I want** a way into the normal flow,
**so that** the assistant is never the only path to a price.

- **Given** a conversation with a computed quote, **when** the customer switches to the form,
  **then** service, cadence, sqft, zip and date prefill from the draft, and the V8 per-visit total equals the
  most recent `compute_quote` `totalWithTax` to the cent.

---

## EPIC B — The conversation

⚠ **corrected** — an earlier draft had no epic here. It scoped the quote and skipped the assistant: five of
seven tools had no story.

### CONV-01 — Choose a real, available time (M)
**As a** customer, **I want** to pick from times that are genuinely free,
**so that** my booking is not rejected after I commit.

- `list_available_slots` (`customer-booking-tools.ts:172-176`, impl `:601-736`) applies provider-skill
  filtering, zip coverage, lead time, buffer and conflict scan. **Zero tests reference it** (verified).
- **Given** a chosen date, **when** slots are offered, **then** they respect lead time and provider
  availability.
- **Given** a day with no availability, **when** it is requested, **then** the reply offers the next 3 dates
  that do have availability.
- **Given** a date outside the booking window (`:484-489`), **when** requested, **then** the reply names the
  latest bookable date.
- **Given** this ships, **when** the suite runs, **then** `list_available_slots` has test coverage for the
  lead-time, conflict and empty-day paths.

### CONV-02 — A slot taken while I decide does not double-book (S)
**As a** customer, **I want** a stale slot re-offered rather than silently accepted,
**so that** two customers are not promised the same visit.

- **Given** a slot that becomes unavailable between selection and `confirm_booking`, **when** confirm runs,
  **then** it fails with a re-offer and creates no booking.

### CONV-06 — Change an earlier answer (M)
**As a** customer who misspoke, **I want** to correct an earlier answer and see the quote re-derive,
**so that** a correction is not a new conversation.

- `update_booking_draft` validates shape (`UpdateDraftInput.parse` at `customer-booking-tools.ts:387`) but is
  otherwise last-write-wins with **no cross-field or semantic validation**; `bookingDraft` is
  `Schema.Types.Mixed`.
- **Given** a corrected value, **when** the draft updates, **then** the next quote is computed from the
  corrected draft, and every currency-formatted substring in the following assistant message matches a value
  from that latest `compute_quote` result.

### CONV-07 — Vague or impossible input gets a question, not a guess (S)
**As a** customer, **I want** a narrowing question when my answer is ambiguous,
**so that** I am not quoted on an assumption I never made.

- `compute_quote` translates bedrooms/bathrooms into `spaceRows` by **regex-matching space names**
  (`customer-booking-tools.ts:307-337`) — a tenant who named spaces differently silently produces no rows.
- **Given** input that maps to zero of the tenant's configured spaces, **when** it is processed,
  **then** no quote is produced and the customer is asked a disambiguating question.

### CONV-08 — Ask what the assistant has recorded (S)
**As a** customer several turns in, **I want** to ask what has been captured so far,
**so that** I can check it before committing.

- `read_booking_draft` (`customer-booking-tools.ts:395-401`) exists with no surface.
- **Given** the customer asks what has been captured, **when** the agent answers, **then** every value it
  states matches the current draft.

### CONV-03 — See it working, and recover from a dropped turn (M)
**As a** customer, **I want** visible progress and a retry when a turn fails,
**so that** a dropped connection is not a dead conversation.

⚠ **corrected** — an earlier draft claimed there was no `AbortSignal`. There is
(`useBookingAgentStream.ts:45,47,50,67-68,154`). What is genuinely absent is a **stall timeout and reconnect**;
`toolCalls` are accumulated (`:120-126,154`) and never rendered; malformed frames are silently swallowed
(`:115-117`); concurrent sends `409` on an in-flight lease (`customer-booking-agent.ts:112-143`) and a closed
conversation `410`s (`:138`) with no customer-facing handling.

- **Given** a turn is sent, **when** 300 ms elapse without a first token, **then** a busy indicator is in the
  DOM, removed on the first `text` event.
- **Given** a dropped or failed turn, **when** it fails, **then** a Retry control renders and the composer is
  enabled.
- **Given** a `409` or `410`, **when** received, **then** the customer sees an explanation rather than a
  silent no-op.

### CONV-04 — Resume after a refresh (M)
**As a** customer returning to a quote, **I want** my conversation intact,
**so that** I do not start over.

- `conversationId` persists in `localStorage` (`CustomerBookingAgentPage.tsx:34,38-54`), but
  `GET /conversations/:id` returns only `messages.slice(-30)` (`customer-booking-agent.ts:237`) — a long
  conversation silently loses its head.
- **Given** a refresh mid-quote, **when** the conversation reloads, **then** the thread renders every message
  the server holds, and the quote card total equals the last `compute_quote` `totalWithTax`.
- ⛔ Blocked by AGENT-04 (a guest needs a durable identity to resume against) and interacts with **DATA-01** —
  today the conversation is deleted after 24h.

### CONV-05 — A route to a human (M)
**As a** customer whose question the assistant cannot answer, **I want** to reach a person,
**so that** the conversation is not a dead end.

- There is **no escalation tool** among the seven; the system prompt's only exits are "stop the flow"
  (`customer-booking-agent.service.ts:61,65`).
- **Given** an unanswerable question, a repeated failure, or an explicit request for a person,
  **when** the customer escalates, **then** an admin notification is created containing the `conversationId`
  and the last 10 turns.
- `→ blocks:` SAFE-03, whose "routed to a human path" does not otherwise exist.

---

## EPIC C — Quote presentation (what the prototype demonstrates)

### QUOTE-01 — A summary in the conversation, not a wall of numbers (S)
**As a** customer mid-conversation, **I want** the quote as a short live summary,
**so that** the chat stays readable while a price exists.

- **Given** a computed quote, **when** it appears, **then** the card shows the service, the cadence, the
  per-visit tax-inclusive total, and one control to open the detail — and renders no line items.
- **Given** any input changes, **when** the new quote resolves, **then** the displayed total equals the most
  recent `compute_quote` result after one render frame.
- ⚠ **corrected** — an earlier draft required a **tier** on the card. No tier concept exists (see item 4).

### QUOTE-02 — Full breakdown on demand, in a drawer (M)
**As a** customer who wants to check the maths, **I want** the breakdown over the conversation,
**so that** I can audit the number without losing my place.

- **Given** the summary, **when** the detail opens, **then** it renders exactly the `lineItems` the engine
  emits, plus the total.
- ⚠ **corrected** — an earlier draft required "each add-on" as a priced line. **The engine cannot supply
  that.** Extras are priced as *minutes* inside `adjustedMinutes`, and `extrasPrice` is returned as `0`
  (`pricing.service.ts:627,817`). Rendering a per-add-on dollar figure would mean inventing one, which then
  breaks PRICE-06. If per-add-on amounts are wanted, that is an engine change and needs its own story.
- **Given** the drawer is open, **when** cadence or add-ons change, **then** the bounding-box `top` of the
  total and of the primary action changes by 0 px.
- **Given** the drawer is open, **when** Escape, the close control, or an outside click occurs,
  **then** it closes and focus returns to the control that opened it.

### QUOTE-03 — One scrolling surface at a time (S)
**As a** customer on a page that also scrolls, **I want** one thing to scroll under my pointer,
**so that** reading the quote does not fight the page.

- **Given** the drawer closed, **when** the customer scrolls over the widget, **then** page scroll offset is
  unchanged and only the conversation moves.
- **Given** the drawer open, **when** the customer scrolls over the scrim, the pinned price, or the primary
  action, **then** page scroll offset is unchanged.
- **Given** an inner scroller at its end, **when** scrolling continues, **then** page scroll offset is
  unchanged.

### QUOTE-04 — The summary never hides a warning the detail shows (S)
**As a** customer, **I want** any "not applied" state visible on the summary,
**so that** collapsing the detail cannot make the price look better than it is.

- **Given** a cadence whose configured discount was not applied, **when** the drawer is closed,
  **then** the summary renders the identical warning string the drawer renders, as text, not colour alone.

### QUOTE-05 — Usable by keyboard and screen reader (M)
**As a** customer using assistive technology, **I want** the drawer to behave like a dialog,
**so that** I can reach the controls and know what changed.

- **Given** the drawer open, **when** tabbing through the full cycle, **then** every focused element is inside
  the drawer.
- **Given** the drawer closed, **when** tabbing the page — including during the close animation —
  **then** no element inside it receives focus.
- **Given** the total changes, **when** it settles, **then** the live region is updated exactly once with the
  total, the cadence, and whether tax is included.
- **Given** `prefers-reduced-motion: reduce`, **when** the drawer opens or closes, **then** no animation plays
  and no control is focusable while off-screen.

### QUOTE-06 — Works at the sizes it will be embedded at (M)
**As a** tenant embedding the widget, **I want** it usable from a 400px embed to full width,
**so that** it has no broken middle range.

- **Given** a widget width ≥ 640 px, **when** the drawer opens, **then** the remaining conversation column is
  ≥ 320 px wide.
- **Given** a widget width < 640 px, **when** the drawer opens, **then** it covers the conversation fully.
- **Given** many configured cadences and add-ons, **when** the drawer opens, **then** the controls scroll while
  the total and primary action remain at a fixed offset.

### QUOTE-09 — Quote a job that is more than one clean (L) ↔ AIRC-01…06
**As an** Airbnb host, **I want** the initial deep clean and the recurring turnover quoted separately,
**so that** I can see and approve each.

⚠ **corrected** — an earlier draft asserted PRICE-07 ("everything is per visit") as universal. That is
incompatible with a shipped flow. In `src/features/drawers/newOrEditBooking/steps/QuoteStep.tsx`, `:319` and
`:333` fire **two independent pricing queries**, and `:869-905` renders Airbnb Initial/Turnover columns with
per-clean `StatusBadge` (`:874`, `:900`); the Initial/Recurring pair is at `:704-741`. Note this is the
**admin** quote builder — the capability exists staff-side and feeds the customer approval page (Epic E). The
agent cannot express it at all: `compute_quote` returns a single `totalWithTax`
(`customer-booking-tools.ts:374-383`).

- **Given** a multi-clean service, **when** the assistant quotes it, **then** each clean is priced separately
  and each can be approved separately.
- Not blocked: the `compute_quote` contract change **is** this story's work.

---

## EPIC D — Pricing correctness

The engine is the single source of truth (`computePricing`, `pricing.service.ts:207`, five non-test callers).
These are the places that promise leaks. *(Every citation in this epic was independently verified.)*

### PRICE-01 — A configured cadence discount is applied, or the customer is told it was not (L) 🔴 live
**As a** customer choosing a cadence the tenant configured, **I want** the advertised discount applied,
**so that** the price shown is the price I agreed to.

A tenant frequency named anything outside four hardcoded names silently prices as **one-time** while the
picker advertises the saving. Three independent hops:
`pricing.service.ts:642-646` (three-way `===`, fallback `effFreq.oneTime`);
`catalog.ts:592` (blind cast, no validation, no `400`);
`BookingExperienceV8.tsx:139-145` (`recTotal()` falls through the same way).

- **Given** a frequency row `2x Weekly` at 15%, **when** selected, **then** the total reflects 15% off, or the
  request is rejected — never silently one-time.
- **Given** an unrecognised `frequency` at the public endpoint, **when** received, **then** the response is
  `400`.
- **Given** the fix, **when** `pricing.parity.test.ts` runs, **then** form-path and agent-path inputs still
  deep-equal (`:104-105`). *Note: that test does not cover the admin path — extending it to admin is optional
  extra scope, not an existing guarantee.*
- Do **not** write a ticket to create `withFreqDiscount()` — it exists (`frequency.ts:81-109`). The gap is
  name→key resolution.

### PRICE-11 — The visit-count saving is deducted, or not advertised (M) 🔴 live
**As** staff building a quote for a customer, **I want** the advertised saving actually deducted,
**so that** the quote I send does not promise a discount the total never applies.

⚠ **corrected twice, and the persona was wrong too.** The first draft cited `OfficeQuoteStep.tsx`, which
**nothing imports** (verified; its discount is a hardcoded `visitsPerWeek >= 2 ? 0.25 : 0` at `:153`). The
second draft's replacement citation was also wrong — `:414-428` is the **cadence** block, which *does* apply
its discount via `withFreqDiscount` (`:423-424`). The correct evidence is
**`src/features/drawers/newOrEditBooking/steps/QuoteStep.tsx:445-460`**, comment at **`:453`** (at HEAD:
`:422`): *"ponytail: display-only. This row advertises a discount that is never deducted from the 'Per visit'
total below it… Wire it into withFreqDiscount (or the engine) when someone decides it should actually apply."*

That path matters: this is the **admin booking drawer**, not the public flow. The defect reaches customers via
the quote that drawer produces and emails (Epic E), not through the public form — so the persona is staff, and
the blast radius is quotes sent by staff.

- **Given** a qualifying visit count, **when** the quote renders, **then** the saving is included in the total,
  or the row is not displayed.
- ⛔ The persistence half is blocked by RECUR-01: `visitsPerWeek` lives only in `wizardSnapshot` with zero
  backend hits. ↔ QAPR-01.

### PRICE-09 — Price commercial work on what actually drives it (XL)
**As a** commercial customer, **I want** density and countable fixtures to affect my price,
**so that** a 20-desk showroom is not priced as an empty floor.

- `FloorPlanField.tsx:22-32` collects `workstations, desks, seats, stalls, sinks, appliances`; no `features`
  key survives into the pricing input (`useWizardPricing.ts:29-35`) and the engine has no such concept.
  `docs/office-cleaning-pricing-rules.md:12` states the intended principle: *"price on density and detail, not
  on size or frequency."*
- **Given** the density model defined by open decision 5, **when** two jobs of equal square footage and
  different density are quoted, **then** their totals differ by at least the band that decision specifies.
- ⛔ Blocked by open decision 5. Its absence makes the prototype's office scenario unquotable as depicted.

### PRICE-10 — Show the minimum-visit floor as a line (S)
**As a** customer whose job is below the minimum, **I want** to see the floor applied,
**so that** the total is explicable.

- Already modelled: `pricing.service.ts:594-620` sets `floorApplied`; `PriceBreakdownLines.tsx:122` renders it.
- **Given** a quote where the floor binds, **when** the breakdown renders, **then** the floor appears as a
  named line.

### PRICE-02 — Cadence identity survives a rename (M)
**As a** tenant, **I want** to rename a frequency without changing what customers are charged,
**so that** copy edits are not pricing changes.

- **Given** a frequency row, **when** created, **then** it carries a stable key independent of display name
  (upgrade path already named at `frequency.ts:7-9`).
- **Given** existing rows, **when** migrated, **then** all are backfilled and no live tenant's computed total
  changes.
- Four copies of the name normalisation exist — `BookingExperienceV8.tsx:131`, `BookingExperienceV15.tsx:141`,
  `pricing.service.ts:242`, `frequency.ts:12`. Converging them is a **review gate on this story**, not a
  runnable acceptance criterion.

### PRICE-03 — Tax rules apply where the tenant said they apply (M) 🔴 live
**As a** tenant, **I want** a rule scoped to `extras` charged on extras only,
**so that** I am not over-collecting tax.

- `appliesTo: "all"|"services"|"extras"` is stored, validated and AI-populated (`rules-settings.model.ts:132`)
  and **never read** — the engine filters on `state` only (`pricing.service.ts:679`).
- **Given** a rule scoped to `extras`, **when** a mixed quote computes, **then** tax applies to the extras
  portion only.
- ⛔ Blocked by open decision 4: fixing this **changes existing tenants' totals** and needs an audit and comms
  plan first.

### PRICE-04 — A recurring quote includes the same surcharges as a one-time one (M)
**As a** customer booking recurring work on a holiday, **I want** the surcharge reflected,
**so that** the persisted total is not short.

- `priceAtFreq` computes from `basePrice`, never `netAfterSurcharge` (`pricing.service.ts:689-696`;
  `BookingExperienceV8.tsx:898-900`).
- **Given** a holiday date, **when** the same job is quoted one-time and recurring, **then** both include the
  surcharge, or the recurring breakdown carries a visible line stating it is excluded.

### PRICE-06 — The breakdown adds up as printed (S)
**As a** customer, **I want** the figures shown to sum to the total shown,
**so that** I can check it by hand.

- **Given** any quote, **when** lines are rounded for display, **then** they sum exactly to the displayed
  total, and any displayed percentage matches its displayed amount to the cent.
- **Given** one quote rendered in the summary, the drawer and the agent's message, **then** all three strings
  are identical.

### PRICE-07 — Single-visit services are quoted per visit (S)
**As a** customer comparing cadences, **I want** one honest unit,
**so that** "per week" does not silently assume a cadence.

- ⚠ **corrected** — scoped to single-visit services; multi-clean is **QUOTE-09**.
- **Given** a single-visit service, **when** the headline shows, **then** it is per visit and labelled so.
- **Given** a monthly projection, **when** shown, **then** it states the visits-per-month it assumes; where the
  engine cannot price the cadence monthly, it reads unavailable rather than showing the one-time figure.

### PRICE-08 — Pricing failure is visible, never a stale number (S)
**As a** customer, **I want** a failed price call to say so,
**so that** I never agree to a number no longer being computed.

- **Given** the pricing request fails or times out, **when** it does, **then** the displayed total is replaced
  by an error state with a retry control, and no previous figure remains on screen.

---

## EPIC E — Quote delivery and approval

⚠ **corrected** — an earlier draft had no stories here and implied no quote-validity window existed. There is
a full lifecycle: signed single-use tokens expiring in **7 days** (`settings/index.ts:1029`), invalidated on
resend, validated atomically, with per-clean and "Approve All" (`quote-approve-public.ts:20,243-253`),
auto-confirm when all expected approvals land (`:34-41,275`), an SMS shortlink (`pages/api/q/[code].ts:43`)
and a public page (`ApproveQuotePage.tsx:39`).

### QUOTE-07 — Leave with a working quote link (M) ↔ QAPR-05/06
**As a** customer who leaves mid-conversation, **I want** the quote emailed with an approval link,
**so that** I can come back and approve it.

- **Given** a computed quote, a captured email, and 15 minutes with no further turn, **when** the timer fires,
  **then** the quote is delivered with a working approval link and the message states its expiry date.
- ⛔ Interacts with DATA-01: today the conversation is purged after 24h.

### QUOTE-08 — An expired or used link says so (S) ↔ QAPR-07
**As a** customer following an old link, **I want** to be told it expired or was already used,
**so that** I know to ask for a new one rather than assume the site is broken.

- **Given** a token past its 7-day window, **when** followed, **then** the page states it expired and offers a
  new quote.
- **Given** an already-consumed token, **when** followed, **then** the page states it was already used and
  links to the resulting booking.

### QAPR-R1 — Decide the fate of time caps (decision, not sized) ↔ QAPR-03 / AIRC-02
- `COMPONENT_CHANGES.md:9400,9405` record the removal of `TimeCap` and `TimeCapCounter`, while
  `REQUIREMENTS.md:112` still marks AIRC-02 `[x]`. Two accepted requirements are unimplemented.
- ⚠ **corrected** — an earlier draft cited an orphan `TimeCap` comment at `QuoteStep.tsx:320`. **No such
  comment exists** at that commit or at HEAD; `grep TimeCap` returns zero hits in that file.
- Outcome: reinstate or formally retire. Tracked as a decision; it carries no story points.

---

## EPIC F — From quote to booking

### BOOK-01 — Commercial customers are not blocked by a card gate (L) ↔ QAPR-01…08
**As an** office manager who pays by invoice, **I want** to approve without a credit card,
**so that** the segment that pays by invoice can book.

- The gate is unconditional: `quote-approve-public.ts:497-503` → `402 card_required`; ACH is excluded
  (`:62`). Yet `booking.model.ts:164-165` defines `preferredPaymentMethod: "credit_card"|"ach"|"invoice"` with
  the comment *"offices are invoice-billed"*, and `rules-settings.model.ts:84-88` lets tenants enable invoice.
- ⚠ **corrected** — an earlier draft said the agent "already reads an `invoiceApproved` flag". Nothing stores
  such a flag; it is *derived* at `customer-booking-tools.ts:434` from
  `profile?.preferredPaymentMethod === "invoice"`. The capability is modelled in the data, not tracked as an
  approval.
- **Given** a tenant with invoice enabled and a customer eligible for it, **when** they approve, **then**
  approval succeeds without a card and the settlement method is persisted on the booking.
- **Given** a tenant without invoice enabled, **when** they approve, **then** the `402` gate still applies.
- ⛔ Blocked by open decision 1 (payment timing) and open decision 6 (who is eligible for invoice).

### BOOK-05 — A booking made in chat sends the same confirmation (M)
**As a** customer who just booked, **I want** the confirmation the form flow sends,
**so that** I have proof of what I booked.

- `.claude/rules/feature-effects.md:167` states `confirm_booking` "does NOT currently re-publish the
  `booking.created` notify+dispatch event" and that Phase 24 will wire it. It creates the booking and a chat
  thread and stops (`customer-booking-tools.ts:530-576`).
- **Given** a booking created by the agent, **when** it is created, **then** the confirmation email is sent,
  and the confirmation SMS is sent when `booking.smsConsent` is true.
- ⛔ Sequenced behind Phase 24 notifications work.

### BOOK-02 — One booking state machine, not three (M)
**As** operations, **I want** a quote to reach the same state regardless of path,
**so that** a status means one thing.

- Public V8 → `pending` (`catalog.ts:1087,1108`); admin approval → `quote|draft → confirmed`
  (`quote-approve-public.ts:300-315`); agent → `confirmed` with `paymentStatus:"none"` directly
  (`customer-booking-tools.ts:530-556`).
- **Given** a booking completed via the assistant, **when** created, **then** its status is `pending`, matching
  the public form path.
- ⚠ **corrected** — an earlier draft ended this criterion with "…or the divergence is documented and
  intentional", an escape hatch that made it unfailable. Target state named instead.
  ↔ `.claude/rules/booking-state-machine.md`.

### BOOK-03 — The assistant states what happens on submit (S)
**As a** customer, **I want** to know whether I am being charged,
**so that** the commitment is not a surprise.

- The public flow takes a SetupIntent and charges **$0** (`BookingExperienceV8.tsx:1243-1256`), settling
  post-job (`booking.ts:2322-2437`).
- **Given** the primary action, **when** rendered, **then** its label and adjacent copy state the amount
  charged now, whether a card is stored, and the resulting booking status.
- ⛔ Blocked by open decision 1: what this copy says depends on the payment moment chosen.

### BOOK-04 — Confirming twice does not book twice (S)
**As a** customer who retries, **I want** one booking,
**so that** a flaky connection does not duplicate.

- Already idempotent on `draft.confirmedBookingId` (`customer-booking-tools.ts:445-453`).
- **Given** a repeated confirm for one draft, **when** processed, **then** the original booking is returned and
  the booking count for that draft is 1.
- ⛔ Blocked by AGENT-04 — the draft key changes once a guest identity exists.

---

## EPIC G — Agent safety

### SAFE-01 — No card data reaches the model (M)
**As** the business, **I want** the PCI invariant enforced in code,
**so that** exposing the agent does not expose us.

- `ROADMAP.md:585-610` states it as binding: card numbers, PANs and CVVs must never appear in agent messages,
  tool inputs or tool outputs.
- **Given** a message containing a PAN-shaped string, **when** the turn is processed, **then** it is redacted
  before the model call and before any persisted transcript.
- **Given** any tool result, **when** serialised, **then** it matches no PAN or CVV pattern.
- ⛔ Interacts with DATA-01: transcripts are stored verbatim
  (`customer-booking-conversation.model.ts:100`).

### SAFE-05 — The catalog handed to the model is scoped (M)
**As the** business, **I want** only what the conversation needs in model context,
**so that** a public agent is not a tenant-configuration disclosure surface.

- `read_catalog` returns the tenant's full catalog including `zipGroups`, `ungroupedZipCodes` and
  `paymentMethods` into model context (`customer-booking-tools.ts:282-284`).
- **Given** a public conversation, **when** `read_catalog` runs, **then** its payload excludes operational
  configuration the customer has no need for, and what remains is scoped to the resolved tenant.
- ⛔ Blocked by AGENT-06.

### SAFE-04 — Service area is enforced server-side (M) ↔ AI-07
**As** the business, **I want** out-of-area requests refused by code, not by the prompt,
**so that** a non-compliant model cannot sell work we cannot deliver.

- AI-07 is implemented on a **different** surface (`routes/ai.ts:105-122`, `400 zip_not_serviced`). In the
  booking agent, zip is format-validated only (`customer-booking-tools.ts:48`), zip groups are handed to the
  model as data (`:282-283`), and neither `compute_quote` nor `confirm_booking` checks membership.
- **Given** an out-of-area zip, **when** `compute_quote` or `confirm_booking` runs, **then** it is refused
  server-side with a distinct error.
- ⛔ Blocked by AGENT-06.

### SAFE-02 — The agent cannot invent a price (M)
**As a** customer, **I want** every figure to come from the engine,
**so that** the conversation and the breakdown cannot disagree.

- **Given** an assistant message, **when** it renders, **then** every currency-formatted substring matches a
  value from a `compute_quote` result in that conversation.
- **Given** an input change after a quoted figure, **when** the agent replies, **then** the figures it states
  match the latest `compute_quote` result, not an earlier one.

### SAFE-03 — The agent cannot grant discounts (S)
**As** the business, **I want** admin-only pricing inputs unreachable from conversation,
**so that** persuasion is not a discount mechanism.

- **Given** a fixed red-team set of at least 50 discount-seeking prompts, **when** run, **then** zero produce a
  `manualDiscount`, `customLineItems`, `overrideMinutes` or `exemptTax` field in any tool call.
- **Given** a discount request, **when** the agent declines, **then** it escalates via CONV-05.
- ⛔ Blocked by CONV-05.

---

## EPIC H — Data, consent and retention

### DATA-01 — Keep the conversation that produced a booking (M) ↔ VER-01/VER-05
**As** the business, **I want** transcripts retained on a documented schedule,
**so that** the record of what a customer was promised outlives 24 hours.

- `customer-booking-conversation.model.ts:108` sets an **unconditional 24h TTL** (`expires: 60*60*24` on
  `startedAt`) — a conversation that created a real booking is purged a day later. The full transcript,
  including every tool input and output, is stored verbatim (`:100`). `status:"expired"` is declared and never
  written. `DELETE` is a hard delete with no audit (`customer-booking-agent.ts:255-259`). The admin equivalent
  already moved off this pattern — VER-01 removed the TTL and VER-05 added a 90-day partial
  (`admin-setup-conversation.model.ts:124-126,146-149`), both complete.
- **Given** the retention period set by open decision 8, **when** a conversation that produced a booking
  reaches it, **then** it is redacted rather than hard-deleted, and an audit record exists.
- ⛔ Blocked by open decision 8.

### LEGAL-01 — Consent parity with the form flow (M)
**As** the business, **I want** the agent to capture the SMS/email consent the wizards capture,
**so that** the agent path is not a compliance hole the form path is not.

- The wizards gate confirm on an SMS-consent modal and persist `booking.smsConsent`
  (`BookingExperienceV8.tsx:1226-1230,1272,1383-1393`). `confirm_booking` writes contact details
  (`customer-booking-tools.ts:547-551`) with **no** consent field — none exists in `CustomerBookingDraft`
  (`customer-booking-conversation.model.ts:22-67`).
- **Given** a booking created by the agent, **when** confirmed, **then** `smsConsent` is persisted with the
  same semantics as the V8 path.

### LEGAL-02 — Terms acceptance (M) — new scope, no parity to inherit
**As** the business, **I want** explicit terms acceptance recorded,
**so that** what the customer agreed to is provable.

- ⚠ **corrected** — an earlier draft folded this into LEGAL-01 as "the same terms acceptance the form flow
  captures". **The form flow does not capture it**: `termsAccepted` has zero hits repo-wide (verified). This
  is new scope for both paths, not parity.
- **Given** a booking created by any path, **when** confirmed, **then** the terms version accepted and the
  timestamp are persisted.
- ⛔ Blocked by a decision on whether terms acceptance is being introduced at all.

---

## EPIC I — Embedding

### EMBED-01 — Embed safely on a tenant's site (M) ↔ Phase 17
**As a** tenant, **I want** the assistant embeddable on my domain and no other,
**so that** embedding is not a way to frame or impersonate us.

- Infrastructure exists: `public/embed.js` ships a `<booking-widget>` custom element with an iframe sandbox
  (`:41`); `App.tsx:175,185` posts to `window.parent` with a **wildcard `"*"` target origin**;
  `EmbedCode.tsx:19-20` emits the element, adding `data-tenant` only on the off-subdomain branch.
  `next.config.mjs:9-18` sets only `Cache-Control` on `/embed.js` — no `X-Frame-Options`, no
  `frame-ancestors`, no `middleware.ts`; helmet applies to the API app only
  (`pages/api/v1/[...path].ts:232`). Phase 17 is `Requirements: TBD`.
- **Given** an embedded widget, **when** it posts to its parent, **then** the `targetOrigin` argument is a
  specific origin and never `"*"`.
- **Given** a page on a domain the tenant has not allowed, **when** it frames the widget, **then** the browser
  refuses the frame per response headers.

---

## EPIC J — Recurring work, config quality, deferred

### RECUR-01 — Frequency is a first-class booking field (L) ↔ QAPR-01/02/04/05
**As** operations, **I want** cadence stored on the booking,
**so that** recurring work is queryable and enforceable.

- **Given** a booking from any of the three paths, **when** persisted, **then** cadence is a typed, indexed
  field, and a query filtering by cadence returns it.
- **Given** existing bookings, **when** migrated, **then** cadence is backfilled where parseable from
  `wizardSnapshot` and flagged where not.
- `→ blocks:` RECUR-02, PRICE-11 (persistence half). Also the home of `visitsPerWeek`.

### RECUR-02 — Choosing "weekly" creates a weekly series (XL)
**As a** customer choosing a recurring cadence, **I want** the visits scheduled,
**so that** "weekly" means more than one booking.

- No `seriesId`, no RRULE, no scheduler; `repeatedFromId` (`booking.model.ts:76,280`) is one-off cloning with
  provenance.
- ⚠ **corrected** — an earlier draft called one-booking-per-instance a "deliberate, documented decision",
  citing `FEATURES.md:95-107`. That resolves to `.planning/research/FEATURES.md`, where the line is a row in
  an Airbnb-vs-recurring **comparison table**, not a decision record. Treat the current behaviour as
  undocumented, not as a decision to overturn.
- ⛔ Blocked by RECUR-01 and open decision 7. Its own milestone.
- **Shippable slice meanwhile:** given a recurring cadence is chosen, the confirmation message states the
  number of bookings created (1) and explicitly says later visits are not yet scheduled.

### RECUR-03 — Do not promise bundled recurring visits (S)
**As** the business, **I want** the assistant unable to offer "quarterly deep clean — included",
**so that** it cannot commit us to work the engine cannot price.

- `ComputeQuoteInput.frequency` is `z.enum(["one-time","weekly","biweekly","monthly"])`
  (`customer-booking-tools.ts:41`); `PricingInput` has no bundle concept.
- **Given** an assistant message describing what is included, **when** it renders, **then** every item it names
  corresponds to a line in the `lineItems` of the current quote.

### CONFIG-01 — Invalid pricing config cannot be saved (L)
**As a** tenant admin, **I want** bad values rejected at entry,
**so that** a typo does not become a live mispricing.

- Validation is thin and mostly client-side. Frequency `discount` is stored as a **string** and coerced at read
  time (`frequency.ts:39` uses `parseFloat(row.discount ?? "0") || 0`; `pricing.service.ts:243` coerces too —
  8 `parseFloat` discount sites in total). Single-`default` is enforced in the browser by unsetting siblings
  (`Frequency.tsx:263-275`) with no DB constraint. Tier `minimum`/`maximum` overlaps and gaps are unchecked and
  `lookupTier` takes the first match (`pricing.service.ts:192-205`).
- ⚠ **corrected** — an earlier draft cited `collection.ts:47-53` for the discount bound. Those lines are a
  name-uniqueness set (`UNIQUE_NAME_COLLECTIONS`), unrelated.
- **Given** a discount outside 0–100%, a negative amount, overlapping or gapped tiers, or a second default
  cadence, **when** saved, **then** the server rejects it with a message naming the field.
- Size raised from M: server validation over a schemaless collection plus migration of existing bad rows.

### CONFIG-02 — Tenant-configured cadences render without a hardcoded list (S)
**As a** tenant, **I want** my own cadence names offered,
**so that** the picker matches how I sell.

- **Given** a tenant's `frequencies` collection, **when** cadences are offered, **then** exactly those rows
  render, each showing its configured saving.

### Deferred (no criteria written; not sized until committed)
- **I18N-01** — currency hardcoded `"USD"` (`pricing.service.ts:822`, `BookingExperienceV8.tsx:105`), dates
  `"en-US"` (`:1113`), no i18n dependency in `package.json`. Deferred unless a non-US tenant is committed.
- **COUPON-01** — no coupon system (zero matches for `coupon|promoCode|promo_code|giftCard`). Deferred unless
  marketing commits.

---

## Explicitly out of scope

| Item | Why |
|---|---|
| Building a conversational agent | Exists; the work is exposure + hardening — but that is three real stories (AGENT-04/05/06), not a flag flip |
| Creating `withFreqDiscount()` | Already merged and shared (`frequency.ts:81-109`) |
| Building quote email/approval delivery | Exists with 7-day signed tokens; Epic E extends it |
| Rate limiting from scratch | Exists (`rate-limit.ts:25-31,73-87`); AGENT-02 is only the identity key |
| Per-add-on dollar amounts in the breakdown | Engine prices extras as minutes and returns `extrasPrice: 0` (`pricing.service.ts:627,817`); would need its own engine story |
| Multi-currency / i18n, coupons | Deferred |
| Recurring series scheduling | RECUR-02, its own milestone |

## Open decisions

1. **Payment timing** — where in the flow payment is requested. Settles AGENT-05, BOOK-01 and BOOK-03, which
   currently imply three different moments. *(Not a blocker on the whole feature: Epics C, D and E are
   startable against the existing playground.)*
2. **AGENT-04** — guest identity model, and how a guest reconciles with an existing customer.
3. **AGENT-06** — server-side tenant binding, and back-compat for embeds shipping `data-tenant`.
4. **PRICE-03** — fixing `appliesTo` changes live tenant totals; needs an audit and comms plan.
5. **PRICE-09** — whether commercial pricing moves to density/detail, and the expected price delta band.
6. **BOOK-01** — who qualifies for invoice settlement.
7. **RECUR-02** — whether one-booking-per-instance changes at all.
8. **DATA-01** — retention period and PII boundary for transcripts.
9. **LEGAL-02** — whether terms acceptance is being introduced.
10. **AGENT-02** — per-tenant LLM budget and exhaustion behaviour.
11. **QAPR-R1** — time caps reinstated or retired.

## Known limits of this document

- Sizes are relative, not estimates; nothing here has been sized by the team that would build it.
- ↔ markers cover the QAPR, AIRC, PAY, AI and VER requirement families. Other `.planning` families were not
  audited line by line.
- Citations are pinned to `91fb0bdf`; `QuoteStep.tsx` has already drifted at HEAD.
- The prototype was reviewed as an interaction study. Its pricing narrative — tiers, "Standard Plus", the
  PR #407 story — does not match the codebase and must not be carried into tickets.
