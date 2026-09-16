/* schema-viewer.js — renders window.__SCHEMA_BLOCKS__ (each {title, tree, sample}, built at
 * generate time by build/schema-tree.mjs from a real Connector.inputSchema/outputSchema) as a
 * Tree View / JSON Schema / Table View explorer with a click-to-select field detail panel and a
 * copy-to-clipboard sample. Plain vanilla JS — no framework — ported from the interaction design
 * of the private connector-catalog accelerator's React app (SchemaNode/SchemaBlock), same
 * behavior, no build step for this static site.
 */
(function () {
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function flatten(node, out) {
    out.push(node);
    if (node.children) node.children.forEach(function (c) { flatten(c, out); });
    return out;
  }

  function treeRowHtml(node, selectedPath) {
    var selected = node.path === selectedPath;
    var row = '<div class="tree-row' + (selected ? ' selected' : '') + '" data-path="' + esc(node.path) + '">' +
      '<span class="tree-name">' + esc(node.path) + '</span>' +
      (node.required ? '<span class="tree-req">*</span>' : '') +
      '<span class="tree-type">' + esc(node.type) + '</span></div>';
    var enumRow = node.enum ? '<div class="tree-desc">' + node.enum.map(function (v) { return '"' + esc(v) + '"'; }).join(' | ') + '</div>' : '';
    var descRow = node.description ? '<div class="tree-desc">' + esc(node.description) + '</div>' : '';
    var children = node.children ? '<div class="tree-children">' + node.children.map(function (c) { return treeRowHtml(c, selectedPath); }).join('') + '</div>' : '';
    return '<div class="tree-node">' + row + enumRow + descRow + children + '</div>';
  }

  function tableHtml(all) {
    var rows = all.map(function (n) {
      return '<tr><td class="tree-name">' + esc(n.path) + '</td>' +
        '<td><span class="tree-type">' + esc(n.type) + '</span>' + (n.required ? ' <span class="tree-req">*</span>' : '') + '</td>' +
        '<td style="font-size:11.5px;color:var(--text-muted)">' + esc(n.description || '') + '</td></tr>';
    }).join('');
    return '<table class="schema-table"><tbody>' + rows + '</tbody></table>';
  }

  function renderBlock(block, container) {
    var all = flatten(block.tree, []);
    var state = { tab: 'tree', selectedPath: block.tree.path };

    var el = document.createElement('div');
    el.className = 'schema-block';
    el.innerHTML =
      '<h6 class="schema-block-title">' + esc(block.title) + '</h6>' +
      '<div class="schema-tabs">' +
        '<div class="schema-tab" data-tab="tree">Tree View</div>' +
        '<div class="schema-tab" data-tab="json">JSON Schema</div>' +
        '<div class="schema-tab" data-tab="table">Table View</div>' +
      '</div>' +
      '<div class="schema-cols">' +
        '<div class="schema-panel schema-view"></div>' +
        '<div class="schema-detail">' +
          '<p class="schema-field-label">Selected Field</p>' +
          '<div class="schema-selected"></div>' +
          '<p class="schema-field-label" style="margin-top:14px">Sample Value</p>' +
          '<pre class="schema-code schema-sample"></pre>' +
          '<button class="schema-copybtn">Copy sample</button>' +
        '</div>' +
      '</div>';
    container.appendChild(el);

    var view = el.querySelector('.schema-view');
    var tabs = el.querySelectorAll('.schema-tab');
    var selectedBox = el.querySelector('.schema-selected');
    var sampleBox = el.querySelector('.schema-sample');
    var copyBtn = el.querySelector('.schema-copybtn');

    function paintTabs() {
      tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === state.tab); });
    }

    function paintSelected() {
      var node = all.filter(function (n) { return n.path === state.selectedPath; })[0] || block.tree;
      selectedBox.innerHTML = '<div class="tree-row selected" style="margin-bottom:8px">' +
        '<span class="tree-name">' + esc(node.path) + '</span>' +
        '<span class="tree-type">' + esc(node.type) + '</span></div>' +
        '<p style="font-size:12px;color:var(--text-secondary);margin:0 0 4px;line-height:1.5">' +
        esc(node.description || 'No description provided for this field.') + '</p>';
      sampleBox.textContent = JSON.stringify(block.sample, null, 2);
    }

    function paintView() {
      if (state.tab === 'tree') view.innerHTML = '<div class="schema-tree">' + treeRowHtml(block.tree, state.selectedPath) + '</div>';
      else if (state.tab === 'json') view.innerHTML = '<pre class="schema-code" style="margin:0">' + esc(JSON.stringify(block.tree, null, 2)) + '</pre>';
      else view.innerHTML = tableHtml(all);
      view.querySelectorAll('.tree-row').forEach(function (row) {
        row.addEventListener('click', function () {
          state.selectedPath = row.getAttribute('data-path');
          paintView();
          paintSelected();
        });
      });
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        state.tab = t.getAttribute('data-tab');
        paintTabs();
        paintView();
      });
    });

    copyBtn.addEventListener('click', function () {
      var text = JSON.stringify(block.sample, null, 2);
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text); } catch (e) {}
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = 'Copy sample'; }, 1200);
    });

    paintTabs();
    paintView();
    paintSelected();
  }

  function boot() {
    var blocks = window.__SCHEMA_BLOCKS__ || [];
    var container = document.getElementById('schema-blocks');
    if (!container) return;
    blocks.forEach(function (b) { renderBlock(b, container); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
