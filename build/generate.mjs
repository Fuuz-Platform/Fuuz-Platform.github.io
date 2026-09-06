/*
 * Builds site/index.html and site/sitemap.xml from the GitHub API.
 *
 * WHY THIS EXISTS. Hand-maintaining a list of accelerators does not survive dozens of them. The
 * failure is not that it is tedious — it is that the hub silently goes stale: somebody adds a
 * repository, forgets the hub, and the index quietly claims a catalogue that is no longer true.
 * A generated index cannot disagree with reality, because reality is its only input.
 *
 * THE CONTRACT. A repository appears on this site when it carries the topic `fuuz-accelerator`.
 * That is the whole enrolment step. Section placement comes from a second topic:
 *
 *     fuuz-runnable      -> Run It Now         (stands up on its own machine)
 *     fuuz-application   -> Applications       (installed into a tenant)
 *     fuuz-package       -> Integration Packages
 *     (none of those)    -> More Accelerators
 *
 * Whether a card links to a published site or to the repository is NOT a topic, and NOT the
 * repository's `has_pages` flag either. That flag only says Pages is ENABLED; it flips the moment
 * someone runs the enable call, long before any site exists. Trusting it put eighteen cards and
 * eighteen sitemap entries onto URLs that answered 404. The build now REQUESTS each candidate URL
 * and believes the response, so a card cannot claim a site that is not actually serving.
 *
 * CURATION. site/accelerators.json is an optional override, keyed by repo name. Anything it sets
 * (title, summary, order, hidden) wins over the API. It exists so a bad auto-derived title can be
 * fixed in one line without giving up automation for the other forty.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SITE = join(ROOT, 'site');

const ORG = 'Fuuz-Platform';
const DOMAIN = 'https://accelerators.fuuz.com';
const MARKER = 'fuuz-accelerator';

const SECTIONS = [
  { topic: 'fuuz-runnable', id: 'run', eyebrow: 'Run It Now',
    heading: ['Stand One Up On Your Own', 'Machine'],
    lede: 'Accelerators that run on a laptop with nothing but Docker. No tenant, no account, no configuration file — read the source first and decide afterwards.' },
  { topic: 'fuuz-application', id: 'applications', eyebrow: 'Applications',
    heading: ['Complete Applications For One', 'Tenant'],
    lede: 'Whole application packages installed into a Fuuz tenant. Manufacturing execution systems (MES), warehouse management, machine monitoring and telemetry.' },
  { topic: 'fuuz-package', id: 'packages', eyebrow: 'Integration Packages',
    heading: ['Connect What You Already', 'Have'],
    lede: 'Enterprise resource planning (ERP) connectors, carrier integrations, schema keyrings and configuration packages. Each one works within the environment already on your floor.' },
  { topic: null, id: 'more', eyebrow: 'More Accelerators',
    heading: ['Everything Else We', 'Publish'],
    lede: 'Roles, units of measure, document design templates and platform tooling.' }
];

/* GitHub descriptions carry a house prefix that is noise once the reader is already on a page
   titled "Accelerators". Strip it rather than repeating it forty times down the page. */
function cleanSummary(text) {
  if (!text) return '';
  let s = text.trim();
  s = s.replace(/^Fuuz\s+(Platform\s+)?accelerator[:\s-]+/i, '');
  s = s.replace(/^Fuuz\s+package[:\s-]+/i, '');
  s = s.replace(/â€”/g, '—');            // mojibake em dash seen in older repos
  /* Only a dash SURROUNDED by whitespace is punctuation. Matching a bare hyphen turned every
     compound word into nonsense: "one-command" became "one — command", "time-series" became
     "time — series", "put-away" became "put — away". */
  s = s.replace(/\s+[-–—]\s+/g, ' — ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Titles come from the repository name, which is stable and unique, rather than from the first
   words of a description, which are not. */
function titleFromName(name) {
  const ACRONYMS = { mes: 'MES', wms: 'WMS', erp: 'ERP', ups: 'UPS', sap: 'SAP', api: 'API',
                     odbc: 'ODBC', ace: 'ACE', si: 'SI', llm: 'LLM', ui: 'UI', iot: 'IoT',
                     mcp: 'MCP', fedex: 'FedEx', netsuite: 'NetSuite', qms: 'QMS', cms: 'CMS' };
  return name
    .replace(/^(application|package)-/, '')
    .replace(/-accelerator$/, '')
    .replace(/^fuuz-/, '')
    .split('-')
    .map(w => ACRONYMS[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function gh(path) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'fuuz-accelerators-build' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function allRepos() {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh(`/orgs/${ORG}/repos?per_page=100&type=public&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/* `has_pages` is necessary but nowhere near sufficient — see the header. Ask the URL.
   A site deployed seconds ago may not answer yet and will be listed as a repository until the next
   build; that is the right direction to be wrong in. */
async function isServing(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    return res.ok;
  } catch { return false; }
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function card(a) {
  const href = a.hasSite ? `${a.name}/` : a.repoUrl;
  const tag = a.hasSite
    ? '<span class="tag tag-live">Site</span>'
    : '<span class="tag">Repo</span>';
  return `        <div class="card">
          <h3><a href="${esc(href)}">${esc(a.title)}</a>${tag}</h3>
          <p>${esc(a.summary)}</p>
          <div class="meta">${esc(a.name)}</div>
        </div>`;
}

function renderSections(accelerators) {
  const used = new Set();
  const blocks = [];

  for (const sec of SECTIONS) {
    const items = accelerators.filter(a =>
      sec.topic ? a.topics.includes(sec.topic) : !used.has(a.name));
    if (sec.topic) items.forEach(a => used.add(a.name));
    if (!items.length) continue;

    items.sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
    blocks.push(`<section id="${sec.id}">
  <div class="wrap">
    <p class="sec-eyebrow">${esc(sec.eyebrow)}</p>
    <h2>${esc(sec.heading[0])} <span class="accent">${esc(sec.heading[1])}</span></h2>
    <p class="sec-lede">${esc(sec.lede)}</p>
    <div class="grid">
${items.map(card).join('\n')}
      </div>
  </div>
</section>`);
  }
  return blocks.join('\n\n');
}

function sitemap(accelerators) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [`${DOMAIN}/`, `${DOMAIN}/demos/`, ...accelerators.filter(a => a.hasSite).map(a => `${DOMAIN}/${a.name}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- GENERATED by build/generate.mjs. Do not edit by hand.
     Accelerators are project sites on this one origin, so every published page belongs in this
     single sitemap — a per-repository sitemap would never be discovered. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u, i) => `  <url>
    <loc>${u}</loc>
    <lastmod>${today}</lastmod>
    <priority>${i === 0 ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

/* ── YouTube ──────────────────────────────────────────────────────────────────────────────────
   Pulled from the channel's Atom feed at build time rather than pasted in, for the same reason the
   accelerator list is: a hardcoded set of videos is wrong the moment the next one is published,
   and nobody remembers to come back here.

   The feed needs no API key and no quota. Thumbnails are served by YouTube, so this adds three
   files' worth of bytes to the page and none to the repository.

   DEGRADES RATHER THAN FAILS. If the feed is unreachable the section renders with just the
   channel link. Losing the videos is a small loss; failing the whole site build over them, when
   they are the least important thing on the page, is a much bigger one. */
const YT_CHANNEL_ID = 'UCJcJs6NTw3WM2tf6vgeKMbA';
const YT_CHANNEL_URL = 'https://www.youtube.com/@FuuzPlatform';
const YT_COUNT = 6;

async function latestVideos() {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`,
      { headers: { 'user-agent': 'fuuz-accelerators-build' } });
    if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
    const xml = await res.text();

    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, YT_COUNT).map(m => {
      const e = m[1];
      const pick = re => (e.match(re) || [])[1] || '';
      return {
        id: pick(/<yt:videoId>(.*?)<\/yt:videoId>/),
        /* The <title> inside <entry> comes before <media:group>'s copy; take the first. */
        title: decodeEntities(pick(/<title>([\s\S]*?)<\/title>/)),
        published: pick(/<published>(\d{4}-\d{2}-\d{2})/)
      };
    }).filter(v => v.id && v.title);
  } catch (err) {
    console.warn(`YouTube feed unavailable (${err.message}) — rendering the channel link only.`);
    return [];
  }
}

/* The feed is XML, so titles arrive with entities escaped. They are about to be re-escaped for
   HTML, and double-escaping is what turns an apostrophe into &amp;#39; on the page. */
function decodeEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
          .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim();
}

function renderVideos(videos) {
  const channelCta = `<a class="cta cta-secondary" href="${YT_CHANNEL_URL}">Visit the channel</a>`;
  if (!videos.length) {
    return `<section id="watch">
  <div class="wrap">
    <p class="sec-eyebrow">Watch</p>
    <h2>Hear It From The People Who Built <span class="accent">It</span></h2>
    <p class="sec-lede">Product walkthroughs, customer conversations and candid discussion of what
      does and does not work on a plant floor.</p>
    <div class="ctas">${channelCta}</div>
  </div>
</section>`;
  }

  const cards = videos.map(v => `        <a class="video" href="https://www.youtube.com/watch?v=${esc(v.id)}">
          <div class="thumb">
            <img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
          </div>
          <div class="video-title">${esc(v.title)}</div>
          <div class="video-date">${esc(v.published)}</div>
        </a>`).join('\n');

  return `<section id="watch">
  <div class="wrap">
    <p class="sec-eyebrow">Watch</p>
    <h2>Hear It From The People Who Built <span class="accent">It</span></h2>
    <p class="sec-lede">Product walkthroughs, customer conversations and candid discussion of what
      does and does not work on a plant floor.</p>
    <div class="videos">
${cards}
    </div>
    <div class="ctas" style="margin-top:26px">${channelCta}</div>
  </div>
</section>`;
}

/* ── platform demos (Bunny Stream) ────────────────────────────────────────────────────────────
   From build/demos.json, a curated snapshot — NOT fetched at build time like the accelerator list
   and the YouTube feed. The source of truth is the Asset model in the fuuzAdministrationBuild
   tenant, which sits behind a tenant JWT; putting one of those in CI secrets is a decision for a
   human, not a build convenience. `node build/refresh-demos.mjs` re-pulls it locally.

   Players are EMBEDDED rather than shown as thumbnails, because the Bunny pull zone has token
   authentication on: the iframe embeds are public, but the direct thumbnail.jpg URLs answer 403.
   Every iframe is lazy so a page of seventeen of them does not load seventeen players up front. */
const DEMOS = JSON.parse(readFileSync(join(HERE, 'demos.json'), 'utf8'));

function duration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderDemoCollections() {
  return DEMOS.collections.map(c => `<section id="${esc(c.name.toLowerCase().replace(/\W+/g, '-'))}">
  <div class="wrap">
    <p class="sec-eyebrow">${esc(c.name)}</p>
    <p class="sec-lede">${esc(c.blurb)}</p>
    <div class="demos">
${c.videos.map(v => `      <article class="demo">
        <button class="player" type="button" data-guid="${esc(v.guid)}" aria-label="Play: ${esc(v.title)}">
          <img src="${DEMOS.thumbBase}/${esc(v.guid)}/thumbnail.jpg" alt="" loading="lazy" width="1280" height="720">
          <span class="play" aria-hidden="true"></span>
        </button>
        <h3>${esc(v.title)}</h3>
        <p class="demo-meta">${esc(duration(v.lengthSeconds))}</p>
        <p>${esc(v.summary)}</p>
      </article>`).join('\n')}
    </div>
  </div>
</section>`).join('\n\n');
}

/* Click-to-play. The thumbnail grid is a fraction of the weight of seventeen embedded players, and
   the iframe is only created for the one the reader actually chose — which is also why it can
   autoplay: the click IS the gesture browsers require.

   Bunny's pull zone blocks requests with a BLANK referrer (ordinary hotlink protection), so the
   images load from a real browser but not from a bare fetch. A reader whose browser strips the
   referrer entirely gets a 403, so a failed image is hidden rather than left as a broken icon —
   the card still reads, and the play control still works. */
const DEMO_SCRIPT = `<script>
document.querySelectorAll('.demo .player').forEach(function (btn) {
  var img = btn.querySelector('img');
  if (img) { img.addEventListener('error', function () { img.style.display = 'none'; }); }
  btn.addEventListener('click', function () {
    var f = document.createElement('iframe');
    f.src = 'https://iframe.mediadelivery.net/embed/${DEMOS.libraryId}/' + btn.dataset.guid + '?autoplay=true';
    f.title = btn.getAttribute('aria-label').replace(/^Play: /, '');
    f.allow = 'accelerometer;gyroscope;encrypted-media;picture-in-picture;autoplay';
    f.allowFullscreen = true;
    btn.replaceWith(f);
  });
});
</script>`;

function renderDemoTeaser() {
  const all = DEMOS.collections.flatMap(c => c.videos);
  return `<section id="demos">
  <div class="wrap">
    <p class="sec-eyebrow">Watch the platform</p>
    <h2>See It Running Before You Install <span class="accent">Anything</span></h2>
    <p class="sec-lede">${all.length} recorded demonstrations &mdash; production execution, overall
      equipment effectiveness, statistical process control, digital twin traceability, edge tag
      subscriptions and app development. No form, no sales call.</p>
    <div class="ctas"><a class="cta cta-primary" href="demos/">Watch the demos</a></div>
  </div>
</section>`;
}

/* ── main ─────────────────────────────────────────────────────────────────────────────────── */
const overridePath = join(SITE, 'accelerators.json');
const overrides = existsSync(overridePath) ? JSON.parse(readFileSync(overridePath, 'utf8')) : {};

const repos = await allRepos();
const accelerators = repos
  .filter(r => (r.topics || []).includes(MARKER) && !r.archived)
  .map(r => {
    const o = overrides[r.name] || {};
    return {
      name: r.name,
      topics: r.topics || [],
      repoUrl: r.html_url,
      hasSite: false,                      // resolved below by asking the URL
      hasPagesFlag: o.hasSite ?? Boolean(r.has_pages),
      title: o.title || titleFromName(r.name),
      summary: o.summary || cleanSummary(r.description),
      order: o.order ?? 100,
      hidden: Boolean(o.hidden)
    };
  })
  .filter(a => !a.hidden);

/* Verify in parallel: ~30 requests, and only for repos whose flag is set at all. */
await Promise.all(accelerators.map(async a => {
  a.hasSite = a.hasPagesFlag ? await isServing(`${DOMAIN}/${a.name}/`) : false;
}));
const claimed = accelerators.filter(a => a.hasPagesFlag).length;
const serving = accelerators.filter(a => a.hasSite).length;
if (claimed !== serving) {
  console.warn(`${claimed - serving} repo(s) have Pages enabled but are not serving a site yet; ` +
               `linking those to their source instead.`);
}

if (!accelerators.length) {
  /* Publishing an empty catalogue would replace a working page with a page that says Fuuz has no
     accelerators. Fail the build instead — a stale site beats a false one. */
  throw new Error(`No repositories carry the "${MARKER}" topic. Refusing to publish an empty index.`);
}

const videos = await latestVideos();

const template = readFileSync(join(HERE, 'template.html'), 'utf8');
const html = template
  .replace('<!--{{SECTIONS}}-->', renderSections(accelerators))
  .replace('<!--{{DEMOS}}-->', renderDemoTeaser())
  .replace('<!--{{VIDEOS}}-->', renderVideos(videos))
  .replace(/\{\{COUNT\}\}/g, String(accelerators.length));

writeFileSync(join(SITE, 'index.html'), html);

const demoCount = DEMOS.collections.reduce((n, c) => n + c.videos.length, 0);
const demoHtml = readFileSync(join(HERE, 'demos-template.html'), 'utf8')
  .replace('<!--{{DEMO_COLLECTIONS}}-->', renderDemoCollections())
  .replace('<!--{{DEMO_SCRIPT}}-->', DEMO_SCRIPT)
  .replace(/\{\{DEMO_COUNT\}\}/g, String(demoCount));
mkdirSync(join(SITE, 'demos'), { recursive: true });
writeFileSync(join(SITE, 'demos', 'index.html'), demoHtml);

writeFileSync(join(SITE, 'sitemap.xml'), sitemap(accelerators));

console.log(`Generated ${accelerators.length} accelerators and ${DEMOS.collections.reduce((n,c)=>n+c.videos.length,0)} demos:`);
for (const a of accelerators) console.log(`  ${a.hasSite ? 'site' : 'repo'}  ${a.name}  -> ${a.title}`);
