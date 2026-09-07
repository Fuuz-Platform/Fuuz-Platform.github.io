# Fuuz-Platform.github.io

The **Fuuz Accelerators** hub — the landing page and index for every accelerator Fuuz publishes.

Published at **https://accelerators.fuuz.com/**

## Adding an accelerator

**Add the topic `fuuz-accelerator` to the repository. That is the whole enrolment step.**

```bash
gh api -X PUT repos/Fuuz-Platform/<repo>/topics \
  -f 'names[]=fuuz-accelerator' -f 'names[]=fuuz-runnable'
```

Nobody edits this repository. `build/generate.mjs` reads the org from the GitHub API at deploy
time and rebuilds `site/index.html` and `site/sitemap.xml`, so the index cannot disagree with
reality — reality is its only input. Hand-maintaining a list does not survive dozens of
accelerators, and the failure mode is not tedium, it is a hub that silently claims a catalogue
that is no longer true.

A second topic picks the section:

| Topic | Section |
|---|---|
| `fuuz-runnable` | Run It Now — stands up on its own machine |
| `fuuz-application` | Applications — installed into a tenant |
| `fuuz-package` | Integration Packages |
| `fuuz-tool` | Tools — helps you *build* on Fuuz; never installed into it |
| `fuuz-ai` | AI Tools — skills, MCP tools and agentic examples |
| *(none of those)* | More Accelerators |

`fuuz-accelerator` means "publish this on the hub", not "this is an accelerator". LLM skills and
MCP tools are not accelerators and should not be filed as though they were — they carry
`fuuz-tool`.

Whether a card links to a published site or to the source is **not** a topic — it is read from the
repository's own GitHub Pages flag, so a card can never claim a site that is not published.

New topics are picked up by the daily 07:00 UTC build. To publish immediately:

```bash
gh api -X POST repos/Fuuz-Platform/Fuuz-Platform.github.io/dispatches -f event_type=refresh
```

### Curation

`site/accelerators.json` overrides anything the API gets wrong, keyed by repository name —
`title`, `summary`, `order`, `hidden`, `accelerator`. Use it only where the derived value is genuinely wrong or
ambiguous. Every repository *not* listed there is fully automatic, which is the point.

### Publishing documentation alongside an accelerator

1. Add a `site/` directory to the accelerator repository.
2. Copy [`ace-docker-simulator/.github/workflows/pages.yml`](https://github.com/Fuuz-Platform/ace-docker-simulator/blob/main/.github/workflows/pages.yml)
   in verbatim — nothing in it is repo-specific.
3. **On a brand-new repository, create the Pages site first:**

   ```bash
   gh api -X POST repos/Fuuz-Platform/<repo>/pages -f build_type=workflow
   ```

   The workflow's `enablement: true` can only *find* an existing site, not create one — a fresh
   repository's `GITHUB_TOKEN` cannot, and the first run fails with `Create Pages site failed —
   Resource not accessible by integration`. It reads like a broken workflow rather than a missing
   permission. Repos that already have Pages are unaffected, and the call is idempotent enough to
   run blind.
4. Copy `site/styles.css` and `site/assets/` from this repository so the page is on-brand.

The page is then served at `accelerators.fuuz.com/<repo>/` and the hub links to it automatically.

## Accelerator or beta concept

**A card is an accelerator when "accelerator" appears in the repository's name or its
description. Everything else on the hub is a beta concept**, and is labelled as one — on its card
here, in its own page's eyebrow and title, and in a callout at the top of that page.

This is derived, not curated, for the same reason the catalogue is: a hand-kept list of which
things are "really" accelerators goes stale silently, and the failure mode is a page claiming a
level of commitment nobody made. If the name and the description are both silent about something
that genuinely is an accelerator, either fix the description — which is the real fix, because the
description is what a reader sees — or override it in `site/accelerators.json`:

```json
"some-repo": { "accelerator": true }
```

The label is not decoration. Calling something an accelerator says it has a defined scope, a guide
stating what is standard, configurable and custom, and a published version to install against. A
beta concept has none of that: it is published to be read, run and learned from, it may change
shape between versions, and it may be withdrawn.

## Service levels

**No service level agreement applies to anything published here — accelerator or beta concept.**
Either becomes a supported deliverable only once it has been implemented by a Fuuz services
professional or an approved Fuuz partner, under that engagement's terms.

That statement is in the footer of every page on this domain, including each accelerator's own
`site/index.html`, and it is set out in full at
[`/what-is-an-accelerator/`](https://accelerators.fuuz.com/what-is-an-accelerator/). Keep it when
copying a page forward. An accelerator is production-ready by design, which makes it reasonable to
read one as finished software with support behind it — the line closes that gap explicitly rather
than leaving it to be assumed.

## Provenance stays off the pages

**Do not publish where an accelerator's contents came from.** Not the tenant it was exported from,
not the customer or project it was first built for, not the standard that tenant's application
happened to implement. A reader deciding whether to install something gains nothing from it, and
the sentence invites questions about a third party we have no reason to answer on a public page.

Describe what the thing does and what shape it carries. "Built against one MES application and
carries its shape" is the honest caveat; "lifted from a live ISA-88 MES tenant" is provenance and
does not belong on a page.

## Platform demos

`site/demos/` is generated from [`build/demos.json`](build/demos.json) — a **curated snapshot** of
the public demo videos in the Fuuz Demo Share Bunny Stream library, not a live fetch.

It is a snapshot on purpose. The source is the `Asset` model in the `fuuzAdministrationBuild`
tenant, which sits behind a tenant JWT that is not scoped read-only; putting one in Actions secrets
to save a manual step is a security decision for a human, and the demos change rarely.

```bash
FUUZ_HOST=<host> FUUZ_TENANT=<tenant> FUUZ_TOKEN=<jwt> node build/refresh-demos.mjs
```

It refreshes durations and source names, reports anything that has disappeared, and reports new
videos in the source collections **without adding them** — publishing to the open internet should
be a decision, not a side effect of a sync. Titles and summaries are left alone: the source names
are raw filenames and the source descriptions are transcript-generated notes, so both are written
by hand for publication.

Videos play through a **click-to-play thumbnail facade** rather than embedded players. Bunny's pull
zone rejects blank-referrer requests (ordinary hotlink protection), so thumbnails load in a browser
but not from a bare `curl`; a reader whose browser strips the referrer sees the card without its
image, and the play control still works.

## Repository standards

**The default branch is `main`. Everywhere, no exceptions.**

Nineteen repositories were on `master` until 2026-09-06. That is not a cosmetic
inconsistency — the Pages workflow triggers on `branches: [main]`, so on every one of them
the deploy **silently never ran**: the push succeeded, no workflow run appeared at all, and
the site 404'd while the repository looked completely correct. A workflow that does not fire
produces no error to find.

All nineteen were renamed with the GitHub rename API, which retargets open pull requests and
leaves redirects in place. The organization default for new repositories is `main`, so this
cannot recur. Anyone holding an old clone updates it once:

```bash
git branch -m master main
git fetch origin && git branch -u origin/main main
git remote set-head origin -a
```

Two more standards worth stating, because both have already bitten:

- **Create the Pages site before the first push** — see step 3 above.
- **Never set a custom domain on an accelerator repository.** The domain belongs to
  `Fuuz-Platform.github.io` and applies to every project site beneath it.

## Why the domain lives here and not on an accelerator

A custom domain set on an *organization* site applies to every **project** site in the same
organization. So the domain lives here, once, and every accelerator repo is served beneath it:

```
this repo                 ->  https://accelerators.fuuz.com/
ace-docker-simulator      ->  https://accelerators.fuuz.com/ace-docker-simulator/
<the next accelerator>    ->  https://accelerators.fuuz.com/<repo-name>/
```

Setting a custom domain on an individual accelerator repo instead would give that one repo the
whole domain root and lock every other accelerator out of it. Don't. **No DNS change is ever
needed for a new accelerator** — the record is `CNAME accelerators -> fuuz-platform.github.io.`
and it is already in place.

## Brand

The site uses the **brand** palette from the Fuuz design system, not the platform's UI palette —
a site *about* Fuuz is brand; a screen *inside* Fuuz is platform. The two are never mixed.
Dark-first on Midnight, Space Grotesk headlines, Inter body, Spring Green reserved for actions.

**One documented deviation.** The guide specifies the closing headline word in Electric Violet
`#4E25E2`. On the guide's own Midnight ground that measures **2.60:1**, which fails WCAG AA even
for large text. Electric Violet is kept for fills and borders; the *type* accent is lifted to
`#9F86FF` (**7.09:1**). Every other pair on the site passes AA.
