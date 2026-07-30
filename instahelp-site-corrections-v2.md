# instahelp.in - Implementation Brief v2

**Supersedes v1 entirely.** Several positions in v1 were wrong and are corrected here.

**Target:** https://instahelp.in/ (and the `.co` property if it shares a codebase)
**Audience:** the coding agent making these changes

---

## 0. Context the agent must understand before editing

**The business.** InstaHelp is a Bengaluru-based assistant and intermediation service
operating since April 2015. It sources, vets and coordinates independent third-party
providers across home services, business services, sourcing and travel. **InstaHelp is its
own operating entity.** Do not attribute the site to Singhvee Ventures or to any other
family entity anywhere in the code, metadata, schema or copy.

**The ambition.** This is not a brochure site. The objective is to rank at the top of Google
and to be the entity that LLMs cite for on-demand service intermediation in India, and
ultimately to compete with JustDial, IndiaMART, HomeTriangle, NoBroker and Google's own
local results. Architect accordingly: the site must scale to thousands of pages without
tripping doorway-page or thin-content penalties.

**The constraint.** The owner holds Indian Trade Mark Registration **No. 3299283** for
**INSTAHELP** in **Class 35**. A cancellation petition against that registration is
currently pending. The website is live evidence and opposing counsel will capture it.

This produces one narrow rule, and it is narrower than v1 stated:

> **Claims about what we deliver must be provable. Claims about what we accept, reach or
> offer need not be.**

That distinction is the spine of this document. It lets the site keep every city, every
locality and every category - the SEO surface stays intact - while removing the specific
sentences that would require an invoice to defend under cross-examination.

### Do not touch

- `Since 2015`, `Operating since April 2015`, `© 2015-2026`
- The footer trade mark notice referencing Reg. No. 3299283, Class 35
- `+91 70227 02220`, WhatsApp links, `mail@instahelp.in`, `@i7022702220`
- The core positioning: InstaHelp arranges and coordinates independent providers and does
  not perform the underlying work itself

### Placeholder convention

`[[FILL: ...]]` requires a value from the owner. Do not guess. List every unresolved
placeholder in your completion summary.

---

# P0 - Legal exposure. Ship first.

## P0-1. Change the verb on every coverage claim. Keep the cities.

**This replaces v1's instruction to delete the city list. That instruction was wrong.**

The cities and localities stay. Every one of them. What changes is the grammatical framing,
from *delivery* to *intake and reach*.

| Claim type | Needs proof? | Use freely |
|---|---|---|
| "We serve 30+ cities" | Yes - an invoice per city | No |
| "On-demand assistant services across Rourkela" | Yes | No |
| "We take requests from anywhere in India" | No | Yes |
| "Send your pin code and we will confirm coverage" | No | Yes |
| "We source providers nationwide" | No | Yes |
| "Available in Whitefield, Marathahalli, Sarjapur Road" | Where genuinely operating | Yes, for real operating areas |

**Action - string replacements:**

| Remove | Replace with |
|---|---|
| `Serving **30+ cities** including Bangalore, Mumbai, Delhi NCR, Hyderabad, Chennai, Pune & more.` | `Requests accepted from anywhere in India. Tell us your pin code and we will confirm before you commit to anything.` |
| `### InstaHelp in <City>` → `On-demand Assistant services across <City> including ...` | `### InstaHelp in <City>` → `We take requests from across <City>, including <localities>. Send your pin code on WhatsApp and we will confirm coverage and timing before anything is booked.` |
| `InstaHelp also serves Lucknow, Chandigarh, Kochi ...` | `We accept requests from Lucknow, Chandigarh, Kochi ...` |
| `We arrange and intermediate trusted professionals with deep operational coverage across all major regional hubs` | `We source providers nationwide, with our deepest bench in Bengaluru and the major metros.` |
| `30+ Indian Cities` in `<title>` | `Nationwide` or `India` |

**Keep as-is:** the "Coming Soon" tags. They are honest and they are a shield, not a
liability - they say explicitly that a city is not yet live.

**Keep as-is:** the honest depth statement. Saying Bengaluru is the strongest market is
truthful, defensible, and reads as credible rather than inflated.

**Acceptance:** grep for `we serve`, `serving`, `services across`, `operational coverage`
and confirm each surviving instance is either (a) a locality where the business genuinely
operates, or (b) reworded to intake framing.

---

## P0-2. Apartment complexes: keep, reframe, disclaim

**This replaces v1's instruction to delete them. That instruction was too absolute.**

Naming a residential development to describe a service area is defensible. Under Section
30(1) of the Trade Marks Act, use in accordance with honest practices in commercial matters
is not infringement, and locational reference to indicate where a service is available is
honest use.

What is **not** defensible is framing that implies traction inside, or appointment by, that
development. `Popular in apartment complexes including Prestige Shantiniketan` is not a
coverage statement - it asserts standing within a named private community. Builders and
resident associations do send cease-and-desist letters over exactly this, and many gated
communities run exclusive vendor panels they actively police. A C&D landing while the
rectification is pending is the specific harm to avoid; litigation is unlikely.

**Action:**

1. Rewrite the framing verb everywhere:

   | Remove | Replace with |
   |---|---|
   | `Popular in apartment complexes including X, Y, Z` | `We take requests from residents of gated communities across <locality>, including X, Y, Z.` |
   | `<Complex> services` (meta keywords) | `<Locality> apartment services` |

2. Add a persistent non-affiliation disclaimer, visible on every page carrying such names
   (footer is acceptable):

   ```
   Names of residential developments, apartment complexes and localities are used
   solely to describe the areas from which we accept requests. InstaHelp is not
   affiliated with, endorsed by, appointed by, or a panel vendor of any developer,
   builder or resident welfare association named on this site. All such names remain
   the property of their respective owners.
   ```

3. **Restructure for SEO, which matters more than the legal point here.** Forty complex
   names listed on the homepage is a keyword block. It will not rank in 2026 and it dilutes
   the homepage. See **P1-1** - these terms belong on individual location pages with real
   content, and that is where they will actually earn traffic.

4. Remove any complex name where the business has genuinely never taken a request from that
   community. Not for legal reasons - because a location page for a place you have never
   served will be thin content and will drag the whole location cluster down.

---

## P0-3. Competitors: comparison is permitted. Denigration is not.

**This substantially reverses v1, which told you to remove all competitor names. That was
over-cautious.**

Comparative advertising is lawful in India. Section 30(1) of the Trade Marks Act protects
use in accordance with honest practices; Section 29(8) bites only where advertising use is
contrary to honest practices, is detrimental to the mark's distinctive character, or takes
unfair advantage of its reputation. The Delhi High Court's comparative-advertising line
permits factual comparison of like with like. What it does not permit is denigrating the
competitor's offering.

**The single line that must change:**

| Remove | Replace with |
|---|---|
| `Skip JustDial's paid listings and endless Google scrolling.` | `Directories give you twenty numbers. We give you one person who makes the calls.` |
| `Skip JustDial and Google - tell us what you need, we get it done.` | `Instead of a list of numbers, one team that sees it through.` |

The problem was the implication that JustDial's listings are pay-to-play and therefore
untrustworthy. That is a statement about the quality of their service and it is the
denigration. Describing the *category* limitation - a directory hands you a list, we hand
you an outcome - is honest positioning and is not actionable.

**Keep the competitor names.** They are legitimate and, for a challenger brand, valuable.

**Action - build comparison pages** (see P1-2). Rules for their content:

- Compare like with like. Compare your intermediation model against their directory or
  marketplace model. Do not compare against a mischaracterised version of their offering.
- Every factual assertion about a competitor must be verifiable and dated. Cite the source
  and the date checked. If a competitor changes their model, your page becomes false.
- No adjectives about competitor quality. `JustDial returns a list of providers` is fact.
  `JustDial returns a list of unreliable providers` is denigration.
- Puffery about your own service is permitted. Assertions about theirs must be strictly
  factual.
- State clearly that competitor names are the property of their owners and used for
  identification only.

Add to each comparison page:

```
Comparison based on publicly available information as at [[FILL: date]].
JustDial, IndiaMART, HomeTriangle and NoBroker are trade marks of their
respective owners, referred to here for identification and comparison only.
InstaHelp is not affiliated with any of them.
```

---

## P0-4. Vetting: keep the claim, substantiate it

The owner has confirmed a genuine vetting process exists and that several aspects are
personally checked. **v1's instruction to strip the word `verified` is withdrawn.**

But an undescribed `verified` is still weak - under the Consumer Protection Act 2019 an
unsubstantiated quality claim is a misrepresentation, and if a provider causes loss at a
customer's premises, "verified by InstaHelp" is the first exhibit against you. The fix is
specificity, and specificity is also the strongest differentiator you have against a
directory that verifies nothing.

**Action:** create a dedicated `/how-we-vet` page and link it from every use of the word.
Populate it from the owner:

```
[[FILL: What is actually checked before a provider is used?
  - Identity document collected and verified?
  - Address verified?
  - Prior work references contacted?
  - Trade licence / GST / professional registration checked, where applicable?
  - Prior InstaHelp jobs reviewed?
  - In-person or video meeting?
  - What causes a provider to be removed?
  - How many providers have been rejected or removed?]]
```

Then, on marketing pages, replace bare claims with specific ones:

| Remove | Replace with |
|---|---|
| `vetted third-party providers` | `providers we have checked ourselves - <one concrete check>` linking to `/how-we-vet` |
| `verified property agents` | `agents we have worked with and checked` linking to `/how-we-vet` |

**Do not state any check that is not actually performed.** A vetting page describing checks
that do not happen is materially worse than saying nothing, both under the CPA and in
evidence.

---

## P0-5. Remove the App Store and Google Play badges

**Holding this from v1.** Not a judgment call.

Apple's marketing guidelines and Google Play's badge guidelines both permit badge use only
to link to a live store listing. These link to `/app-waitlist`. It breaches both programmes
and represents that an app exists when it does not.

**Action:** delete both badge images and the `applemediaservices.com` and
`play.google.com/.../badges` URLs. Replace with:

```
InstaHelp app - in development.
[ Join the waitlist ]  ->  /app-waitlist
```

---

## P0-6. Remove the developer-tools blocker

**Holding this from v1**, and it now has a ranking argument as well as a legal one.

Find and delete the code producing `Please close developer tools to continue`, plus any
keybinding traps, right-click suppression, `debugger` loops or devtools detection.

It is bypassed in seconds, it breaks Lighthouse and accessibility tooling, it can interfere
with crawlers and archival capture, and on a site whose function is to establish credibility
it signals concealment. For a business intending to rank first on Google, deliberately
obstructing inspection tooling is a self-inflicted wound.

---

## P0-7. Hidden and cloaked text audit

**Holding this from v1, and it is now the highest-priority SEO item.**

Determine whether the city and locality keyword blocks are visible to human visitors. If any
keyword content is hidden by `display:none`, `visibility:hidden`, zero opacity, off-screen
positioning, colour-matching, or served differently to crawlers than to users, that is
cloaking under Google's spam policies and grounds for **deindexing the entire domain**.

For a business whose strategy is to outrank JustDial, this is an existential risk, not a
compliance footnote.

**Action:** remove any such technique. Report exactly what you find. All keyword-bearing
content must be visible to human visitors in normal rendering.

---

## P0-8. Statutory disclosures in the footer

**Holding this from v1 and strengthening it.** If the objective is to become a marketplace
competing with JustDial and IndiaMART, these disclosures move from advisable to mandatory -
and Google's E-E-A-T signals actively reward visible, verifiable business identity. Anonymity
suppresses rankings for commercial-intent queries. Compliance and ranking align completely
here.

The Consumer Protection (E-Commerce) Rules 2020 require a marketplace entity to display
legal name, principal geographic address, customer care contact and grievance officer
details. The IT Rules 2021 require a published grievance officer to support intermediary
safe harbour under Section 79 of the IT Act.

**Action:** add to the footer, on every page:

```
Operated by [[FILL: exact legal name of the InstaHelp operating entity, as on its
GST registration - NOT Singhvee Ventures]]
[[FILL: full principal place of business address, Bengaluru]]
GSTIN: [[FILL: GSTIN of the InstaHelp operating entity]]

Customer care: mail@instahelp.in · +91 70227 02220

Grievance Officer
Name: [[FILL]]
Email: [[FILL: use a distinct address, e.g. grievance@instahelp.in]]
Address: [[FILL: as above]]
Complaints acknowledged within 24 hours; resolution targeted within 15 days.
```

Create `/grievance` carrying the same details plus a complaint form. Link from the footer.

---

## P0-9. Data protection notice and consent

**Holding this from v1.**

The site collects name, phone, email, postal address and browser geolocation. The current
single checkbox covers onward sharing only. The Digital Personal Data Protection Act 2023
framework requires notice at the point of collection covering purpose, retention and the
individual's rights.

> The commencement and rules position under DPDP has been moving. The owner must confirm
> the operative compliance date with counsel. Implement regardless - it costs nothing and a
> marketplace handling consumer data at scale will need it.

**Action:**

1. Two separate checkboxes, both unticked by default:

   ```
   [ ] I agree that InstaHelp may share my request and contact details with
       independent providers so they can quote for and carry out the work.

   [ ] I have read the Privacy Policy and consent to InstaHelp processing my
       personal data for this purpose.
   ```

2. Collection notice beneath the form:

   ```
   We collect your name, contact details and - only if you choose to share it -
   your location, in order to match your request to a provider. We keep this for
   [[FILL: retention period]] and then delete it. You can ask us to correct or
   delete your data at any time at mail@instahelp.in. Full details in our
   Privacy Policy.
   ```

3. `Use my location` must be user-initiated with a plain-English explanation shown before
   the browser prompt fires. Never request geolocation on page load.

---

## P0-10. Move the Class 35 vocabulary off the marketing pages

**Holding this from v1**, and it now has a retrieval argument alongside the evidentiary one.

Copy that recites statutory classification language reads as drafted-for-litigation, which
reduces its evidentiary weight. It is also meaningless to customers, **and it actively
degrades LLM retrieval** - models answering "who can arrange a plumber and a CA in
Bangalore?" match against plain descriptions of what you do, not against classification
terminology. The jargon makes you harder to cite, not easier.

**Action:**

| Remove | Replace with |
|---|---|
| `operates as a **Assistant-based commercial intermediation platform** (Trademark Class 35)` | `is a Bengaluru-based assistant service. You tell us what you need; we find, check and manage the right independent provider, and stay on it until it is done.` |
| `under our Class 35 mandate of **commercial intermediation, business management for others, and arranging contracts for the supply of services**` | `We do not carry out the work ourselves. We source it, brief it, negotiate it and follow it through.` |
| `Class 35 commercial intermediation - providers operate independently.` (footer strip) | `We arrange work through independent providers who operate on their own account.` |
| `commercial intermediation`, `Class 35 services India` in `<meta name="keywords">` | delete |

**Keep unchanged:** the single footer notice
`INSTAHELP® is a registered trademark of Kamlesh Singhvee (Reg. No. 3299283, Class 35 - ...)`.

**Keep in plain English throughout** - this substance is load-bearing and must survive:

- InstaHelp does not perform the underlying services
- providers are independent third parties, not employees or agents
- InstaHelp's role is finding, checking, briefing, coordinating and following up

---

## P0-11. Terms, Privacy, Refund, Pricing, Legal - read and report only

**Do not edit these five pages.** They go to the owner's advocate first.

Read each and report which of the following are missing:

- [ ] InstaHelp is not a party to the contract between customer and provider
- [ ] Providers are independent contractors; no employment, agency or partnership
- [ ] No warranty of provider performance, timeliness or quality
- [ ] Limitation of liability, capped, excluding indirect and consequential loss
- [ ] Customer indemnity for claims arising from the provider engagement
- [ ] Clear statement of InstaHelp's fee and when it is charged
- [ ] Whether provider payment is collected by InstaHelp or paid direct
- [ ] Governing law and jurisdiction - Bengaluru
- [ ] Grievance escalation route
- [ ] Provider-side terms: onboarding, conduct standards, removal grounds
- [ ] Non-affiliation with named developments and competitors

---

# P1 - SEO architecture for a marketplace-scale site

## P1-1. Replace keyword blocks with a real location × category matrix

The current approach - dozens of city and complex names concatenated on the homepage - is a
2012 tactic. It does not rank now and it suppresses the homepage's own topical clarity.

**The architecture that ranks:**

```
/services/<category>/                        e.g. /services/plumber/
/<city>/                                     e.g. /bangalore/
/<city>/<category>/                          e.g. /bangalore/plumber/
/<city>/<locality>/                          e.g. /bangalore/whitefield/
/<city>/<locality>/<category>/               e.g. /bangalore/whitefield/plumber/
```

**Doorway-page rule - non-negotiable.** Google's spam policies treat near-duplicate pages
generated at scale as doorway pages, and the penalty is sitewide. Every generated page must
carry content that exists nowhere else on the site. A template with the city name swapped in
is a doorway page.

Minimum unique content per generated page:

- 150+ words genuinely specific to that location and category
- Real local detail: typical call-out timing, what the common requests are in that area,
  locality-specific constraints
- At least one real, anonymised job example from that area, dated
- Locality-relevant FAQ entries that differ between pages
- Genuine internal links to neighbouring localities and related categories

**Publish only pages you can fill.** Fifty strong location pages outrank two thousand thin
ones, and two thousand thin ones can get the domain penalised. Start with Bengaluru
localities where real jobs exist, prove the pattern ranks, then expand.

`[[FILL: which localities and categories have enough real job history to support a page?]]`

Every generated page inherits the intake framing from P0-1: it describes requests accepted,
not services delivered.

## P1-2. Comparison pages

High commercial intent, high conversion, and legitimate under P0-3.

```
/compare/justdial-alternative/
/compare/indiamart-alternative/
/compare/hometriangle-alternative/
/compare/nobroker-alternative/
```

Each page: an honest, dated, factual comparison table; a clear statement of who each option
suits best - including cases where the competitor is the better choice, which raises
credibility and is the single strongest trust signal on a comparison page; the identification
disclaimer from P0-3.

Do not build a page for any competitor whose model you cannot describe accurately.

## P1-3. Technical corrections

1. **Canonical mismatch.** `<link rel="canonical">` points to `https://www.instahelp.in/`
   while the site resolves at `https://instahelp.in/`. Choose one host, 301 the other
   permanently, and align canonical, `og:url`, sitemap and all internal links.
2. **Verify `/og-cover.jpg` returns 200** at the canonical host. A broken OG image kills
   WhatsApp and LinkedIn previews - a direct loss for a WhatsApp-led business.
3. **`instahelp.co`.** Decide: 301 to `.in`, or run as a distinct property with distinct
   content. Do not run duplicate content across both. `[[FILL: which?]]`
4. **Core Web Vitals.** Measure LCP, INP and CLS on mobile before and after. Report both.
5. **XML sitemap** generated from the real page inventory, with `lastmod`, submitted to
   Search Console and Bing Webmaster Tools.
6. **Internal linking.** Every generated page must be reachable within three clicks of the
   homepage. Orphaned pages do not rank.

## P1-4. Structured data

Add to the homepage:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "InstaHelp",
  "legalName": "[[FILL: InstaHelp operating entity legal name]]",
  "url": "https://instahelp.in/",
  "logo": "https://instahelp.in/[[FILL: logo path]]",
  "foundingDate": "2015-04-21",
  "email": "mail@instahelp.in",
  "telephone": "+917022702220",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[[FILL]]",
    "addressLocality": "Bengaluru",
    "addressRegion": "Karnataka",
    "postalCode": "[[FILL]]",
    "addressCountry": "IN"
  },
  "areaServed": { "@type": "Country", "name": "India" },
  "sameAs": [
    "https://twitter.com/i7022702220",
    "[[FILL: Google Business Profile URL]]",
    "[[FILL: Justdial listing URL]]",
    "[[FILL: LinkedIn company page]]"
  ]
}
```

Also add:

- `Service` schema on each category page
- `FAQPage` schema on the FAQ and on each location page carrying an FAQ
- `BreadcrumbList` on every generated page
- `AggregateRating` **only** if backed by real, displayed, verifiable reviews. Fabricated or
  unbacked rating markup is a manual-action risk and, given the pending proceedings, a
  liability you do not need.

Include only `sameAs` entries that resolve. Delete unfilled placeholders rather than
shipping them.

---

# P2 - Ranking in LLM answers

An honest assessment, because there is a lot of noise in this area.

## P2-1. Remove the `meta-ai.*` tags

The site carries custom tags - `meta-ai.category`, `meta-ai.description`,
`meta-ai.differentiator`, `meta-ai.alternatives_to`, `meta-ai.use_cases`.

**There is no evidence that any major LLM crawler reads custom `meta-ai.*` tags.** They are
not a recognised standard, not part of any published specification, and not documented as
consumed by any major model provider. They are almost certainly doing nothing.

They are not neutral, though: they carry claims that are as discoverable as visible text, and
`meta-ai.alternatives_to: JustDial, IndiaMART, Sulekha` is a competitor-comparison assertion
sitting in your markup where you cannot contextualise or date it.

**Action:** delete all `meta-ai.*` tags. Move the genuinely useful content - the description
of what InstaHelp does, the differentiator, the use cases - into **visible page text**, which
is what actually gets retrieved and cited.

## P2-2. What does appear to work

Stated with appropriate uncertainty - this field is young and practices are unsettled:

1. **Plain, factual, self-contained sentences.** Models cite text that answers a question
   without needing surrounding context. `InstaHelp is a Bengaluru-based service that finds
   and manages independent providers for home, business and travel tasks, operating since
   2015.` is citable. Marketing copy is not.
2. **Question-shaped headings with direct answers underneath.** `How much does it cost to
   hire a plumber in Whitefield?` followed by a real answer.
3. **JSON-LD structured data.** Demonstrably parsed, unlike custom meta tags.
4. **Third-party corroboration.** This is probably the largest lever and it is not on-site
   work. Models weight what independent sources say about you: directory listings, press
   coverage, Wikidata, industry write-ups, review platforms. Consistent name, address and
   phone across every one of them.
5. **`llms.txt` at the root.** A proposed convention with partial and uneven adoption. Cheap
   to add, low expected return; add it, do not rely on it.
6. **Clean semantic HTML** that renders without JavaScript. Many crawlers do not execute JS.
   Verify your key content is present in the raw HTML response.

## P2-3. Content that earns citation

The single highest-return content investment for both Google and LLM visibility is data
nobody else has. You have eleven years of job records.

Published, anonymised, updated annually:

- What a plumber, electrician or deep clean actually costs across Bengaluru localities
- Typical response times by category and area
- What proportion of providers fail vetting, and on what grounds
- Seasonal demand patterns

Nobody else publishes this. It is genuinely useful, it is citable, it earns links, and it
substantiates the vetting claim from P0-4 with numbers instead of adjectives.

---

# P3 - Marketplace build-out. Flag now, decide later.

If the direction is a JustDial or IndiaMART competitor, note these before architecture
decisions get baked in. **Do not implement - surface them to the owner.**

1. **Payment handling.** If InstaHelp collects customer money and remits to providers, RBI's
   Payment Aggregator framework applies and either authorisation or an authorised PA partner
   is required. If providers are paid direct, it does not. This decision shapes the entire
   product and should be made deliberately, not by accident.
2. **Provider-side terms and onboarding.** A marketplace needs published provider terms,
   conduct standards and removal grounds. Currently absent.
3. **User-generated content.** Reviews and listings trigger intermediary obligations,
   takedown processes and moderation duties under the IT Rules.
4. **Trade mark class coverage.** The registration is Class 35, which covers provision of an
   online marketplace and is well positioned for this. A software platform may implicate
   Class 42; payment services Class 36; transport and travel arrangement Class 39. Worth
   putting to the owner's advocate before launch - this is a note for counsel, not an
   instruction.
5. **Listing-scraping.** Do not populate provider listings by scraping competitor
   directories. Database rights, terms-of-service breach, and a catastrophic look given
   pending proceedings.

---

# P4 - Conversion

1. **Pricing signal.** No price, no range, no indication that enquiring is free. Largest
   single drop-off cause on a services page. Add near the primary CTA:
   `Asking costs nothing. We confirm the provider's price and our fee in writing before any
   work starts.` `[[FILL: fee basis - flat, percentage, or free to customer]]`
2. **Proof.** No testimonial, named person, photograph or review count. Surface real Google
   Business reviews with attribution. Add one named human with a photograph. Add dated,
   anonymised job examples. Real content only.
3. **Category sprawl.** Ten categories each with "+N more" reads as no specialism. Lead with
   three or four; move the rest behind one "Something else? Ask us." link.
   `[[FILL: which 3-4 to lead with]]`
4. **WhatsApp primary.** WhatsApp is one tap and the business is WhatsApp-led. Promote it to
   sole primary CTA; demote the multi-step form to `Prefer a form?`. Reduce required fields
   to task, name, phone.
5. **Plans and Gift Cards** are in the nav and never explained. Explain on the homepage or
   remove the links.

---

# Verification checklist

- [ ] All cities and localities retained; every coverage claim reworded to intake framing
- [ ] Zero hits: `we serve 30+`, `30+ cities`, `operational coverage`, `services across <city>`
- [ ] Apartment names retained but reframed; non-affiliation disclaimer present on every page
- [ ] Competitor names retained; zero denigrating characterisations
- [ ] `verified` / `vetted` retained, each instance linking to a populated `/how-we-vet`
- [ ] Zero hits: `Class 35` except the single footer trade mark notice
- [ ] Zero hits: App Store / Play Store badge assets and URLs
- [ ] Zero hits: devtools blocker code
- [ ] Zero hits: all `meta-ai.*` tags
- [ ] Zero hidden or cloaked keyword text; all keyword content visible in normal rendering
- [ ] Footer carries InstaHelp entity name, address, GSTIN, customer care, grievance officer
- [ ] No reference anywhere to Singhvee Ventures
- [ ] `/grievance` and `/how-we-vet` exist and are linked
- [ ] Two unticked consent checkboxes; collection notice below the form
- [ ] Geolocation user-initiated only
- [ ] One canonical host; the other 301s; canonical, `og:url`, sitemap agree
- [ ] `og-cover.jpg` returns 200
- [ ] Organization JSON-LD validates in Google's Rich Results Test
- [ ] Key content present in raw HTML without JavaScript execution
- [ ] Every generated page carries 150+ words of genuinely unique content
- [ ] Every generated page reachable within three clicks of the homepage
- [ ] Terms / Privacy / Refund / Pricing / Legal unedited
- [ ] Every `[[FILL:]]` listed in the completion summary

# Completion summary - required output

1. Every unresolved `[[FILL:]]`
2. Missing-clause findings from P0-11 - findings only, no drafting
3. Result of the hidden-text audit (P0-7), stated explicitly
4. Core Web Vitals before and after
5. Count of generated pages published, with the unique word count of the thinnest
6. Any claim found on the site not covered by this brief that you believe cannot be
   substantiated - flag it, do not silently retain it

# Post-deployment, for the owner

Submit `https://instahelp.in/` and `https://instahelp.co/` to the Internet Archive Save Page
Now, and repeat monthly. Record the archive URLs. Third-party timestamped captures are
materially better evidence than self-generated screenshots, and they close a gap that
already exists in the 2020-2024 record.
