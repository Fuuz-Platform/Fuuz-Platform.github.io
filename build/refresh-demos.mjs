/*
 * Re-pulls demo metadata from the Fuuz Asset model into build/demos.json.
 *
 * RUN THIS LOCALLY, NOT IN CI. The Asset model lives in the fuuzAdministrationBuild tenant behind a
 * tenant JWT. That token is not scoped to read-only, so putting one in GitHub Actions secrets to
 * save a manual step is a security decision for a human to make deliberately — not something a
 * build script should quietly require. The demos change rarely; the trade is worth it.
 *
 *   FUUZ_HOST=<host> FUUZ_TENANT=<tenant> FUUZ_TOKEN=<jwt> node build/refresh-demos.mjs
 *
 * WHAT IT TOUCHES. `lengthSeconds` and `sourceName` are overwritten from the tenant, and any video
 * that has disappeared from a source collection is reported. `title` and `summary` are LEFT ALONE:
 * the source names are raw filenames ("prodexecutiondemo_v1 (2160p).mp4") and the source
 * descriptions are transcript-generated prose that reads like notes, not like a page. Both were
 * hand-written for publication and regenerating them would undo that.
 *
 * New videos added to a source collection are reported but NOT added automatically — publishing
 * something to the open internet should be a decision, not a side effect of a sync.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS_PATH = join(HERE, 'demos.json');

const { FUUZ_HOST, FUUZ_TENANT, FUUZ_TOKEN } = process.env;
if (!FUUZ_HOST || !FUUZ_TENANT || !FUUZ_TOKEN) {
  console.error('Set FUUZ_HOST, FUUZ_TENANT and FUUZ_TOKEN. See the header of this file.');
  process.exit(1);
}

/* The Fuuz GraphQL endpoint is /application — not /graphql, and not /api/graphql. */
async function gql(query, variables = {}) {
  const res = await fetch(`https://${FUUZ_HOST}/application`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: FUUZ_TOKEN.startsWith('Bearer ') ? FUUZ_TOKEN : `Bearer ${FUUZ_TOKEN}`,
      'x-fuuz-tenant': FUUZ_TENANT
    },
    body: JSON.stringify({ query, variables })
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors).slice(0, 400));
  return body.data;
}

const demos = JSON.parse(readFileSync(DEMOS_PATH, 'utf8'));
const sourceCollections = demos.collections.map(c => c.sourceCollection);

const data = await gql(`
  query($collections: [String!]) {
    asset(where: { bunnyCollectionName: { _in: $collections } }, first: 500) {
      edges { node { id name bunnyVideoGuid bunnyCollectionName lengthSeconds } }
    }
  }`, { collections: sourceCollections });

const live = new Map(data.asset.edges.map(e => [e.node.bunnyVideoGuid, e.node]));

let updated = 0;
const missing = [];
for (const c of demos.collections) {
  for (const v of c.videos) {
    const row = live.get(v.guid);
    if (!row) { missing.push(`${c.name} / ${v.title}`); continue; }
    if (row.lengthSeconds !== v.lengthSeconds || row.name !== v.sourceName) updated++;
    v.lengthSeconds = row.lengthSeconds;
    v.sourceName = row.name;
  }
}

const published = new Set(demos.collections.flatMap(c => c.videos.map(v => v.guid)));
const added = [...live.values()].filter(n => !published.has(n.bunnyVideoGuid));

writeFileSync(DEMOS_PATH, JSON.stringify(demos, null, 2) + '\n');

console.log(`Refreshed ${published.size} published demos (${updated} changed).`);
if (missing.length) {
  console.log('\nGONE from the source collections — remove from demos.json:');
  missing.forEach(m => console.log(`  ${m}`));
}
if (added.length) {
  console.log('\nNEW in the source collections — review, then add to demos.json by hand:');
  added.forEach(n => console.log(`  [${n.bunnyCollectionName}] ${n.name}  (${n.bunnyVideoGuid})`));
}
