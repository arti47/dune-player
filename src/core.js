// core.js — foundational constants, DOM/util helpers, raw d20 functions. No imports.

export const APP_NAME = 'Imperium Player';
export const APP_VERSION = '0.1.0';

// ---------- DOM helpers ----------
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Create an element: el('div', { class: 'card', onclick: fn }, child1, 'text') */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2), v);
    } else if (k === 'class') {
      node.className = v;
    } else if (k === 'dataset') {
      Object.assign(node.dataset, v);
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Escape a string for safe interpolation into HTML. */
export function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// ---------- Utils ----------
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ---------- Raw dice (no rules knowledge here) ----------
export function d20() {
  return Math.floor(Math.random() * 20) + 1;
}

/** Roll a single die with n faces → 1..n. */
export function dN(n) {
  return Math.floor(Math.random() * n) + 1;
}

/** Roll n d20s → array of face values. */
export function rollD20s(n) {
  return Array.from({ length: n }, d20);
}
