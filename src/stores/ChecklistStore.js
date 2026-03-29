/**
 * ChecklistStore.js — Polar[3] PWA v2.7.12
 * Gestión del checklist estático de preparación de jornada.
 * Persiste los IDs de ítems tildados en localStorage.
 */

import { CHECKLIST_KEY } from '../config.js';
import { trackedSetItem, trackedRemoveItem } from '../modules/Storage.js';

// ─────────────────────────────────────────────
// CARGA INICIAL
// ─────────────────────────────────────────────

/**
 * Lee el estado guardado y aplica la clase `checked` a los ítems del DOM.
 * Llamar una vez después de que el DOM esté listo.
 */
export function loadChecklist() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '[]');
    if (!Array.isArray(saved)) saved = [];
  } catch (e) {
    saved = [];
  }

  document.querySelectorAll('.check-item[data-id]').forEach(item => {
    if (saved.includes(item.dataset.id)) {
      item.classList.add('checked');
    }
  });

  updateCheckProgress();
}

// ─────────────────────────────────────────────
// TOGGLE
// ─────────────────────────────────────────────

/**
 * Alterna el estado de un ítem de checklist y persiste.
 * @param {HTMLElement} item - El elemento `.check-item[data-id]`
 */
export function toggleCheck(item) {
  item.classList.toggle('checked');
  const saved = [...document.querySelectorAll('.check-item[data-id].checked')]
    .map(i => i.dataset.id);
  trackedSetItem(CHECKLIST_KEY, JSON.stringify(saved));
  updateCheckProgress();
}

// ─────────────────────────────────────────────
// PROGRESO
// ─────────────────────────────────────────────

export function updateCheckProgress() {
  const items   = document.querySelectorAll('.check-item[data-id]');
  const checked = document.querySelectorAll('.check-item[data-id].checked');
  const total = items.length;
  const done  = checked.length;

  const progress = document.getElementById('check-progress');
  const bar      = document.getElementById('check-bar');

  if (progress) progress.textContent = `${done} / ${total}`;
  if (bar) bar.style.width = total > 0 ? `${(done / total) * 100}%` : '0%';
}

// ─────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────

export function resetChecklist() {
  if (!confirm('¿Reiniciar el checklist? Se borrarán todos los tildados.')) return;
  trackedRemoveItem(CHECKLIST_KEY);
  document.querySelectorAll('.check-item[data-id]').forEach(i => i.classList.remove('checked'));
  updateCheckProgress();
}

// ─────────────────────────────────────────────
// CONTEO (para resumen del dashboard)
// ─────────────────────────────────────────────

export function getChecklistCount() {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '[]').length;
  } catch (e) {
    return 0;
  }
}
