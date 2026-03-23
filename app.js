let precioActual = parseInt(localStorage.getItem('polar3_precio')) || 15000;
const sectionMap = {
  inicio: 'sec-inicio',
  appcenter: 'sec-appcenter',
  quien: 'sec-quien',
  pack: 'sec-pack',
  compromisos: 'sec-compromisos',
  flujo: 'sec-flujo',
  calendario: 'sec-calendario',
  economico: 'sec-economico',
  captacion: 'sec-captacion',
  scripts: 'sec-scripts',
  familias: 'sec-familias',
  marketing: 'sec-marketing',
  cartera: 'sec-cartera',
  captura: 'sec-captura',
  iluminacion: 'sec-iluminacion',
  lightroom: 'sec-lightroom',
  photoshop: 'sec-photoshop',
  montaje: 'sec-montaje',
  imprenta: 'sec-imprenta',
  archivos: 'sec-archivos',
  checklist: 'sec-checklist',
  seguimiento: 'sec-seguimiento',
  roles: 'sec-roles',
  emergencias: 'sec-emergencias',
  diagnostico: 'sec-diagnostico',
  sla: 'sec-sla',
  qa: 'sec-qa',
  pagos: 'sec-pagos',
  cobranzas: 'sec-cobranzas',
  forms: 'sec-forms',
  kpis: 'sec-kpis',
  simulador: 'sec-simulador',
  respaldos: 'sec-respaldos',
    institucional: 'sec-institucional',
  modalidades: 'sec-modalidades',
  propuesta: 'sec-propuesta',
  marca: 'sec-marca',
  workspace: 'sec-workspace'
};
const sectionSpaces = {
  inicio: ['operativo', 'comercial'],
  appcenter: ['operativo', 'comercial'],
  quien: ['operativo', 'comercial'],
  pack: ['operativo', 'comercial'],
  compromisos: ['operativo', 'comercial'],
  flujo: ['operativo'],
  calendario: ['operativo'],
  economico: ['operativo'],
  captacion: ['operativo', 'comercial'],
  scripts: ['operativo', 'comercial'],
  familias: ['operativo', 'comercial'],
  marketing: ['operativo', 'comercial'],
  cartera: ['operativo', 'comercial'],
  captura: ['operativo'],
  iluminacion: ['operativo'],
  lightroom: ['operativo'],
  photoshop: ['operativo'],
  montaje: ['operativo'],
  imprenta: ['operativo'],
  archivos: ['operativo'],
  checklist: ['operativo'],
  seguimiento: ['operativo'],
  roles: ['operativo'],
  emergencias: ['operativo'],
  diagnostico: ['operativo'],
  sla: ['operativo'],
  qa: ['operativo'],
  pagos: ['operativo'],
  cobranzas: ['operativo'],
  forms: ['operativo'],
  kpis: ['operativo'],
  simulador: ['operativo', 'comercial'],
  respaldos: ['operativo'],
  institucional: ['comercial'],
  modalidades: ['comercial'],
  propuesta: ['comercial'],
  marca: ['comercial'],
  workspace: ['operativo', 'comercial']
};
const workspaceDefaults = {
  operativo: 'inicio',
  comercial: 'institucional'
};
let currentWorkspace = (['operativo', 'comercial'].includes(localStorage.getItem('polar3_workspace')) ? localStorage.getItem('polar3_workspace') : 'operativo');
let meetingMode = false;
const POLAR3_STORAGE_PREFIX = 'polar3_';
const BACKUP_META_KEY = 'polar3_backup_meta';
const BACKUP_HISTORY_KEY = 'polar3_backup_history';
const BACKUP_PREFS_KEY = 'polar3_backup_prefs';
const BACKUP_HISTORY_LIMIT = 40;
let toastTimer = null;
let backupReminderShown = false;
let appReadyForDirtyTracking = false;
let deferredInstallPrompt = null;
const PWA_CACHE_LABEL = 'Polar3 PWA';
const POLAR3_APP_VERSION = '2.7.10';
const DEPRECATED_SECTION_REDIRECTS = {
  quien: 'inicio',
  pack: 'modalidades',
  compromisos: 'institucional',
  flujo: 'calendario',
  economico: 'simulador',
  captura: 'checklist',
  iluminacion: 'checklist',
  lightroom: 'checklist',
  photoshop: 'checklist',
  montaje: 'checklist',
  imprenta: 'checklist',
  archivos: 'workspace',
  roles: 'checklist',
  onboarding: 'inicio',
  glosario: 'inicio'
};
const SEARCH_EXCLUDED_SECTIONS = new Set(Object.keys(DEPRECATED_SECTION_REDIRECTS));
let lastScrollY = 0;
let topbarCollapsedState = false;
let topbarScrollTicking = false;
let topbarScrollLockUntil = 0;
let calendarMobileOpenMonthKey = null;
const AI_PROVIDER_URLS = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
  claude: 'https://claude.ai/'
};
const AI_PROVIDER_INTENTS = {
  chatgpt: 'intent://chatgpt.com/#Intent;scheme=https;package=com.openai.chatgpt;S.browser_fallback_url=https%3A%2F%2Fchatgpt.com%2F;end',
  gemini: 'intent://gemini.google.com/app#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp;end',
  claude: 'intent://claude.ai/#Intent;scheme=https;package=com.anthropic.claude;S.browser_fallback_url=https%3A%2F%2Fclaude.ai%2F;end'
};
const AI_TEMPLATE_LABELS = {
  consulta: 'Consulta operativa',
  cobranzas: 'Cobranzas / pagos',
  jornada: 'Jornada de toma',
  comercial: 'Mensaje comercial',
  kpis: 'Lectura de KPIs'
};

function trackedSetItem(key, value, markDirty = true) {
  localStorage.setItem(key, value);
  if (appReadyForDirtyTracking && markDirty && key.startsWith(POLAR3_STORAGE_PREFIX) && key !== BACKUP_META_KEY) markBackupDirty(key);
}

function trackedRemoveItem(key, markDirty = true) {
  localStorage.removeItem(key);
  if (appReadyForDirtyTracking && markDirty && key.startsWith(POLAR3_STORAGE_PREFIX) && key !== BACKUP_META_KEY) markBackupDirty(key);
}

function safeReadJsonKey(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function safeReadBackupMeta() {
  return safeReadJsonKey(BACKUP_META_KEY, {});
}

function getBackupHistory() {
  const list = safeReadJsonKey(BACKUP_HISTORY_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getBackupPrefs() {
  const saved = safeReadJsonKey(BACKUP_PREFS_KEY, {});
  return {
    intervalHours: Number(saved.intervalHours ?? 72),
    dirtyOnly: saved.dirtyOnly !== false,
    toastOnStart: saved.toastOnStart !== false
  };
}

function writeBackupMeta(meta) {
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
}

function saveBackupHistory(history) {
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history.slice(0, BACKUP_HISTORY_LIMIT)));
}

function saveBackupPrefs(nextPrefs = {}) {
  const prefs = { ...getBackupPrefs(), ...nextPrefs };
  localStorage.setItem(BACKUP_PREFS_KEY, JSON.stringify(prefs));
  return prefs;
}

function formatDateTime(value) {
  if (!value) return 'pendiente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'pendiente';
  return date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function countTrackedKeys() {
  return Object.keys(localStorage).filter(key => key.startsWith(POLAR3_STORAGE_PREFIX) && ![BACKUP_META_KEY].includes(key)).length;
}

function getBackupSummary() {
  return {
    schoolBoard: (() => { try { return JSON.parse(localStorage.getItem('polar3_school_board') || '[]').length; } catch (e) { return 0; } })(),
    followups: (() => { try { return JSON.parse(localStorage.getItem('polar3_followup_board') || '[]').length; } catch (e) { return 0; } })(),
    payments: (() => { try { return JSON.parse(localStorage.getItem('polar3_payment_board') || '[]').length; } catch (e) { return 0; } })(),
    checklistItems: (() => { try { return JSON.parse(localStorage.getItem('polar3_checklist') || '[]').length; } catch (e) { return 0; } })(),
    trackedKeys: countTrackedKeys()
  };
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

function computeBackupReminderState() {
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
    short = `Recordatorio: exportar hoy`;
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
    enabled, due, tone, short, title, text, nextReminderText, lastBackupText: lastBackupAt ? formatDateTime(meta.lastBackupAt) : 'Sin exportar', dirty: hasDirty, prefs, lastChangeText: lastChangeAt ? formatDateTime(meta.lastChangeAt) : '—'
  };
}

function updateBackupChip() {
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

function updateBackupReminderUI() {
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

function renderBackupAdmin() {
  const state = computeBackupReminderState();
  const meta = safeReadBackupMeta();
  const history = getBackupHistory();
  const summary = getBackupSummary();
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  setText('backupAdminStatus', state.due ? 'Atención' : (meta.dirty ? 'Pendiente' : 'Al día'));
  setText('backupAdminLast', state.lastBackupText);
  setText('backupAdminHistoryCount', String(history.length));
  setText('backupAdminTrackedKeys', String(summary.trackedKeys));
  setText('backupAdminDirty', meta.dirty ? 'Sí' : 'No');
  setText('backupAdminBadge', state.enabled ? `Cada ${state.prefs.intervalHours === 24 ? '24 h' : state.prefs.intervalHours === 72 ? '3 días' : state.prefs.intervalHours === 168 ? '7 días' : state.prefs.intervalHours + ' h'}` : 'Recordatorio apagado');
  setText('backupAdminSummary', `${state.title}. ${state.text}`);
  setText('backupWorkflowHint', meta.dirty ? 'Ahora mismo hay cambios pendientes. Conviene exportar un JSON antes de cerrar el día o mover datos.' : 'El estado actual está limpio. Aprovecha para guardar un respaldo de cierre de jornada o semana.');
  const statusBox = document.getElementById('backupReminderStatusBox');
  if (statusBox) {
    statusBox.className = `note-box ${state.due ? 'danger' : meta.dirty ? 'info' : 'success'}`;
    statusBox.textContent = `${state.nextReminderText} Último cambio detectado: ${state.lastChangeText}.`;
  }

  const interval = document.getElementById('backupReminderInterval');
  const toast = document.getElementById('backupReminderToast');
  const dirtyOnly = document.getElementById('backupReminderDirtyOnly');
  if (interval) interval.value = String(state.prefs.intervalHours);
  if (toast) toast.value = state.prefs.toastOnStart ? '1' : '0';
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

function summarizeUpcomingAgenda() {
  const data = getCalendarPlannerData();
  const items = sortCalendarItems(Object.values(data).flatMap(month => Array.isArray(month?.items) ? month.items : []));
  const today = getTodayIsoDate();
  const todays = items.filter(item => normalizePaymentDate(item.date) === today);
  const next = items.find(item => normalizePaymentDate(item.date) && normalizePaymentDate(item.date) >= today) || null;
  return { today, todays, next };
}

function renderMobileOpsDashboard() {
  const nextTitle = document.getElementById('mobileNextActionTitle');
  const nextMeta = document.getElementById('mobileNextActionMeta');
  const payTitle = document.getElementById('mobilePendingPaymentsTitle');
  const payMeta = document.getElementById('mobilePendingPaymentsMeta');
  const followTitle = document.getElementById('mobileFollowupTitle');
  const followMeta = document.getElementById('mobileFollowupMeta');
  const backupTitle = document.getElementById('mobileBackupTitle');
  const backupMeta = document.getElementById('mobileBackupMeta');
  if (!nextTitle && !payTitle && !followTitle && !backupTitle) return;

  const agenda = summarizeUpcomingAgenda();
  if (nextTitle && nextMeta) {
    if (agenda.todays.length) {
      const first = agenda.todays[0];
      nextTitle.textContent = `Hoy · ${agenda.todays.length} movimiento${agenda.todays.length > 1 ? 's' : ''}`;
      nextMeta.textContent = `${first.time ? formatCalendarTime(first.time) + ' · ' : ''}${first.school || 'Sin colegio'} · ${getCalendarStatusLabel(first.status)}`;
    } else if (agenda.next) {
      nextTitle.textContent = agenda.next.school || 'Próxima agenda cargada';
      nextMeta.textContent = `${formatCalendarDate(agenda.next.date)}${agenda.next.time ? ' · ' + formatCalendarTime(agenda.next.time) : ''} · ${getCalendarStatusLabel(agenda.next.status)}`;
    } else {
      nextTitle.textContent = 'Sin agenda próxima cargada';
      nextMeta.textContent = 'Carga una fecha en Calendario anual para ver tu próxima acción.';
    }
  }

  const payments = getPaymentBoardData();
  const pendingPayments = payments.filter(item => ['pendiente', 'observado'].includes(item.status));
  const pendingAmount = pendingPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  if (payTitle && payMeta) {
    payTitle.textContent = `${pendingPayments.length} cobro${pendingPayments.length === 1 ? '' : 's'} en seguimiento`;
    payMeta.textContent = pendingPayments.length
      ? `${money(pendingAmount)} pendientes entre observados y no validados.`
      : 'Sin dinero pendiente por revisar.';
  }

  const followups = getFollowupData();
  const openCases = followups.filter(item => item.status !== 'resuelto');
  const openCount = openCases.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const retakeCount = openCases.filter(item => item.type === 'retoma').reduce((sum, item) => sum + Number(item.count || 0), 0);
  if (followTitle && followMeta) {
    followTitle.textContent = `${openCount} caso${openCount === 1 ? '' : 's'} abierto${openCount === 1 ? '' : 's'}`;
    followMeta.textContent = openCount
      ? `${retakeCount} en retoma · ${openCases.length} registro${openCases.length === 1 ? '' : 's'} operativos todavía activos.`
      : 'Sin ausentes ni retomas abiertas.';
  }

  const backup = computeBackupReminderState();
  if (backupTitle && backupMeta) {
    backupTitle.textContent = backup.dirty ? 'Respaldo pendiente' : 'Respaldo al día';
    backupMeta.textContent = `Último JSON: ${backup.lastBackupText}. ${backup.nextReminderText}`;
  }
}

function updateMobileTabbar(activeSection) {
  document.querySelectorAll('[data-mobile-tab]').forEach(btn => {
    const key = btn.dataset.mobileTab;
    const isActive = key !== 'menu' && key === activeSection;
    btn.classList.toggle('active', isActive);
  });
}

function updateBackupUI() {
  updateBackupChip();
  updateBackupReminderUI();
  renderBackupAdmin();
  renderMobileOpsDashboard();
}

function showToast(message, tone = 'info') {
  const toast = document.getElementById('appToast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${tone}`;
  toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

function maybeShowBackupReminderToast() {
  if (backupReminderShown) return;
  const prefs = getBackupPrefs();
  const state = computeBackupReminderState();
  if (prefs.toastOnStart && state.due) {
    backupReminderShown = true;
    showToast(`${state.title}. ${state.text}`, state.tone === 'danger' ? 'danger' : 'warning');
  }
}

function markBackupDirty(reason = 'update') {
  const prev = safeReadBackupMeta();
  const meta = {
    ...prev,
    dirty: true,
    lastChangeAt: new Date().toISOString(),
    lastChangeKey: reason || prev.lastChangeKey || 'update'
  };
  writeBackupMeta(meta);
  updateBackupUI();
}

function markBackupClean(mode = 'export') {
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
  updateBackupUI();
}

function addBackupHistoryEntry(action, options = {}) {
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

function collectBackupPayload() {
  const storage = {};
  Object.keys(localStorage).filter(key => key.startsWith(POLAR3_STORAGE_PREFIX)).forEach(key => {
    storage[key] = localStorage.getItem(key);
  });
  const meta = safeReadBackupMeta();
  return {
    app: 'Polar3',
    schema: 'polar3-backup-v1',
    version: '2.5.1',
    exportedAt: new Date().toISOString(),
    generatedFrom: location.href,
    storage,
    summary: {
      ...getBackupSummary(),
      dirty: !!meta.dirty
    }
  };
}

function exportBackupJson() {
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
    showToast('Respaldo JSON generado. Guarda el archivo dentro de la carpeta de Polar3.', 'success');
  } catch (err) {
    console.error(err);
    showToast('No pude generar el respaldo JSON.', 'danger');
  }
}

function triggerBackupImport() {
  const input = document.getElementById('backupFileInput');
  if (!input) return;
  input.value = '';
  input.click();
}

function applyBackupPayload(payload, fileName = '') {
  const storage = payload?.storage;
  if (!storage || typeof storage !== 'object') throw new Error('invalid_backup');
  if (!confirm('Vas a reemplazar los datos actuales de Polar3 por el respaldo importado. Conviene exportar un JSON antes de continuar. ¿Seguimos?')) return;
  Object.keys(localStorage).filter(key => key.startsWith(POLAR3_STORAGE_PREFIX)).forEach(key => localStorage.removeItem(key));
  Object.entries(storage).forEach(([key, value]) => {
    localStorage.setItem(key, String(value));
  });
  markBackupClean('import');
  addBackupHistoryEntry('import', { fileName, summary: getBackupSummary(), note: 'Importación manual JSON' });
  showToast('Respaldo importado. La app se va a recargar.', 'success');
  setTimeout(() => location.reload(), 350);
}

function handleBackupImportFile(file) {
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
      showToast('El archivo no parece ser un respaldo válido de Polar3.', 'danger');
    }
  };
  reader.onerror = () => showToast('No pude leer el archivo seleccionado.', 'danger');
  reader.readAsText(file);
}

function syncBackupPrefs() {
  const interval = Number(document.getElementById('backupReminderInterval')?.value || 0);
  const dirtyOnly = !!document.getElementById('backupReminderDirtyOnly')?.checked;
  const toastOnStart = (document.getElementById('backupReminderToast')?.value || '1') === '1';
  saveBackupPrefs({ intervalHours: interval, dirtyOnly, toastOnStart });
  updateBackupUI();
  showToast('Preferencias de recordatorio actualizadas.', 'success');
}

function clearBackupHistory() {
  if (!confirm('¿Limpiar el historial local de respaldos? Esto no borra los datos de trabajo, solo el registro de eventos.')) return;
  localStorage.removeItem(BACKUP_HISTORY_KEY);
  updateBackupUI();
  showToast('Historial local de respaldos limpiado.', 'success');
}

const paymentBoardSeed = [
  { id: 'ex1', school: 'Jardín Arco Iris', date: '2026-03-08', name: 'Sofía Pérez', course: 'Sala 5 A', amount: 15000, status: 'validado', receipt: 'MP-3021', note: 'Pack base' },
  { id: 'ex2', school: 'Instituto San Martín', date: '2026-03-11', name: 'Tomás Díaz', course: 'Sala 4 B', amount: 15000, status: 'observado', receipt: 'Comprobante ilegible', note: 'Pedir reenvío' },
  { id: 'ex3', school: 'Escuela Modelo Sur', date: '2026-02-26', name: 'Emma Roldán', course: 'Sala 5 A', amount: 17500, status: 'liquidado', receipt: 'Transferencia', note: 'Pack + extra digital' }
];

const schoolBoardSeed = [
  { id: 'sch1', name: 'Jardín Arco Iris', level: 'Jardín', stage: 'renovacion', contact: 'Cooperadora · Laura', renewal: 'Abril 2026', nextAction: 'Confirmar fecha de reunión', risk: 'amarillo', pack: 15000, notes: 'Buen vínculo. Piden propuesta simplificada.' },
  { id: 'sch2', name: 'Instituto San Martín', level: 'Primaria', stage: 'propuesta', contact: 'Secretaría', renewal: '—', nextAction: 'Enviar propuesta completa', risk: 'verde', pack: 15000, notes: 'Interés en modalidad completa.' },
  { id: 'sch3', name: 'Escuela Modelo Sur', level: 'Mixto', stage: 'activo', contact: 'Cooperadora', renewal: 'Agosto 2026', nextAction: 'Revisar conversión del último año', risk: 'verde', pack: 15000, notes: 'Histórico estable.' },
  { id: 'sch4', name: 'Colegio Nuevo Horizonte', level: 'Primaria', stage: 'contacto', contact: 'Directivo', renewal: '—', nextAction: 'Segundo seguimiento', risk: 'rojo', pack: 16000, notes: 'Respuesta lenta y decisión política abierta.' }
];

const followupSeed = [
  { id: 'fl1', school: 'Jardín Arco Iris', date: '2026-04-12', course: 'Sala 5 A', type: 'ausente', count: 2, status: 'abierto', nextAction: 'Consultar si habrá retoma', owner: 'Adrián', notes: 'Dos ausentes justificados.' },
  { id: 'fl2', school: 'Instituto San Martín', date: '2026-05-03', course: '2° B', type: 'retoma', count: 1, status: 'agendado', nextAction: 'Retoma viernes 8:00', owner: 'Adrián', notes: 'Ojos cerrados en individual.' },
  { id: 'fl3', school: 'Escuela Modelo Sur', date: '2026-05-15', course: 'Sala 4', type: 'pendiente', count: 1, status: 'abierto', nextAction: 'Falta grupal del turno tarde', owner: 'Asistente', notes: 'Definir si se resuelve misma semana.' }
];

let searchIndex = [];
let searchActiveIndex = -1;

function formatPrecio(n) {
  return n.toLocaleString('es-AR');
}

function actualizarPreciosEnApp() {
  const f = formatPrecio(precioActual);
  const c = formatPrecio(Math.round(precioActual * 0.2));
  document.querySelectorAll('.precio-val, .precio-val2').forEach(el => el.textContent = f);
  document.querySelectorAll('.canon-val').forEach(el => el.textContent = c);
  const display = document.getElementById('precio-display');
  if (display) display.textContent = f;
  const schoolPack = document.getElementById('schoolPack');
  if (schoolPack && !schoolPack.value) schoolPack.value = precioActual;
  document.querySelectorAll('.precio-cell').forEach(el => el.textContent = '$' + f);
  const totales = document.querySelectorAll('.precio-total-cell');
  const vols = [300, 400, 500];
  totales.forEach((el, i) => el.textContent = '$' + formatPrecio(precioActual * vols[i]));
  document.querySelectorAll('[data-global-pack-text]').forEach(el => el.textContent = '$' + formatPrecio(precioActual));
}

function money(n) {
  const num = Number.isFinite(Number(n)) ? Number(n) : 0;
  return '$' + formatPrecio(Math.round(num));
}

function editarPrecio() {
  const input = document.getElementById('precio-input');
  if (input) input.value = precioActual;
  const modal = document.getElementById('modal-precio');
  if (modal) modal.style.display = 'flex';
}

function guardarPrecio() {
  const input = document.getElementById('precio-input');
  if (!input) return;
  const v = parseInt(input.value, 10);
  if (v > 0) {
    precioActual = v;
    trackedSetItem('polar3_precio', v);
    actualizarPreciosEnApp();
  }
  cerrarModal();
}

function cerrarModal() {
  const modal = document.getElementById('modal-precio');
  if (modal) modal.style.display = 'none';
}

function sectionIdToKey(sectionId) {
  return Object.keys(sectionMap).find(key => sectionMap[key] === sectionId) || 'inicio';
}

function spacesForSection(key) {
  return sectionSpaces[key] || ['operativo'];
}

function sectionBelongsToWorkspace(key, workspace) {
  return spacesForSection(key).includes(workspace);
}

function normalizeWorkspaceLabel(workspace) {
  return workspace.charAt(0).toUpperCase() + workspace.slice(1);
}

function getActiveSectionKey() {
  return sectionIdToKey(document.querySelector('.section.active')?.id || '');
}

function updateWorkspaceMeta() {
  const workspaceChip = document.getElementById('workspaceChip');
  const moduleChip = document.getElementById('moduleCountChip');
  const count = Object.keys(sectionMap).filter(key => sectionBelongsToWorkspace(key, currentWorkspace)).length;
  if (workspaceChip) workspaceChip.textContent = `Espacio: ${normalizeWorkspaceLabel(currentWorkspace)}`;
  if (moduleChip) moduleChip.textContent = `${count} módulos en ${currentWorkspace}`;
}

function applyWorkspaceState() {
  document.body.dataset.workspace = currentWorkspace;
  document.querySelectorAll('[data-space]').forEach(node => {
    const spaces = (node.dataset.space || '').split(/\s+/).filter(Boolean);
    const visible = !spaces.length || spaces.includes(currentWorkspace);
    if (visible) node.removeAttribute('hidden');
    else node.setAttribute('hidden', 'hidden');
  });
  document.querySelectorAll('.workspace-btn[data-workspace]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.workspace === currentWorkspace);
  });
  updateWorkspaceMeta();
}

function ensureWorkspaceForSection(id) {
  const spaces = spacesForSection(id);
  if (!spaces.includes(currentWorkspace)) {
    currentWorkspace = spaces[0] || 'operativo';
    trackedSetItem('polar3_workspace', currentWorkspace);
    applyWorkspaceState();
  }
}


function resolveSectionTarget(id) {
  return DEPRECATED_SECTION_REDIRECTS[id] || id;
}

function pruneDeprecatedUi() {
  const sectionIdsToRemove = [
    'sec-quien','sec-pack','sec-compromisos','sec-flujo','sec-economico',
    'sec-captura','sec-iluminacion','sec-lightroom','sec-photoshop','sec-montaje','sec-imprenta','sec-archivos','sec-roles'
  ];
  sectionIdsToRemove.forEach(id => document.getElementById(id)?.remove());

  ['#grp-presentacion', '#grp-tecnico'].forEach(sel => {
    document.querySelectorAll(sel).forEach(node => node.remove());
  });

  ['flujo', 'economico', 'roles'].forEach(key => {
    document.querySelectorAll(`[data-section="${key}"]`).forEach(node => {
      const wrapper = node.closest('li, .quick-card, .nav-group') || node;
      wrapper.remove();
    });
  });

  document.querySelectorAll('.quick-card').forEach(card => {
    const action = card.getAttribute('onclick') || '';
    if (/showSection\('(quien|flujo)'\)/.test(action)) card.remove();
  });

  document.querySelectorAll('button[onclick], a[onclick]').forEach(node => {
    const action = node.getAttribute('onclick') || '';
    if (action.includes("showSection('flujo')")) {
      node.setAttribute('onclick', "showSection('calendario')");
      if (node.textContent?.trim() === 'Ver flujo completo') node.textContent = 'Ver calendario';
    }
    if (action.includes("showSection('pack')")) {
      node.setAttribute('onclick', "showSection('modalidades')");
      if (node.textContent?.trim() === 'Abrir pack y servicios') node.textContent = 'Abrir modalidades';
    }
    if (action.includes("showSection('compromisos')")) {
      node.setAttribute('onclick', "showSection('institucional')");
      if (node.textContent?.trim() === 'Ver compromisos') node.textContent = 'Ver propuesta base';
    }
    if (action.includes("showSection('archivos')")) {
      node.setAttribute('onclick', "showSection('workspace')");
      if (node.textContent?.trim() === 'Ver estructura de archivos') node.textContent = 'Ver estructura Workspace';
    }
  });
}

function setTopbarCollapsed(collapsed, { force = false } = {}) {
  const next = !!collapsed;
  if (!force && topbarCollapsedState === next) return;
  topbarCollapsedState = next;
  document.body.classList.toggle('topbar-collapsed', next);
  topbarScrollLockUntil = Date.now() + 260;
}

function evaluateTopbarAutoCollapse(currentY) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const sidebarOpen = document.getElementById('sidebar')?.classList.contains('open');
  const hasFocusedField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');

  if (isMobile || sidebarOpen || hasFocusedField) {
    setTopbarCollapsed(false, { force: false });
    lastScrollY = currentY;
    return;
  }

  if (Date.now() < topbarScrollLockUntil) {
    lastScrollY = currentY;
    return;
  }

  const delta = currentY - lastScrollY;

  if (currentY <= 72) {
    setTopbarCollapsed(false, { force: true });
  } else if (!topbarCollapsedState && currentY > 168 && delta > 16) {
    setTopbarCollapsed(true);
  } else if (topbarCollapsedState && delta < -18) {
    setTopbarCollapsed(false, { force: true });
  }

  lastScrollY = currentY;
}

function handleTopbarAutoCollapse() {
  const currentY = window.scrollY || window.pageYOffset || 0;
  if (topbarScrollTicking) return;
  topbarScrollTicking = true;
  requestAnimationFrame(() => {
    topbarScrollTicking = false;
    evaluateTopbarAutoCollapse(currentY);
  });
}

function switchWorkspace(workspace, preferredSection = null) {
  currentWorkspace = workspace;
  trackedSetItem('polar3_workspace', currentWorkspace);
  applyWorkspaceState();
  const currentKey = getActiveSectionKey();
  const target = preferredSection && sectionBelongsToWorkspace(preferredSection, workspace)
    ? preferredSection
    : (sectionBelongsToWorkspace(currentKey, workspace) ? currentKey : workspaceDefaults[workspace]);
  showSection(target);
}

function getSectionMeta(key) {
  const section = document.getElementById(sectionMap[key]);
  if (!section) return { title: 'Inicio', kicker: 'Panel principal' };
  const title = section.querySelector('.section-header h1')?.textContent?.trim()
    || (key === 'inicio' ? 'Inicio' : key);
  const kicker = section.querySelector('.breadcrumb')?.textContent?.trim()
    || 'Panel principal';
  return { title, kicker };
}

function openGroupForSection(id) {
  const node = document.querySelector(`.nav-group [data-section="${id}"]`);
  const group = node?.closest('.nav-group');
  if (group) group.classList.add('open');
}

function updateTopbar(id) {
  const meta = getSectionMeta(id);
  const kicker = document.getElementById('currentSectionKicker');
  const title = document.getElementById('currentSectionTitle');
  const chip = document.getElementById('hashChip');
  if (kicker) kicker.textContent = meta.kicker;
  if (title) title.textContent = meta.title;
  if (chip) chip.textContent = `Ruta: #${id}`;
  document.title = `Polar[3] · ${normalizeWorkspaceLabel(currentWorkspace)} — ${meta.title}`;
}

function showSection(id, pushHash = true) {
  id = resolveSectionTarget(id);
  if (!sectionMap[id]) id = 'inicio';
  ensureWorkspaceForSection(id);
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionMap[id]);
  if (target) target.classList.add('active');
  document.querySelectorAll('[data-section]').forEach(a => a.classList.remove('active'));
  document.querySelectorAll(`[data-section="${id}"]`).forEach(a => a.classList.add('active'));
  openGroupForSection(id);
  updateTopbar(id);
  document.body.dataset.section = id;
  setTopbarCollapsed(false, { force: true });
  updateMobileTabbar(id);
  if (pushHash && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  closeSidebar();
  return false;
}

function toggleGroup(id) {
  const g = document.getElementById(id);
  if (g) g.classList.toggle('open');
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('open');
  setTopbarCollapsed(false, { force: true });
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('open');
}

function toggleAcc(header) {
  if (!header) return;
  const item = header.closest('.faq-item, .accordion-item, .accordion');
  const body = (
    header.nextElementSibling?.classList?.contains('acc-body')
      ? header.nextElementSibling
      : item?.querySelector('.acc-body, .faq-body')
  ) || null;
  const willOpen = !header.classList.contains('open');
  header.classList.toggle('open', willOpen);
  body?.classList.toggle('open', willOpen);
  item?.classList.toggle('open', willOpen);
}

function loadChecklist() {
  const saved = JSON.parse(localStorage.getItem('polar3_checklist') || '[]');
  document.querySelectorAll('.check-item[data-id]').forEach(item => {
    if (saved.includes(item.dataset.id)) item.classList.add('checked');
  });
  updateCheckProgress();
}

function toggleCheck(item) {
  item.classList.toggle('checked');
  const saved = [...document.querySelectorAll('.check-item[data-id].checked')].map(i => i.dataset.id);
  trackedSetItem('polar3_checklist', JSON.stringify(saved));
  updateCheckProgress();
}

function updateCheckProgress() {
  const items = document.querySelectorAll('.check-item[data-id]');
  const checked = document.querySelectorAll('.check-item[data-id].checked');
  const total = items.length;
  const done = checked.length;
  const progress = document.getElementById('check-progress');
  const bar = document.getElementById('check-bar');
  if (progress) progress.textContent = `${done} / ${total}`;
  if (bar) bar.style.width = total > 0 ? `${(done / total) * 100}%` : '0%';
}

function resetChecklist() {
  if (!confirm('¿Reiniciar el checklist? Se borrarán todos los tildados.')) return;
  trackedRemoveItem('polar3_checklist');
  document.querySelectorAll('.check-item[data-id]').forEach(i => i.classList.remove('checked'));
  updateCheckProgress();
}

function copyScript(id, btn) {
  const text = document.getElementById(id)?.textContent?.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = '✓ Copiado';
    btn.style.background = 'var(--success)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--success)';
    setTimeout(() => {
      btn.textContent = original || 'Copiar';
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 1800);
  });
}

function filterGlosario() {
  const val = document.getElementById('glosario-input')?.value.toLowerCase() || '';
  document.querySelectorAll('#glosario-table tbody tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(val) ? '' : 'none';
  });
}

function buildSearchIndex() {
  searchIndex = Object.entries(sectionMap).filter(([key]) => !SEARCH_EXCLUDED_SECTIONS.has(key)).map(([key, id]) => {
    const section = document.getElementById(id);
    const title = section.querySelector('.section-header h1')?.textContent?.trim() || key;
    const kicker = section.querySelector('.breadcrumb')?.textContent?.trim() || 'Panel principal';
    const bodyText = (section.textContent || '').replace(/\s+/g, ' ').trim();
    return {
      key,
      id,
      title,
      kicker,
      text: bodyText.toLowerCase(),
      preview: bodyText.slice(0, 180)
    };
  });
}

function renderSearchResults(query) {
  const container = document.getElementById('searchResults');
  if (!container) return;
  const q = query.trim().toLowerCase();
  if (!q) {
    container.hidden = true;
    container.innerHTML = '';
    searchActiveIndex = -1;
    return;
  }
  const results = searchIndex
    .map(entry => {
      const titleHit = entry.title.toLowerCase().includes(q) ? 5 : 0;
      const kickerHit = entry.kicker.toLowerCase().includes(q) ? 2 : 0;
      const bodyHit = entry.text.includes(q) ? 1 : 0;
      return { ...entry, score: titleHit + kickerHit + bodyHit };
    })
    .filter(entry => entry.score > 0 && sectionBelongsToWorkspace(entry.key, currentWorkspace))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'es'))
    .slice(0, 8);

  if (!results.length) {
    container.hidden = false;
    container.innerHTML = '<div class="search-empty">No encontré coincidencias. Prueba con “retomas”, “canon”, “Forms”, “QA” o “cooperadora”.</div>';
    searchActiveIndex = -1;
    return;
  }

  container.hidden = false;
  container.innerHTML = results.map((entry, idx) => `
    <button class="search-item ${idx === 0 ? 'active' : ''}" type="button" data-search-index="${idx}" data-target="${entry.key}">
      <small>${entry.kicker}</small>
      <strong>${entry.title}</strong>
      <span>${entry.preview}…</span>
    </button>
  `).join('');
  searchActiveIndex = 0;

  container.querySelectorAll('.search-item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateFromSearch(btn.dataset.target);
    });
  });
}

function syncSearchActiveItem() {
  const items = [...document.querySelectorAll('.search-item')];
  items.forEach((item, idx) => item.classList.toggle('active', idx === searchActiveIndex));
}

function navigateFromSearch(target) {
  showSection(target);
  const input = document.getElementById('globalSearch');
  const container = document.getElementById('searchResults');
  if (input) input.value = '';
  if (container) {
    container.hidden = true;
    container.innerHTML = '';
  }
}

function printCurrentSection() {
  window.print();
}

function toggleFocusMode() {
  document.body.classList.remove('focus-mode');
  try { localStorage.removeItem('polar3_focus_mode'); } catch (e) {}
}

function getSchoolBoardData() {
  return JSON.parse(localStorage.getItem('polar3_school_board') || '[]');
}

function saveSchoolBoardData(data) {
  trackedSetItem('polar3_school_board', JSON.stringify(data));
}


function formatPercent(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const decimals = safe % 1 === 0 ? 0 : 1;
  return safe.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: 1 }) + '%';
}

const KPI_TICKET_MODE_KEY = 'polar3_kpi_ticket_mode';
const KPI_SCOPE_KEY = 'polar3_kpi_scope';
const KPI_PERIOD_MODE_KEY = 'polar3_kpi_period_mode';
const KPI_PERIOD_VALUE_KEY = 'polar3_kpi_period_value';

const CALENDAR_STORAGE_KEY = 'polar3_work_calendar_v2';
const CALENDAR_LEGACY_STORAGE_KEY = 'polar3_work_calendar_v1';
const CALENDAR_PRINT_REFERENCE_KEY = 'polar3_calendar_print_reference';
const CALENDAR_PRINT_SCHOOL_FILTER_KEY = 'polar3_calendar_print_school_filter';
const CALENDAR_DAY_SHEET_STORAGE_KEY = 'polar3_calendar_day_sheet_v1';
const CALENDAR_DAY_CHECKLIST_STORAGE_KEY = 'polar3_calendar_day_checklist_v1';
const CALENDAR_MONTH_KEYS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const CALENDAR_STATUS_LABELS = {
  tentativo: 'Tentativo',
  confirmado: 'Confirmado',
  jornada: 'Jornada',
  reunion: 'Reunión',
  edicion: 'Edición',
  entrega: 'Entrega',
  retoma: 'Retoma',
  cobranza: 'Cobranza',
  administrativo: 'Administrativo'
};
const CALENDAR_STATUS_OPTIONS = Object.keys(CALENDAR_STATUS_LABELS);
const CALENDAR_MONTH_LABELS = { enero: 'Enero', febrero: 'Febrero', marzo: 'Marzo', abril: 'Abril', mayo: 'Mayo', junio: 'Junio', julio: 'Julio', agosto: 'Agosto', septiembre: 'Septiembre', octubre: 'Octubre', noviembre: 'Noviembre', diciembre: 'Diciembre' };
const CALENDAR_BASE_TEMPLATE = {
  enero: 'Revisar equipo, actualizar precios, ordenar materiales comerciales y definir agenda tentativa.',
  febrero: 'Contactar colegios, cerrar fechas, preparar formularios, contratos y materiales.',
  marzo: 'Confirmar primeras jornadas, grupos y circuito de cobro. Preparar plan B por lluvia.',
  abril: 'Sostener tomas masivas, controlar edición y entregas parciales.',
  mayo: 'Continuar jornadas, revisar pendientes y mantener ritmo de producción.',
  junio: 'Cerrar cuellos de botella y ordenar próximas entregas.',
  julio: 'Avanzar edición acumulada, retomas y orden administrativo.',
  agosto: 'Programar retomas, actos y campañas de segunda mitad del año.',
  septiembre: 'Seguir retomas, campañas familiares y agenda de cierre.',
  octubre: 'Últimas tomas, egresados y definición de plazos finales.',
  noviembre: 'Edición masiva, producción, entregas y liquidaciones.',
  diciembre: 'Cierre de cobranzas, rendiciones, KPIs y renovaciones.'
};

function createEmptyCalendarMonth() {
  return { notes: '', items: [] };
}

function createEmptyCalendarDaySheet() {
  return {
    schedule: '',
    courses: '',
    equipment: '',
    contacts: '',
    observations: '',
    pending: '',
    retakes: ''
  };
}

function createEmptyCalendarDayChecklist() {
  return {
    camera: false,
    batteries: false,
    cards: false,
    background: false,
    schedule: false,
    contacts: false,
    route: false,
    space: false,
    forms: false,
    payments: false,
    retakes: false,
    closing: false
  };
}

function getCalendarDayChecklistLabels() {
  return {
    camera: 'Cámara principal, lente y flash revisados',
    batteries: 'Baterías cargadas y cargadores listos',
    cards: 'Tarjetas vacías / respaldo preparado',
    background: 'Fondo, soportes y extensiones cargados',
    schedule: 'Horario, cursos y secuencia confirmados',
    contacts: 'Referentes y contactos a mano',
    route: 'Ruta, llegada y acceso revisados',
    space: 'Espacio / set y plan B definidos',
    forms: 'Formularios, autorizaciones y pendientes revisados',
    payments: 'Sistema de cobro / QR / sobres listos',
    retakes: 'Ausentes, retomas y casos especiales anotados',
    closing: 'Plan de cierre, backup y próximo paso definido'
  };
}

function normalizeCalendarDayChecklist(raw = {}) {
  const base = createEmptyCalendarDayChecklist();
  Object.keys(base).forEach(key => {
    base[key] = Boolean(raw?.[key]);
  });
  return base;
}

function getCalendarDayChecklistStore() {
  try {
    const raw = localStorage.getItem(CALENDAR_DAY_CHECKLIST_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const normalized = {};
    Object.entries(parsed).forEach(([key, value]) => {
      normalized[key] = normalizeCalendarDayChecklist(value);
    });
    return normalized;
  } catch (e) {
    return {};
  }
}

function saveCalendarDayChecklistStore(store) {
  const safe = {};
  Object.entries(store || {}).forEach(([key, value]) => {
    safe[key] = normalizeCalendarDayChecklist(value);
  });
  trackedSetItem(CALENDAR_DAY_CHECKLIST_STORAGE_KEY, JSON.stringify(safe));
}

function getCalendarDayChecklistValue(dateValue, schoolValue) {
  const context = getCalendarDaySheetContext(dateValue, schoolValue);
  const store = getCalendarDayChecklistStore();
  return normalizeCalendarDayChecklist(store[context.key]);
}

function isCalendarDayChecklistEmpty(checklist) {
  return Object.values(normalizeCalendarDayChecklist(checklist)).every(value => !value);
}

function getCalendarDayChecklistProgress(checklist) {
  const values = Object.values(normalizeCalendarDayChecklist(checklist));
  const done = values.filter(Boolean).length;
  return { done, total: values.length };
}

function renderCalendarDayChecklist(reference, selectedSchool) {
  const context = getCalendarDaySheetContext(reference, selectedSchool);
  const checklist = getCalendarDayChecklistValue(context.date, context.school);
  const title = document.getElementById('calendarDayChecklistTitle');
  const meta = document.getElementById('calendarDayChecklistMeta');
  const count = document.getElementById('calendarDayChecklistCount');
  const progress = getCalendarDayChecklistProgress(checklist);

  if (title) {
    title.textContent = context.school
      ? `Checklist de salida · ${context.school}`
      : 'Checklist de salida · Todos los colegios';
  }

  if (count) {
    count.textContent = `${progress.done} / ${progress.total}`;
  }

  if (meta) {
    const scopeLabel = context.school ? `Colegio: ${context.school}` : 'Vista general del día';
    meta.textContent = `Fecha: ${formatCalendarDate(context.date)} · ${scopeLabel} · ${progress.done} de ${progress.total} controles marcados.`;
  }

  document.querySelectorAll('[data-day-check-item]').forEach(input => {
    const key = input.dataset.dayCheckItem;
    input.checked = Boolean(checklist[key]);
  });
}

function setCalendarDayChecklistItem(field, checked) {
  const template = createEmptyCalendarDayChecklist();
  if (!Object.prototype.hasOwnProperty.call(template, field)) return;

  const context = getCalendarDaySheetContext();
  const store = getCalendarDayChecklistStore();
  const current = normalizeCalendarDayChecklist(store[context.key]);
  current[field] = Boolean(checked);

  if (isCalendarDayChecklistEmpty(current)) delete store[context.key];
  else store[context.key] = current;

  saveCalendarDayChecklistStore(store);
  renderCalendarDayChecklist(context.date, context.school);
  updateCalendarSaveStatus('Checklist de salida guardado · ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'success');
}

function normalizeCalendarDaySheet(raw = {}) {
  const base = createEmptyCalendarDaySheet();
  Object.keys(base).forEach(key => {
    base[key] = String(raw?.[key] || '');
  });
  return base;
}

function getCalendarDaySheetKey(dateValue, schoolValue) {
  const safeDate = normalizePaymentDate(dateValue) || getTodayIsoDate();
  const schoolKey = normalizeSchoolKey(schoolValue) || '__general__';
  return `${safeDate}__${schoolKey}`;
}

function getCalendarDaySheetStore() {
  try {
    const raw = localStorage.getItem(CALENDAR_DAY_SHEET_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const normalized = {};
    Object.entries(parsed).forEach(([key, value]) => {
      normalized[key] = normalizeCalendarDaySheet(value);
    });
    return normalized;
  } catch (e) {
    return {};
  }
}

function saveCalendarDaySheetStore(store) {
  const safe = {};
  Object.entries(store || {}).forEach(([key, value]) => {
    safe[key] = normalizeCalendarDaySheet(value);
  });
  trackedSetItem(CALENDAR_DAY_SHEET_STORAGE_KEY, JSON.stringify(safe));
}

function getCalendarDaySheetContext(dateValue = getCalendarPrintReference(), schoolValue = getCalendarSchoolFilter()) {
  const date = normalizePaymentDate(dateValue) || getTodayIsoDate();
  const school = String(schoolValue || '').trim();
  return {
    date,
    school,
    key: getCalendarDaySheetKey(date, school),
    schoolLabel: school || 'Todos los colegios'
  };
}

function getCalendarDaySheetValue(dateValue, schoolValue) {
  const context = getCalendarDaySheetContext(dateValue, schoolValue);
  const store = getCalendarDaySheetStore();
  return normalizeCalendarDaySheet(store[context.key]);
}

function isCalendarDaySheetEmpty(sheet) {
  return Object.values(normalizeCalendarDaySheet(sheet)).every(value => !String(value || '').trim());
}

function getCalendarDaySheetFieldLabels() {
  return {
    schedule: 'Horario y secuencia',
    courses: 'Cursos / salas',
    equipment: 'Equipo y materiales',
    contacts: 'Referentes y contactos',
    observations: 'Observaciones de jornada',
    pending: 'Pendientes del día',
    retakes: 'Retomas del día'
  };
}

function syncCalendarDaySheetCopies(sheet) {
  const labels = getCalendarDaySheetFieldLabels();
  Object.entries(labels).forEach(([field, label]) => {
    const copy = document.querySelector(`[data-day-sheet-copy="${field}"]`);
    if (!copy) return;
    const value = String(sheet?.[field] || '').trim();
    copy.innerHTML = `<strong>${escapeHtml(label)}:</strong> ${value ? escapeHtml(value).replace(/\n/g, '<br/>') : '<span class="muted-inline">Sin completar.</span>'}`;
    copy.classList.toggle('is-empty', !value);
  });
}

function renderCalendarDaySheet(reference, selectedSchool, dayItems) {
  const context = getCalendarDaySheetContext(reference, selectedSchool);
  const sheet = getCalendarDaySheetValue(context.date, context.school);
  const title = document.getElementById('calendarDaySheetTitle');
  const meta = document.getElementById('calendarDaySheetMeta');

  if (title) {
    title.textContent = context.school
      ? `Hoja premium · ${context.school}`
      : 'Hoja premium · Todos los colegios';
  }

  if (meta) {
    const scopeLabel = context.school ? `Colegio: ${context.school}` : 'Vista general del día';
    const base = `Fecha: ${formatCalendarDate(context.date)} · ${scopeLabel}`;
    const extra = dayItems.length
      ? ` · ${buildCalendarSummaryText(dayItems)}`
      : ' · Sin movimientos cargados todavía en la agenda.';
    meta.textContent = `${base}${extra}`;
  }

  document.querySelectorAll('[data-day-sheet-field]').forEach(field => {
    const key = field.dataset.daySheetField;
    field.value = sheet[key] || '';
  });

  syncCalendarDaySheetCopies(sheet);
  renderCalendarDayTimeline(context.date, context.school, dayItems);
  renderCalendarDayChecklist(context.date, context.school);
}

function setCalendarDaySheetField(field, value) {
  const template = createEmptyCalendarDaySheet();
  if (!Object.prototype.hasOwnProperty.call(template, field)) return;

  const context = getCalendarDaySheetContext();
  const store = getCalendarDaySheetStore();
  const current = normalizeCalendarDaySheet(store[context.key]);
  current[field] = String(value || '');

  if (isCalendarDaySheetEmpty(current)) delete store[context.key];
  else store[context.key] = current;

  saveCalendarDaySheetStore(store);
  syncCalendarDaySheetCopies(current);
  updateCalendarSaveStatus('Hoja diaria premium guardada · ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'success');
}

function normalizeCalendarStatus(value) {
  const safe = String(value || '').trim().toLowerCase();
  return CALENDAR_STATUS_OPTIONS.includes(safe) ? safe : 'tentativo';
}

function normalizeCalendarTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) return '';
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return '';
  return `${match[1]}:${match[2]}`;
}

function formatCalendarTime(value) {
  const safe = normalizeCalendarTime(value);
  return safe || 'Sin hora';
}

function buildCalendarDateTimeLabel(item) {
  const parts = [];
  if (item?.date) parts.push(formatCalendarDate(item.date));
  if (item?.time) parts.push(formatCalendarTime(item.time));
  return parts.join(' · ') || 'Sin fecha';
}

function buildCalendarItemId() {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch (e) {}
  return 'cal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function normalizeCalendarItem(item = {}) {
  return {
    id: String(item.id || buildCalendarItemId()),
    school: String(item.school || '').trim(),
    date: normalizePaymentDate(item.date || ''),
    time: normalizeCalendarTime(item.time || ''),
    status: normalizeCalendarStatus(item.status),
    detail: String(item.detail || '').trim()
  };
}

function sortCalendarItems(items = []) {
  return [...items].sort((a, b) => {
    const da = a.date || '9999-99-99';
    const db = b.date || '9999-99-99';
    if (da !== db) return da.localeCompare(db);
    const ta = a.time || '99:99';
    const tb = b.time || '99:99';
    if (ta !== tb) return ta.localeCompare(tb);
    return String(a.school || '').localeCompare(String(b.school || ''), 'es');
  });
}

function normalizeCalendarData(raw) {
  const data = {};
  CALENDAR_MONTH_KEYS.forEach(key => {
    const source = raw?.[key];
    if (typeof source === 'string') {
      data[key] = { notes: source, items: [] };
      return;
    }
    if (source && typeof source === 'object') {
      data[key] = {
        notes: String(source.notes || ''),
        items: sortCalendarItems(Array.isArray(source.items) ? source.items.map(normalizeCalendarItem) : [])
      };
      return;
    }
    data[key] = createEmptyCalendarMonth();
  });
  return data;
}

function getCalendarPlannerData() {
  try {
    const currentRaw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (currentRaw) return normalizeCalendarData(JSON.parse(currentRaw));
  } catch (e) {}

  try {
    const legacyRaw = localStorage.getItem(CALENDAR_LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const migrated = normalizeCalendarData(JSON.parse(legacyRaw));
      saveCalendarPlannerData(migrated);
      return migrated;
    }
  } catch (e) {}

  return normalizeCalendarData({});
}

function saveCalendarPlannerData(data) {
  trackedSetItem(CALENDAR_STORAGE_KEY, JSON.stringify(normalizeCalendarData(data)));
}

function updateCalendarSaveStatus(message, tone) {
  const el = document.getElementById('calendarSaveStatus');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('export', 'import');
  if (tone === 'success') el.classList.add('export');
  if (tone === 'info') el.classList.add('import');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCalendarDate(value) {
  const safe = normalizePaymentDate(value);
  if (!safe) return 'Sin fecha';
  const [year, month, day] = safe.split('-').map(Number);
  const dt = new Date(year, month - 1, day);
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getCalendarStatusLabel(value) {
  return CALENDAR_STATUS_LABELS[normalizeCalendarStatus(value)] || 'Tentativo';
}

function buildCalendarStatusOptions(selectedValue) {
  const safe = normalizeCalendarStatus(selectedValue);
  return CALENDAR_STATUS_OPTIONS.map(key => `<option value="${key}" ${key === safe ? 'selected' : ''}>${CALENDAR_STATUS_LABELS[key]}</option>`).join('');
}

function renderCalendarMonthList(month, monthData) {
  const container = document.querySelector(`[data-calendar-list="${month}"]`);
  const countNode = document.getElementById(`calendar-count-${month}`);
  if (!container) return;

  const items = sortCalendarItems(Array.isArray(monthData?.items) ? monthData.items : []);
  if (countNode) countNode.textContent = `${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}`;

  if (!items.length) {
    container.innerHTML = '<div class="calendar-item-empty">Sin filas operativas cargadas para este mes.</div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="calendar-item-row calendar-status-${normalizeCalendarStatus(item.status)}">
      <div class="calendar-item-main">
        <input class="calendar-inline-input" type="text" value="${escapeHtml(item.school)}" placeholder="Colegio" onchange="setCalendarPlannerItemField('${month}', '${item.id}', 'school', this.value)" />
        <input class="calendar-inline-input calendar-inline-date" type="date" value="${escapeHtml(item.date)}" onchange="setCalendarPlannerItemField('${month}', '${item.id}', 'date', this.value)" />
        <input class="calendar-inline-input calendar-inline-time" type="time" value="${escapeHtml(item.time || '')}" onchange="setCalendarPlannerItemField('${month}', '${item.id}', 'time', this.value)" />
        <select class="calendar-inline-input" onchange="setCalendarPlannerItemField('${month}', '${item.id}', 'status', this.value)">${buildCalendarStatusOptions(item.status)}</select>
        <input class="calendar-inline-input calendar-inline-detail" type="text" value="${escapeHtml(item.detail)}" placeholder="Detalle operativo (opcional)" onchange="setCalendarPlannerItemField('${month}', '${item.id}', 'detail', this.value)" />
      </div>
      <button class="btn btn-danger btn-sm calendar-delete-btn" onclick="removeCalendarPlannerItem('${month}', '${item.id}')" type="button">Eliminar</button>
    </div>
  `).join('');
}

function syncCalendarPrintCopies(data) {
  document.querySelectorAll('[data-calendar-print]').forEach(node => {
    const key = node.dataset.calendarPrint;
    const monthData = data?.[key] || createEmptyCalendarMonth();
    const items = sortCalendarItems(Array.isArray(monthData.items) ? monthData.items : []);
    const notes = String(monthData.notes || '').trim();

    let text = '';
    if (items.length) {
      text += 'Agenda operativa:\n';
      text += items.map(item => {
        const parts = [formatCalendarDate(item.date), item.time ? formatCalendarTime(item.time) : '', item.school || 'Sin colegio', getCalendarStatusLabel(item.status)];
        const main = parts.filter(Boolean).join(' · ');
        return `• ${main}${item.detail ? ' — ' + item.detail : ''}`;
      }).join('\n');
    }
    if (notes) {
      text += (text ? '\n\n' : '') + 'Notas libres:\n' + notes;
    }

    node.textContent = text || 'Sin información cargada.';
    node.classList.toggle('is-empty', !text);
  });
}


function getCalendarShortMonthLabel(month) {
  const label = CALENDAR_MONTH_LABELS[month] || month || '';
  return label ? label.slice(0, 3) : '';
}

function getCalendarMonthCards() {
  return [...document.querySelectorAll('#sec-calendario .calendar-month-card')].map(card => {
    const dateField = card.querySelector('[id^="cal-"][id$="-date"]');
    const match = dateField?.id?.match(/^cal\-([a-zñ]+)\-date$/i);
    const month = match?.[1] || card.dataset.calendarMonth || '';
    if (month) card.dataset.calendarMonth = month;
    return { card, month };
  }).filter(entry => entry.month);
}

function ensureCalendarMobileMonthStructure() {
  getCalendarMonthCards().forEach(({ card, month }) => {
    const head = card.querySelector('.calendar-month-head');
    if (!head) return;

    let body = card.querySelector('.calendar-month-body');
    if (!body) {
      body = document.createElement('div');
      body.className = 'calendar-month-body';
      [...card.children].forEach(child => {
        if (child !== head) body.appendChild(child);
      });
      card.appendChild(body);
    }

    if (!head.querySelector('.calendar-mobile-toggle')) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'btn btn-outline btn-sm calendar-mobile-toggle';
      toggle.textContent = 'Abrir';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.onclick = () => setCalendarMobileOpenMonth(month);
      head.appendChild(toggle);
    }
  });
}

function isCalendarMobileViewport() {
  return window.matchMedia ? window.matchMedia('(max-width: 900px)').matches : window.innerWidth <= 900;
}

function findCalendarNextActiveMonth(data) {
  const currentIndex = new Date().getMonth();
  const ordered = [...CALENDAR_MONTH_KEYS.slice(currentIndex), ...CALENDAR_MONTH_KEYS.slice(0, currentIndex)];
  return ordered.find(month => (data?.[month]?.items || []).length) || CALENDAR_MONTH_KEYS[currentIndex] || CALENDAR_MONTH_KEYS[0];
}

function getCalendarMonthSummary(data, month) {
  const monthData = data?.[month] || createEmptyCalendarMonth();
  const items = sortCalendarItems(Array.isArray(monthData.items) ? monthData.items : []);
  const today = getTodayIsoDate();
  const next = items.find(item => item.date && item.date >= today) || items[0] || null;
  return { items, next, notes: String(monthData.notes || '').trim() };
}

function renderCalendarMobileHub() {
  const chips = document.getElementById('calendarMobileMonthChips');
  const summary = document.getElementById('calendarMobileSummary');
  if (!chips || !summary) return;

  const data = getCalendarPlannerData();
  const fallbackMonth = CALENDAR_MONTH_KEYS[new Date().getMonth()] || CALENDAR_MONTH_KEYS[0];
  const activeMonth = calendarMobileOpenMonthKey || findCalendarNextActiveMonth(data) || fallbackMonth;

  chips.innerHTML = CALENDAR_MONTH_KEYS.map(month => {
    const count = (data?.[month]?.items || []).length;
    const active = month === activeMonth ? ' active' : '';
    return `<button class="calendar-mobile-chip${active}" type="button" onclick="setCalendarMobileOpenMonth('${month}')"><span>${escapeHtml(getCalendarShortMonthLabel(month))}</span><strong>${count}</strong></button>`;
  }).join('');

  const payload = getCalendarMonthSummary(data, activeMonth);
  const monthLabel = CALENDAR_MONTH_LABELS[activeMonth] || activeMonth;
  if (!payload.items.length) {
    summary.innerHTML = `<strong>${escapeHtml(monthLabel)}</strong><span>Sin movimientos cargados todavía. Puedes usar este mes para cargar jornadas, reuniones o recordatorios.</span>`;
    return;
  }

  const nextLabel = payload.next
    ? `${formatCalendarDate(payload.next.date)}${payload.next.time ? ' · ' + formatCalendarTime(payload.next.time) : ''} · ${escapeHtml(payload.next.school || 'Sin colegio')}`
    : 'Sin fecha próxima cargada.';
  summary.innerHTML = `<strong>${escapeHtml(monthLabel)}</strong><span>${payload.items.length} ${payload.items.length === 1 ? 'ítem cargado' : 'ítems cargados'} · Próximo: ${nextLabel}</span>`;
}

function syncCalendarMobileLayout() {
  ensureCalendarMobileMonthStructure();
  const cards = getCalendarMonthCards();
  if (!cards.length) return;

  if (!isCalendarMobileViewport()) {
    cards.forEach(({ card }) => {
      card.classList.remove('is-collapsed', 'is-active-mobile');
      const toggle = card.querySelector('.calendar-mobile-toggle');
      if (toggle) {
        toggle.textContent = 'Abrir';
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
    renderCalendarMobileHub();
    return;
  }

  const availableMonths = cards.map(entry => entry.month);
  if (!calendarMobileOpenMonthKey || !availableMonths.includes(calendarMobileOpenMonthKey)) {
    const data = getCalendarPlannerData();
    calendarMobileOpenMonthKey = findCalendarNextActiveMonth(data) || availableMonths[new Date().getMonth()] || availableMonths[0];
  }

  cards.forEach(({ card, month }) => {
    const isOpen = month === calendarMobileOpenMonthKey;
    card.classList.toggle('is-collapsed', !isOpen);
    card.classList.toggle('is-active-mobile', isOpen);
    const toggle = card.querySelector('.calendar-mobile-toggle');
    if (toggle) {
      toggle.textContent = isOpen ? 'Activo' : 'Abrir';
      toggle.setAttribute('aria-expanded', String(isOpen));
    }
  });

  renderCalendarMobileHub();
}

function setCalendarMobileOpenMonth(month, options = {}) {
  const targetMonth = CALENDAR_MONTH_KEYS.includes(month) ? month : (CALENDAR_MONTH_KEYS[new Date().getMonth()] || CALENDAR_MONTH_KEYS[0]);
  calendarMobileOpenMonthKey = targetMonth;
  syncCalendarMobileLayout();

  if (isCalendarMobileViewport() && options.scroll !== false) {
    const targetCard = document.querySelector(`#sec-calendario .calendar-month-card[data-calendar-month="${targetMonth}"]`);
    targetCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function openCalendarCurrentMonth() {
  const month = CALENDAR_MONTH_KEYS[new Date().getMonth()] || CALENDAR_MONTH_KEYS[0];
  setCalendarMobileOpenMonth(month);
}

function openCalendarNextPlannedMonth() {
  const data = getCalendarPlannerData();
  const month = findCalendarNextActiveMonth(data);
  if (!month) {
    showToast('Todavía no hay actividad cargada en el calendario.', 'warning');
    openCalendarCurrentMonth();
    return;
  }
  setCalendarMobileOpenMonth(month);
}


function renderCalendarPlanner() {
  const data = getCalendarPlannerData();
  document.querySelectorAll('[data-calendar-notes]').forEach(field => {
    const key = field.dataset.calendarNotes;
    if (Object.prototype.hasOwnProperty.call(data, key)) field.value = data[key].notes;
  });
  CALENDAR_MONTH_KEYS.forEach(month => {
    renderCalendarMonthList(month, data[month]);
  });
  syncCalendarPrintCopies(data);
  renderCalendarDerivedViews();
  syncCalendarMobileLayout();
  updateCalendarSaveStatus('Autoguardado local activo', 'info');
}

function setCalendarPlannerNotes(month, value) {
  const data = getCalendarPlannerData();
  data[month] = data[month] || createEmptyCalendarMonth();
  data[month].notes = String(value || '');
  saveCalendarPlannerData(data);
  syncCalendarPrintCopies(data);
  updateCalendarSaveStatus('Guardado automático · ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'success');
}

function clearCalendarMonthQuickForm(month) {
  const ids = ['school', 'date', 'time', 'detail', 'status'];
  ids.forEach(suffix => {
    const el = document.getElementById(`cal-${month}-${suffix}`);
    if (!el) return;
    if (suffix === 'status') el.value = 'tentativo';
    else el.value = '';
  });
}

function addCalendarPlannerItem(month) {
  const school = document.getElementById(`cal-${month}-school`)?.value?.trim() || '';
  const date = normalizePaymentDate(document.getElementById(`cal-${month}-date`)?.value || '');
  const time = normalizeCalendarTime(document.getElementById(`cal-${month}-time`)?.value || '');
  const status = normalizeCalendarStatus(document.getElementById(`cal-${month}-status`)?.value || 'tentativo');
  const detail = document.getElementById(`cal-${month}-detail`)?.value?.trim() || '';

  if (!school) {
    showToast('Completa al menos el nombre del colegio antes de agregar la fila.', 'warning');
    return;
  }
  if (!date) {
    showToast('Completa la fecha para que la agenda anual quede ordenada.', 'warning');
    return;
  }

  const data = getCalendarPlannerData();
  data[month] = data[month] || createEmptyCalendarMonth();
  data[month].items.push(normalizeCalendarItem({ id: buildCalendarItemId(), school, date, time, status, detail }));
  data[month].items = sortCalendarItems(data[month].items);
  saveCalendarPlannerData(data);
  renderCalendarPlanner();
  clearCalendarMonthQuickForm(month);
  setCalendarMobileOpenMonth(month, { scroll: false });
  updateCalendarSaveStatus('Fila operativa agregada · ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'success');
  showToast('Fila agregada al calendario anual.', 'success');
}

function setCalendarPlannerItemField(month, itemId, field, value) {
  const data = getCalendarPlannerData();
  const monthData = data[month] || createEmptyCalendarMonth();
  const item = monthData.items.find(entry => entry.id === itemId);
  if (!item) return;

  if (field === 'school') item.school = String(value || '').trim();
  if (field === 'date') item.date = normalizePaymentDate(value);
  if (field === 'time') item.time = normalizeCalendarTime(value);
  if (field === 'status') item.status = normalizeCalendarStatus(value);
  if (field === 'detail') item.detail = String(value || '').trim();

  monthData.items = sortCalendarItems(monthData.items.filter(entry => String(entry.school || '').trim() || String(entry.detail || '').trim() || entry.date));
  data[month] = monthData;
  saveCalendarPlannerData(data);
  renderCalendarPlanner();
  updateCalendarSaveStatus('Fila actualizada · ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'success');
}

function removeCalendarPlannerItem(month, itemId) {
  const data = getCalendarPlannerData();
  const monthData = data[month] || createEmptyCalendarMonth();
  monthData.items = monthData.items.filter(entry => entry.id !== itemId);
  data[month] = monthData;
  saveCalendarPlannerData(data);
  renderCalendarPlanner();
  showToast('Fila eliminada del calendario.', 'success');
}

function seedCalendarPlanner() {
  const data = getCalendarPlannerData();
  let changes = 0;
  CALENDAR_MONTH_KEYS.forEach(key => {
    data[key] = data[key] || createEmptyCalendarMonth();
    if (!String(data[key].notes || '').trim()) {
      data[key].notes = CALENDAR_BASE_TEMPLATE[key] || '';
      changes += 1;
    }
  });
  saveCalendarPlannerData(data);
  renderCalendarPlanner();
  showToast(changes ? 'Base anual cargada en las notas vacías.' : 'No había meses vacíos para completar.', changes ? 'success' : 'warning');
}

function clearCalendarPlanner() {
  if (!confirm('¿Limpiar toda la agenda anual y las notas del calendario?')) return;
  trackedRemoveItem(CALENDAR_STORAGE_KEY);
  trackedRemoveItem(CALENDAR_LEGACY_STORAGE_KEY);
  renderCalendarPlanner();
  showToast('Calendario anual limpiado.', 'success');
}

function printCalendarPlanner() {
  showSection('calendario');
  renderCalendarPlanner();
  setCalendarPrintMode('annual');
  window.print();
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarPrintReference() {
  const stored = normalizePaymentDate(localStorage.getItem(CALENDAR_PRINT_REFERENCE_KEY) || '');
  return stored || getTodayIsoDate();
}


function getCalendarSchoolFilter() {
  return String(localStorage.getItem(CALENDAR_PRINT_SCHOOL_FILTER_KEY) || '').trim();
}

function setCalendarSchoolFilter(value) {
  trackedSetItem(CALENDAR_PRINT_SCHOOL_FILTER_KEY, String(value || '').trim());
  renderCalendarDerivedViews();
  updateCalendarSaveStatus('Filtro por colegio actualizado · ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'success');
}

function getCalendarFilterSchoolNames(data) {
  const agendaNames = buildCalendarFlatItems(data).map(item => String(item.school || '').trim()).filter(Boolean);
  const boardNames = getSchoolBoardData().map(item => String(item.name || '').trim()).filter(Boolean);
  const paymentNames = getPaymentBoardData().map(item => String(item.school || '').trim()).filter(Boolean);
  const selected = String(getCalendarSchoolFilter() || '').trim();
  return [...new Set([...agendaNames, ...boardNames, ...paymentNames, selected].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

function renderCalendarSchoolFilterOptions(data) {
  const select = document.getElementById('calendarSchoolFilter');
  if (!select) return;
  const selected = String(getCalendarSchoolFilter() || '').trim();
  const names = getCalendarFilterSchoolNames(data);
  select.innerHTML = ['<option value="">Todos los colegios</option>']
    .concat(names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`))
    .join('');
  select.value = selected;
}

function parseIsoDateLocal(value) {
  const safe = normalizePaymentDate(value);
  if (!safe) return null;
  const [year, month, day] = safe.split('-').map(Number);
  const dt = new Date(year, month - 1, day);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toIsoDateLocal(date) {
  const safe = date instanceof Date ? date : new Date(date);
  if (!(safe instanceof Date) || Number.isNaN(safe.getTime())) return '';
  return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, '0')}-${String(safe.getDate()).padStart(2, '0')}`;
}

function addDays(date, amount) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

function getStartOfWeek(date) {
  const safe = date instanceof Date ? date : new Date(date);
  const day = safe.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(safe, diff);
}

function formatCalendarDateLong(value) {
  const dt = parseIsoDateLocal(value);
  if (!dt) return 'Sin fecha';
  return dt.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getCalendarMonthKeyFromDate(value) {
  const dt = parseIsoDateLocal(value);
  if (!dt) return null;
  return CALENDAR_MONTH_KEYS[dt.getMonth()] || null;
}

function getCalendarMonthTitle(value) {
  const dt = parseIsoDateLocal(value);
  if (!dt) return 'Mes de referencia';
  const key = CALENDAR_MONTH_KEYS[dt.getMonth()];
  return `${CALENDAR_MONTH_LABELS[key] || 'Mes'} ${dt.getFullYear()}`;
}

function buildCalendarFlatItems(data) {
  const flat = [];
  CALENDAR_MONTH_KEYS.forEach(month => {
    const items = Array.isArray(data?.[month]?.items) ? data[month].items : [];
    items.forEach(item => {
      flat.push({ ...normalizeCalendarItem(item), month });
    });
  });
  return sortCalendarItems(flat);
}

function buildCalendarSummaryText(items) {
  if (!items.length) return 'Sin ítems cargados en este período.';
  const counts = {};
  items.forEach(item => {
    const key = normalizeCalendarStatus(item.status);
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${CALENDAR_STATUS_LABELS[key] || key}: ${count}`)
    .join(' · ');
}

function buildCalendarDerivedItemsHtml(items) {
  if (!items.length) return '<div class="calendar-derived-empty">Sin movimientos cargados para este tramo.</div>';
  return items.map(item => `
    <div class="calendar-derived-item">
      <div class="calendar-derived-item-time">${escapeHtml(item.time ? formatCalendarTime(item.time) : '—')}</div>
      <div class="calendar-derived-item-main">
        <div class="calendar-derived-school">${escapeHtml(item.school || 'Sin colegio')}</div>
        <div class="calendar-derived-subline">${escapeHtml(item.date ? formatCalendarDate(item.date) : 'Sin fecha')} · ${escapeHtml(getCalendarStatusLabel(item.status))}</div>
        <div class="calendar-derived-detail">${item.detail ? escapeHtml(item.detail) : 'Sin detalle operativo cargado.'}</div>
      </div>
      <div class="calendar-derived-status">${escapeHtml(getCalendarStatusLabel(item.status))}</div>
    </div>
  `).join('');
}

function buildCalendarMonthPrintHtml(items) {
  if (!items.length) return '<div class="calendar-derived-empty">No hay movimientos cargados en el mes elegido.</div>';
  const groups = new Map();
  items.forEach(item => {
    const key = item.date || 'sin-fecha';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return Array.from(groups.entries()).map(([date, group]) => `
    <div class="calendar-derived-day">
      <div class="calendar-derived-day-head">
        <div>
          <div class="calendar-derived-day-title">${escapeHtml(formatCalendarDateLong(date))}</div>
          <div class="calendar-derived-day-sub">${escapeHtml(buildCalendarSummaryText(group))}</div>
        </div>
        <div class="calendar-derived-day-count">${group.length} ${group.length === 1 ? 'ítem' : 'ítems'}</div>
      </div>
      ${buildCalendarDerivedItemsHtml(group)}
    </div>
  `).join('');
}

function buildCalendarDayPrintHtml(items, reference) {
  if (!items.length) return '<div class="calendar-derived-empty">No hay movimientos cargados en la fecha elegida.</div>';
  return `
    <div class="calendar-derived-day">
      <div class="calendar-derived-day-head">
        <div>
          <div class="calendar-derived-day-title">${escapeHtml(formatCalendarDateLong(reference))}</div>
          <div class="calendar-derived-day-sub">${escapeHtml(buildCalendarSummaryText(items))}</div>
        </div>
        <div class="calendar-derived-day-count">${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}</div>
      </div>
      ${buildCalendarDerivedItemsHtml(items)}
    </div>
  `;
}

function buildCalendarWeekPrintHtml(items, weekStart) {
  const days = Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
  return days.map(day => {
    const iso = toIsoDateLocal(day);
    const dayItems = items.filter(item => item.date === iso);
    return `
      <div class="calendar-derived-day">
        <div class="calendar-derived-day-head">
          <div>
            <div class="calendar-derived-day-title">${escapeHtml(formatCalendarDateLong(iso))}</div>
            <div class="calendar-derived-day-sub">${escapeHtml(buildCalendarSummaryText(dayItems))}</div>
          </div>
          <div class="calendar-derived-day-count">${dayItems.length} ${dayItems.length === 1 ? 'ítem' : 'ítems'}</div>
        </div>
        ${buildCalendarDerivedItemsHtml(dayItems)}
      </div>
    `;
  }).join('');
}

function buildCalendarDayTimelineHtml(items) {
  const timed = sortCalendarItems(items).filter(item => item.time);
  if (!timed.length) return '<div class="calendar-derived-empty">No hay horarios cargados todavía en la agenda del día.</div>';
  return timed.map(item => `
    <div class="calendar-day-timeline-item">
      <div class="calendar-day-timeline-time">${escapeHtml(formatCalendarTime(item.time))}</div>
      <div class="calendar-day-timeline-main">
        <div class="calendar-day-timeline-school">${escapeHtml(item.school || 'Sin colegio')}</div>
        <div class="calendar-day-timeline-detail">${item.detail ? escapeHtml(item.detail) : 'Sin detalle operativo cargado.'}</div>
      </div>
      <div class="calendar-day-timeline-status">${escapeHtml(getCalendarStatusLabel(item.status))}</div>
    </div>
  `).join('');
}

function renderCalendarDayTimeline(reference, selectedSchool, dayItems) {
  const context = getCalendarDaySheetContext(reference, selectedSchool);
  const title = document.getElementById('calendarDayTimelineTitle');
  const meta = document.getElementById('calendarDayTimelineMeta');
  const count = document.getElementById('calendarDayTimelineCount');
  const list = document.getElementById('calendarDayTimelineList');
  const timed = sortCalendarItems(dayItems).filter(item => item.time);

  if (title) {
    title.textContent = context.school
      ? `Secuencia base · ${context.school}`
      : 'Secuencia base · Todos los colegios';
  }

  if (count) count.textContent = `${timed.length} ${timed.length === 1 ? 'horario' : 'horarios'}`;

  if (meta) {
    meta.textContent = timed.length
      ? `Fecha: ${formatCalendarDate(context.date)} · ${context.school ? 'Colegio: ' + context.school : 'Vista general del día'} · ordenado por hora real.`
      : `Fecha: ${formatCalendarDate(context.date)} · ${context.school ? 'Colegio: ' + context.school : 'Vista general del día'} · todavía no cargaste horas en la agenda.`;
  }

  if (list) list.innerHTML = buildCalendarDayTimelineHtml(dayItems);
}

function renderCalendarDerivedViews() {
  const data = getCalendarPlannerData();
  renderCalendarSchoolFilterOptions(data);
  const allItems = buildCalendarFlatItems(data);
  const reference = getCalendarPrintReference();
  const referenceInput = document.getElementById('calendarPrintReference');
  if (referenceInput) referenceInput.value = reference;

  const selectedSchool = String(getCalendarSchoolFilter() || '').trim();
  const normalizedSelectedSchool = normalizeSchoolKey(selectedSchool);
  const filteredItems = normalizedSelectedSchool
    ? allItems.filter(item => normalizeSchoolKey(item.school) === normalizedSelectedSchool)
    : allItems;
  const schoolMetaText = selectedSchool ? ` · Colegio: ${selectedSchool}` : ' · Todos los colegios';

  const referenceDate = parseIsoDateLocal(reference) || parseIsoDateLocal(getTodayIsoDate()) || new Date();
  const dayItems = filteredItems.filter(item => item.date === reference);
  const dayTitle = document.getElementById('calendarDayPrintTitle');
  const dayCount = document.getElementById('calendarDayPrintCount');
  const dayMeta = document.getElementById('calendarDayPrintMeta');
  const dayList = document.getElementById('calendarDayPrintList');
  const dayNotes = document.getElementById('calendarDayPrintNotes');
  const dayMonthKey = getCalendarMonthKeyFromDate(reference);
  const dayMonthNotes = dayMonthKey ? String(data?.[dayMonthKey]?.notes || '').trim() : '';

  if (dayTitle) dayTitle.textContent = selectedSchool
    ? `Jornada del ${formatCalendarDate(reference)} · ${selectedSchool}`
    : `Jornada del ${formatCalendarDate(reference)}`;
  if (dayCount) dayCount.textContent = `${dayItems.length} ${dayItems.length === 1 ? 'ítem' : 'ítems'}`;
  if (dayMeta) dayMeta.textContent = dayItems.length
    ? `Fecha: ${formatCalendarDate(reference)}${schoolMetaText} · ${buildCalendarSummaryText(dayItems)}`
    : `Fecha: ${formatCalendarDate(reference)}${schoolMetaText} · sin movimientos cargados.`;
  if (dayList) dayList.innerHTML = buildCalendarDayPrintHtml(dayItems, reference);
  renderCalendarDaySheet(reference, selectedSchool, dayItems);
  if (dayNotes) dayNotes.innerHTML = dayMonthNotes
    ? `<strong>${selectedSchool ? 'Notas libres del mes (generales, no filtradas por colegio):' : 'Notas libres del mes:'}</strong>
${escapeHtml(dayMonthNotes)}`
    : `<strong>${selectedSchool ? 'Notas libres del mes (generales, no filtradas por colegio):' : 'Notas libres del mes:'}</strong> Sin notas cargadas.`;

  const monthPrefix = reference.slice(0, 7);
  const monthItems = filteredItems.filter(item => String(item.date || '').slice(0, 7) === monthPrefix);
  const monthTitle = document.getElementById('calendarMonthPrintTitle');
  const monthCount = document.getElementById('calendarMonthPrintCount');
  const monthMeta = document.getElementById('calendarMonthPrintMeta');
  const monthList = document.getElementById('calendarMonthPrintList');
  const monthNotes = document.getElementById('calendarMonthPrintNotes');
  const monthKey = getCalendarMonthKeyFromDate(reference);
  const currentMonthNotes = monthKey ? String(data?.[monthKey]?.notes || '').trim() : '';

  if (monthTitle) monthTitle.textContent = selectedSchool
    ? `${getCalendarMonthTitle(reference)} · ${selectedSchool}`
    : getCalendarMonthTitle(reference);
  if (monthCount) monthCount.textContent = `${monthItems.length} ${monthItems.length === 1 ? 'ítem' : 'ítems'}`;
  if (monthMeta) monthMeta.textContent = monthItems.length
    ? `Período: ${getCalendarMonthTitle(reference)}${schoolMetaText} · ${buildCalendarSummaryText(monthItems)}`
    : `Período: ${getCalendarMonthTitle(reference)}${schoolMetaText} · sin movimientos cargados.`;
  if (monthList) monthList.innerHTML = buildCalendarMonthPrintHtml(monthItems);
  if (monthNotes) monthNotes.innerHTML = currentMonthNotes
    ? `<strong>${selectedSchool ? 'Notas libres del mes (generales, no filtradas por colegio):' : 'Notas libres del mes:'}</strong>
${escapeHtml(currentMonthNotes)}`
    : `<strong>${selectedSchool ? 'Notas libres del mes (generales, no filtradas por colegio):' : 'Notas libres del mes:'}</strong> Sin notas cargadas.`;

  const weekStart = getStartOfWeek(referenceDate);
  const weekEnd = addDays(weekStart, 6);
  const weekStartIso = toIsoDateLocal(weekStart);
  const weekEndIso = toIsoDateLocal(weekEnd);
  const weekItems = filteredItems.filter(item => item.date && item.date >= weekStartIso && item.date <= weekEndIso);
  const weekTitle = document.getElementById('calendarWeekPrintTitle');
  const weekCount = document.getElementById('calendarWeekPrintCount');
  const weekMeta = document.getElementById('calendarWeekPrintMeta');
  const weekList = document.getElementById('calendarWeekPrintList');

  if (weekTitle) weekTitle.textContent = selectedSchool
    ? `Semana del ${formatCalendarDate(weekStartIso)} al ${formatCalendarDate(weekEndIso)} · ${selectedSchool}`
    : `Semana del ${formatCalendarDate(weekStartIso)} al ${formatCalendarDate(weekEndIso)}`;
  if (weekCount) weekCount.textContent = `${weekItems.length} ${weekItems.length === 1 ? 'ítem' : 'ítems'}`;
  if (weekMeta) weekMeta.textContent = weekItems.length
    ? `Período: ${formatCalendarDate(weekStartIso)} → ${formatCalendarDate(weekEndIso)}${schoolMetaText} · ${buildCalendarSummaryText(weekItems)}`
    : `Período: ${formatCalendarDate(weekStartIso)} → ${formatCalendarDate(weekEndIso)}${schoolMetaText} · sin movimientos cargados.`;
  if (weekList) weekList.innerHTML = buildCalendarWeekPrintHtml(weekItems, weekStart);
}

function setCalendarPrintReference(value) {
  const safe = normalizePaymentDate(value) || getTodayIsoDate();
  trackedSetItem(CALENDAR_PRINT_REFERENCE_KEY, safe);
  renderCalendarDerivedViews();
  updateCalendarSaveStatus('Fecha de referencia actualizada · ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'success');
}

function setCalendarPrintReferenceToday() {
  setCalendarPrintReference(getTodayIsoDate());
  showToast('Fecha de referencia llevada a hoy.', 'success');
}

function setCalendarPrintMode(mode) {
  document.body.classList.remove('print-calendar-annual', 'print-calendar-month', 'print-calendar-week', 'print-calendar-day');
  if (mode === 'annual') document.body.classList.add('print-calendar-annual');
  if (mode === 'month') document.body.classList.add('print-calendar-month');
  if (mode === 'week') document.body.classList.add('print-calendar-week');
  if (mode === 'day') document.body.classList.add('print-calendar-day');
}

function clearCalendarPrintMode() {
  document.body.classList.remove('print-calendar-annual', 'print-calendar-month', 'print-calendar-week', 'print-calendar-day');
}

function printCalendarDerived(mode) {
  if (!['day', 'month', 'week'].includes(mode)) return;
  showSection('calendario');
  renderCalendarDerivedViews();
  setCalendarPrintMode(mode);
  window.print();
}

function normalizeFamilyKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeSchoolKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthValue() {
  return getTodayIsoDate().slice(0, 7);
}

function getCurrentYearValue() {
  return getTodayIsoDate().slice(0, 4);
}

function normalizePaymentDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function normalizeMonthValue(value) {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : '';
}

function formatMonthLabel(value) {
  const safe = normalizeMonthValue(value);
  if (!safe) return 'mes sin definir';
  const [year, month] = safe.split('-').map(Number);
  const dt = new Date(year, month - 1, 1);
  return dt.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function syncPaymentDateDefault() {
  const input = document.getElementById('paymentDate');
  if (input && !input.value) input.value = getTodayIsoDate();
}

function getKpiTicketMode() {
  const saved = localStorage.getItem(KPI_TICKET_MODE_KEY);
  return saved === 'family' ? 'family' : 'payment';
}

function setKpiTicketMode(mode) {
  const safeMode = mode === 'family' ? 'family' : 'payment';
  trackedSetItem(KPI_TICKET_MODE_KEY, safeMode);
  renderKpiDashboard();
  renderCalendarPlanner();
}

function syncKpiTicketModeButtons(mode) {
  document.querySelectorAll('[data-kpi-ticket-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.kpiTicketMode === mode);
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setTextMany(ids, value) {
  ids.forEach(id => setText(id, value));
}

function getKpiScope() {
  return localStorage.getItem(KPI_SCOPE_KEY) || '';
}

function setKpiScope(scope) {
  trackedSetItem(KPI_SCOPE_KEY, String(scope || '').trim());
  renderKpiDashboard();
}

function getKpiPeriodMode() {
  const saved = localStorage.getItem(KPI_PERIOD_MODE_KEY);
  return ['all', 'month_current', 'year_current', 'month_custom'].includes(saved) ? saved : 'all';
}

function getKpiPeriodValue() {
  return normalizeMonthValue(localStorage.getItem(KPI_PERIOD_VALUE_KEY)) || getCurrentMonthValue();
}

function setKpiPeriodMode(mode) {
  const safeMode = ['all', 'month_current', 'year_current', 'month_custom'].includes(mode) ? mode : 'all';
  trackedSetItem(KPI_PERIOD_MODE_KEY, safeMode);
  if (safeMode === 'month_custom' && !normalizeMonthValue(localStorage.getItem(KPI_PERIOD_VALUE_KEY))) {
    trackedSetItem(KPI_PERIOD_VALUE_KEY, getCurrentMonthValue());
  }
  renderKpiDashboard();
}

function setKpiPeriodValue(value) {
  const safeValue = normalizeMonthValue(value) || getCurrentMonthValue();
  trackedSetItem(KPI_PERIOD_VALUE_KEY, safeValue);
  if (getKpiPeriodMode() !== 'month_custom') {
    trackedSetItem(KPI_PERIOD_MODE_KEY, 'month_custom');
  }
  renderKpiDashboard();
}

function getUnifiedSchoolNames() {
  const scopeName = String(getKpiScope() || '').trim();
  const schoolNames = getSchoolBoardData().map(item => String(item.name || '').trim()).filter(Boolean);
  const paymentNames = getPaymentBoardData().map(item => String(item.school || '').trim()).filter(Boolean);
  return [...new Set([...schoolNames, ...paymentNames, scopeName].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

function renderPaymentSchoolOptions() {
  const list = document.getElementById('paymentSchoolOptions');
  if (!list) return;
  const names = getUnifiedSchoolNames();
  list.innerHTML = names.map(name => `<option value="${String(name).replace(/"/g, '&quot;')}"></option>`).join('');
}

function syncKpiScopeSelectors(scope) {
  const names = getUnifiedSchoolNames();
  document.querySelectorAll('[data-kpi-scope-selector]').forEach(select => {
    const previous = scope || '';
    const options = ['<option value="">Global · todos los colegios</option>']
      .concat(names.map(name => `<option value="${String(name).replace(/"/g, '&quot;')}" ${name === previous ? 'selected' : ''}>${name}</option>`));
    select.innerHTML = options.join('');
    select.value = previous;
  });
}

function syncKpiPeriodControls(mode, value) {
  const safeMode = ['all', 'month_current', 'year_current', 'month_custom'].includes(mode) ? mode : 'all';
  const safeValue = normalizeMonthValue(value) || getCurrentMonthValue();
  const allDates = getPaymentBoardData().map(item => normalizePaymentDate(item.date)).filter(Boolean).sort();
  const minMonth = allDates.length ? allDates[0].slice(0, 7) : '';
  const maxMonth = allDates.length ? allDates[allDates.length - 1].slice(0, 7) : '';

  document.querySelectorAll('[data-kpi-period-mode]').forEach(select => {
    select.value = safeMode;
  });

  document.querySelectorAll('[data-kpi-period-month]').forEach(input => {
    input.value = safeValue;
    input.disabled = safeMode !== 'month_custom';
    input.classList.toggle('disabled', safeMode !== 'month_custom');
    if (minMonth) input.min = minMonth;
    else input.removeAttribute('min');
    if (maxMonth) input.max = maxMonth;
    else input.removeAttribute('max');
  });
}

function computeKpiMetrics() {
  const allPayments = getPaymentBoardData();
  const allSchools = getSchoolBoardData();
  const ticketMode = getKpiTicketMode();
  const scope = getKpiScope();
  const periodMode = getKpiPeriodMode();
  const periodValue = getKpiPeriodValue();
  const normalizedScope = normalizeSchoolKey(scope);

  const paymentsInScope = normalizedScope
    ? allPayments.filter(item => normalizeSchoolKey(item.school) === normalizedScope)
    : allPayments;

  const undatedCount = paymentsInScope.filter(item => !normalizePaymentDate(item.date)).length;
  const datedInScopeCount = paymentsInScope.length - undatedCount;

  const payments = paymentsInScope.filter(item => {
    const date = normalizePaymentDate(item.date);
    if (periodMode === 'all') return true;
    if (!date) return false;
    if (periodMode === 'month_current') return date.slice(0, 7) === getCurrentMonthValue();
    if (periodMode === 'year_current') return date.slice(0, 4) === getCurrentYearValue();
    if (periodMode === 'month_custom') return date.slice(0, 7) === periodValue;
    return true;
  });

  let schools = normalizedScope
    ? allSchools.filter(item => normalizeSchoolKey(item.name) === normalizedScope)
    : allSchools;

  if (normalizedScope && !schools.length && scope) {
    schools = [{ id: 'scope_only', name: scope, stage: 'sin-dato' }];
  }

  const totalPayments = payments.length;
  const gross = payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const effectiveCount = payments.filter(item => ['validado', 'liquidado'].includes(item.status)).length;
  const pendingCount = Math.max(totalPayments - effectiveCount, 0);
  const familyKeys = payments.map(item => normalizeFamilyKey(item.name) || item.id);
  const uniqueFamilyCount = new Set(familyKeys).size;
  const duplicatePaymentCount = Math.max(totalPayments - uniqueFamilyCount, 0);
  const ticketPerPayment = totalPayments ? gross / totalPayments : 0;
  const ticketPerFamily = uniqueFamilyCount ? gross / uniqueFamilyCount : 0;
  const ticket = ticketMode === 'family' ? ticketPerFamily : ticketPerPayment;
  const ticketFormula = ticketMode === 'family'
    ? 'Facturación Bruta ÷ Familias Únicas'
    : 'Facturación Bruta ÷ Total de Pagos';
  const ticketMeta = ticketMode === 'family'
    ? 'Monto promedio que ingresa por cada familia deduplicada según el nombre cargado en cobranzas.'
    : 'Monto promedio que ingresa por cada familia compradora medida por registro de cobro.';
  const ticketModeLabel = ticketMode === 'family' ? 'Modo actual: por familia única' : 'Modo actual: por pago';
  const ticketDetail = ticketMode === 'family'
    ? `${uniqueFamilyCount} familias únicas detectadas${duplicatePaymentCount > 0 ? ` · ${duplicatePaymentCount} registros duplicados absorbidos` : ''}`
    : `${totalPayments} pagos tomados como base`;

  const canon = gross * 0.2;
  const effectiveRate = totalPayments ? (effectiveCount / totalPayments) * 100 : 0;
  const activeSchools = schools.filter(item => item.stage === 'activo').length;
  const scoped = !!normalizedScope;
  const scopeLabel = scoped ? scope : 'Global · todos los colegios';
  const scopeText = scoped
    ? `Vista filtrada por ${scope}.`
    : 'Vista consolidada de toda la operación.';
  const scopeFootnote = scoped
    ? 'Solo computa cobranzas asociadas a esa institución.'
    : 'Suma todas las cobranzas y toda la cartera cargada.';

  let periodStatus = 'Período: todo el historial';
  let periodText = 'Sin filtro temporal. Incluye todas las cobranzas cargadas.';
  if (periodMode === 'month_current') {
    periodStatus = `Período: ${formatMonthLabel(getCurrentMonthValue())}`;
    periodText = 'Solo computa cobranzas fechadas dentro del mes actual.';
  } else if (periodMode === 'year_current') {
    periodStatus = `Período: año ${getCurrentYearValue()}`;
    periodText = 'Solo computa cobranzas fechadas dentro del año actual.';
  } else if (periodMode === 'month_custom') {
    periodStatus = `Período: ${formatMonthLabel(periodValue)}`;
    periodText = 'Solo computa cobranzas fechadas dentro del mes seleccionado.';
  }

  const periodFootnote = periodMode === 'all'
    ? (undatedCount > 0
      ? `${undatedCount} registro(s) de esta vista siguen sin fecha. En filtros temporales quedarán fuera hasta completarlos.`
      : 'Incluye todo el historial cargado, con o sin fecha.')
    : (undatedCount > 0
      ? `Filtro temporal activo. ${undatedCount} registro(s) de esta vista no tienen fecha y quedaron fuera del período.`
      : 'Filtro temporal activo. Solo entra lo que tenga fecha dentro del período elegido.');

  const institutionTitle = scoped ? 'Institución activa' : 'Instituciones activas';
  const institutionFormula = scoped ? 'Institución seleccionada en etapa "Activo"' : 'Colegios en etapa "Activo"';
  const institutionMeta = periodMode === 'all'
    ? (scoped
      ? 'Confirma si el colegio filtrado está efectivamente en producción.'
      : 'Volumen de operaciones actualmente en producción.')
    : (scoped
      ? 'La lectura financiera está filtrada por período, pero este KPI sigue mostrando el estado actual de la cartera.'
      : 'Con filtro temporal activo, este KPI sigue mostrando el estado actual de la cartera, no un histórico.');
  const institutionDetail = scoped
    ? `${activeSchools ? 'Sí' : 'No'} · ${scope}${schools.length ? '' : ' (aún no figura en cartera)'}`
    : `${activeSchools} activas sobre ${schools.length} instituciones en cartera`;

  return {
    scope,
    scoped,
    scopeLabel,
    scopeText,
    scopeFootnote,
    periodMode,
    periodValue,
    periodStatus,
    periodText,
    periodFootnote,
    payments,
    paymentsInScope,
    schools,
    totalPayments,
    datedInScopeCount,
    undatedCount,
    gross,
    effectiveCount,
    pendingCount,
    ticket,
    ticketMode,
    ticketFormula,
    ticketMeta,
    ticketModeLabel,
    ticketDetail,
    ticketPerPayment,
    ticketPerFamily,
    uniqueFamilyCount,
    duplicatePaymentCount,
    canon,
    effectiveRate,
    activeSchools,
    institutionTitle,
    institutionFormula,
    institutionMeta,
    institutionDetail
  };
}


function buildKpiMobileExecutive(metrics, healthVariant) {
  if (!metrics.totalPayments && !metrics.schools.length) {
    return { pill: 'Sin datos', title: 'Panel todavía vacío', meta: 'Carga al menos un colegio y un cobro para que la lectura móvil empiece a tener sentido.' };
  }
  if (healthVariant === 'danger') {
    return { pill: 'Atención', title: 'Cobranza frágil', meta: `Solo ${formatPercent(metrics.effectiveRate)} del tablero está validado o liquidado. Conviene bajar a cobranzas y atacar pendientes.` };
  }
  if (healthVariant === 'warning') {
    return { pill: 'Seguimiento', title: 'Pulso intermedio', meta: `${metrics.pendingCount} registro(s) siguen abiertos. Ya hay ${money(metrics.canon)} para reservar a cooperadora.` };
  }
  return { pill: 'Sano', title: 'Lectura saludable', meta: `${formatPercent(metrics.effectiveRate)} efectivo · ${metrics.activeSchools} institución(es) activa(s) · ${money(metrics.canon)} proyectados para canon.` };
}

function buildKpiMobileAction(metrics) {
  if (!metrics.totalPayments && metrics.schools.length) {
    return { title: 'Primero cargar cobros', meta: 'Ya tienes cartera, pero todavía no hay cobranzas. El siguiente paso real es alimentar el tablero financiero.' };
  }
  if (!metrics.totalPayments) {
    return { title: 'Arrancar por cartera y cobranzas', meta: 'Sin datos financieros todavía. Carga un colegio y un primer cobro para activar el tablero.' };
  }
  if (metrics.undatedCount > 0 && metrics.periodMode !== 'all') {
    return { title: 'Completar fechas faltantes', meta: `${metrics.undatedCount} registro(s) quedaron fuera del período porque no tienen fecha cargada.` };
  }
  if (metrics.effectiveRate < 40) {
    return { title: 'Atacar pendientes y observados', meta: `${metrics.pendingCount} registro(s) todavía no entran como efectivos. Ese es el cuello de botella principal.` };
  }
  if (metrics.effectiveRate < 70) {
    return { title: 'Empujar validación antes de producir', meta: 'La cobranza todavía está en zona media. Conviene validar más antes de comprometer volumen fuerte.' };
  }
  if (!metrics.scoped && metrics.activeSchools === 0 && metrics.schools.length) {
    return { title: 'Revisar etapa de cartera', meta: 'Hay instituciones cargadas, pero ninguna figura activa. Vale la pena ordenar la cartera comercial.' };
  }
  return { title: 'Mantener ritmo y respaldo', meta: 'La lectura está bien. Usa este panel para no perder visibilidad y sigue exportando respaldo JSON con frecuencia.' };
}

function renderKpiMobileFocus(metrics, healthVariant) {
  const executive = buildKpiMobileExecutive(metrics, healthVariant);
  const action = buildKpiMobileAction(metrics);
  const pill = document.getElementById('kpiMobileFocusPill');
  const focus = document.getElementById('kpiMobileFocus');
  const filterTitle = metrics.scoped ? `${metrics.scopeLabel} · ${metrics.periodStatus.replace('Período: ', '')}` : `${metrics.scopeLabel} · ${metrics.periodStatus.replace('Período: ', '')}`;
  const filterMeta = `${metrics.scopeText} ${metrics.periodText}`;

  setText('kpiMobileExecutiveTitle', executive.title);
  setText('kpiMobileExecutiveMeta', executive.meta);
  setText('kpiMobileActionTitle', action.title);
  setText('kpiMobileActionMeta', action.meta);
  setText('kpiMobileFilterTitle', filterTitle);
  setText('kpiMobileFilterMeta', filterMeta);
  if (pill) pill.textContent = executive.pill;
  if (focus) {
    focus.classList.remove('is-warning', 'is-danger', 'is-success');
    if (healthVariant === 'warning') focus.classList.add('is-warning');
    if (healthVariant === 'danger') focus.classList.add('is-danger');
    if (healthVariant === 'success') focus.classList.add('is-success');
  }
}

function renderKpiDashboard() {
  const metrics = computeKpiMetrics();
  syncKpiTicketModeButtons(metrics.ticketMode);
  syncKpiScopeSelectors(metrics.scope);
  syncKpiPeriodControls(metrics.periodMode, metrics.periodValue);

  setTextMany(['kpiTicketPromedio', 'inicioKpiTicketPromedio'], money(metrics.ticket));
  setTextMany(['kpiFacturacionBruta', 'inicioKpiFacturacionBruta'], money(metrics.gross));
  setTextMany(['kpiCanonCooperadoras', 'inicioKpiCanonCooperadoras'], money(metrics.canon));
  setTextMany(['kpiTasaCobro', 'inicioKpiTasaCobro'], formatPercent(metrics.effectiveRate));
  setTextMany(['kpiInstitucionesActivas', 'inicioKpiInstitucionesActivas'], String(metrics.activeSchools));
  setText('kpiRecordsCount', String(metrics.totalPayments));
  setText('kpiEffectiveCount', String(metrics.effectiveCount));
  setText('kpiPendingCount', String(metrics.pendingCount));
  setText('kpiSchoolCount', String(metrics.schools.length));
  setText('kpiLastRefresh', new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
  setTextMany(['kpiTasaDetalle', 'inicioKpiTasaDetalle'], `${metrics.effectiveCount} de ${metrics.totalPayments} registros efectivos`);
  setTextMany(['kpiInstitucionesDetalle', 'inicioKpiInstitucionesDetalle'], metrics.institutionDetail);
  setText('kpiTicketFormula', metrics.ticketFormula);
  setText('kpiTicketMeta', metrics.ticketMeta);
  setText('kpiTicketModeBadge', metrics.ticketModeLabel);
  setText('kpiTicketDetalle', metrics.ticketDetail);
  setText('inicioKpiTicketDetalle', metrics.ticketDetail);
  setText('inicioKpiFacturacionDetalle', `${metrics.totalPayments} registros cargados`);
  setTextMany(['kpiScopeStatus', 'inicioKpiScopeStatus'], metrics.scopeLabel);
  setTextMany(['kpiScopeText', 'inicioKpiScopeText'], metrics.scopeText);
  setTextMany(['kpiScopeFootnote', 'inicioKpiScopeFootnote'], metrics.scopeFootnote);
  setTextMany(['kpiPeriodStatus', 'inicioKpiPeriodStatus'], metrics.periodStatus);
  setTextMany(['kpiPeriodText', 'inicioKpiPeriodText'], metrics.periodText);
  setTextMany(['kpiPeriodFootnote', 'inicioKpiPeriodFootnote'], metrics.periodFootnote);
  setTextMany(['kpiInstitucionName', 'inicioKpiInstitucionName'], metrics.institutionTitle);
  setText('kpiInstitucionesFormula', metrics.institutionFormula);
  setText('kpiInstitucionesMeta', metrics.institutionMeta);

  const healthCard = document.getElementById('kpiHealthCard');
  const healthText = document.getElementById('kpiHealthText');
  const homeHealthText = document.getElementById('inicioKpiHealthText');
  const scopePrefix = metrics.scoped ? `${metrics.scope}: ` : '';
  let healthMessage = 'Carga datos en cobranzas y cartera para habilitar la lectura automática.';
  let healthVariant = '';

  if (!metrics.totalPayments && !metrics.schools.length) {
    healthMessage = metrics.scoped
      ? `${scopePrefix}no hay cobranzas asociadas ni registro de esa institución en cartera.`
      : 'Aún no hay datos cargados en cobranzas ni cartera. Los cinco KPIs se activan apenas registres pagos e instituciones.';
  } else if (!metrics.totalPayments && metrics.periodMode !== 'all' && metrics.undatedCount > 0) {
    healthVariant = 'warning';
    healthMessage = metrics.scoped
      ? `${scopePrefix}no aparecen cobros dentro de este período. Ojo: ${metrics.undatedCount} registro(s) de esta institución siguen sin fecha y quedaron fuera del filtro temporal.`
      : `No aparecen cobros dentro del período elegido. Ojo: ${metrics.undatedCount} registro(s) del tablero siguen sin fecha y quedaron fuera del filtro temporal.`;
  } else if (!metrics.totalPayments) {
    healthVariant = 'warning';
    healthMessage = metrics.scoped
      ? `${scopePrefix}figura en cartera, pero todavía no tiene cobranzas asociadas en el tablero.`
      : `Ya tienes ${metrics.schools.length} instituciones en cartera, pero todavía no hay cobranzas cargadas. El panel comercial existe, pero la lectura financiera aún está vacía.`;
  } else if (metrics.effectiveRate < 40) {
    healthVariant = 'danger';
    healthMessage = metrics.scoped
      ? `${scopePrefix}la cobranza está frágil: solo ${formatPercent(metrics.effectiveRate)} del tablero filtrado está validado o liquidado.`
      : `La cobranza está frágil: solo ${formatPercent(metrics.effectiveRate)} del tablero está validado o liquidado. Antes de producir en volumen, conviene atacar pendientes y observados.`;
  } else if (metrics.effectiveRate < 70) {
    healthVariant = 'warning';
    healthMessage = metrics.scoped
      ? `${scopePrefix}${formatPercent(metrics.effectiveRate)} de efectividad y ${money(metrics.canon)} de canon proyectado en esta institución.`
      : `La cobranza está en seguimiento: ${formatPercent(metrics.effectiveRate)} de efectividad y ${money(metrics.canon)} a reservar para cooperadora. Estás en zona intermedia.`;
  } else {
    healthVariant = 'success';
    healthMessage = metrics.scoped
      ? `${scopePrefix}buen pulso operativo: ${formatPercent(metrics.effectiveRate)} del tablero filtrado ya está validado o liquidado.`
      : `Buen pulso operativo: ${formatPercent(metrics.effectiveRate)} del tablero ya está validado o liquidado, con ${metrics.activeSchools} instituciones activas y ${money(metrics.canon)} de canon proyectado.`;
  }

  if (healthText) healthText.textContent = healthMessage;
  if (homeHealthText) homeHealthText.textContent = healthMessage;
  if (healthCard) {
    healthCard.className = 'ops-card';
    if (healthVariant === 'warning') healthCard.classList.add('ops-card-warning');
    if (healthVariant === 'danger') healthCard.classList.add('ops-card-danger');
    if (healthVariant === 'success') healthCard.classList.add('ops-card-success');
  }

  renderKpiMobileFocus(metrics, healthVariant);
}

function renderSchoolBoard() {
  const rows = document.getElementById('schoolBoardRows');
  if (!rows) return;
  const data = getSchoolBoardData();
  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted)">Sin instituciones cargadas.</td></tr>';
  } else {
    rows.innerHTML = data.map(item => `
      <tr>
        <td><strong>${item.name || '—'}</strong></td>
        <td>${item.level || '—'}</td>
        <td>
          <select class="inline-select stage-${item.stage}" onchange="setSchoolField('${item.id}','stage', this.value)">
            <option value="prospecto" ${item.stage === 'prospecto' ? 'selected' : ''}>Prospecto</option>
            <option value="contacto" ${item.stage === 'contacto' ? 'selected' : ''}>Contacto</option>
            <option value="reunion" ${item.stage === 'reunion' ? 'selected' : ''}>Reunión</option>
            <option value="propuesta" ${item.stage === 'propuesta' ? 'selected' : ''}>Propuesta</option>
            <option value="activo" ${item.stage === 'activo' ? 'selected' : ''}>Activo</option>
            <option value="renovacion" ${item.stage === 'renovacion' ? 'selected' : ''}>Renovación</option>
            <option value="pausa" ${item.stage === 'pausa' ? 'selected' : ''}>En pausa</option>
          </select>
        </td>
        <td>${item.contact || '—'}</td>
        <td><input class="inline-input" value="${item.renewal || ''}" onchange="setSchoolField('${item.id}','renewal', this.value)" type="text"></td>
        <td><input class="inline-input" value="${item.nextAction || ''}" onchange="setSchoolField('${item.id}','nextAction', this.value)" type="text"></td>
        <td>
          <select class="inline-select risk-${item.risk}" onchange="setSchoolField('${item.id}','risk', this.value)">
            <option value="verde" ${item.risk === 'verde' ? 'selected' : ''}>Verde</option>
            <option value="amarillo" ${item.risk === 'amarillo' ? 'selected' : ''}>Amarillo</option>
            <option value="rojo" ${item.risk === 'rojo' ? 'selected' : ''}>Rojo</option>
          </select>
        </td>
        <td><input class="inline-input inline-input-sm" value="${item.pack || ''}" onchange="setSchoolField('${item.id}','pack', this.value)" type="number"></td>
        <td><input class="inline-input" value="${(item.notes || '').replace(/"/g,'&quot;')}" onchange="setSchoolField('${item.id}','notes', this.value)" type="text"></td>
        <td><button class="mini-btn danger" type="button" onclick="removeSchoolRecord('${item.id}')">Eliminar</button></td>
      </tr>
    `).join('');
  }

  const total = data.length;
  const active = data.filter(item => ['activo'].includes(item.stage)).length;
  const pipeline = data.filter(item => ['prospecto','contacto','reunion','propuesta'].includes(item.stage)).length;
  const renewal = data.filter(item => item.stage === 'renovacion').length;
  const red = data.filter(item => item.risk === 'rojo').length;
  document.getElementById('schoolCount') && (document.getElementById('schoolCount').textContent = String(total));
  document.getElementById('schoolActive') && (document.getElementById('schoolActive').textContent = String(active));
  document.getElementById('schoolPipeline') && (document.getElementById('schoolPipeline').textContent = String(pipeline));
  document.getElementById('schoolRenew') && (document.getElementById('schoolRenew').textContent = String(renewal));
  document.getElementById('schoolRiskRed') && (document.getElementById('schoolRiskRed').textContent = String(red));
  const insight = document.getElementById('schoolInsight');
  if (insight) {
    if (!total) insight.textContent = 'Sin cartera cargada todavía.';
    else if (red > 0) insight.textContent = 'Hay instituciones en riesgo rojo. Revisa objeciones, tiempos políticos y define próximo paso concreto.';
    else if (renewal > 0) insight.textContent = 'Tienes renovaciones abiertas. Conviene atacar primero los colegios más cercanos al ciclo.';
    else if (pipeline > active) insight.textContent = 'El pipeline está creciendo. Prioriza cierre de propuestas y seguimiento de reuniones.';
    else insight.textContent = 'La cartera está relativamente estable. Puedes concentrarte en renovación y calidad de ejecución.';
  }

  renderKpiDashboard();
}

function addSchoolRecord() {
  const name = document.getElementById('schoolName')?.value.trim();
  const level = document.getElementById('schoolLevel')?.value || 'Jardín';
  const stage = document.getElementById('schoolStage')?.value || 'prospecto';
  const contact = document.getElementById('schoolContact')?.value.trim();
  const renewal = document.getElementById('schoolRenewal')?.value.trim();
  const nextAction = document.getElementById('schoolNextAction')?.value.trim();
  const risk = document.getElementById('schoolRisk')?.value || 'verde';
  const pack = Number(document.getElementById('schoolPack')?.value || precioActual);
  const notes = document.getElementById('schoolNotes')?.value.trim();
  if (!name) return;
  const data = getSchoolBoardData();
  data.unshift({ id: 'sch_' + Date.now(), name, level, stage, contact, renewal, nextAction, risk, pack, notes });
  saveSchoolBoardData(data);
  ['schoolName','schoolContact','schoolRenewal','schoolNextAction','schoolNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const packEl = document.getElementById('schoolPack'); if (packEl) packEl.value = precioActual;
  document.getElementById('schoolStage') && (document.getElementById('schoolStage').value = 'prospecto');
  document.getElementById('schoolRisk') && (document.getElementById('schoolRisk').value = 'verde');
  renderSchoolBoard();
}

function setSchoolField(id, field, value) {
  const data = getSchoolBoardData().map(item => item.id === id ? { ...item, [field]: field === 'pack' ? Number(value || 0) : value } : item);
  saveSchoolBoardData(data);
  renderSchoolBoard();
}

function removeSchoolRecord(id) {
  saveSchoolBoardData(getSchoolBoardData().filter(item => item.id !== id));
  renderSchoolBoard();
}

function seedSchoolBoard() {
  if (getSchoolBoardData().length) return;
  saveSchoolBoardData(schoolBoardSeed);
  renderSchoolBoard();
}

function clearSchoolBoard() {
  if (!confirm('¿Vaciar la cartera de colegios?')) return;
  trackedRemoveItem('polar3_school_board');
  renderSchoolBoard();
}

function getFollowupData() {
  return JSON.parse(localStorage.getItem('polar3_followup_board') || '[]');
}

function saveFollowupData(data) {
  trackedSetItem('polar3_followup_board', JSON.stringify(data));
}

function renderFollowupBoard() {
  const rows = document.getElementById('followupRows');
  if (!rows) return;
  const data = getFollowupData();
  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted)">Sin controles cargados.</td></tr>';
  } else {
    rows.innerHTML = data.map(item => `
      <tr>
        <td><strong>${item.school || '—'}</strong></td>
        <td>${item.date || '—'}</td>
        <td>${item.course || '—'}</td>
        <td>
          <select class="inline-select type-${item.type}" onchange="setFollowupField('${item.id}','type', this.value)">
            <option value="ausente" ${item.type === 'ausente' ? 'selected' : ''}>Ausente</option>
            <option value="retoma" ${item.type === 'retoma' ? 'selected' : ''}>Retoma</option>
            <option value="pendiente" ${item.type === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          </select>
        </td>
        <td><input class="inline-input inline-input-sm" value="${item.count || 1}" onchange="setFollowupField('${item.id}','count', this.value)" type="number" min="1"></td>
        <td>
          <select class="inline-select status-${item.status}" onchange="setFollowupField('${item.id}','status', this.value)">
            <option value="abierto" ${item.status === 'abierto' ? 'selected' : ''}>Abierto</option>
            <option value="agendado" ${item.status === 'agendado' ? 'selected' : ''}>Agendado</option>
            <option value="resuelto" ${item.status === 'resuelto' ? 'selected' : ''}>Resuelto</option>
          </select>
        </td>
        <td><input class="inline-input" value="${item.nextAction || ''}" onchange="setFollowupField('${item.id}','nextAction', this.value)" type="text"></td>
        <td><input class="inline-input" value="${item.owner || ''}" onchange="setFollowupField('${item.id}','owner', this.value)" type="text"></td>
        <td><input class="inline-input" value="${(item.notes || '').replace(/"/g,'&quot;')}" onchange="setFollowupField('${item.id}','notes', this.value)" type="text"></td>
        <td><button class="mini-btn danger" type="button" onclick="removeFollowupRecord('${item.id}')">Eliminar</button></td>
      </tr>
    `).join('');
  }

  const total = data.length;
  const absent = data.filter(item => item.type === 'ausente').reduce((sum, item) => sum + Number(item.count || 0), 0);
  const retake = data.filter(item => item.type === 'retoma' && item.status !== 'resuelto').reduce((sum, item) => sum + Number(item.count || 0), 0);
  const open = data.filter(item => item.status !== 'resuelto').reduce((sum, item) => sum + Number(item.count || 0), 0);
  document.getElementById('followCountAll') && (document.getElementById('followCountAll').textContent = String(total));
  document.getElementById('followAbsent') && (document.getElementById('followAbsent').textContent = String(absent));
  document.getElementById('followRetake') && (document.getElementById('followRetake').textContent = String(retake));
  document.getElementById('followOpen') && (document.getElementById('followOpen').textContent = String(open));
  const insight = document.getElementById('followInsight');
  if (insight) {
    if (!total) insight.textContent = 'Sin pendientes cargados todavía.';
    else if (retake > 0) insight.textContent = 'Hay retomas abiertas. Define fecha o criterio de cierre antes de avanzar con producción final.';
    else if (absent > 0) insight.textContent = 'Existen ausentes registrados. Decide si se absorben en una retoma o se cierran como ausentes definitivos.';
    else if (open > 0) insight.textContent = 'Quedan pendientes operativos. Conviene cerrarlos antes de edición e impresión.';
    else insight.textContent = 'Control limpio: no quedan abiertos relevantes en esta vista.';
  }
  renderMobileOpsDashboard();
}

function addFollowupRecord() {
  const school = document.getElementById('followSchool')?.value.trim();
  const date = document.getElementById('followDate')?.value || '';
  const course = document.getElementById('followCourse')?.value.trim();
  const type = document.getElementById('followType')?.value || 'ausente';
  const count = Number(document.getElementById('followCount')?.value || 1);
  const status = document.getElementById('followStatus')?.value || 'abierto';
  const nextAction = document.getElementById('followNext')?.value.trim();
  const owner = document.getElementById('followOwner')?.value.trim();
  const notes = document.getElementById('followNotes')?.value.trim();
  if (!school || !course) return;
  const data = getFollowupData();
  data.unshift({ id: 'fl_' + Date.now(), school, date, course, type, count, status, nextAction, owner, notes });
  saveFollowupData(data);
  ['followSchool','followDate','followCourse','followNext','followOwner','followNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('followType') && (document.getElementById('followType').value = 'ausente');
  document.getElementById('followStatus') && (document.getElementById('followStatus').value = 'abierto');
  document.getElementById('followCount') && (document.getElementById('followCount').value = 1);
  renderFollowupBoard();
}

function setFollowupField(id, field, value) {
  const data = getFollowupData().map(item => item.id === id ? { ...item, [field]: field === 'count' ? Number(value || 0) : value } : item);
  saveFollowupData(data);
  renderFollowupBoard();
}

function removeFollowupRecord(id) {
  saveFollowupData(getFollowupData().filter(item => item.id !== id));
  renderFollowupBoard();
}

function seedFollowupBoard() {
  if (getFollowupData().length) return;
  saveFollowupData(followupSeed);
  renderFollowupBoard();
}

function clearFollowupBoard() {
  if (!confirm('¿Vaciar pendientes, ausentes y retomas?')) return;
  trackedRemoveItem('polar3_followup_board');
  renderFollowupBoard();
}


const paymentBoardUiState = {
  search: '',
  status: ''
};

function getPaymentStatusLabel(status) {
  return ({
    pendiente: 'Pendiente',
    observado: 'Observado',
    validado: 'Validado',
    liquidado: 'Liquidado'
  })[status] || 'Pendiente';
}

function getPaymentFilteredData(data = getPaymentBoardData()) {
  const search = String(paymentBoardUiState.search || '').trim().toLowerCase();
  const status = paymentBoardUiState.status || '';
  return data.filter(item => {
    const matchesStatus = !status || item.status === status;
    if (!matchesStatus) return false;
    if (!search) return true;
    const haystack = [item.school, item.name, item.course, item.receipt, item.note, item.date, item.status]
      .map(value => String(value || '').toLowerCase())
      .join(' ');
    return haystack.includes(search);
  });
}

function setPaymentSearch(value) {
  paymentBoardUiState.search = String(value || '').trim();
  renderPaymentBoard();
}

function setPaymentStatusFilter(value) {
  paymentBoardUiState.status = value || '';
  renderPaymentBoard();
}

function clearPaymentFilters() {
  paymentBoardUiState.search = '';
  paymentBoardUiState.status = '';
  const searchEl = document.getElementById('paymentSearch');
  const statusEl = document.getElementById('paymentFilterStatus');
  if (searchEl) searchEl.value = '';
  if (statusEl) statusEl.value = '';
  renderPaymentBoard();
}

function setPaymentQuickStatus(id, status) {
  setPaymentField(id, 'status', status);
}

function getPaymentBoardData() {
  const data = JSON.parse(localStorage.getItem('polar3_payment_board') || '[]');
  if (!Array.isArray(data)) return [];
  return data.map(item => ({
    ...item,
    school: String(item.school || '').trim(),
    name: String(item.name || '').trim(),
    course: String(item.course || '').trim(),
    receipt: String(item.receipt || '').trim(),
    note: String(item.note || '').trim(),
    date: normalizePaymentDate(item.date)
  }));
}

function savePaymentBoardData(data) {
  trackedSetItem('polar3_payment_board', JSON.stringify(data));
}


function renderPaymentBoard() {
  const rows = document.getElementById('paymentsBoardRows');
  const mobileList = document.getElementById('paymentMobileList');
  if (!rows) return;
  const data = getPaymentBoardData();
  const filteredData = getPaymentFilteredData(data);
  renderPaymentSchoolOptions();

  const emptyRow = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">Sin registros todavía.</td></tr>';
  const emptyFilteredRow = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">No hay registros para este filtro.</td></tr>';

  if (!data.length) {
    rows.innerHTML = emptyRow;
  } else if (!filteredData.length) {
    rows.innerHTML = emptyFilteredRow;
  } else {
    rows.innerHTML = filteredData.map(item => {
      const school = escapeHtml(item.school || '');
      const date = escapeHtml(item.date || '');
      const name = escapeHtml(item.name || '');
      const course = escapeHtml(item.course || '');
      const receipt = escapeHtml(item.receipt || '');
      const note = escapeHtml(item.note || '');
      return `
      <tr>
        <td>
          <input class="inline-input" list="paymentSchoolOptions" value="${school}" onchange="setPaymentField('${item.id}','school', this.value)" placeholder="Asignar colegio" type="text">
        </td>
        <td>
          <input class="inline-input inline-input-date" value="${date}" onchange="setPaymentField('${item.id}','date', this.value)" type="date">
        </td>
        <td><strong>${name || '—'}</strong></td>
        <td>${course || '—'}</td>
        <td>${money(item.amount)}</td>
        <td>
          <select class="inline-select status-${item.status}" onchange="setPaymentField('${item.id}','status', this.value)">
            <option value="pendiente" ${item.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="observado" ${item.status === 'observado' ? 'selected' : ''}>Observado</option>
            <option value="validado" ${item.status === 'validado' ? 'selected' : ''}>Validado</option>
            <option value="liquidado" ${item.status === 'liquidado' ? 'selected' : ''}>Liquidado</option>
          </select>
        </td>
        <td>${receipt || '—'}</td>
        <td>${note || '—'}</td>
        <td><button class="mini-btn danger" type="button" onclick="removePaymentRecord('${item.id}')">Eliminar</button></td>
      </tr>
    `;
    }).join('');
  }

  if (mobileList) {
    if (!data.length) {
      mobileList.innerHTML = '<div class="payment-mobile-empty">Todavía no hay registros de cobranzas.</div>';
    } else if (!filteredData.length) {
      mobileList.innerHTML = '<div class="payment-mobile-empty">No hay resultados con ese filtro.</div>';
    } else {
      mobileList.innerHTML = filteredData.map(item => {
        const school = escapeHtml(item.school || 'Sin institución');
        const name = escapeHtml(item.name || 'Sin nombre');
        const course = escapeHtml(item.course || 'Sin curso');
        const receipt = escapeHtml(item.receipt || 'Sin comprobante');
        const note = escapeHtml(item.note || 'Sin observación');
        const prettyDate = escapeHtml(formatCalendarDate(item.date));
        const statusLabel = escapeHtml(getPaymentStatusLabel(item.status));
        return `
        <article class="payment-mobile-card status-${item.status}">
          <div class="payment-mobile-card-top">
            <div>
              <div class="payment-mobile-school">${school}</div>
              <h4>${name}</h4>
              <p>${course}</p>
            </div>
            <div class="payment-mobile-amount-wrap">
              <strong class="payment-mobile-amount">${money(item.amount)}</strong>
              <span class="payment-status-pill status-${item.status}">${statusLabel}</span>
            </div>
          </div>
          <div class="payment-mobile-meta">
            <span>📅 ${prettyDate}</span>
            <span>🧾 ${receipt}</span>
          </div>
          <div class="payment-mobile-note">${note}</div>
          <div class="payment-mobile-edit-grid">
            <label class="payment-mobile-edit">
              <span>Fecha</span>
              <input class="inline-input inline-input-date" value="${escapeHtml(item.date || '')}" onchange="setPaymentField('${item.id}','date', this.value)" type="date">
            </label>
            <label class="payment-mobile-edit">
              <span>Estado</span>
              <select class="inline-select status-${item.status}" onchange="setPaymentField('${item.id}','status', this.value)">
                <option value="pendiente" ${item.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="observado" ${item.status === 'observado' ? 'selected' : ''}>Observado</option>
                <option value="validado" ${item.status === 'validado' ? 'selected' : ''}>Validado</option>
                <option value="liquidado" ${item.status === 'liquidado' ? 'selected' : ''}>Liquidado</option>
              </select>
            </label>
          </div>
          <div class="payment-mobile-actions">
            <button class="payment-chip-btn" type="button" onclick="setPaymentQuickStatus('${item.id}','pendiente')">Pend.</button>
            <button class="payment-chip-btn" type="button" onclick="setPaymentQuickStatus('${item.id}','observado')">Obs.</button>
            <button class="payment-chip-btn" type="button" onclick="setPaymentQuickStatus('${item.id}','validado')">Validar</button>
            <button class="payment-chip-btn primary" type="button" onclick="setPaymentQuickStatus('${item.id}','liquidado')">Liquidar</button>
            <button class="payment-chip-btn danger" type="button" onclick="removePaymentRecord('${item.id}')">Eliminar</button>
          </div>
        </article>`;
      }).join('');
    }
  }

  const total = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const pending = data.filter(item => ['pendiente','observado'].includes(item.status)).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const settled = data.filter(item => item.status === 'liquidado').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const assignedSchools = new Set(data.map(item => normalizeSchoolKey(item.school)).filter(Boolean)).size;
  const unassigned = data.filter(item => !normalizeSchoolKey(item.school)).length;
  const undated = data.filter(item => !normalizePaymentDate(item.date)).length;

  document.getElementById('payCount') && (document.getElementById('payCount').textContent = String(data.length));
  document.getElementById('payTotal') && (document.getElementById('payTotal').textContent = money(total));
  document.getElementById('payPending') && (document.getElementById('payPending').textContent = money(pending));
  document.getElementById('paySettled') && (document.getElementById('paySettled').textContent = money(settled));
  document.getElementById('paySchoolsLinked') && (document.getElementById('paySchoolsLinked').textContent = `${assignedSchools} vinculados · ${unassigned} sin colegio · ${undated} sin fecha`);

  const insight = document.getElementById('paymentInsight');
  if (insight) {
    if (!data.length) insight.textContent = 'Aún no hay datos cargados.';
    else if (undated > 0) insight.textContent = `Hay ${undated} cobro(s) sin fecha. Completa esa columna para habilitar KPIs confiables por período.`;
    else if (unassigned > 0) insight.textContent = `Hay ${unassigned} cobro(s) sin institución asignada. Completa esa columna para habilitar KPIs confiables por colegio.`;
    else if (pending > settled && pending > 0) insight.textContent = 'Hoy tienes más dinero en seguimiento que liquidado. Conviene atacar observados y pendientes antes de producir.';
    else if (settled >= total * 0.6) insight.textContent = 'Buen nivel de cierre: la mayor parte del tablero ya está liquidada o lista para conciliación.';
    else insight.textContent = 'Tablero equilibrado, pero todavía conviene revisar observados para no frenar producción.';
  }

  const feedback = document.getElementById('paymentFilterFeedback');
  if (feedback) {
    if (!data.length) feedback.textContent = 'Sin registros cargados todavía.';
    else if (!paymentBoardUiState.search && !paymentBoardUiState.status) feedback.textContent = `Mostrando todos los registros (${data.length}).`;
    else feedback.textContent = `Mostrando ${filteredData.length} de ${data.length} registro(s)${paymentBoardUiState.status ? ` · estado ${getPaymentStatusLabel(paymentBoardUiState.status).toLowerCase()}` : ''}${paymentBoardUiState.search ? ` · búsqueda “${paymentBoardUiState.search}”` : ''}.`;
  }

  syncKpiScopeSelectors(getKpiScope());
  renderKpiDashboard();
  renderMobileOpsDashboard();
}

function addPaymentRecord() {

  const school = document.getElementById('paymentSchool')?.value.trim();
  const name = document.getElementById('paymentName')?.value.trim();
  const course = document.getElementById('paymentCourse')?.value.trim();
  const date = normalizePaymentDate(document.getElementById('paymentDate')?.value) || getTodayIsoDate();
  const amount = parseInt(document.getElementById('paymentAmount')?.value || '0', 10);
  const status = document.getElementById('paymentStatus')?.value || 'pendiente';
  const receipt = document.getElementById('paymentReceipt')?.value.trim();
  const note = document.getElementById('paymentNote')?.value.trim();
  if (!name || !amount) return;
  const data = getPaymentBoardData();
  data.unshift({ id: 'pay_' + Date.now(), school, date, name, course, amount, status, receipt, note });
  savePaymentBoardData(data);
  ['paymentSchool','paymentName','paymentCourse','paymentAmount','paymentReceipt','paymentNote'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const statusEl = document.getElementById('paymentStatus'); if (statusEl) statusEl.value = 'pendiente';
  const dateEl = document.getElementById('paymentDate'); if (dateEl) dateEl.value = getTodayIsoDate();
  showToast('Registro de cobranza guardado.', 'success');
  renderPaymentBoard();
  const nextField = document.getElementById('paymentName');
  if (nextField) nextField.focus();
}

function setPaymentField(id, field, value) {
  const data = getPaymentBoardData().map(item => {
    if (item.id !== id) return item;
    let nextValue = value;
    if (field === 'school') nextValue = String(value || '').trim();
    if (field === 'date') nextValue = normalizePaymentDate(value);
    return { ...item, [field]: nextValue };
  });
  savePaymentBoardData(data);
  renderPaymentBoard();
}

function setPaymentStatus(id, status) {
  setPaymentField(id, 'status', status);
}

function removePaymentRecord(id) {
  const data = getPaymentBoardData().filter(item => item.id !== id);
  savePaymentBoardData(data);
  renderPaymentBoard();
}

function seedPaymentBoard() {
  if (getPaymentBoardData().length) return;
  savePaymentBoardData(paymentBoardSeed);
  renderPaymentBoard();
}

function clearPaymentBoard() {
  if (!confirm('¿Vaciar el tablero de cobranzas?')) return;
  trackedRemoveItem('polar3_payment_board');
  renderPaymentBoard();
}

function fillMissingPaymentDates() {
  const data = getPaymentBoardData();
  const missing = data.filter(item => !normalizePaymentDate(item.date)).length;
  if (!missing) {
    showToast('No hay registros sin fecha para completar.', 'warning');
    return;
  }
  const today = getTodayIsoDate();
  savePaymentBoardData(data.map(item => normalizePaymentDate(item.date) ? item : { ...item, date: today }));
  renderPaymentBoard();
  showToast(`Se completaron ${missing} fecha(s) faltante(s) con ${today}.`, 'success');
}

function getSimulatorValues() {
  const val = id => Number(document.getElementById(id)?.value || 0);
  return {
    students: val('simStudents'),
    conversion: val('simConversion') / 100,
    packPrice: val('simPackPrice'),
    extraAvg: val('simExtraAvg'),
    canonPct: val('simCanonPct') / 100,
    printCost: val('simPrintCost'),
    assistant: val('simAssistant'),
    travel: val('simTravel'),
    editHours: val('simEditHours'),
    hourRate: val('simHourRate')
  };
}

function updateSimulador() {
  const v = getSimulatorValues();
  const sales = Math.round(v.students * v.conversion);
  const base = sales * v.packPrice;
  const extras = sales * v.extraAvg;
  const gross = base + extras;
  const canon = gross * v.canonPct;
  const print = sales * v.printCost;
  const edit = v.editHours * v.hourRate;
  const direct = print + edit + v.assistant + v.travel;
  const net = gross - canon - direct;
  const ticket = v.students ? gross / v.students : 0;
  const margin = gross ? (net / gross) * 100 : 0;
  const safe = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  safe('simSales', String(sales));
  safe('simGross', money(gross));
  safe('simNet', money(net));
  safe('simTicket', money(ticket));
  safe('simBase', money(base));
  safe('simExtras', money(extras));
  safe('simCanon', money(canon));
  safe('simPrint', money(print));
  safe('simEdit', money(edit));
  safe('simDirect', money(direct));
  const decision = document.getElementById('simDecision');
  if (decision) {
    if (gross <= 0) decision.textContent = 'Sin ingresos estimados, el escenario no es utilizable.';
    else if (margin >= 35) decision.textContent = `Escenario sano: margen estimado ${margin.toFixed(1)}%. Buen candidato para priorizar o renovar.`;
    else if (margin >= 20) decision.textContent = `Escenario aceptable: margen estimado ${margin.toFixed(1)}%. Conviene revisar canon, extras o eficiencia de edición.`;
    else if (net > 0) decision.textContent = `Escenario justo: margen ${margin.toFixed(1)}%. Solo tomarlo si aporta volumen estratégico o apertura a crecer.`;
    else decision.textContent = `Escenario débil o negativo: margen ${margin.toFixed(1)}%. No cerrar sin cambiar precio, conversión, costos o alcance.`;
  }
  trackedSetItem('polar3_simulador', JSON.stringify({
    students: v.students, conversion: v.conversion * 100, packPrice: v.packPrice, extraAvg: v.extraAvg, canonPct: v.canonPct * 100, printCost: v.printCost, assistant: v.assistant, travel: v.travel, editHours: v.editHours, hourRate: v.hourRate
  }));
}

function syncSimulatorWithPack() {
  const input = document.getElementById('simPackPrice');
  if (input) input.value = precioActual;
  updateSimulador();
}

function loadSimulatorState() {
  const saved = JSON.parse(localStorage.getItem('polar3_simulador') || 'null');
  if (saved) {
    Object.entries(saved).forEach(([key, value]) => {
      const map = { students:'simStudents', conversion:'simConversion', packPrice:'simPackPrice', extraAvg:'simExtraAvg', canonPct:'simCanonPct', printCost:'simPrintCost', assistant:'simAssistant', travel:'simTravel', editHours:'simEditHours', hourRate:'simHourRate' };
      const el = document.getElementById(map[key]);
      if (el) el.value = value;
    });
  } else {
    const pack = document.getElementById('simPackPrice');
    if (pack) pack.value = precioActual;
  }
  updateSimulador();
}

function modalityCopy(modality) {
  const map = {
    'Básica': [
      'retratos individuales y foto grupal por curso',
      'una jornada prolija, simple de coordinar y sin sobrecarga institucional',
      'comunicación clara para familias y cooperadora'
    ],
    'Completa': [
      'retrato individual, foto grupal y complementos acordados',
      'más valor percibido sin perder orden operativo ni trazabilidad',
      'equilibrio entre cobertura, presentación y experiencia de jornada'
    ],
    'Institucional': [
      'cobertura ajustada al objetivo específico del colegio',
      'alcance definido desde el inicio para evitar ambigüedades',
      'posible adaptación a actos, piezas institucionales o requerimientos especiales'
    ]
  };
  return map[modality] || map['Completa'];
}

function audienceCopy(audience) {
  const map = {
    cooperadora: 'La propuesta está pensada para aliviar carga operativa, dar claridad de cobro y sostener una jornada ordenada para toda la comunidad.',
    directivos: 'La propuesta está pensada para cuidar la experiencia institucional, la privacidad, la organización del día y la comunicación con las familias.',
    mixto: 'La propuesta combina foco institucional y operativo, buscando una jornada clara para directivos, cooperadora, docentes y familias.'
  };
  return map[audience] || map.mixto;
}

function paymentModelCopy(model) {
  const map = {
    formulario: 'Los pedidos pueden gestionarse por formulario digital con comprobante obligatorio y aceptación visible de términos y condiciones.',
    sobres: 'El colegio puede optar por un esquema de sobres cerrados, con circuito claro de recepción y rendición.',
    mixto: 'El circuito puede combinar formulario digital y excepciones operativas puntuales definidas desde el inicio.'
  };
  return map[model] || map.formulario;
}

function updateProposalGenerator() {
  const school = document.getElementById('propSchool')?.value.trim() || 'la institución';
  const audience = document.getElementById('propAudience')?.value || 'cooperadora';
  const level = document.getElementById('propLevel')?.value || 'Jardín';
  const modality = document.getElementById('propModality')?.value || 'Completa';
  const students = Number(document.getElementById('propStudents')?.value || 0);
  const packPrice = Number(document.getElementById('propPackPrice')?.value || precioActual);
  const validity = Number(document.getElementById('propValidity')?.value || 7);
  const paymentModel = document.getElementById('propPaymentModel')?.value || 'formulario';
  const focus = document.getElementById('propFocus')?.value.trim() || 'orden, trazabilidad y una experiencia cuidada';
  const notes = document.getElementById('propNotes')?.value.trim();
  const bullets = modalityCopy(modality);
  const audienceLine = audienceCopy(audience);
  const paymentLine = paymentModelCopy(paymentModel);
  const estimated = students ? `La estimación base considera aproximadamente ${students} alumnos y un valor de pack de ${money(packPrice)}.` : `La propuesta se ajusta según el volumen real del colegio y la modalidad acordada.`;
  const preview = document.getElementById('proposalPreview');
  const html = `
    <div class="proposal-doc proposal-doc-sheet">
      <div class="proposal-kicker">Polar3 · propuesta preliminar</div>
      <div class="proposal-headline">
        <h3>Propuesta para ${school}</h3>
        <div class="proposal-meta">
          <span>${level}</span>
          <span>${modality}</span>
          <span>Validez ${validity} días</span>
        </div>
      </div>
      <p>${audienceLine}</p>
      <p>El enfoque general es sostener <strong>${focus}</strong>, evitando improvisación, sobrecarga interna y mensajes ambiguos.</p>
      <div class="proposal-box">
        <strong>Qué incluye esta modalidad</strong>
        <ul>${bullets.map(item => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div class="proposal-box">
        <strong>Cómo trabaja Polar3</strong>
        <ul>
          <li>Jornada ordenada, con circuito claro y lenguaje visual institucional.</li>
          <li>Trazabilidad operativa desde la toma hasta la entrega.</li>
          <li>Privacidad e integridad de imagen como criterio central, especialmente en menores.</li>
        </ul>
      </div>
      <div class="proposal-box proposal-box-soft">
        <strong>Circuito de cobro y condiciones base</strong>
        <p>${paymentLine}</p>
        <p>${estimated}</p>
      </div>
      ${notes ? `<div class="proposal-box"><strong>Notas / alcance específico</strong><p>${notes}</p></div>` : ''}
      <div class="proposal-box">
        <strong>Privacidad y resguardo</strong>
        <p>Las fotografías de menores se tratan con especial cuidado. No se publican sin autorización expresa y la edición corrige luz, color o detalles menores sin alterar identidad ni expresión.</p>
      </div>
      <div class="proposal-box proposal-box-cta">
        <strong>Siguiente paso sugerido</strong>
        <p>Si la modalidad les resulta adecuada, el siguiente paso es definir alcance, calendario tentativo, circuito de cobro y condiciones operativas para cerrar una propuesta final.</p>
      </div>
    </div>
  `;
  if (preview) preview.innerHTML = html;

  const plain = [
    `Propuesta Polar3 para ${school}`,
    '',
    `Público principal: ${audience}`,
    `Nivel: ${level}`,
    `Modalidad: ${modality}`,
    `Validez: ${validity} días`,
    '',
    audienceLine,
    '',
    `Enfoque: ${focus}.`,
    '',
    'Qué incluye:',
    ...bullets.map(item => `- ${item}`),
    '',
    'Circuito de cobro:',
    paymentLine,
    '',
    estimated,
    notes ? '' : null,
    notes ? `Notas: ${notes}` : null,
    '',
    'Privacidad: no se publican imágenes de menores sin autorización expresa y la edición no altera identidad ni expresión.',
    '',
    'Siguiente paso: definir alcance, calendario tentativo, circuito de cobro y condiciones operativas para cerrar una propuesta final.'
  ].filter(Boolean).join('\n');
  trackedSetItem('polar3_propuesta_texto', plain);
}

function copyProposalText() {
  const text = localStorage.getItem('polar3_propuesta_texto');
  if (!text) updateProposalGenerator();
  const finalText = localStorage.getItem('polar3_propuesta_texto') || '';
  if (!finalText) return;
  navigator.clipboard.writeText(finalText);
}

function syncProposalWithPack() {
  const input = document.getElementById('propPackPrice');
  if (input) input.value = precioActual;
  updateProposalGenerator();
}

function applyMeetingMode() {
  meetingMode = false;
  document.body.classList.remove('meeting-mode');
  try { localStorage.removeItem('polar3_meeting_mode'); } catch (e) {}
}

function toggleMeetingMode(forceValue) {
  meetingMode = false;
  document.body.classList.remove('meeting-mode');
  try { localStorage.removeItem('polar3_meeting_mode'); } catch (e) {}
}

// --- LÓGICA DEL HUB GOOGLE WORKSPACE ---
function getWorkspaceLinks() {
  return safeReadJsonKey('polar3_ws_links', {
    ws_planilla: '', ws_espejo: '', ws_forms: '', ws_encuesta: '', ws_docs: '', ws_drive: ''
  });
}

function saveWorkspaceLink(id) {
  const input = document.getElementById(id);
  if (!input) return;
  const links = getWorkspaceLinks();
  links[id] = input.value.trim();
  trackedSetItem('polar3_ws_links', JSON.stringify(links));
  showToast('Enlace guardado correctamente.', 'success');
}

function openWorkspaceLink(id) {
  const links = getWorkspaceLinks();
  const url = links[id];
  if (url && url.startsWith('http')) {
    window.open(url, '_blank');
  } else {
    showToast('Por favor, pega una URL válida (que empiece con http) antes de abrir.', 'warning');
  }
}

function loadWorkspaceUI() {
  const links = getWorkspaceLinks();
  Object.keys(links).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = links[id];
  });
}
// ----------------------------------------

function copyPlainText(text) {
  if (!text) return Promise.resolve(false);
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  try {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', 'readonly');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
    return Promise.resolve(true);
  } catch (error) {
    return Promise.resolve(false);
  }
}

function getCurrentSectionContext() {
  const hash = location.hash.replace('#', '') || 'inicio';
  const title = document.getElementById('currentSectionTitle')?.textContent?.trim() || 'Inicio';
  return { hash, title, workspace: currentWorkspace };
}

function getAiQuickTemplateValue() {
  const select = document.getElementById('aiTemplateSelect');
  return select?.value || localStorage.getItem('polar3_ai_template') || 'consulta';
}

function getAiQuickNotesValue() {
  const notes = document.getElementById('aiQuickNotes')?.value || '';
  return notes.trim();
}

function buildAiQuickPrompt() {
  const template = getAiQuickTemplateValue();
  const notes = getAiQuickNotesValue();
  const ctx = getCurrentSectionContext();
  const contextLine = `Contexto Polar[3]: sección ${ctx.title} (${ctx.hash}), espacio ${ctx.workspace}.`;
  const common = 'Responde en español, directo, breve y accionable. Si falta un dato, dilo con claridad y no inventes.';
  let body = '';
  switch (template) {
    case 'cobranzas':
      body = 'Actúa como apoyo administrativo para fotografía escolar. Ayúdame con seguimiento de pagos, redacción breve de mensajes, orden de estados y próximos pasos.';
      break;
    case 'jornada':
      body = 'Actúa como coordinador operativo de una jornada de fotografía escolar. Ayúdame con checklist, tiempos, contingencias, retomas y organización del día.';
      break;
    case 'comercial':
      body = 'Actúa como consultor comercial para fotografía escolar en Argentina. Ayúdame a redactar mensajes, objeciones, propuestas y seguimiento de instituciones.';
      break;
    case 'kpis':
      body = 'Actúa como analista de negocio para fotografía escolar. Ayúdame a interpretar KPIs, detectar alertas y proponer decisiones concretas.';
      break;
    default:
      body = 'Actúa como asistente operativo para mi negocio de fotografía escolar Polar[3].';
      break;
  }
  const userRequest = notes || 'Necesito una consulta rápida con foco práctico.';
  return `${body}
${contextLine}
${common}
Consulta puntual: ${userRequest}`.trim();
}

function syncAiQuickComposer() {
  const preview = document.getElementById('aiQuickPromptPreview');
  const contextChip = document.getElementById('aiQuickContextChip');
  const template = getAiQuickTemplateValue();
  const ctx = getCurrentSectionContext();
  if (contextChip) contextChip.textContent = `${ctx.title} · ${ctx.workspace}`;
  if (preview) preview.value = buildAiQuickPrompt();
  try {
    trackedSetItem('polar3_ai_template', JSON.stringify(template), false);
    trackedSetItem('polar3_ai_notes', JSON.stringify(document.getElementById('aiQuickNotes')?.value || ''), false);
  } catch (error) {}
}

function setAiQuickTemplate(value) {
  const select = document.getElementById('aiTemplateSelect');
  if (select) select.value = value;
  syncAiQuickComposer();
}

function loadAiQuickComposer() {
  const savedTemplate = safeReadJsonKey('polar3_ai_template', 'consulta');
  const savedNotes = safeReadJsonKey('polar3_ai_notes', '');
  const select = document.getElementById('aiTemplateSelect');
  const notes = document.getElementById('aiQuickNotes');
  if (select) select.value = typeof savedTemplate === 'string' ? savedTemplate : 'consulta';
  if (notes) notes.value = typeof savedNotes === 'string' ? savedNotes : '';
  syncAiQuickComposer();
}

function focusAiQuickPanel() {
  showSection('appcenter');
  setTimeout(() => {
    document.getElementById('aiQuickPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('aiQuickNotes')?.focus();
  }, 120);
}

function copyAiQuickPrompt() {
  const prompt = buildAiQuickPrompt();
  copyPlainText(prompt).then(success => {
    showToast(success ? 'Prompt copiado.' : 'No pude copiar el prompt automáticamente.', success ? 'success' : 'warning');
  });
}

function isAndroidLikeDevice() {
  return /Android/i.test(navigator.userAgent || '');
}

function openAiQuickProvider(provider) {
  const webUrl = AI_PROVIDER_URLS[provider];
  const intentUrl = AI_PROVIDER_INTENTS[provider];
  if (!webUrl) return;
  const label = provider === 'chatgpt' ? 'ChatGPT' : provider === 'gemini' ? 'Gemini' : 'Claude';
  const prompt = buildAiQuickPrompt();

  copyPlainText(prompt).then(success => {
    showToast(success ? `Prompt copiado. Intentando abrir ${label}.` : `Intentando abrir ${label}. Si hace falta, copia el prompt manualmente.`, success ? 'success' : 'info');
  });

  if (isAndroidLikeDevice() && intentUrl) {
    let fallbackUsed = false;
    const fallback = () => {
      if (fallbackUsed || document.hidden) return;
      fallbackUsed = true;
      window.open(webUrl, '_blank', 'noopener');
    };
    setTimeout(fallback, 900);
    const anchor = document.createElement('a');
    anchor.href = intentUrl;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  window.open(webUrl, '_blank', 'noopener');
}

function openPolarWhatsApp() {
  const ctx = getCurrentSectionContext();
  const text = `Hola Adrián, consulta rápida desde Polar[3]. Contexto: ${ctx.title}.`;
  const url = `https://wa.me/5491155238266?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
}

function openPolarMail() {
  const ctx = getCurrentSectionContext();
  const subject = `Polar[3] · Consulta desde ${ctx.title}`;
  const body = `Hola Adrián,\n\nTe escribo desde Polar[3].\nContexto: ${ctx.title}.\n\nConsulta:\n`;
  window.location.href = `mailto:polar3fotografia@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function isPwaSecureContext() {
  return location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
}

function isStandalonePwa() {
  return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

function updatePwaUi() {
  const modeChip = document.getElementById('pwaModeChip');
  const offlineChip = document.getElementById('pwaOfflineChip');
  const scopeChip = document.getElementById('pwaScopeChip');
  const installBtn = document.getElementById('pwaInstallBtn');
  const mobileInstallPanel = document.getElementById('mobileInstallPanel');
  const mobileInstallTitle = document.getElementById('mobileInstallTitle');
  const mobileInstallMeta = document.getElementById('mobileInstallMeta');
  const mobileInstallActionBtn = document.getElementById('mobileInstallActionBtn');
  const standalone = isStandalonePwa();
  const controlled = !!navigator.serviceWorker?.controller;
  const canInstall = !standalone && !!deferredInstallPrompt;
  const secureContextReady = isPwaSecureContext();

  if (modeChip) {
    modeChip.textContent = standalone ? 'Modo app activo' : 'Modo navegador';
    modeChip.dataset.tone = standalone ? 'success' : 'info';
  }

  if (offlineChip) {
    if (!('serviceWorker' in navigator)) {
      offlineChip.textContent = 'Cache web: no soportado';
      offlineChip.dataset.tone = 'warning';
    } else if (!secureContextReady) {
      offlineChip.textContent = 'Cache web: requiere localhost / HTTPS';
      offlineChip.dataset.tone = 'warning';
    } else if (controlled) {
      offlineChip.textContent = `${PWA_CACHE_LABEL}: activo`;
      offlineChip.dataset.tone = 'success';
    } else {
      offlineChip.textContent = `${PWA_CACHE_LABEL}: pendiente`;
      offlineChip.dataset.tone = 'info';
    }
  }

  if (scopeChip) {
    if (!secureContextReady) {
      scopeChip.textContent = 'Instalable solo desde localhost / HTTPS';
      scopeChip.dataset.tone = 'warning';
    } else if (canInstall) {
      scopeChip.textContent = 'Instalación lista en este navegador';
      scopeChip.dataset.tone = 'success';
    } else if (standalone) {
      scopeChip.textContent = 'App instalada en este dispositivo';
      scopeChip.dataset.tone = 'success';
    } else {
      scopeChip.textContent = 'PWA lista; el aviso depende del navegador';
      scopeChip.dataset.tone = 'info';
    }
  }

  if (installBtn) installBtn.hidden = !canInstall;

  if (mobileInstallPanel && mobileInstallTitle && mobileInstallMeta && mobileInstallActionBtn) {
    mobileInstallPanel.hidden = standalone;
    if (!secureContextReady) {
      mobileInstallTitle.textContent = 'Instalación deshabilitada en este contexto';
      mobileInstallMeta.textContent = 'Para instalar Polar[3] abre la app desde HTTPS o localhost. Si entraste desde archivo local, no se podrá instalar.';
      mobileInstallActionBtn.textContent = 'Ver centro de app';
      mobileInstallActionBtn.onclick = () => showSection('appcenter');
    } else if (canInstall) {
      mobileInstallTitle.textContent = 'Polar[3] lista para instalar';
      mobileInstallMeta.textContent = 'Puedes instalarla ahora. Si ya la agregaste a pantalla principal, ábrela desde el icono para evitar la barra del navegador.';
      mobileInstallActionBtn.textContent = 'Instalar / abrir como app';
      mobileInstallActionBtn.onclick = () => installPolarApp();
    } else {
      mobileInstallTitle.textContent = 'Abrir desde el icono para usar modo app';
      mobileInstallMeta.textContent = 'Si ya la agregaste a pantalla principal, cierra esta pestaña y abre Polar[3] desde el icono del teléfono. Si no, usa el menú del navegador y elige “Agregar a pantalla principal”.';
      mobileInstallActionBtn.textContent = 'Centro de app';
      mobileInstallActionBtn.onclick = () => showSection('appcenter');
    }
  }
}

async function registerPolarServiceWorker() {
  if (!('serviceWorker' in navigator) || !isPwaSecureContext()) {
    updatePwaUi();
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    registration.addEventListener('updatefound', updatePwaUi);
    navigator.serviceWorker.addEventListener('controllerchange', updatePwaUi);
  } catch (error) {
    console.warn('No pude registrar el service worker de Polar[3].', error);
  }
  updatePwaUi();
}

async function installPolarApp() {
  if (isStandalonePwa()) {
    showToast('Polar[3] ya está abierta en modo app.', 'success');
    return;
  }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } catch (error) {
      console.warn('La instalación PWA fue cancelada o no respondió.', error);
    }
    deferredInstallPrompt = null;
    updatePwaUi();
    return;
  }
  if (!isPwaSecureContext()) {
    showToast('Para instalar Polar[3] como app debes abrirla desde localhost o HTTPS, no directamente como archivo local.', 'warning');
    return;
  }
  showToast('Si tu navegador no muestra el aviso, usa el menú y elige “Instalar app” o “Agregar a pantalla de inicio”.', 'info');
}

function initPwa() {
  updatePwaUi();
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updatePwaUi();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('Polar[3] quedó instalada como app.', 'success');
    updatePwaUi();
  });
  window.addEventListener('online', updatePwaUi);
  window.addEventListener('offline', updatePwaUi);
  document.addEventListener('visibilitychange', updatePwaUi);
  if (window.matchMedia) {
    const mq = window.matchMedia('(display-mode: standalone)');
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', updatePwaUi);
    else if (typeof mq.addListener === 'function') mq.addListener(updatePwaUi);
  }
  registerPolarServiceWorker();
}

function initEvents() {
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', evt => {
      evt.preventDefault();
      showSection(link.dataset.section);
    });
  });

  const modal = document.getElementById('modal-precio');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === this) cerrarModal();
    });
  }

  const input = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');
  const backupInput = document.getElementById('backupFileInput');
  if (input) {
    input.addEventListener('input', () => renderSearchResults(input.value));
    input.addEventListener('keydown', evt => {
      const items = [...document.querySelectorAll('.search-item')];
      if (!items.length) return;
      if (evt.key === 'ArrowDown') {
        evt.preventDefault();
        searchActiveIndex = Math.min(searchActiveIndex + 1, items.length - 1);
        syncSearchActiveItem();
      }
      if (evt.key === 'ArrowUp') {
        evt.preventDefault();
        searchActiveIndex = Math.max(searchActiveIndex - 1, 0);
        syncSearchActiveItem();
      }
      if (evt.key === 'Enter' && searchActiveIndex >= 0) {
        evt.preventDefault();
        navigateFromSearch(items[searchActiveIndex].dataset.target);
      }
      if (evt.key === 'Escape') {
        input.value = '';
        renderSearchResults('');
        input.blur();
      }
    });
  }

  document.addEventListener('click', evt => {
    if (!evt.target.closest('.search-wrap')) {
      results.hidden = true;
    }
  });

  if (backupInput) {
    backupInput.addEventListener('change', evt => {
      const file = evt.target?.files?.[0];
      handleBackupImportFile(file);
    });
  }

  document.querySelectorAll('[data-calendar-notes]').forEach(field => {
    field.addEventListener('input', evt => {
      setCalendarPlannerNotes(field.dataset.calendarNotes, evt.target.value);
    });
  });

  document.querySelectorAll('[data-day-sheet-field]').forEach(field => {
    field.addEventListener('input', evt => {
      setCalendarDaySheetField(field.dataset.daySheetField, evt.target.value);
    });
  });

  document.querySelectorAll('[data-day-check-item]').forEach(input => {
    input.addEventListener('change', evt => {
      setCalendarDayChecklistItem(input.dataset.dayCheckItem, evt.target.checked);
    });
  });

  ['simStudents','simConversion','simPackPrice','simExtraAvg','simCanonPct','simPrintCost','simAssistant','simTravel','simEditHours','simHourRate'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', updateSimulador); });
  ['propSchool','propAudience','propLevel','propModality','propStudents','propPackPrice','propValidity','propPaymentModel','propFocus','propNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', updateProposalGenerator); if (el) el.addEventListener('change', updateProposalGenerator); });

  document.addEventListener('keydown', evt => {
    if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'k') {
      evt.preventDefault();
      input?.focus();
      input?.select();
    }
    if (evt.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      evt.preventDefault();
      input?.focus();
    }
  });

  window.addEventListener('hashchange', () => {
    const target = location.hash.replace('#', '') || 'inicio';
    showSection(target, false);
  });

  window.addEventListener('scroll', handleTopbarAutoCollapse, { passive: true });
  window.addEventListener('resize', () => { lastScrollY = window.scrollY || window.pageYOffset || 0; handleTopbarAutoCollapse(); syncCalendarMobileLayout(); });
  document.addEventListener('focusin', evt => {
    if (evt.target && ['INPUT','TEXTAREA','SELECT'].includes(evt.target.tagName)) setTopbarCollapsed(false, { force: true });
  });
  window.addEventListener('afterprint', clearCalendarPrintMode);
}


function initApp() {
  pruneDeprecatedUi();
  actualizarPreciosEnApp();
  loadChecklist();
  loadSimulatorState();
  loadWorkspaceUI();
  renderSchoolBoard();
  renderFollowupBoard();
  renderPaymentBoard();
  renderKpiDashboard();
  renderCalendarPlanner();
  syncPaymentDateDefault();
  updateProposalGenerator();
  buildSearchIndex();
  initEvents();
  initPwa();
  loadAiQuickComposer();
  renderMobileOpsDashboard();
  updateBackupUI();
  applyWorkspaceState();
  applyMeetingMode();
  handleTopbarAutoCollapse();
  document.body.classList.remove('focus-mode');
  try { localStorage.removeItem('polar3_focus_mode'); } catch (e) {}
  const target = location.hash.replace('#', '') || workspaceDefaults[currentWorkspace] || 'inicio';
  showSection(target, false);
  appReadyForDirtyTracking = true;
  updateBackupUI();
  maybeShowBackupReminderToast();
}

window.showSection = showSection;
window.toggleGroup = toggleGroup;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openPolarWhatsApp = openPolarWhatsApp;
window.openPolarMail = openPolarMail;
window.focusAiQuickPanel = focusAiQuickPanel;
window.setCalendarMobileOpenMonth = setCalendarMobileOpenMonth;
window.openCalendarCurrentMonth = openCalendarCurrentMonth;
window.openCalendarNextPlannedMonth = openCalendarNextPlannedMonth;
window.setAiQuickTemplate = setAiQuickTemplate;
window.syncAiQuickComposer = syncAiQuickComposer;
window.copyAiQuickPrompt = copyAiQuickPrompt;
window.openAiQuickProvider = openAiQuickProvider;
window.toggleAcc = toggleAcc;
window.toggleCheck = toggleCheck;
window.resetChecklist = resetChecklist;
window.copyScript = copyScript;
window.filterGlosario = filterGlosario;
window.editarPrecio = editarPrecio;
window.guardarPrecio = guardarPrecio;
window.cerrarModal = cerrarModal;
window.printCurrentSection = printCurrentSection;
window.toggleFocusMode = toggleFocusMode;
window.switchWorkspace = switchWorkspace;
window.updateSimulador = updateSimulador;
window.syncSimulatorWithPack = syncSimulatorWithPack;
window.syncBackupPrefs = syncBackupPrefs;
window.clearBackupHistory = clearBackupHistory;
window.addSchoolRecord = addSchoolRecord;
window.setSchoolField = setSchoolField;
window.removeSchoolRecord = removeSchoolRecord;
window.seedSchoolBoard = seedSchoolBoard;
window.clearSchoolBoard = clearSchoolBoard;
window.addFollowupRecord = addFollowupRecord;
window.setFollowupField = setFollowupField;
window.removeFollowupRecord = removeFollowupRecord;
window.seedFollowupBoard = seedFollowupBoard;
window.clearFollowupBoard = clearFollowupBoard;
window.addPaymentRecord = addPaymentRecord;
window.setPaymentField = setPaymentField;
window.setPaymentStatus = setPaymentStatus;
window.removePaymentRecord = removePaymentRecord;
window.seedPaymentBoard = seedPaymentBoard;
window.clearPaymentBoard = clearPaymentBoard;
window.fillMissingPaymentDates = fillMissingPaymentDates;
window.setKpiTicketMode = setKpiTicketMode;
window.setKpiScope = setKpiScope;
window.setKpiPeriodMode = setKpiPeriodMode;
window.setKpiPeriodValue = setKpiPeriodValue;
window.updateProposalGenerator = updateProposalGenerator;
window.copyProposalText = copyProposalText;
window.syncProposalWithPack = syncProposalWithPack;
window.toggleMeetingMode = toggleMeetingMode;
window.exportBackupJson = exportBackupJson;
window.triggerBackupImport = triggerBackupImport;
window.saveWorkspaceLink = saveWorkspaceLink;
window.openWorkspaceLink = openWorkspaceLink;
window.seedCalendarPlanner = seedCalendarPlanner;
window.clearCalendarPlanner = clearCalendarPlanner;
window.printCalendarPlanner = printCalendarPlanner;
window.printCalendarDerived = printCalendarDerived;
window.setCalendarDaySheetField = setCalendarDaySheetField;
window.setCalendarDayChecklistItem = setCalendarDayChecklistItem;
window.setCalendarPrintReference = setCalendarPrintReference;
window.setCalendarPrintReferenceToday = setCalendarPrintReferenceToday;
window.setCalendarSchoolFilter = setCalendarSchoolFilter;
window.addCalendarPlannerItem = addCalendarPlannerItem;
window.setCalendarPlannerItemField = setCalendarPlannerItemField;
window.removeCalendarPlannerItem = removeCalendarPlannerItem;
window.installPolarApp = installPolarApp;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}