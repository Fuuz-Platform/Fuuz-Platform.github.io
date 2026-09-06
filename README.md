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
| *(none of those)* | More Accelerators |

Whether a card links to a published site or to the source is **not** a topic — it is read from the
repository's own GitHub Pages flag, so a card can never claim a site that is not published.

New topics are picked up by the daily 07:00 UTC build. To publish immediately:

```bash
gh api -X POST repos/Fuuz-Platform/Fuuz-Platform.github.io/dispatches -f event_type=refresh
```

### Curation

`site/accelerators.json` overrides anything the API gets wrong, keyed by repository name —
`title`, `summary`, `order`, `hidden`. Use it only where the derived value is genuinely wrong or
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
