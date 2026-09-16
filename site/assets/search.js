/*
 * Site search, backed by Pagefind (github.com/CloudCannon/pagefind). Pagefind indexes the built
 * HTML at deploy time — see .github/workflows/pages.yml — and drops its runtime into /pagefind/.
 * That runtime and its CSS are loaded lazily, on first open, so a visitor who never searches never
 * pays for it.
 *
 * This file is a static asset copied as-is; it is the same on every page regardless of how deep
 * the page sits, which is why every path below is site-root-absolute rather than relative.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var nav = document.querySelector('header.topbar nav');
    if (!nav) return;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nav-search-btn';
    trigger.setAttribute('aria-label', 'Search this site');
    trigger.innerHTML = 'Search <kbd>/</kbd>';
    nav.insertBefore(trigger, nav.firstChild);

    var overlay = null;
    var mounted = false;

    function loadPagefind(cb) {
      if (window.PagefindUI) return cb();
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/pagefind/pagefind-ui.css';
      document.head.appendChild(css);

      var script = document.createElement('script');
      script.src = '/pagefind/pagefind-ui.js';
      script.onload = cb;
      document.head.appendChild(script);
    }

    function openSearch() {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.innerHTML =
          '<div class="search-panel" role="dialog" aria-modal="true" aria-label="Search">' +
            '<button type="button" class="search-close" aria-label="Close search">&times;</button>' +
            '<div id="search"></div>' +
          '</div>';
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeSearch();
        });
        overlay.querySelector('.search-close').addEventListener('click', closeSearch);
        document.body.appendChild(overlay);
      }
      overlay.classList.add('open');
      document.body.classList.add('search-open');
      loadPagefind(function () {
        if (!mounted) {
          new window.PagefindUI({
            element: '#search',
            showSubResults: true,
            showImages: false,
            resetStyles: false
          });
          mounted = true;
        }
        var input = overlay.querySelector('input');
        if (input) input.focus();
      });
    }

    function closeSearch() {
      if (!overlay) return;
      overlay.classList.remove('open');
      document.body.classList.remove('search-open');
    }

    trigger.addEventListener('click', openSearch);

    document.addEventListener('keydown', function (e) {
      var target = e.target;
      var tag = target && target.tagName;
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      } else if (!typing && e.key === '/') {
        e.preventDefault();
        openSearch();
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    });
  });
})();
