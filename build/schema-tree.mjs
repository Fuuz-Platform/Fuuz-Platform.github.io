/* build/schema-tree.mjs — turns a real JSON Schema (from the platform's Connector.inputSchema /
 * outputSchema) into the flattened {path,type,required,description,enum,children} tree the
 * viewer widget walks, plus a shape-accurate PLACEHOLDER sample (`"<string>"`, `0`, `false`,
 * `{}`, `[]`, or the schema's own enum[0]/default when present) — never a fabricated realistic
 * value. This is the same placeholder convention the private connector-catalog accelerator's own
 * hand-written HTTP schema already uses (`path: '<string>'`), just derived mechanically here
 * instead of hand-typed, because these 47 schemas came from the live tenant, not a curated file.
 */

function typeLabel(t) {
  if (Array.isArray(t)) return t.filter(x => x !== null).join(' | ') + (t.includes(null) ? ' | null' : '');
  return t || 'any';
}

export function schemaToTree(schema, path, required) {
  if (!schema || typeof schema !== 'object') return { path, type: 'any', required: !!required };
  const branches = schema.oneOf || schema.anyOf;
  if (branches) {
    return {
      path, required: !!required,
      type: (schema.oneOf ? 'oneOf' : 'anyOf') + ` — ${branches.length} variants`,
      description: schema.description,
      children: branches.map((b, i) => schemaToTree(b, `${path} (variant ${i + 1})`, false)),
    };
  }
  const node = {
    path, required: !!required,
    type: typeLabel(schema.type) + (schema.properties && !schema.type ? 'object' : ''),
    description: schema.description,
    enum: schema.enum,
  };
  if (schema.properties) {
    const req = new Set(schema.required || []);
    node.children = Object.keys(schema.properties).map(k => schemaToTree(schema.properties[k], `${path}.${k}`, req.has(k)));
  } else if (schema.items) {
    node.children = [schemaToTree(schema.items, `${path}[]`, false)];
  }
  return node;
}

function placeholder(schema) {
  if (!schema || typeof schema !== 'object') return null;
  const branches = schema.oneOf || schema.anyOf;
  if (branches) return placeholder(branches[0]);
  if (schema.enum) return schema.enum[0];
  if ('default' in schema) return schema.default;
  const t = Array.isArray(schema.type) ? schema.type.find(x => x !== 'null') : schema.type;
  if (t === 'object' || schema.properties) {
    const out = {};
    for (const [k, v] of Object.entries(schema.properties || {})) out[k] = placeholder(v);
    return out;
  }
  if (t === 'array' || schema.items) return schema.items ? [placeholder(schema.items)] : [];
  if (t === 'string') return '<string>';
  if (t === 'integer' || t === 'number') return 0;
  if (t === 'boolean') return false;
  return null;
}

export function placeholderSample(schema) {
  return placeholder(schema);
}

// A schema block ready to embed in a page: {title, tree, sample}.
export function buildSchemaBlock(title, schema, rootPath) {
  if (!schema || (typeof schema === 'object' && Object.keys(schema).length === 0)) return null;
  return { title, tree: schemaToTree(schema, rootPath, true), sample: placeholderSample(schema) };
}
