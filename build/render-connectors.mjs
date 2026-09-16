/* build/render-connectors.mjs — pure render helpers for the connectors pages. generate.mjs calls
 * these against the data files in build/data/*.mjs; nothing here reads a file or the network.
 * Inputs are trusted, hand-authored content (not user input), so strings are not HTML-escaped —
 * that's what lets a data file use <strong>, <code> or &nbsp; where it reads better.
 */

const isUrl = s => typeof s === 'string' && /^https?:\/\//.test(s);

// A vendor's mark: a local file under site/assets/logos/ (resolved relative to the page, via
// `depth` — '../../' from a two-deep page, '../' from a hub one level down), a full URL (the
// platform's own public S3 logos), or a text badge when no usable mark exists.
function mark(name, logo, depth) {
  if (!logo) {
    const badge = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || '??';
    return `<span class="badge-mark">${badge}</span>`;
  }
  const src = isUrl(logo) ? logo : `${depth}assets/logos/${logo}`;
  return `<img src="${src}" alt="${name} logo" loading="lazy">`;
}

// Renders one connector's real API documentation (queried live from the platform's Connector
// model — see build/data/connector-docs.mjs) as a collapsed <details> disclosure. `doc` is
// {credentials: [{label, secret, required, note}], notes}; required defaults to true.
function renderDoc(doc, detailHref) {
  if (!doc) return '';
  const creds = (doc.credentials || []).map(c => {
    const req = c.required === false ? '<span class="req-flag">optional</span>' : '<span class="req-flag">required</span>';
    const secret = c.secret ? ' <span class="secret-flag">&#9679; secret</span>' : '';
    const note = c.note ? `<span class="field-note">${c.note}</span>` : '';
    return `            <li>${c.label} ${req}${secret}${note}</li>`;
  }).join('\n');
  const link = detailHref ? `\n            <p style="margin:12px 0 0"><a href="${detailHref}">Full API reference &amp; schema explorer &rarr;</a></p>` : '';
  return `
        <details>
          <summary></summary>
          <div class="doc-body">
            ${doc.notes ? `<p class="doc-notes">${doc.notes}</p>` : ''}
            ${creds ? `<p class="doc-creds-label">Credentials</p>\n            <ul class="doc-creds">\n${creds}\n            </ul>` : ''}${link}
          </div>
        </details>`;
}

// Groups a flat list of {name, category, logo, note} into named .logo-group sections, each a
// dense grid of one tile per connector. `footnotes[category]` appends a callout under that
// group. `skipCategories` carries data (e.g. the 'AI' entries, cross-referenced from LLMS)
// without ever giving it its own group. `docs` (name -> {credentials, notes}) adds a real,
// live-queried API-details disclosure to any tile whose name matches.
export function renderLogoGrid(items, { depth, skipCategories = [], footnotes = {}, docs = {}, detailSlugs = {} } = {}) {
  const groups = new Map();
  for (const item of items) {
    if (skipCategories.includes(item.category)) continue;
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  return [...groups.entries()].map(([category, entries]) => {
    const tiles = entries.map(e => `        <div class="logo-tile">
          <div class="mark">${mark(e.name, e.logo, depth)}</div>
          <div class="name">${e.name}</div>
          ${e.note ? `<div class="note">${e.note}</div>` : ''}${renderDoc(docs[e.name], detailSlugs[e.name] ? `./${detailSlugs[e.name]}/` : null)}
        </div>`).join('\n');
    const footnote = footnotes[category] ? `\n      <div class="callout">${footnotes[category]}</div>` : '';
    return `      <div class="logo-group">
        <p class="logo-group-title">${category}</p>
        <div class="logo-grid">
${tiles}
        </div>${footnote}
      </div>`;
  }).join('\n');
}

// Richer, one-per-item cards (LLMs, Recently Added, Ignition Module features) — text-forward,
// an optional tag and an optional logo, not part of the dense vendor wall above.
export function renderFeatureCards(items, { depth = '' } = {}) {
  return items.map(it => {
    const tag = it.tag ? `<span class="tag${it.tagClass ? ' ' + it.tagClass : ''}">${it.tag}</span>` : '';
    const id = it.id ? ` id="${it.id}"` : '';
    const logo = it.logo ? `<div class="mark" style="margin-bottom:10px">${mark(it.name, it.logo, depth)}</div>` : '';
    return `      <div class="card"${id}>
        ${logo}<h3>${it.name}${tag}</h3>
        <p>${it.desc}</p>
      </div>`;
  }).join('\n');
}

export function renderTable(rows, columns) {
  const thead = columns.map(c => `<th>${c}</th>`).join('');
  const tbody = rows.map(r => `          <tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('\n');
  return `<div class="tablewrap">
      <table>
        <thead><tr>${thead}</tr></thead>
        <tbody>
${tbody}
        </tbody>
      </table>
    </div>`;
}
