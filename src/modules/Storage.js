/**
 * Storage.js — Polar[3] PWA v2.7.12
 * Capa de persistencia inteligente sobre localStorage.
 * Maneja: escritura/lectura con dirty-tracking, backup export/import,
 * historial de respaldos, preferencias de recordatorio y UI asociada.
 */

import {
  POLAR3_STORAGE_PREFIX,
  BACKUP_META_KEY,
  BACKUP_HISTORY_KEY,
  BACKUP_PREFS_KEY,
  BACKUP_HISTORY_LIMIT,
  PAYMENT_BOARD_KEY,
  SCHOOL_BOARD_KEY,
  FOLLOWUP_BOARD_KEY,
  CHECKLIST_KEY,
  POLAR3_APP_VERSION,
  BACKUP_DEFAULT_INTERVAL_HOURS
} from '../config.js';

// ─────────────────────────────────────────────
// ESTADO DEL MÓDULO
// ─────────────────────────────────────────────

let appReadyForDirtyTracking = false;

/** Callback inyectado por app.js para actualizar la UI de backup */
let _onBackupStateChange = null;

/** Callback inyectado por app.js para mostrar toasts */
let _showToast = null;

// ─────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {function} opts.onBackupStateChange - Se llama cuando cambia el estado del backup
 * @param {function} opts.showToast - fn(message, tone)
 */
export function initStorage({ onBackupStateChange = null, showToast = null } = {}) {
  _onBackupStateChange = onBackupStateChange;
  _showToast = showToast;
}

export function enableDirtyTracking() {
  appReadyForDirtyTracking = true;
}

// ─────────────────────────────────────────────
// LECTURA / ESCRITURA RASTREADA
// ─────────────────────────────────────────────

export function trackedSetItem(key, value, markDirty = true) {
  localStorage.setItem(key, value);
  if (
    appReadyForDirtyTracking &&
    markDirty &&
    key.startsWith(POLAR3_STORAGE_PREFIX) &&
    key !== BACKUP_META_KEY
  ) {
    markBackupDirty(key);
  }
}

export function trackedRemoveItem(key, markDirty = true) {
  localStorage.removeItem(key);
  if (
    appReadyForDirtyTracking &&
    markDirty &&
    key.startsWith(POLAR3_STORAGE_PREFIX) &&
    key !== BACKUP_META_KEY
  ) {
    markBackupDirty(key);
  }
}

export function safeReadJsonKey(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

export function countTrackedKeys() {
  return Object.keys(localStorage).filter(
    key => key.startsWith(POLAR3_STORAGE_PREFIX) && key !== BACKUP_META_KEY
  ).length;
}

// ─────────────────────────────────────────────
// BACKUP META
// ─────────────────────────────────────────────

export function safeReadBackupMeta() {
  return safeReadJsonKey(BACKUP_META_KEY, {});
}

export function writeBackupMeta(meta) {
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
}

export function markBackupDirty(reason = 'update') {
  const prev = safeReadBackupMeta();
  const meta = {
    ...prev,
    dirty: true,
    lastChangeAt: new Date().toISOString(),
    lastChangeKey: reason || prev.lastChangeKey || 'update'
  };
  writeBackupMeta(meta);
  if (_onBackupStateChange) _onBackupStateChange();
}

export function markBackupClean(mode = 'export') {
  const prev = safeReadBackupMeta();
  const now = new Date().toISOString();
  const meta = {
    ...prev,
    dirty: false,
    lastBackupAt: now,
    lastBackupMode: mode,
    lastChangeKey: prev.lastChangeKey || null
  };
  writeBackupMeta(meta);
  if (_onBackupStateChange) _onBackupStateChange();
}

// ─────────────────────────────────────────────
// HISTORIAL DE BACKUP
// ─────────────────────────────────────────────

export function getBackupHistory() {
  const list = safeReadJsonKey(BACKUP_HISTORY_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveBackupHistory(history) {
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history.slice(0, BACKUP_HISTORY_LIMIT)));
}

export function addBackupHistoryEntry(action, options = {}) {
  const history = getBackupHistory();
  history.unshift({
    id: 'bk_' + Date.now(),
    at: new Date().toISOString(),
    action,
    fileName: options.fileName || '',
    note: options.note || '',
    summary: options.summary || getBackupSummary()
  });
  saveBackupHistory(history);
}

export function clearBackupHistory() {
  if (!confirm('¿Limpiar el historial local de respaldos? Esto no borra los datos de trabajo, solo el registro de eventos.')) return;
  localStorage.removeItem(BACKUP_HISTORY_KEY);
  if (_onBackupStateChange) _onBackupStateChange();
  if (_showToast) _showToast('Historial local de respaldos limpiado.', 'success');
}

// ─────────────────────────────────────────────
// PREFERENCIAS DE BACKUP
// ─────────────────────────────────────────────

export function getBackupPrefs() {
  const saved = safeReadJsonKey(BACKUP_PREFS_KEY, {});
  return {
    intervalHours: Number(saved.intervalHours ?? BACKUP_DEFAULT_INTERVAL_HOURS),
    dirtyOnly: saved.dirtyOnly !== false,
    toastOnStart: saved.toastOnStart !== false
  };
}

export function saveBackupPrefs(nextPrefs = {}) {
  const prefs = { ...getBackupPrefs(), ...nextPrefs };
  localStorage.setItem(BACKUP_PREFS_KEY, JSON.stringify(prefs));
  return prefs;
}

export function syncBackupPrefs() {
  const interval = Number(document.getElementById('backupReminderInterval')?.value || 0);
  const dirtyOnly = !!document.getElementById('backupReminderDirtyOnly')?.checked;
  const toastOnStart = (document.getElementById('backupReminderToast')?.value || '1') === '1';
  saveBackupPrefs({ intervalHours: interval, dirtyOnly, toastOnStart });
  if (_onBackupStateChange) _onBackupStateChange();
  if (_showToast) _showToast('Preferencias de recordatorio actualizadas.', 'success');
}

// ─────────────────────────────────────────────
// RESUMEN / ESTADO CALCULADO
// ─────────────────────────────────────────────

export function getBackupSummary() {
  const tryCount = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || '[]').length; } catch (e) { return 0; }
  };
  return {
    schoolBoard:    tryCount(SCHOOL_BOARD_KEY),
    followups:      tryCount(FOLLOWUP_BOARD_KEY),
    payments:       tryCount(PAYMENT_BOARD_KEY),
    checklistItems: tryCount(CHECKLIST_KEY),
    trackedKeys:    countTrackedKeys()
  };
}

export function computeBackupReminderState() {
  const meta = safeReadBackupMeta();
  const prefs = getBackupPrefs();
  const lastBackupAt = meta.lastBackupAt ? new Date(meta.lastBackupAt) : null;
  const lastChangeAt = meta.lastChangeAt ? new Date(meta.lastChangeAt) : null;
  const now = new Date();
  const hasDirty = !!meta.dirty;
  const intervalHours = Number(prefs.intervalHours || 0);
  const enabled = intervalHours > 0;
  const noBackupYet = !lastBackupAt;
  const hoursSinceBackup = lastBackupAt ? (now - lastBackupAt) / 36e5 : null;
  const dueByTime = enabled && lastBackupAt ? hoursSinceBackup >= intervalHours : enabled && noBackupYet;
  const dueByDirty = prefs.dirtyOnly ? hasDirty : true;
  const due = enabled && dueByTime && dueByDirty;

  let tone = 'success';
  let short = 'Recordatorio: al día';
  let title = 'Respaldo al día';
  let text = lastBackupAt
    ? `Último respaldo ${formatDateTime(meta.lastBackupAt)}.`
    : 'Aún no se exportó un respaldo desde esta instalación.';

  if (!enabled) {
    tone = 'success';
    short = 'Recordatorio: apagado';
    title = 'Recordatorio desactivado';
    text = 'La app no te avisará automáticamente. Sigue exportando un JSON al cerrar jornadas o tandas de carga.';
  } else if (noBackupYet) {
    tone = hasDirty ? 'danger' : 'warning';
    short = hasDirty ? 'Recordatorio: primer backup pendiente' : 'Recordatorio: sin primer backup';
    title = 'Conviene crear el primer respaldo';
    text = hasDirty
      ? 'Ya hay cambios cargados y todavía no exportaste ningún JSON. Haz el primer respaldo cuanto antes.'
      : 'Todavía no hay un respaldo inicial registrado. Exporta uno cuando cierres la primera tanda de trabajo.';
  } else if (due) {
    tone = hasDirty ? 'danger' : 'warning';
    short = 'Recordatorio: exportar hoy';
    title = hasDirty ? 'Hay cambios pendientes sin respaldo' : 'Conviene refrescar el respaldo';
    text = hasDirty
      ? `Pasaron ${formatElapsedHours(hoursSinceBackup)} desde el último respaldo y hubo cambios posteriores. Exporta un JSON hoy.`
      : `Pasaron ${formatElapsedHours(hoursSinceBackup)} desde el último respaldo. Conviene generar uno nuevo.`;
  } else if (hasDirty) {
    tone = 'warning';
    short = 'Recordatorio: cambios sin exportar';
    title = 'Hay cambios desde el último JSON';
    const nextIn = lastBackupAt ? formatRelativeHours(intervalHours - hoursSinceBackup) : 'pronto';
    text = `Hay cambios sin exportar, pero el recordatorio fuerte se activará ${nextIn}. Si acabas de cargar bastante información, respalda igual.`;
  }

  const nextReminderText = !enabled
    ? 'Recordatorios desactivados.'
    : noBackupYet
      ? 'Se avisará apenas existan datos sin respaldo.'
      : due
        ? 'El recordatorio ya está activo.'
        : `Próximo aviso estimado ${formatRelativeHours(intervalHours - (hoursSinceBackup || 0))}.`;

  return {
    enabled, due, tone, short, title, text, nextReminderText,
    lastBackupText: lastBackupAt ? formatDateTime(meta.lastBackupAt) : 'Sin exportar',
    dirty: hasDirty, prefs,
    lastChangeText: lastChangeAt ? formatDateTime(meta.lastChangeAt) : '—'
  };
}

// ─────────────────────────────────────────────
// EXPORT / IMPORT JSON
// ─────────────────────────────────────────────

function collectBackupPayload() {
  const storage = {};
  Object.keys(localStorage)
    .filter(key => key.startsWith(POLAR3_STORAGE_PREFIX))
    .forEach(key => { storage[key] = localStorage.getItem(key); });

  const meta = safeReadBackupMeta();
  return {
    app: 'Polar3',
    schema: 'polar3-backup-v1',
    version: POLAR3_APP_VERSION,
    exportedAt: new Date().toISOString(),
    generatedFrom: location.href,
    storage,
    summary: {
      ...getBackupSummary(),
      dirty: !!meta.dirty
    }
  };
}

export function exportBackupJson() {
  try {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `polar3-backup-${stamp}.json`;
    addBackupHistoryEntry('export', { fileName: filename, summary: getBackupSummary(), note: 'Exportación manual JSON' });
    const payload = collectBackupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    markBackupClean('export');
    if (_showToast) _showToast('Respaldo JSON generado. Guarda el archivo dentro de la carpeta de Polar3.', 'success');
  } catch (err) {
    console.error(err);
    if (_showToast) _showToast('No pude generar el respaldo JSON.', 'danger');
  }
}

export function triggerBackupImport() {
  const input = document.getElementById('backupFileInput');
  if (!input) return;
  input.value = '';
  input.click();
}

function applyBackupPayload(payload, fileName = '') {
  const storage = payload?.storage;
  if (!storage || typeof storage !== 'object') throw new Error('invalid_backup');
  if (!confirm('Vas a reemplazar los datos actuales de Polar3 por el respaldo importado. Conviene exportar un JSON antes de continuar. ¿Seguimos?')) return;
  Object.keys(localStorage)
    .filter(key => key.startsWith(POLAR3_STORAGE_PREFIX))
    .forEach(key => localStorage.removeItem(key));
  Object.entries(storage).forEach(([key, value]) => {
    localStorage.setItem(key, String(value));
  });
  markBackupClean('import');
  addBackupHistoryEntry('import', { fileName, summary: getBackupSummary(), note: 'Importación manual JSON' });
  if (_showToast) _showToast('Respaldo importado. La app se va a recargar.', 'success');
  setTimeout(() => location.reload(), 350);
}

export function handleBackupImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const payload = JSON.parse(String(evt.target?.result || ''));
      const isValid = payload?.schema === 'polar3-backup-v1' && payload?.app === 'Polar3' && payload?.storage;
      if (!isValid) throw new Error('invalid_schema');
      applyBackupPayload(payload, file.name || 'respaldo-importado.json');
    } catch (err) {
      console.error(err);
      if (_showToast) _showToast('El archivo no parece ser un respaldo válido de Polar3.', 'danger');
    }
  };
  reader.onerror = () => {
    if (_showToast) _showToast('No pude leer el archivo seleccionado.', 'danger');
  };
  reader.readAsText(file);
}

// ─────────────────────────────────────────────
// UI DE BACKUP
// ─────────────────────────────────────────────

export function updateBackupChip() {
  const chip = document.getElementById('backupChip');
  if (!chip) return;
  const meta = safeReadBackupMeta();
  const state = computeBackupReminderState();
  if (!meta.lastBackupAt) {
    chip.textContent = meta.dirty ? 'Respaldo: pendiente' : 'Respaldo: sin exportar';
  } else {
    chip.textContent = meta.dirty
      ? `Respaldo: pendiente · último ${formatDateTime(meta.lastBackupAt)}`
      : `Respaldo: ${formatDateTime(meta.lastBackupAt)}`;
  }
  chip.dataset.state = state.due ? state.tone : (meta.dirty ? 'warning' : 'success');
}

export function updateBackupReminderUI() {
  const state = computeBackupReminderState();
  const chip = document.getElementById('backupReminderChip');
  if (chip) {
    chip.textContent = state.short;
    chip.dataset.state = state.tone;
  }
  const bar = document.getElementById('backupReminderBar');
  if (bar) {
    if (!state.enabled && !state.dirty) {
      bar.hidden = true;
    } else if (state.due || !safeReadBackupMeta().lastBackupAt || state.dirty) {
      bar.hidden = false;
      bar.dataset.tone = state.tone;
      bar.innerHTML = `
        <div>
          <strong>${state.title}</strong>
          <span>${state.text}</span>
        </div>
        <div class="backup-reminder-actions">
          <button class="mini-btn" type="button" onclick="showSection('respaldos')">Abrir administración</button>
          <button class="mini-btn" type="button" onclick="exportBackupJson()">Respaldar ahora</button>
        </div>
      `;
    } else {
      bar.hidden = true;
    }
  }
}

export function renderBackupAdmin() {
  const state = computeBackupReminderState();
  const meta = safeReadBackupMeta();
  const history = getBackupHistory();
  const summary = getBackupSummary();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('backupAdminStatus', state.due ? 'Atención' : (meta.dirty ? 'Pendiente' : 'Al día'));
  setText('backupAdminLast', state.lastBackupText);
  setText('backupAdminHistoryCount', String(history.length));
  setText('backupAdminTrackedKeys', String(summary.trackedKeys));
  setText('backupAdminDirty', meta.dirty ? 'Sí' : 'No');
  setText('backupAdminBadge', state.enabled
    ? `Cada ${
        state.prefs.intervalHours === 24  ? '24 h'    :
        state.prefs.intervalHours === 72  ? '3 días'  :
        state.prefs.intervalHours === 168 ? '7 días'  :
        state.prefs.intervalHours + ' h'
      }`
    : 'Recordatorio apagado'
  );
  setText('backupAdminSummary', `${state.title}. ${state.text}`);
  setText('backupWorkflowHint', meta.dirty
    ? 'Ahora mismo hay cambios pendientes. Conviene exportar un JSON antes de cerrar el día o mover datos.'
    : 'El estado actual está limpio. Aprovecha para guardar un respaldo de cierre de jornada o semana.'
  );

  const statusBox = document.getElementById('backupReminderStatusBox');
  if (statusBox) {
    statusBox.className = `note-box ${state.due ? 'danger' : meta.dirty ? 'info' : 'success'}`;
    statusBox.textContent = `${state.nextReminderText} Último cambio detectado: ${state.lastChangeText}.`;
  }

  const interval  = document.getElementById('backupReminderInterval');
  const toast     = document.getElementById('backupReminderToast');
  const dirtyOnly = document.getElementById('backupReminderDirtyOnly');
  if (interval)  interval.value   = String(state.prefs.intervalHours);
  if (toast)     toast.value      = state.prefs.toastOnStart ? '1' : '0';
  if (dirtyOnly) dirtyOnly.checked = !!state.prefs.dirtyOnly;

  const insight = document.getElementById('backupHistoryInsight');
  if (insight) {
    if (!history.length) {
      insight.className = 'note-box info';
      insight.textContent = 'Todavía no hay eventos registrados. El primer respaldo exportado creará una entrada aquí.';
    } else if (state.due) {
      insight.className = 'note-box danger';
      insight.textContent = 'El historial muestra actividad previa, pero ahora ya toca generar un respaldo nuevo. No dejes que el JSON quede desfasado respecto a la carga real.';
    } else if (meta.dirty) {
      insight.className = 'note-box info';
      insight.textContent = 'Hay historial y también cambios nuevos sin exportar. El sistema sigue relativamente protegido, pero aún no refleja la última carga.';
    } else {
      insight.className = 'note-box success';
      insight.textContent = 'El historial está al día y no hay cambios pendientes. Buen punto para cerrar jornada o semana.';
    }
  }

  const rows = document.getElementById('backupHistoryRows');
  if (rows) {
    if (!history.length) {
      rows.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin historial todavía.</td></tr>';
    } else {
      rows.innerHTML = history.map(item => {
        const tagClass = item.action === 'import' ? 'import' : 'export';
        const file = item.fileName || '—';
        const summaryText = item.summary
          ? `${item.summary.schoolBoard || 0} colegios · ${item.summary.followups || 0} seguimientos · ${item.summary.payments || 0} pagos`
          : 'Sin resumen';
        return `
          <tr>
            <td>${formatDateTime(item.at)}</td>
            <td><span class="history-tag ${tagClass}">${item.action === 'import' ? 'Importación' : 'Exportación'}</span></td>
            <td>${file}</td>
            <td>${summaryText}</td>
            <td>${item.note || '—'}</td>
          </tr>
        `;
      }).join('');
    }
  }
}

export function updateBackupUI() {
  updateBackupChip();
  updateBackupReminderUI();
  renderBackupAdmin();
}

// ─────────────────────────────────────────────
// TOAST RECORDATORIO AL INICIAR
// ─────────────────────────────────────────────

let backupReminderShown = false;

export function maybeShowBackupReminderToast() {
  if (backupReminderShown) return;
  const prefs = getBackupPrefs();
  const state = computeBackupReminderState();
  if (prefs.toastOnStart && state.due) {
    if (_showToast) _showToast(state.short + ' · ' + state.text, state.tone === 'danger' ? 'danger' : 'warning');
    backupReminderShown = true;
  }
}

// ─────────────────────────────────────────────
// FORMATEO DE FECHAS (helpers locales)
// ─────────────────────────────────────────────

export function formatDateTime(value) {
  if (!value) return 'pendiente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'pendiente';
  return date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatRelativeHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return 'ahora';
  if (hours < 24) return `en ${Math.ceil(hours)} h`;
  const days = Math.ceil(hours / 24);
  return `en ${days} día${days > 1 ? 's' : ''}`;
}

function formatElapsedHours(hours) {
  if (!Number.isFinite(hours) || hours < 1) return 'menos de 1 hora';
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = Math.floor(hours / 24);
  return `${days} día${days > 1 ? 's' : ''}`;
}
