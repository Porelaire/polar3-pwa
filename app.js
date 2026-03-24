let precioActual = parseInt(localStorage.getItem('polar3_precio')) || 15000;
const sectionMap = {
  inicio: 'sec-inicio',
  appcenter: 'sec-appcenter',
  calendario: 'sec-calendario',
  captacion: 'sec-captacion',
  scripts: 'sec-scripts',
  familias: 'sec-familias',
  marketing: 'sec-marketing',
  cartera: 'sec-cartera',
  institucional: 'sec-institucional',
  modalidades: 'sec-modalidades',
  propuesta: 'sec-propuesta',
  marca: 'sec-marca',
  checklist: 'sec-checklist',
  seguimiento: 'sec-seguimiento',
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
  workspace: 'sec-workspace'
};
const legacyRedirects = {
  quien: 'institucional',
  pack: 'modalidades',
  compromisos: 'marca',
  flujo: 'calendario',
  economico: 'simulador',
  captura: 'checklist',
  iluminacion: 'checklist',
  lightroom: 'qa',
  photoshop: 'qa',
  montaje: 'qa',
  imprenta: 'qa',
  archivos: 'respaldos',
  roles: 'checklist',
  onboarding: 'appcenter',
  glosario: 'appcenter',
  'legal-consolidado': 'forms',
  'legal-resumen': 'forms',
  privacidad: 'forms'
};
const sectionSpaces = {
  inicio: ['operativo', 'comercial'],
  appcenter: ['operativo', 'comercial'],
  calendario: ['operativo'],
  captacion: ['operativo', 'comercial'],
  scripts: ['operativo', 'comercial'],
  familias: ['operativo', 'comercial'],
  marketing: ['operativo', 'comercial'],
  cartera: ['operativo', 'comercial'],
  institucional: ['comercial'],
  modalidades: ['comercial'],
  propuesta: ['comercial'],
  marca: ['comercial'],
  checklist: ['operativo'],
  seguimiento: ['operativo'],
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
  workspace: ['operativo', 'comercial']
};
const workspaceDefaults = {
  operativo: 'inicio',
  comercial: 'institucional'
};
const VALID_WORKSPACES = ['operativo', 'comercial'];
let currentWorkspace = localStorage.getItem('polar3_workspace') || 'operativo';
if (!VALID_WORKSPACES.includes(currentWorkspace)) currentWorkspace = 'operativo';
let meetingMode = localStorage.getItem('polar3_meeting_mode') === '1';
const POLAR3_STORAGE_PREFIX = 'polar3_';
const BACKUP_META_KEY = 'polar3_backup_meta';
const BACKUP_HISTORY_KEY = 'polar3_backup_history';
const BACKUP_PREFS_KEY = 'polar3_backup_prefs';
const BACKUP_HISTORY_LIMIT = 40;
let toastTimer = null;
let backupReminderShown = false;
let appReadyForDirtyTracking = false;

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

function updateBackupUI() {
  updateBackupChip();
  updateBackupReminderUI();
  renderBackupAdmin();
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
  { id: 'ex1', name: 'Sofía Pérez', course: 'Sala 5 A', amount: 15000, status: 'validado', receipt: 'MP-3021', note: 'Pack base' },
  { id: 'ex2', name: 'Tomás Díaz', course: 'Sala 4 B', amount: 15000, status: 'observado', receipt: 'Comprobante ilegible', note: 'Pedir reenvío' },
  { id: 'ex3', name: 'Emma Roldán', course: 'Sala 5 A', amount: 17500, status: 'liquidado', receipt: 'Transferencia', note: 'Pack + extra digital' }
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

function switchWorkspace(workspace, preferredSection = null) {
  if (!VALID_WORKSPACES.includes(workspace)) workspace = 'operativo';
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
  id = legacyRedirects[id] || id;
  if (!sectionMap[id]) id = 'inicio';
  ensureWorkspaceForSection(id);
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionMap[id]);
  if (target) target.classList.add('active');
  document.querySelectorAll('[data-section]').forEach(a => a.classList.remove('active'));
  document.querySelectorAll(`[data-section="${id}"]`).forEach(a => a.classList.add('active'));
  openGroupForSection(id);
  updateTopbar(id);
  if (pushHash && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  const scrollHost = document.getElementById('main');
  const behavior = 'instant' in window ? 'instant' : 'auto';
  scrollHost?.scrollTo({ top: 0, behavior });
  window.scrollTo({ top: 0, behavior });
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
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('open');
}

function toggleAcc(header) {
  const item = header.closest('.faq-item, .accordion-item');
  item?.classList.toggle('open');
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
  searchIndex = Object.entries(sectionMap).map(([key, id]) => {
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
  document.body.classList.toggle('focus-mode');
  trackedSetItem('polar3_focus_mode', document.body.classList.contains('focus-mode') ? '1' : '0');
}

function getSchoolBoardData() {
  return JSON.parse(localStorage.getItem('polar3_school_board') || '[]');
}

function saveSchoolBoardData(data) {
  trackedSetItem('polar3_school_board', JSON.stringify(data));
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

function getPaymentBoardData() {
  return JSON.parse(localStorage.getItem('polar3_payment_board') || '[]');
}

function savePaymentBoardData(data) {
  trackedSetItem('polar3_payment_board', JSON.stringify(data));
}

function renderPaymentBoard() {
  const rows = document.getElementById('paymentsBoardRows');
  if (!rows) return;
  const data = getPaymentBoardData();
  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Sin registros todavía.</td></tr>';
  } else {
    rows.innerHTML = data.map(item => `
      <tr>
        <td><strong>${item.name || '—'}</strong></td>
        <td>${item.course || '—'}</td>
        <td>${money(item.amount)}</td>
        <td>
          <select class="inline-select status-${item.status}" onchange="setPaymentStatus('${item.id}', this.value)">
            <option value="pendiente" ${item.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="observado" ${item.status === 'observado' ? 'selected' : ''}>Observado</option>
            <option value="validado" ${item.status === 'validado' ? 'selected' : ''}>Validado</option>
            <option value="liquidado" ${item.status === 'liquidado' ? 'selected' : ''}>Liquidado</option>
          </select>
        </td>
        <td>${item.receipt || '—'}</td>
        <td>${item.note || '—'}</td>
        <td><button class="mini-btn danger" type="button" onclick="removePaymentRecord('${item.id}')">Eliminar</button></td>
      </tr>
    `).join('');
  }

  const total = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const pending = data.filter(item => ['pendiente','observado'].includes(item.status)).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const settled = data.filter(item => item.status === 'liquidado').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  document.getElementById('payCount') && (document.getElementById('payCount').textContent = String(data.length));
  document.getElementById('payTotal') && (document.getElementById('payTotal').textContent = money(total));
  document.getElementById('payPending') && (document.getElementById('payPending').textContent = money(pending));
  document.getElementById('paySettled') && (document.getElementById('paySettled').textContent = money(settled));

  const insight = document.getElementById('paymentInsight');
  if (insight) {
    if (!data.length) insight.textContent = 'Aún no hay datos cargados.';
    else if (pending > settled && pending > 0) insight.textContent = 'Hoy tienes más dinero en seguimiento que liquidado. Conviene atacar observados y pendientes antes de producir.';
    else if (settled >= total * 0.6) insight.textContent = 'Buen nivel de cierre: la mayor parte del tablero ya está liquidada o lista para conciliación.';
    else insight.textContent = 'Tablero equilibrado, pero todavía conviene revisar observados para no frenar producción.';
  }
}

function addPaymentRecord() {
  const name = document.getElementById('paymentName')?.value.trim();
  const course = document.getElementById('paymentCourse')?.value.trim();
  const amount = parseInt(document.getElementById('paymentAmount')?.value || '0', 10);
  const status = document.getElementById('paymentStatus')?.value || 'pendiente';
  const receipt = document.getElementById('paymentReceipt')?.value.trim();
  const note = document.getElementById('paymentNote')?.value.trim();
  if (!name || !amount) return;
  const data = getPaymentBoardData();
  data.unshift({ id: 'pay_' + Date.now(), name, course, amount, status, receipt, note });
  savePaymentBoardData(data);
  ['paymentName','paymentCourse','paymentAmount','paymentReceipt','paymentNote'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const statusEl = document.getElementById('paymentStatus'); if (statusEl) statusEl.value = 'pendiente';
  renderPaymentBoard();
}

function setPaymentStatus(id, status) {
  const data = getPaymentBoardData().map(item => item.id === id ? { ...item, status } : item);
  savePaymentBoardData(data);
  renderPaymentBoard();
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
  document.body.classList.toggle('meeting-mode', !!meetingMode);
  const btn = document.getElementById('meetingModeBtn');
  const chip = document.getElementById('modeChip');
  const strip = document.getElementById('meetingStrip');
  if (btn) {
    btn.classList.toggle('active-mode', !!meetingMode);
    btn.textContent = meetingMode ? 'Salir reunión' : 'Modo reunión';
  }
  if (chip) chip.textContent = meetingMode ? 'Modo: Reunión' : 'Modo: Interno';
  if (strip) strip.hidden = !meetingMode;
}

function toggleMeetingMode(forceValue) {
  meetingMode = typeof forceValue === 'boolean' ? forceValue : !meetingMode;
  trackedSetItem('polar3_meeting_mode', meetingMode ? '1' : '0');
  applyMeetingMode();
  if (meetingMode) switchWorkspace('comercial', 'institucional');
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

function initEvents() {
  document.addEventListener('click', evt => {
    const sectionTrigger = evt.target.closest('[data-section]');
    if (sectionTrigger) {
      evt.preventDefault();
      showSection(sectionTrigger.dataset.section);
      return;
    }

    const workspaceTrigger = evt.target.closest('[data-action="switch-workspace"][data-workspace]');
    if (workspaceTrigger) {
      evt.preventDefault();
      switchWorkspace(workspaceTrigger.dataset.workspace);
      return;
    }

    const actionTrigger = evt.target.closest('[data-action]');
    if (actionTrigger) {
      const action = actionTrigger.dataset.action;
      if (action === 'toggle-sidebar') return void toggleSidebar();
      if (action === 'close-sidebar') return void closeSidebar();
      if (action === 'toggle-group') return void toggleGroup(actionTrigger.dataset.group);
      if (action === 'toggle-focus') return void toggleFocusMode();
      if (action === 'toggle-meeting') return void toggleMeetingMode();
      if (action === 'exit-meeting') return void toggleMeetingMode(false);
      if (action === 'import-backup') return void triggerBackupImport();
      if (action === 'export-backup') return void exportBackupJson();
      if (action === 'print-section') return void printCurrentSection();
    }
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
    const hashTarget = location.hash.replace('#', '');
    const target = legacyRedirects[hashTarget] || hashTarget || 'inicio';
    showSection(target, false);
  });
}

function initApp() {
  actualizarPreciosEnApp();
  loadChecklist();
  loadSimulatorState();
  loadWorkspaceUI();
  renderSchoolBoard();
  renderFollowupBoard();
  renderPaymentBoard();
  updateProposalGenerator();
  buildSearchIndex();
  initEvents();
  updateBackupUI();
  applyWorkspaceState();
  applyMeetingMode();
  if (localStorage.getItem('polar3_focus_mode') === '1') {
    document.body.classList.add('focus-mode');
  }
  const hashTarget = location.hash.replace('#', '');
  const target = legacyRedirects[hashTarget] || hashTarget || workspaceDefaults[currentWorkspace] || 'inicio';
  showSection(target, false);
  appReadyForDirtyTracking = true;
  updateBackupUI();
  maybeShowBackupReminderToast();
}

window.showSection = showSection;
window.toggleGroup = toggleGroup;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
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
window.setPaymentStatus = setPaymentStatus;
window.removePaymentRecord = removePaymentRecord;
window.seedPaymentBoard = seedPaymentBoard;
window.clearPaymentBoard = clearPaymentBoard;
window.updateProposalGenerator = updateProposalGenerator;
window.copyProposalText = copyProposalText;
window.syncProposalWithPack = syncProposalWithPack;
window.toggleMeetingMode = toggleMeetingMode;
window.exportBackupJson = exportBackupJson;
window.triggerBackupImport = triggerBackupImport;
window.saveWorkspaceLink = saveWorkspaceLink;
window.openWorkspaceLink = openWorkspaceLink;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}