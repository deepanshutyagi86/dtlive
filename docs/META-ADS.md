# Running Meta ads to deepanshutyagi.live

What the code already does, what you have to do in Business Manager, and
which of the five ways to collect a registration is worth your money.

---

## What the site already sends

| Event | Fires when | Where from |
|---|---|---|
| `PageView` | every page | browser |
| `ViewContent` | a course/workshop page or /live opens | browser |
| `InitiateCheckout` | the checkout modal opens | browser |
| `Lead` | a free registration is submitted | browser **and** server |
| `Purchase` | a payment succeeds | browser **and** server |

`Lead` and `Purchase` are sent twice on purpose — once from the browser,
once from the server through the Conversions API — sharing an `event_id`
so Meta merges them into one conversion. That is what keeps conversions
being reported when a browser blocks the pixel, which on iOS is most of
them. It is already built (`src/lib/meta-capi.ts`); it only needs the two
environment variables below.

`ViewContent` and `InitiateCheckout` are browser-only, and that is the
right trade: they are optimisation signals, not money, and a missed one
costs nothing.

---

## One-time setup in Business Manager

Do these in order. Each takes a few minutes.

**1. Environment variables** — Vercel → project `dtlive1` → Settings →
Environment Variables. Add both to Production, then redeploy:

- `META_PIXEL_ID` — Events Manager → your pixel → Settings → the ID at the top
- `META_CAPI_TOKEN` — same page → Conversions API → *Generate access token*

Without these the site runs completely normally and sends nothing.

**2. Verify the domain** — Business Settings → Brand Safety → Domains → Add
`deepanshutyagi.live` → choose **Meta-tag verification** → paste the tag
into the site's `<head>`. Skipping this is what causes "you can't optimise
for this event" errors later, and it cannot be fixed retroactively.

**3. Aggregated Event Measurement** — Events Manager → your pixel →
Aggregated Event Measurement → Configure Web Events. Order them:

1. `Purchase`
2. `InitiateCheckout`
3. `Lead`
4. `ViewContent`
5. `PageView`

Only the top event is reported for an iOS user who opted out of tracking,
so the order is a statement about what you care about most.

**4. Confirm it works** — Events Manager → Test Events → copy the test
code → open the site with `?test_event_code=XXXX` on the URL → click
through a registration. You should see `Lead` arrive twice, marked
**deduplicated**. Twice and *not* deduplicated means the `event_id` is not
matching, and your conversion count will be double what it really is.

---

## The five ways to collect a registration

Ranked worst-to-best by lead quality, which is roughly the reverse of cost
per lead. Cheap leads that don't turn up are the most expensive thing on
this list.

**1. Instant Forms (lead ads).** The form opens inside Instagram; they
never reach your site. Cheapest cost per lead by a wide margin, lowest
intent by the same margin, and the leads sit in Meta until you export them
by hand or wire a webhook to `/api/leads`. Worth testing only once
something else is working.

**2. Click-to-WhatsApp.** The ad opens a WhatsApp chat with you. Very
strong response rates in India and you get to pitch conversationally, but
there is no email address, no pixel event, and the follow-up is manual.

**3. Ad → `/live/<slug>`.** The default, and what the site is built for.
Full page, your pixel, `ViewContent` → `Lead` → `Purchase` all firing,
UTM tags recorded on your own rows. Everything downstream works.

**4. Ad → a thin single-CTA page.** Same data as 3, but a page with one
message and one button. Usually converts cold traffic better, because a
page that explains five things to someone who arrived for one is a page
they leave. Worth an A/B against 3.

**5. Ad → paid ticket (₹49–₹99).** Same flow, but they pay to register.
Cuts registrations by roughly two thirds and raises show-up from about a
quarter to well over half. It also lets you optimise the campaign on
`Purchase`, which is the strongest signal Meta has — a campaign optimising
on Purchase finds buyers, a campaign optimising on Lead finds form-fillers.
On this site it is one setting: make the /live block a paid one at ₹49.

**Always, alongside whichever you pick — retargeting.** Two audiences are
worth more than any cold campaign:

- Hit `ViewContent` or `/live`, never fired `Lead` → they looked and left.
- Fired `Lead`, never fired `Purchase` → they registered and didn't buy.

Both are buildable in Ads Manager the moment the events above are flowing.

---

## Link tags

Put UTM tags on every ad's destination URL. The site records them on the
lead or order (migration 003), so you can ask your own database which
campaign produced buyers rather than which produced clicks:

```
https://www.deepanshutyagi.live/live?utm_source=fb&utm_medium=paid&utm_campaign=aug-webinar&utm_content=video-a
```

Keep `utm_content` distinct per creative. It is the only way to tell which
video did the work when a campaign has four of them.
