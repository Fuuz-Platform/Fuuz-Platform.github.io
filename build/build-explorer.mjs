/*
 * Builds a browsable, semantic view of every accelerator's actual Fuuz content — moduleGroup >
 * module > screens/flows/models, plus documents, data mappings, saved transforms and seed data —
 * so someone can read what an accelerator actually does without installing it.
 *
 * TWO SHAPES, ONE MODEL. An accelerator repo ships its content one of two ways:
 *   - loose files: screens/, dataFlows/, dataModels/, documentDesigns/, data/ (optionally nested
 *     under modules/<module>/), each file shaped { header: {id,name,description,moduleId,...},
 *     version: {...} } — the same export shape the platform itself writes.
 *   - a single `*.fuuz` bundle at the repo root: a gzipped tar containing package-data.json, whose
 *     top-level keys (dataModels, dataFlows, screens, documentDesigns, dataMappings,
 *     savedTransforms, data) hold arrays of those same { header, version } objects.
 * Both are normalized into the same per-repo JSON below, so the viewer (assets/explorer.js) never
 * needs to know which one it's looking at.
 *
 * MODULE GROUPING. Flows and screens carry header.moduleId directly. Data models carry it at
 * version.modelDefinition.metadata.mfgx.module.id (and .group.id for the moduleGroup) — a
 * different path, because a model's module is a fact about the model definition, not about an
 * export header. data/Module.json and data/ModuleGroup.json (wherever they live, loose or inside
 * the bundle) supply the human name/description/icon for whatever moduleId/moduleGroupId turn up;
 * anything with no match falls back to a title-cased version of the raw id, and anything with no
 * moduleId at all — document designs, always; the rare unmoduled flow or screen — lands in an
 * "Uncategorized" module rather than being silently dropped.
 *
 * CONTENT STORAGE. Metadata (id/name/description/grouping) is written into
 * site/explore/data/<repo>.json — small, and all a visitor needs to render the tree. A file's
 * full content is fetched only when a visitor opens it, via contentUrl: for a loose repo that's
 * the file's own raw.githubusercontent.com URL (no reason to copy content GitHub already serves);
 * for a bundle repo, each item is extracted to its own file under
 * site/explore/content/<repo>/<type>/<id>.json at build time, since there's no other stable URL
 * for one record inside a gzipped tar.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', 'site');
const ORG = 'Fuuz-Platform';
const MARKER = 'fuuz-accelerator';
const CONCURRENCY = 12;

/* ── GitHub access ────────────────────────────────────────────────────────────────────────── */
async function gh(path) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'fuuz-accelerators-explorer' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
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

async function repoTree(repo, branch) {
  const data = await gh(`/repos/${ORG}/${repo}/git/trees/${branch}?recursive=1`);
  return data.tree || [];
}

function rawUrl(repo, branch, path) {
  return `https://raw.githubusercontent.com/${ORG}/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

async function rawJson(repo, branch, path) {
  const res = await fetch(rawUrl(repo, branch, path));
  if (!res.ok) throw new Error(`raw ${res.status} on ${path}`);
  return res.json();
}

/* Concurrency-limited map — a bare Promise.all over ~200 raw fetches per repo would open that many
   sockets at once; this caps it without pulling in a queue library for one loop. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ── minimal ustar reader ─────────────────────────────────────────────────────────────────────
   A .fuuz is `tar czf` output. We only ever need one short-named file out of a handful of entries,
   so this reads just enough of the format (name at 0..100, octal size at 124..136, 512-byte
   blocks) to pull it out — no GNU long-name support, no npm dependency for one file lookup. */
function untarFind(buf, wantedNames) {
  const found = {};
  let offset = 0;
  while (offset + 512 <= buf.length && Object.keys(found).length < wantedNames.length) {
    const header = buf.subarray(offset, offset + 512);
    if (header.every(b => b === 0)) break; // end-of-archive marker
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '');
    const sizeField = header.subarray(124, 136).toString('utf8').replace(/\0.*$/s, '').trim();
    const size = parseInt(sizeField || '0', 8) || 0;
    offset += 512;
    if (wantedNames.includes(name)) found[name] = buf.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;
  }
  return found;
}

/* ── shared helpers ───────────────────────────────────────────────────────────────────────── */
/* Same cleanup as generate.mjs's cleanSummary, duplicated for the same reason titleFromName is
   above: this is a standalone script, not a module the two share. */
function cleanSummary(text) {
  if (!text) return '';
  let s = text.trim()
    .replace(/^Fuuz\s+(Platform\s+)?accelerator[:\s-]+/i, '')
    .replace(/^Fuuz\s+package[:\s-]+/i, '')
    .replace(/â€”/g, '—')
    .replace(/\s+[-–—]\s+/g, ' — ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleCase(id) {
  return String(id)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

/* Same acronym table as generate.mjs's titleFromName, duplicated rather than imported — this is a
   standalone build step and the two scripts otherwise share no code. */
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

const TYPE_FROM_KEY = {
  dataFlows: 'flows', screens: 'screens', dataModels: 'models',
  documentDesigns: 'documents', dataMappings: 'mappings', savedTransforms: 'transforms',
};
const MODULED_TYPES = new Set(['flows', 'screens', 'models']);

function normalizeItem(type, raw) {
  const header = raw.header || {};
  const moduleId = type === 'models'
    ? raw?.version?.modelDefinition?.metadata?.mfgx?.module?.id || null
    : header.moduleId || null;
  const moduleGroupIdFromModel = type === 'models'
    ? raw?.version?.modelDefinition?.metadata?.mfgx?.module?.group?.id || null
    : null;
  return {
    type, id: header.id, name: header.name || header.id || '(untitled)',
    description: header.description || '', moduleId, moduleGroupIdFromModel,
  };
}

/* ── per-repo processing ──────────────────────────────────────────────────────────────────── */
/* Shared by both single-blob shapes below — a .fuuz bundle's package-data.json and a loose
   top-level package-data.json are byte-for-byte the same shape, just reached differently. Either
   way, every item needs its own physical file under site/explore/content/, since a single big
   JSON blob has no per-record URL of its own. */
function ingestPackageData(pkg, repo, items, seedGroups, moduleMap, groupMap) {
  const contentDir = join(SITE, 'explore', 'content', repo.name);
  for (const [key, arr] of Object.entries(pkg)) {
    const type = TYPE_FROM_KEY[key];
    if (!type || !Array.isArray(arr)) continue;
    const dir = join(contentDir, type);
    if (arr.length) mkdirSync(dir, { recursive: true });
    for (const raw of arr) {
      const norm = normalizeItem(type, raw);
      if (!norm.id) continue;
      writeFileSync(join(dir, `${norm.id}.json`), JSON.stringify(raw));
      norm.contentUrl = `explore/content/${repo.name}/${type}/${norm.id}.json`;
      items.push(norm);
    }
  }
  for (const d of pkg.data || []) {
    if (!d?.modelName) continue;
    seedGroups.push({ modelName: d.modelName, recordCount: (d.payload || []).length, fileCount: null });
    if (d.modelName === 'Module') for (const m of d.payload) moduleMap[m.id] = m;
    if (d.modelName === 'ModuleGroup') for (const g of d.payload) groupMap[g.id] = g;
  }
}

async function processRepo(repo) {
  const branch = repo.default_branch || 'main';
  const entries = await repoTree(repo.name, branch);
  const fuuzFile = entries.find(e => e.type === 'blob' && /\.fuuz$/i.test(e.path) && !e.path.includes('/'));
  const loosePackageData = entries.find(e => e.type === 'blob' && e.path === 'package-data.json');

  const items = [];        // normalized {type,id,name,description,moduleId,moduleGroupIdFromModel,contentUrl}
  const seedGroups = [];   // {modelName, recordCount|null, fileCount|null}
  let otherFiles = [];
  const moduleMap = {};    // id -> {name,description,moduleGroupId}
  const groupMap = {};     // id -> {name,description,icon}

  if (fuuzFile || loosePackageData) {
    let pkg = null;
    try {
      if (fuuzFile) {
        const buf = Buffer.from(await (await fetch(rawUrl(repo.name, branch, fuuzFile.path))).arrayBuffer());
        const tarBuf = gunzipSync(buf);
        const { 'package-data.json': pdBuf } = untarFind(tarBuf, ['package-data.json']);
        if (pdBuf) pkg = JSON.parse(pdBuf.toString('utf8'));
      } else {
        pkg = await rawJson(repo.name, branch, loosePackageData.path);
      }
    } catch { /* fall through to otherFiles below */ }

    if (!pkg) {
      const path = fuuzFile ? fuuzFile.path : loosePackageData.path;
      otherFiles.push({ path, contentUrl: rawUrl(repo.name, branch, path) });
    } else {
      ingestPackageData(pkg, repo, items, seedGroups, moduleMap, groupMap);
      /* At least one package-data.json in the wild (install/preinstall/postinstall sequencing
         packages) doesn't use any of dataModels/dataFlows/screens/etc at all, so ingestion finds
         nothing. Rather than publish a blank page for that accelerator, fall back to listing
         whatever else is in the repo — the deploy-sequence files themselves are still "the code". */
      if (!items.length && !seedGroups.length) {
        const KNOWN_FILE = new Set(['README.md', 'manifest.json', 'definition.json']);
        otherFiles = entries
          .filter(e => e.type === 'blob' && !/^(site\/|\.github\/)/.test(e.path) && !KNOWN_FILE.has(e.path))
          .map(e => ({ path: e.path, contentUrl: rawUrl(repo.name, branch, e.path) }));
      }
    }
  } else {
    const candidates = entries.filter(e => e.type === 'blob' && /\.json$/i.test(e.path) &&
      /(^|\/)(screens|dataFlows|dataModels|documentDesigns|dataMappings|savedTransforms)\//.test(e.path + '/'));

    await pool(candidates, CONCURRENCY, async (e) => {
      const folder = e.path.match(/(^|\/)(screens|dataFlows|dataModels|documentDesigns|dataMappings|savedTransforms)\//)[2];
      const type = TYPE_FROM_KEY[folder];
      try {
        const raw = await rawJson(repo.name, branch, e.path);
        const norm = normalizeItem(type, raw);
        if (!norm.id) return;
        norm.contentUrl = rawUrl(repo.name, branch, e.path);
        items.push(norm);
      } catch { /* one bad file doesn't fail the whole repo */ }
    });

    const dataFiles = entries.filter(e => e.type === 'blob' && /^data\//.test(e.path) && /\.json$/i.test(e.path));
    const dataGroups = new Map();
    for (const e of dataFiles) {
      const rest = e.path.slice('data/'.length);
      const key = rest.includes('/') ? rest.split('/')[0] : rest.replace(/\.json$/i, '');
      if (!dataGroups.has(key)) dataGroups.set(key, []);
      dataGroups.get(key).push(e.path);
    }
    for (const [modelName, files] of dataGroups) seedGroups.push({ modelName, recordCount: null, fileCount: files.length });

    const moduleFile = dataFiles.find(e => /(^|\/)Module\.json$/i.test(e.path));
    const groupFile = dataFiles.find(e => /(^|\/)ModuleGroup\.json$/i.test(e.path));
    if (moduleFile) {
      try { for (const m of (await rawJson(repo.name, branch, moduleFile.path)).payload || []) moduleMap[m.id] = m; } catch { /* labels stay derived */ }
    }
    if (groupFile) {
      try { for (const g of (await rawJson(repo.name, branch, groupFile.path)).payload || []) groupMap[g.id] = g; } catch { /* labels stay derived */ }
    }

    const KNOWN_PREFIX = /^(modules\/|screens\/|dataFlows\/|dataModels\/|documentDesigns\/|dataMappings\/|savedTransforms\/|data\/|site\/|\.github\/)/;
    const KNOWN_FILE = new Set(['README.md', 'manifest.json', 'definition.json', 'package-data.json']);
    otherFiles = entries
      .filter(e => e.type === 'blob' && !KNOWN_PREFIX.test(e.path) && !KNOWN_FILE.has(e.path))
      .map(e => ({ path: e.path, contentUrl: rawUrl(repo.name, branch, e.path) }));
  }

  /* ── assemble the moduleGroup > module tree ── */
  const groups = new Map();
  const group = (id) => {
    if (!groups.has(id)) {
      const g = groupMap[id];
      groups.set(id, { id, name: g?.name || titleCase(id), description: g?.description || '', icon: g?.icon || null, modules: new Map() });
    }
    return groups.get(id);
  };
  const moduleOf = (groupId, moduleId) => {
    const g = group(groupId);
    if (!g.modules.has(moduleId)) {
      const m = moduleMap[moduleId];
      g.modules.set(moduleId, { id: moduleId, name: m?.name || titleCase(moduleId), description: m?.description || '', screens: [], flows: [], models: [] });
    }
    return g.modules.get(moduleId);
  };

  const documents = [], mappings = [], transforms = [];
  for (const item of items) {
    const record = { id: item.id, name: item.name, description: item.description, contentUrl: item.contentUrl };
    if (item.type === 'documents') { documents.push(record); continue; }
    if (item.type === 'mappings') { mappings.push(record); continue; }
    if (item.type === 'transforms') { transforms.push(record); continue; }
    const moduleId = item.moduleId || 'uncategorized';
    const groupId = (item.type === 'models' ? item.moduleGroupIdFromModel : moduleMap[moduleId]?.moduleGroupId) || 'uncategorized';
    moduleOf(groupId, moduleId)[item.type].push(record);
  }

  const moduleGroups = [...groups.values()]
    .map(g => ({ ...g, modules: [...g.modules.values()].filter(m => m.screens.length || m.flows.length || m.models.length) }))
    .filter(g => g.modules.length)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(g => ({ ...g, modules: g.modules.sort((a, b) => a.name.localeCompare(b.name)) }));

  return {
    repo: repo.name, branch, moduleGroups,
    documents: documents.sort((a, b) => a.name.localeCompare(b.name)),
    mappings: mappings.sort((a, b) => a.name.localeCompare(b.name)),
    transforms: transforms.sort((a, b) => a.name.localeCompare(b.name)),
    seedData: seedGroups.sort((a, b) => a.modelName.localeCompare(b.modelName)),
    otherFiles: otherFiles.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

/* ── main ─────────────────────────────────────────────────────────────────────────────────── */
const overridePath = join(SITE, 'accelerators.json');
const overrides = existsSync(overridePath) ? JSON.parse(readFileSync(overridePath, 'utf8')) : {};

const repos = (await allRepos())
  .filter(r => (r.topics || []).includes(MARKER) && !r.archived)
  .filter(r => {
    const o = overrides[r.name] || {};
    return !o.hidden && !o.deprecated;
  });

mkdirSync(join(SITE, 'explore', 'data'), { recursive: true });

const index = [];
for (const repo of repos) {
  try {
    const result = await processRepo(repo);
    writeFileSync(join(SITE, 'explore', 'data', `${repo.name}.json`), JSON.stringify(result));
    const itemCount = result.moduleGroups.reduce((n, g) => n + g.modules.reduce((n2, m) => n2 + m.screens.length + m.flows.length + m.models.length, 0), 0)
      + result.documents.length + result.mappings.length + result.transforms.length;
    index.push({
      repo: repo.name,
      title: overrides[repo.name]?.title || titleFromName(repo.name),
      description: overrides[repo.name]?.summary || cleanSummary(repo.description),
      moduleGroupCount: result.moduleGroups.length,
      itemCount,
      seedDataCount: result.seedData.length,
      otherFileCount: result.otherFiles.length,
    });
    console.log(`explorer: ${repo.name} — ${result.moduleGroups.length} module groups, ${itemCount} items, ${result.seedData.length} seed models, ${result.otherFiles.length} other files`);
  } catch (e) {
    console.warn(`explorer: skipped ${repo.name}: ${e.message}`);
  }
}

index.sort((a, b) => a.title.localeCompare(b.title));
writeFileSync(join(SITE, 'explore', 'data', 'index.json'), JSON.stringify(index));
console.log(`Explorer: processed ${index.length}/${repos.length} accelerators.`);
