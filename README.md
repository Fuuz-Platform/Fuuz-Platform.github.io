# Fuuz-Platform.github.io

The **Fuuz Accelerators** hub — the landing page and index for every accelerator Fuuz publishes.

Published at **https://accelerators.fuuz.com/**

## Why this repo exists beyond the landing page

A custom domain set on an *organization* site applies to every **project** site in the same
organization. So the domain lives here, once, and every accelerator repo is then served beneath it
automatically:

```
this repo                 ->  https://accelerators.fuuz.com/
ace-docker-simulator      ->  https://accelerators.fuuz.com/ace-docker-simulator/
<the next accelerator>    ->  https://accelerators.fuuz.com/<repo-name>/
```

Setting a custom domain on an individual accelerator repo instead would give that one repo the
whole domain root and lock every other accelerator out of it. Don't.

## Adding an accelerator to the index

1. Add a `<url>` entry to [`site/sitemap.xml`](site/sitemap.xml) — accelerators share this one
   origin, so this is the only sitemap Google reads for all of them.
1. In the accelerator repo: add a `site/` directory and copy
   [`.github/workflows/pages.yml`](.github/workflows/pages.yml) in verbatim — nothing in it is
   repo-specific.
2. In that repo: **Settings → Pages → Source = GitHub Actions**.
3. Add a card to [`site/index.html`](site/index.html) here.

No DNS change is ever needed for a new accelerator.
