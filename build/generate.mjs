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
 * Whether a card links to a published site or to the repository is NOT a topic — it is read from
 * the GitHub Pages flag on the repository itself, so it can never disagree with what is actually
 * published.
 *
 * CURATION. site/accelerators.json is an optional override, keyed by repo name. Anything it sets
 * (title, summary, order, hidden) wins over the API. It exists so a bad auto-derived title can be
 * fixed in one line without giving up automation for the other forty.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
  const urls = [`${DOMAIN}/`, ...accelerators.filter(a => a.hasSite).map(a => `${DOMAIN}/${a.name}/`)];
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
      hasSite: o.hasSite ?? Boolean(r.has_pages),
      title: o.title || titleFromName(r.name),
      summary: o.summary || cleanSummary(r.description),
      order: o.order ?? 100,
      hidden: Boolean(o.hidden)
    };
  })
  .filter(a => !a.hidden);

if (!accelerators.length) {
  /* Publishing an empty catalogue would replace a working page with a page that says Fuuz has no
     accelerators. Fail the build instead — a stale site beats a false one. */
  throw new Error(`No repositories carry the "${MARKER}" topic. Refusing to publish an empty index.`);
}

const template = readFileSync(join(HERE, 'template.html'), 'utf8');
const html = template
  .replace('<!--{{SECTIONS}}-->', renderSections(accelerators))
  .replace(/\{\{COUNT\}\}/g, String(accelerators.length));

writeFileSync(join(SITE, 'index.html'), html);
writeFileSync(join(SITE, 'sitemap.xml'), sitemap(accelerators));

console.log(`Generated ${accelerators.length} accelerators:`);
for (const a of accelerators) console.log(`  ${a.hasSite ? 'site' : 'repo'}  ${a.name}  -> ${a.title}`);
