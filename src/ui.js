// ui.js — themed modals/toasts/confirm/prompt. No native alert/confirm/prompt anywhere.

import { el, qs } from './core.js';

let lastFocused = null;
let modalTitleSeq = 0;

/**
 * Open a modal. content: Node | Node[]. Returns close().
 * Accessible: focus trap, Escape closes, aria-modal, focus restore.
 */
export function modal(content, { labelledBy = null, onClose = null } = {}) {
  lastFocused = document.activeElement;
  const box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
  box.append(...[content].flat());
  // Name the dialog for screen readers: explicit labelledBy wins; otherwise derive
  // it from the first heading in the content (auto-assigning an id if it lacks one).
  if (labelledBy) {
    box.setAttribute('aria-labelledby', labelledBy);
  } else {
    const heading = box.querySelector('h1, h2, h3');
    if (heading) {
      if (!heading.id) heading.id = `modal-title-${++modalTitleSeq}`;
      box.setAttribute('aria-labelledby', heading.id);
    }
  }
  const overlay = el('div', { class: 'modal-overlay' }, box);

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    if (onClose) onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {
      const focusables = box.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  const firstFocus = box.querySelector('button, [href], input, select, textarea');
  (firstFocus || box).focus?.();
  return close;
}

/** Transient toast, announced via the aria-live region in index.html. */
export function showToast(message, ms = 2800) {
  const region = qs('#toast-region');
  const t = el('div', { class: 'toast' }, message);
  region.append(t);
  setTimeout(() => t.remove(), ms);
}

/** A persistent toast with an action button (no auto-dismiss). Returns a dismiss fn.
 *  Used for the "new version available — reload" prompt. */
export function showActionToast(message, actionLabel, onAction) {
  const region = qs('#toast-region');
  const t = el('div', { class: 'toast toast-action', role: 'status', 'aria-live': 'polite' },
    el('span', {}, message));
  const dismiss = () => t.remove();
  t.append(
    el('button', { class: 'toast-btn', onclick: () => onAction(dismiss) }, actionLabel),
    el('button', { class: 'toast-x', 'aria-label': 'Dismiss', onclick: dismiss }, '×'));
  region.append(t);
  return dismiss;
}

/** Themed confirm → Promise<boolean>. */
export function confirmModal(message, { okLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const ok = el('button', { class: 'btn', onclick: () => { done = true; close(); resolve(true); } }, okLabel);
    const cancel = el('button', { class: 'btn secondary', onclick: () => { done = true; close(); resolve(false); } }, cancelLabel);
    const msgId = `modal-msg-${++modalTitleSeq}`;
    const close = modal(
      [el('p', { id: msgId }, message), el('div', { class: 'modal-actions' }, cancel, ok)],
      { labelledBy: msgId, onClose: () => { if (!done) resolve(false); } }
    );
  });
}

/** Themed prompt → Promise<string|null>. */
export function promptModal(message, { placeholder = '', value = '', okLabel = 'OK' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const msgId = `modal-msg-${++modalTitleSeq}`;
    const input = el('input', { type: 'text', placeholder, value, 'aria-labelledby': msgId });
    const submit = () => { done = true; close(); resolve(input.value); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    const ok = el('button', { class: 'btn', onclick: submit }, okLabel);
    const cancel = el('button', { class: 'btn secondary', onclick: () => { done = true; close(); resolve(null); } }, 'Cancel');
    const close = modal(
      [el('p', { id: msgId }, message), input, el('div', { class: 'modal-actions' }, cancel, ok)],
      { labelledBy: msgId, onClose: () => { if (!done) resolve(null); } }
    );
    input.focus();
  });
}
