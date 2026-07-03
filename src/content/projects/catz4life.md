---
name: catz4life
blurb: A deliberately broken cat adoption page for learning browser DevTools.
status: live
stack: [JavaScript, HTML, CSS]
repoUrl: https://github.com/mindiweik/catz4life
order: 4
since: 2025
---

The catz4life adopshun centre is a very broken cat adoption page, on purpose. Your mission: fix it using nothing but your browser's DevTools.

## the story

I built it to support a talk I gave about the browser, the same material that became my four-part DevTools series here on the blog. Slides only get you so far; fixing a real broken page is where DevTools actually clicks.

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:0.5rem">
  <a href="/blog/unlocking-your-browser" class="hov-card" style="display:block;padding:0.75rem 0.85rem;border:1px solid var(--border);border-radius:10px;text-decoration:none;--hover-accent:var(--accent-blog)">
    <span style="display:block;font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted)">part 1</span>
    <span style="display:block;font-family:var(--font-display);font-weight:500;font-size:0.85rem;line-height:1.3;margin-top:0.35rem">unlocking your browser</span>
  </a>
  <a href="/blog/your-new-best-friend-the-console" class="hov-card" style="display:block;padding:0.75rem 0.85rem;border:1px solid var(--border);border-radius:10px;text-decoration:none;--hover-accent:var(--accent-blog)">
    <span style="display:block;font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted)">part 2</span>
    <span style="display:block;font-family:var(--font-display);font-weight:500;font-size:0.85rem;line-height:1.3;margin-top:0.35rem">your new best friend, the console</span>
  </a>
  <a href="/blog/whats-actually-happening" class="hov-card" style="display:block;padding:0.75rem 0.85rem;border:1px solid var(--border);border-radius:10px;text-decoration:none;--hover-accent:var(--accent-blog)">
    <span style="display:block;font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted)">part 3</span>
    <span style="display:block;font-family:var(--font-display);font-weight:500;font-size:0.85rem;line-height:1.3;margin-top:0.35rem">what's actually happening</span>
  </a>
  <a href="/blog/level-up-sources-performance-and-your-playground" class="hov-card" style="display:block;padding:0.75rem 0.85rem;border:1px solid var(--border);border-radius:10px;text-decoration:none;--hover-accent:var(--accent-blog)">
    <span style="display:block;font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted)">part 4</span>
    <span style="display:block;font-family:var(--font-display);font-weight:500;font-size:0.85rem;line-height:1.3;margin-top:0.35rem">level up: sources, performance &amp; your playground</span>
  </a>
</div>

## what it does

It is a scavenger hunt. A broken headline to fix in the elements tab, a failed API call to chase down in the network tab, a busted adopt button for the console, and a theme toggle hiding in local storage. Each bug teaches one tab.

## where it's at

Done and reusable. If you are learning DevTools, clone it and go break things (well, fix things).
