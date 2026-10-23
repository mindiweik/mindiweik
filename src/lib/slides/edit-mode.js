// Edit-mode machinery for the blocked talk deck.
// Loaded ONLY when SLIDES_EDITABLE is true in src/config/slides.ts (the tag is
// injected at build time; nothing references this file otherwise). Even then it
// stays dormant unless ?edit is in the URL, so the public deck is untouched.
// The storage key arrives via the script tag's data-key attribute, set from
// src/config/slides.ts, which remains the single source of truth.

// Edit mode. Reachable only with ?edit in the URL, so the public deck
// still looks like a locked presentation. Edits autosave to this
// browser's localStorage; Export downloads them for folding into the
// repo; Reset discards them.
(function () {
  if (!new URLSearchParams(location.search).has('edit')) return;

  const KEY = document.currentScript?.dataset.key || 'blocked-slides-overrides';

  const style = document.createElement('style');
  style.textContent = `
          [contenteditable="true"] { outline: 1px dashed rgba(110, 123, 255, 0.5); outline-offset: 3px; border-radius: 3px; cursor: text; }
          [contenteditable="true"]:focus { outline: 2px solid var(--accent-primary); background: rgba(110, 123, 255, 0.08); }
          .editbar {
            position: fixed; right: 1rem; top: 1rem; z-index: 50;
            display: flex; gap: 0.4rem; align-items: center;
            font-family: var(--font-mono); font-size: 0.65rem;
            background: var(--surface); border: 1px solid var(--accent-primary);
            border-radius: 8px; padding: 0.4rem 0.6rem;
          }
          .editbar button {
            font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase;
            letter-spacing: 0.06em; background: transparent; color: var(--text);
            border: 1px solid var(--border); border-radius: 6px; padding: 0.25rem 0.55rem; cursor: pointer;
          }
          .editbar button:hover { border-color: var(--accent-primary); }
          .editbar .live { color: var(--accent-speaking); }
        `;
  document.head.appendChild(style);

  // Tag editable elements with a stable identity for save/load.
  const editableSel =
    '.slide h1, .slide h2, .slide p, .slide li, .card h3, .card .min, .slide .code';
  document.querySelectorAll(editableSel).forEach((el, idx) => {
    el.dataset.eid =
      el.closest('.slide').id ||
      's' + [...document.querySelectorAll('.slide')].indexOf(el.closest('.slide')) + '-' + idx;
  });

  const save = () => {
    const data = {};
    document.querySelectorAll('[data-eid]').forEach((el) => {
      data[el.dataset.eid] = el.innerHTML;
    });
    try {
      localStorage.setItem(KEY, JSON.stringify({ saved: new Date().toISOString(), edits: data }));
      flash('saved ' + new Date().toLocaleTimeString());
    } catch {
      flash('save failed');
    }
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const { edits } = JSON.parse(raw);
      let n = 0;
      Object.entries(edits).forEach(([id, html]) => {
        const el = document.querySelector('[data-eid="' + id + '"]');
        if (el && el.innerHTML !== html) {
          el.innerHTML = html;
          n++;
        }
      });
      return n > 0 || Object.keys(edits).length > 0;
    } catch {
      return false;
    }
  };

  let timer = null;
  const flash = (msg) => {
    status.textContent = msg;
    clearTimeout(timer);
    timer = setTimeout(() => {
      status.textContent = 'edit mode';
    }, 1600);
  };

  const bar = document.createElement('div');
  bar.className = 'editbar';
  bar.innerHTML =
    '<span class="live" id="edit-status">edit mode</span>' +
    '<button id="edit-export">export</button>' +
    '<button id="edit-clear">reset</button>';
  document.body.appendChild(bar);

  const status = bar.querySelector('#edit-status');

  // Restore before enabling editing.
  const restored = load();
  if (restored) flash('restored local edits');

  document.querySelectorAll(editableSel).forEach((el) => {
    el.setAttribute('contenteditable', 'true');
    el.addEventListener('input', () => {
      clearTimeout(timer);
      status.textContent = '...';
      timer = setTimeout(save, 700);
    });
  });

  bar.querySelector('#edit-export').onclick = () => {
    save();
    const raw = localStorage.getItem(KEY);
    const blob = new Blob([raw || '{}'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'slides-overrides.json';
    a.click();
  };

  bar.querySelector('#edit-clear').onclick = () => {
    localStorage.removeItem(KEY);
    location.reload();
  };
})();
