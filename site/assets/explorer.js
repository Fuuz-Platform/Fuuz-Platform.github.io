/*
 * Renders the two pages under site/explore/ from the JSON build/build-explorer.mjs writes to
 * site/explore/data/. Same file for both — the picker (explore/index.html, lists every
 * accelerator) and the viewer (explore/view/index.html, one accelerator's moduleGroup > module >
 * screen/flow/model tree plus a click-to-view content pane) — because they share the fetch/render
 * helpers and neither is large enough to earn its own file.
 *
 * Absolute paths throughout (site-root, not relative): this script runs from two different
 * directory depths, and item.contentUrl is either an absolute raw.githubusercontent.com URL (a
 * loose-file repo) or a site-root-relative path into explore/content/ (an extracted .fuuz/
 * package-data.json repo) — see build/build-explorer.mjs for which is which.
 */
(function () {
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function contentHref(url) {
    return /^https?:\/\//.test(url) ? url : '/' + url.replace(/^\/+/, '');
  }

  /* ── picker (site/explore/index.html) ────────────────────────────────────────────────────── */
  function renderPicker(container) {
    fetch('/explore/data/index.json')
      .then(function (r) { return r.json(); })
      .then(function (repos) {
        if (!repos.length) {
          container.innerHTML = '<p class="explorer-empty">No accelerators are indexed yet.</p>';
          return;
        }
        container.innerHTML = repos.map(function (r) {
          var parts = [];
          if (r.itemCount) parts.push(r.itemCount + ' screens, flows &amp; models');
          if (r.seedDataCount) parts.push(r.seedDataCount + ' seed data models');
          if (r.otherFileCount && !r.itemCount) parts.push(r.otherFileCount + ' files');
          var meta = parts.length ? parts.join(' &middot; ') : 'Source available on GitHub';
          return '<div class="card">' +
            '<h3><a href="/explore/view/?repo=' + esc(r.repo) + '">' + esc(r.title) + '</a></h3>' +
            '<p>' + esc(r.description) + '</p>' +
            '<div class="meta">' + meta + '</div>' +
          '</div>';
        }).join('\n');
      })
      .catch(function () {
        container.innerHTML = '<p class="explorer-empty">Couldn’t load the accelerator list. Try refreshing.</p>';
      });
  }

  /* ── viewer (site/explore/view/index.html) ───────────────────────────────────────────────── */
  function itemRowHtml(type, item) {
    return '<div class="tree-row" data-type="' + esc(type) + '" data-id="' + esc(item.id) + '" data-url="' + esc(item.contentUrl) + '" data-name="' + esc(item.name) + '">' +
      '<span class="tree-name">' + esc(item.name) + '</span>' +
      '<span class="tree-type">' + esc(type) + '</span></div>';
  }

  function moduleHtml(mod) {
    var rows = []
      .concat(mod.screens.map(function (i) { return itemRowHtml('screen', i); }))
      .concat(mod.flows.map(function (i) { return itemRowHtml('flow', i); }))
      .concat(mod.models.map(function (i) { return itemRowHtml('model', i); }));
    return '<div class="explorer-module">' +
      '<div class="explorer-module-name">' + esc(mod.name) + '</div>' +
      rows.join('') +
    '</div>';
  }

  function groupHtml(group, index) {
    return '<details class="explorer-group"' + (index === 0 ? ' open' : '') + '>' +
      '<summary>' + esc(group.name) + '</summary>' +
      group.modules.map(moduleHtml).join('') +
    '</details>';
  }

  function flatSectionHtml(title, type, list) {
    if (!list.length) return '';
    return '<p class="explorer-section-title">' + esc(title) + '</p>' +
      list.map(function (i) { return itemRowHtml(type, i); }).join('');
  }

  function seedSectionHtml(seedData) {
    if (!seedData.length) return '';
    return '<p class="explorer-section-title">Seed Data</p>' +
      seedData.map(function (d) {
        var count = d.recordCount != null ? d.recordCount + ' records' : d.fileCount + ' file' + (d.fileCount === 1 ? '' : 's');
        return '<div class="explorer-seed-row"><span>' + esc(d.modelName) + '</span><span class="count">' + esc(count) + '</span></div>';
      }).join('');
  }

  function otherFilesSectionHtml(otherFiles) {
    if (!otherFiles.length) return '';
    return '<p class="explorer-section-title">Other Files</p>' +
      otherFiles.map(function (f) {
        return '<div class="tree-row" data-type="file" data-id="' + esc(f.path) + '" data-url="' + esc(f.contentUrl) + '" data-name="' + esc(f.path) + '">' +
          '<span class="tree-name">' + esc(f.path) + '</span></div>';
      }).join('');
  }

  function renderViewer() {
    var params = new URLSearchParams(location.search);
    var repo = params.get('repo');
    var titleEl = document.getElementById('explore-title');
    var eyebrowEl = document.getElementById('explore-eyebrow');
    var descEl = document.getElementById('explore-desc');
    var githubLink = document.getElementById('explore-github-link');
    var treeEl = document.getElementById('explore-tree');
    var breadcrumbEl = document.getElementById('explore-breadcrumb');
    var codeEl = document.getElementById('explore-code');

    if (!repo) {
      treeEl.innerHTML = '<p class="explorer-empty">No accelerator specified.</p>';
      eyebrowEl.textContent = 'Browse The Code';
      titleEl.textContent = 'Pick An Accelerator';
      return;
    }

    githubLink.href = 'https://github.com/Fuuz-Platform/' + repo;

    Promise.all([
      fetch('/explore/data/' + repo + '.json').then(function (r) { if (!r.ok) throw new Error('not found'); return r.json(); }),
      fetch('/explore/data/index.json').then(function (r) { return r.json(); }).catch(function () { return []; })
    ]).then(function (results) {
      var data = results[0];
      var index = results[1];
      var meta = index.filter(function (r) { return r.repo === repo; })[0];

      eyebrowEl.textContent = 'Accelerator';
      titleEl.textContent = meta ? meta.title : repo;
      descEl.textContent = meta ? meta.description : '';
      document.title = (meta ? meta.title : repo) + ' — Browse The Code — Fuuz Accelerators';

      var sections = data.moduleGroups.map(groupHtml).join('') +
        flatSectionHtml('Documents', 'document', data.documents) +
        flatSectionHtml('Data Mappings', 'mapping', data.mappings) +
        flatSectionHtml('Saved Transforms', 'transform', data.transforms) +
        seedSectionHtml(data.seedData) +
        otherFilesSectionHtml(data.otherFiles);

      treeEl.innerHTML = sections || '<p class="explorer-empty">Nothing indexed for this accelerator yet.</p>';

      treeEl.querySelectorAll('.tree-row').forEach(function (row) {
        row.addEventListener('click', function () {
          treeEl.querySelectorAll('.tree-row.selected').forEach(function (r) { r.classList.remove('selected'); });
          row.classList.add('selected');
          var type = row.getAttribute('data-type');
          var name = row.getAttribute('data-name');
          var url = row.getAttribute('data-url');
          breadcrumbEl.textContent = type.charAt(0).toUpperCase() + type.slice(1) + ':';
          breadcrumbEl.innerHTML = '<span style="text-transform:capitalize">' + esc(type) + '</span><span class="sep">/</span>' + esc(name);
          codeEl.textContent = 'Loading…';
          codeEl.className = '';
          fetch(contentHref(url))
            .then(function (r) { return r.text(); })
            .then(function (text) {
              try { text = JSON.stringify(JSON.parse(text), null, 2); } catch (e) { /* not JSON, show as-is */ }
              codeEl.textContent = text;
              codeEl.className = 'language-json';
              if (window.hljs) window.hljs.highlightElement(codeEl);
            })
            .catch(function () { codeEl.textContent = 'Could not load this file.'; });
        });
      });
    }).catch(function () {
      treeEl.innerHTML = '<p class="explorer-empty">Couldn’t load this accelerator’s index.</p>';
      titleEl.textContent = repo;
    });
  }

  function boot() {
    var picker = document.getElementById('explore-picker');
    if (picker) renderPicker(picker);
    var tree = document.getElementById('explore-tree');
    if (tree) renderViewer();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
