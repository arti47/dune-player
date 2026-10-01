// swipe.js — left/right swipe between sections (UI round 2 #5).
//
// One document-level touch listener; the current screen registers what a swipe means with
// `setSwipe({ prev, next })` (router clears it before each render). Swipes that start on a form
// field, a slider, an open dialog or anything that scrolls sideways are left alone.
// `animateIn(node)` gives the newly shown section a short slide from the swipe's direction.

const MIN_DX = 60;          // px travelled sideways
const RATIO = 1.5;          // sideways must beat vertical by this much
const MAX_MS = 700;         // a swipe, not a slow drag

let handler = null;
let pendingDir = null;      // 'left' | 'right' — the direction the finger moved
let start = null;

export function setSwipe(h) { handler = h || null; }

/** Pure: is this gesture a horizontal swipe? Returns 'left' | 'right' | null. */
export function swipeDirection(dx, dy, ms) {
  if (ms > MAX_MS || Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * RATIO) return null;
  return dx < 0 ? 'left' : 'right';
}

function scrollsSideways(node) {
  for (let n = node; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 1) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
}

function ignored(target) {
  if (!(target instanceof Element)) return true;
  if (document.querySelector('.modal-overlay, .wizard')) return true;
  if (target.closest('input, textarea, select, [contenteditable], .no-swipe')) return true;
  return scrollsSideways(target);
}

/** Install once at boot. */
export function initSwipe() {
  document.addEventListener('touchstart', (e) => {
    start = null;
    if (!handler || e.touches.length !== 1 || ignored(e.target)) return;
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, ts: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!start || !handler) return;
    const t = e.changedTouches[0];
    const dir = swipeDirection(t.clientX - start.x, t.clientY - start.y, Date.now() - start.ts);
    start = null;
    if (!dir) return;
    const go = dir === 'left' ? handler.next : handler.prev;
    if (!go) return;
    pendingDir = dir;
    go();
  }, { passive: true });
}

/** Slide the freshly rendered section in from the side the swipe came from (no-op otherwise). */
export function animateIn(node) {
  if (!pendingDir || !node) return;
  node.classList.add(pendingDir === 'left' ? 'swipe-in-left' : 'swipe-in-right');
  pendingDir = null;
}

/** prev/next neighbours of `id` within an ordered id list (null at the ends — no wrap). */
export function neighbours(ids, id) {
  const i = ids.indexOf(id);
  return { prev: i > 0 ? ids[i - 1] : null, next: i >= 0 && i < ids.length - 1 ? ids[i + 1] : null };
}
