/**
 * app.js — Polar[3] PWA v2.7.12
 * Punto de entrada principal (ES Module).
 * Importa los módulos extraídos y conecta todo al DOM.
 *
 * NOTA: Las funciones de Calendario (renderCalendarPlanner, etc.)
 * se mantienen aquí inline pendientes de extracción al CalendarModule.
 */

// ─────────────────────────────────────────────
// IMPORTS
// ─────────────────────────────────────────────

import {
  POLAR3_APP_VERSION,
  PWA_CACHE_LABEL,
  WORKSPACE_STORAGE_KEY,
  VALID_WORKSPACES,
  workspaceDefaults,
  AI_PROVIDER_URLS,
  AI_PROVIDER_INTENTS,
  AI_TEMPLATE_LABELS,
  CALENDAR_STORAGE_KEY,
  CALENDAR_LEGACY_STORAGE_KEY,
  CALENDAR_PRINT_REFERENCE_KEY,
  CALENDAR_PRINT_SCHOOL_FILTER_KEY,
  CALENDAR_DAY_SHEET_STORAGE_KEY,
  CALENDAR_DAY_CHECKLIST_STORAGE_KEY,
  CALENDAR_MONTH_KEYS,
  CALENDAR_MONTH_LABELS,
  CALENDAR_STATUS_LABELS,
  CALENDAR_STATUS_OPTIONS,
  CALENDAR_BASE_TEMPLATE,
  CALENDAR_DAY_CHECKLIST_LABELS
} from './src/config.js';

import {
  initNavigation,
  showSection,
  toggleGroup,
  toggleSidebar,
  closeSidebar,
  toggleAcc,
  printCurrentSection,
  switchWorkspace,
  applyWorkspaceState,
  buildSearchIndex,
  navigateFromSearch,
  renderSearchResults,
  syncSearchActiveItem,
  pruneDeprecatedUi,
  handleTopbarAutoCollapse,
  initNavigationEvents,
  getCurrentWorkspace,
  getScrollContainer,
  setTopbarCollapsed
} from './src/modules/Navigation.js';

import {
  initStorage,
  enableDirtyTracking,
  trackedSetItem,
  trackedRemoveItem,
  safeReadJsonKey,
  updateBackupUI,
  updateBackupChip,
  updateBackupReminderUI,
  renderBackupAdmin,
  markBackupDirty,
  markBackupClean,
  exportBackupJson,
  triggerBackupImport,
  handleBackupImportFile,
  syncBackupPrefs,
  clearBackupHistory,
  maybeShowBackupReminderToast,
  computeBackupReminderState,
  getBackupSummary,
  formatDateTime
} from './src/modules/Storage.js';

import {
  initCobrosStore,
  getPaymentBoardData,
  savePaymentBoardData,
  addPaymentRecord,
  setPaymentField,
  setPaymentStatus,
  setPaymentQuickStatus,
  removePaymentRecord,
  seedPaymentBoard,
  clearPaymentBoard,
  fillMissingPaymentDates,
  syncPaymentDateDefault,
  renderPaymentBoard,
  setPaymentSearch,
  setPaymentStatusFilter,
  clearPaymentFilters,
  normalizePaymentDate,
  normalizeSchoolKey,
  normalizeMonthValue,
  getCurrentMonthValue,
  getCurrentYearValue,
  getTodayIsoDate,
  formatCalendarDate,
  formatMonthLabel,
  escapeHtml,
  money,
  getUnifiedSchoolNames
} from './src/stores/CobrosStore.js';

import {
  loadChecklist,
  toggleCheck,
  updateCheckProgress,
  resetChecklist
} from './src/stores/ChecklistStore.js';

import {
  initSeguimientoModule,
  getSchoolBoardData,
  saveSchoolBoardData,
  addSchoolRecord,
  setSchoolField,
  removeSchoolRecord,
  seedSchoolBoard,
  clearSchoolBoard,
  renderSchoolBoard,
  getFollowupData,
  saveFollowupData,
  addFollowupRecord,
  setFollowupField,
  removeFollowupRecord,
  seedFollowupBoard,
  clearFollowupBoard,
  renderFollowupBoard
} from './src/modules/Business/SeguimientoModule.js';

import {
  renderKpiDashboard,
  computeKpiMetrics,
  getKpiScope,
  setKpiScope,
  getKpiTicketMode,
  setKpiTicketMode,
  getKpiPeriodMode,
  getKpiPeriodValue,
  setKpiPeriodMode,
  setKpiPeriodValue,
  syncKpiScopeSelectors,
  syncKpiPeriodControls
} from './src/modules/Business/KpisModule.js';

import {
  initPrecio,
  getPrecioActual,
  actualizarPreciosEnApp,
  editarPrecio,
  guardarPrecio,
  cerrarModal,
  updateSimulador,
  loadSimulatorState,
  syncSimulatorWithPack,
  updateProposalGenerator
} from './src/modules/Business/FotografiaModule.js';

// ─────────────────────────────────────────────
// ESTADO GLOBAL DEL MÓDULO
// ─────────────────────────────────────────────

let deferredInstallPrompt = null;
let toastTimer = null;
let calendarMobileOpenMonthKey = null;

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────

function showToast(message, tone = 'info') {
  const toast = document.getElementById('appToast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${tone}`;
  toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

// ─────────────────────────────────────────────
// UTILIDADES MENORES
// ─────────────────────────────────────────────

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
    row.style.display = row.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
}

function toggleFocusMode() {
  document.body.classList.remove('focus-mode');
  try { localStorage.removeItem('polar3_focus_mode'); } catch (e) {}
}

function toggleMeetingMode() {
  document.body.classList.remove('meeting-mode');
  try { localStorage.removeItem('polar3_meeting_mode'); } catch (e) {}
}

// ─────────────────────────────────────────────
// GOOGLE WORKSPACE HUB
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// PRECIO — helpers de UI que necesitan precioActual
// ─────────────────────────────────────────────

function syncProposalWithPack() {
  const input = document.getElementById('propPackPrice');
  if (input) input.value = getPrecioActual();
  updateProposalGenerator();
}

function copyProposalText() {
  let text = localStorage.getItem('polar3_propuesta_texto');
  if (!text) updateProposalGenerator();
  text = localStorage.getItem('polar3_propuesta_texto') || '';
  if (!text) return;
  navigator.clipboard.writeText(text);
}

// ─────────────────────────────────────────────
// DASHBOARD MÓVIL DE OPERACIONES
// ─────────────────────────────────────────────

function summarizeUpcomingAgenda() {
  const data = getCalendarPlannerData();
  const items = sortCalendarItems(
    Object.values(data).flatMap(month => Array.isArray(month?.items) ? month.items : [])
  );
  const today = getTodayIsoDate();
  const todays = items.filter(item => normalizePaymentDate(item.date) === today);
  const next   = items.find(item => normalizePaymentDate(item.date) && normalizePaymentDate(item.date) >= today) || null;
  return { today, todays, next };
}

function renderMobileOpsDashboard() {
  const nextTitle  = document.getElementById('mobileNextActionTitle');
  const nextMeta   = document.getElementById('mobileNextActionMeta');
  const payTitle   = document.getElementById('mobilePendingPaymentsTitle');
  const payMeta    = document.getElementById('mobilePendingPaymentsMeta');
  const followTitle= document.getElementById('mobileFollowupTitle');
  const followMeta = document.getElementById('mobileFollowupMeta');
  const backupTitle= document.getElementById('mobileBackupTitle');
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
  const pendingAmount   = pendingPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  if (payTitle && payMeta) {
    payTitle.textContent = `${pendingPayments.length} cobro${pendingPayments.length === 1 ? '' : 's'} en seguimiento`;
    payMeta.textContent  = pendingPayments.length
      ? `${money(pendingAmount)} pendientes entre observados y no validados.`
      : 'Sin dinero pendiente por revisar.';
  }

  const followups = getFollowupData();
  const openCases = followups.filter(item => item.status !== 'resuelto');
  const openCount = openCases.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const retakeCount = openCases.filter(item => item.type === 'retoma').reduce((sum, item) => sum + Number(item.count || 0), 0);
  if (followTitle && followMeta) {
    followTitle.textContent = `${openCount} caso${openCount === 1 ? '' : 's'} abierto${openCount === 1 ? '' : 's'}`;
    followMeta.textContent  = openCount
      ? `${retakeCount} en retoma · ${openCases.length} registro${openCases.length === 1 ? '' : 's'} operativos todavía activos.`
      : 'Sin ausentes ni retomas abiertas.';
  }

  const backup = computeBackupReminderState();
  if (backupTitle && backupMeta) {
    backupTitle.textContent = backup.dirty ? 'Respaldo pendiente' : 'Respaldo al día';
    backupMeta.textContent  = `Último JSON: ${backup.lastBackupText}. ${backup.nextReminderText}`;
  }
}

// ─────────────────────────────────────────────
// IA — PANEL RÁPIDO
// ─────────────────────────────────────────────

function getCurrentSectionContext() {
  const hash  = location.hash.replace('#', '') || 'inicio';
  const title = document.getElementById('currentSectionTitle')?.textContent?.trim() || 'Inicio';
  return { hash, title, workspace: getCurrentWorkspace() };
}

function buildAiQuickPrompt() {
  const template = document.getElementById('aiTemplateSelect')?.value || localStorage.getItem('polar3_ai_template') || 'consulta';
  const notes    = (document.getElementById('aiQuickNotes')?.value || '').trim();
  const ctx      = getCurrentSectionContext();
  const contextLine = `Contexto Polar[3]: sección ${ctx.title} (${ctx.hash}), espacio ${ctx.workspace}.`;
  const common = 'Responde en español, directo, breve y accionable. Si falta un dato, dilo con claridad y no inventes.';
  let body = '';
  switch (template) {
    case 'cobranzas': body = 'Actúa como apoyo administrativo para fotografía escolar. Ayúdame con seguimiento de pagos, redacción breve de mensajes, orden de estados y próximos pasos.'; break;
    case 'jornada':   body = 'Actúa como coordinador operativo de una jornada de fotografía escolar. Ayúdame con checklist, tiempos, contingencias, retomas y organización del día.'; break;
    case 'comercial': body = 'Actúa como consultor comercial para fotografía escolar en Argentina. Ayúdame a redactar mensajes, objeciones, propuestas y seguimiento de instituciones.'; break;
    case 'kpis':      body = 'Actúa como analista de negocio para fotografía escolar. Ayúdame a interpretar KPIs, detectar alertas y proponer decisiones concretas.'; break;
    default:          body = 'Actúa como asistente operativo para mi negocio de fotografía escolar Polar[3].'; break;
  }
  const userRequest = notes || 'Necesito una consulta rápida con foco práctico.';
  return `${body}\n${contextLine}\n${common}\nConsulta puntual: ${userRequest}`.trim();
}

function syncAiQuickComposer() {
  const preview     = document.getElementById('aiQuickPromptPreview');
  const contextChip = document.getElementById('aiQuickContextChip');
  const template    = document.getElementById('aiTemplateSelect')?.value || 'consulta';
  const ctx         = getCurrentSectionContext();
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
  const savedNotes    = safeReadJsonKey('polar3_ai_notes', '');
  const select = document.getElementById('aiTemplateSelect');
  const notes  = document.getElementById('aiQuickNotes');
  if (select) select.value = typeof savedTemplate === 'string' ? savedTemplate : 'consulta';
  if (notes)  notes.value  = typeof savedNotes    === 'string' ? savedNotes    : '';
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
  copyPlainText(buildAiQuickPrompt()).then(success => {
    showToast(
      success ? `Prompt copiado. Intentando abrir ${label}.` : `Intentando abrir ${label}. Si hace falta, copia el prompt manualmente.`,
      success ? 'success' : 'info'
    );
  });
  if (isAndroidLikeDevice() && intentUrl) {
    window.location.href = intentUrl;
    return;
  }
  window.open(webUrl, '_blank', 'noopener');
}

function openPolarWhatsApp() {
  const ctx  = getCurrentSectionContext();
  const text = `Hola Adrián, consulta rápida desde Polar[3]. Contexto: ${ctx.title}.`;
  window.open(`https://wa.me/5491155238266?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

function openPolarMail() {
  const ctx     = getCurrentSectionContext();
  const subject = `Polar[3] · Consulta desde ${ctx.title}`;
  const body    = `Hola Adrián,\n\nTe escribo desde Polar[3].\nContexto: ${ctx.title}.\n\nConsulta:\n`;
  window.location.href = `mailto:polar3fotografia@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─────────────────────────────────────────────
// PWA
// ─────────────────────────────────────────────

function isPwaSecureContext() {
  return location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
}

function isStandalonePwa() {
  return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

function updatePwaUi() {
  const modeChip   = document.getElementById('pwaModeChip');
  const offlineChip= document.getElementById('pwaOfflineChip');
  const scopeChip  = document.getElementById('pwaScopeChip');
  const installBtn = document.getElementById('pwaInstallBtn');
  const mobileInstallPanel  = document.getElementById('mobileInstallPanel');
  const mobileInstallTitle  = document.getElementById('mobileInstallTitle');
  const mobileInstallMeta   = document.getElementById('mobileInstallMeta');
  const mobileInstallActionBtn = document.getElementById('mobileInstallActionBtn');

  const standalone      = isStandalonePwa();
  const controlled      = !!navigator.serviceWorker?.controller;
  const canInstall      = !standalone && !!deferredInstallPrompt;
  const secureContextReady = isPwaSecureContext();

  if (modeChip) {
    modeChip.textContent   = standalone ? 'Modo app activo' : 'Modo navegador';
    modeChip.dataset.tone  = standalone ? 'success' : 'info';
  }
  if (offlineChip) {
    if (!('serviceWorker' in navigator)) {
      offlineChip.textContent = 'Cache web: no soportado'; offlineChip.dataset.tone = 'warning';
    } else if (!secureContextReady) {
      offlineChip.textContent = 'Cache web: requiere localhost / HTTPS'; offlineChip.dataset.tone = 'warning';
    } else if (controlled) {
      offlineChip.textContent = `${PWA_CACHE_LABEL}: activo`; offlineChip.dataset.tone = 'success';
    } else {
      offlineChip.textContent = `${PWA_CACHE_LABEL}: pendiente`; offlineChip.dataset.tone = 'info';
    }
  }
  if (scopeChip) {
    if (!secureContextReady)  { scopeChip.textContent = 'Instalable solo desde localhost / HTTPS'; scopeChip.dataset.tone = 'warning'; }
    else if (canInstall)      { scopeChip.textContent = 'Instalación lista en este navegador'; scopeChip.dataset.tone = 'success'; }
    else if (standalone)      { scopeChip.textContent = 'App instalada en este dispositivo'; scopeChip.dataset.tone = 'success'; }
    else                      { scopeChip.textContent = 'PWA lista; el aviso depende del navegador'; scopeChip.dataset.tone = 'info'; }
  }
  if (installBtn) installBtn.hidden = !canInstall;

  if (mobileInstallPanel && mobileInstallTitle && mobileInstallMeta && mobileInstallActionBtn) {
    mobileInstallPanel.hidden = standalone;
    if (!secureContextReady) {
      mobileInstallTitle.textContent = 'Instalación deshabilitada en este contexto';
      mobileInstallMeta.textContent  = 'Para instalar Polar[3] abre la app desde HTTPS o localhost.';
      mobileInstallActionBtn.textContent = 'Ver centro de app';
      mobileInstallActionBtn.onclick = () => showSection('appcenter');
    } else if (canInstall) {
      mobileInstallTitle.textContent = 'Polar[3] lista para instalar';
      mobileInstallMeta.textContent  = 'Puedes instalarla ahora. Si ya la agregaste a pantalla principal, ábrela desde el icono.';
      mobileInstallActionBtn.textContent = 'Instalar / abrir como app';
      mobileInstallActionBtn.onclick = () => installPolarApp();
    } else {
      mobileInstallTitle.textContent = 'Abrir desde el icono para usar modo app';
      mobileInstallMeta.textContent  = 'Si ya la agregaste a pantalla principal, cierra esta pestaña y abre Polar[3] desde el icono del teléfono.';
      mobileInstallActionBtn.textContent = 'Centro de app';
      mobileInstallActionBtn.onclick = () => showSection('appcenter');
    }
  }
}

async function registerPolarServiceWorker() {
  if (!('serviceWorker' in navigator) || !isPwaSecureContext()) { updatePwaUi(); return; }
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
  if (isStandalonePwa()) { showToast('Polar[3] ya está abierta en modo app.', 'success'); return; }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch (e) {}
    deferredInstallPrompt = null;
    updatePwaUi();
    return;
  }
  if (!isPwaSecureContext()) {
    showToast('Para instalar Polar[3] como app debes abrirla desde localhost o HTTPS.', 'warning');
    return;
  }
  showToast('Si tu navegador no muestra el aviso, usa el menú y elige "Instalar app" o "Agregar a pantalla de inicio".', 'info');
}

function initPwa() {
  updatePwaUi();
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; updatePwaUi(); });
  window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; showToast('Polar[3] quedó instalada como app.', 'success'); updatePwaUi(); });
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

// ─────────────────────────────────────────────
// CALENDARIO — funciones inline (pendientes de CalendarModule)
// ─────────────────────────────────────────────

function normalizeCalendarStatus(value) {
  const safe = String(value || '').trim().toLowerCase();
  return CALENDAR_STATUS_OPTIONS.includes(safe) ? safe : 'tentativo';
}

function getCalendarStatusLabel(value) {
  return CALENDAR_STATUS_LABELS[normalizeCalendarStatus(value)] || 'Tentativo';
}

function buildCalendarStatusOptions(selectedValue) {
  const safe = normalizeCalendarStatus(selectedValue);
  return CALENDAR_STATUS_OPTIONS.map(key =>
    `<option value="${key}" ${key === safe ? 'selected' : ''}>${CALENDAR_STATUS_LABELS[key]}</option>`
  ).join('');
}

function createEmptyCalendarMonth() { return { notes: '', items: [] }; }

function normalizeCalendarData(raw) {
  const data = {};
  CALENDAR_MONTH_KEYS.forEach(key => {
    const src = raw?.[key] || {};
    data[key] = { notes: String(src.notes || ''), items: Array.isArray(src.items) ? src.items : [] };
  });
  return data;
}

function getCalendarPlannerData() {
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return normalizeCalendarData(parsed);
    }
    const legacyRaw = localStorage.getItem(CALENDAR_LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy && typeof legacy === 'object') return normalizeCalendarData(legacy);
    }
  } catch (e) {}
  return normalizeCalendarData({});
}

function saveCalendarPlannerData(data) {
  trackedSetItem(CALENDAR_STORAGE_KEY, JSON.stringify(normalizeCalendarData(data)));
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

function getIsoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function sortCalendarItems(items) {
  return [...items].sort((a, b) => {
    const da = normalizePaymentDate(a.date) || '9999-99-99';
    const db = normalizePaymentDate(b.date) || '9999-99-99';
    if (da !== db) return da < db ? -1 : 1;
    return (a.time || '').localeCompare(b.time || '');
  });
}

function buildCalendarFlatItems(data) {
  return sortCalendarItems(CALENDAR_MONTH_KEYS.flatMap(key => Array.isArray(data?.[key]?.items) ? data[key].items : []));
}

function buildCalendarSummaryText(items) {
  if (!items.length) return 'Sin movimientos cargados.';
  const counts = {};
  items.forEach(item => {
    const s = normalizeCalendarStatus(item.status);
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([key, count]) => `${CALENDAR_STATUS_LABELS[key] || key}: ${count}`)
    .join(' · ');
}

function formatCalendarTime(value) {
  const safe = String(value || '').trim();
  if (!safe) return '';
  const match = safe.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return safe;
  return `${match[1]}:${match[2]}`;
}

function formatCalendarDateLong(value) {
  const safe = normalizePaymentDate(value);
  if (!safe) return 'Sin fecha';
  const [year, month, day] = safe.split('-').map(Number);
  const dt = new Date(year, month - 1, day);
  return dt.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function getCalendarMonthKey(dateIso) {
  const safe = normalizePaymentDate(dateIso);
  if (!safe) return null;
  const dt = parseIsoDateLocal(safe);
  if (!dt) return null;
  return CALENDAR_MONTH_KEYS[dt.getMonth()] || null;
}

function getCalendarMonthYearLabel(dateIso) {
  const safe = normalizePaymentDate(dateIso);
  if (!safe) return 'Sin fecha';
  const dt = parseIsoDateLocal(safe);
  if (!dt) return 'Sin fecha';
  const key = CALENDAR_MONTH_KEYS[dt.getMonth()];
  return `${CALENDAR_MONTH_LABELS[key] || 'Mes'} ${dt.getFullYear()}`;
}

function getCalendarShortMonthLabel(month) {
  const label = CALENDAR_MONTH_LABELS[month] || month || '';
  return label.slice(0, 3);
}

function renderCalendarMonthList(month, monthData) {
  const container = document.querySelector(`[data-calendar-list="${month}"]`);
  const countNode  = document.getElementById(`calendar-count-${month}`);
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

function syncCalendarMobileLayout() {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const chips    = document.getElementById('calendarMobileChips');
  const activeMonth = calendarMobileOpenMonthKey;
  if (!isMobile || !chips) return;
  const data = getCalendarPlannerData();
  const today = getTodayIsoDate();
  chips.innerHTML = CALENDAR_MONTH_KEYS.map(month => {
    const count  = (data?.[month]?.items || []).length;
    const active = month === activeMonth ? ' active' : '';
    return `<button class="calendar-mobile-chip${active}" type="button" onclick="setCalendarMobileOpenMonth('${month}')"><span>${escapeHtml(getCalendarShortMonthLabel(month))}</span><strong>${count}</strong></button>`;
  }).join('');
  const mobileDetail = document.getElementById('calendarMobileDetail');
  if (!mobileDetail) return;
  if (!activeMonth) { mobileDetail.hidden = true; return; }
  mobileDetail.hidden = false;
  const monthData  = data?.[activeMonth] || createEmptyCalendarMonth();
  const items      = sortCalendarItems(Array.isArray(monthData.items) ? monthData.items : []);
  const summary    = mobileDetail.querySelector('#calendarMobileSummary');
  const listWrap   = mobileDetail.querySelector('#calendarMobileList');
  const monthLabel = CALENDAR_MONTH_LABELS[activeMonth] || activeMonth;
  if (summary) {
    if (!items.length) {
      summary.innerHTML = `<strong>${escapeHtml(monthLabel)}</strong><span>Sin movimientos cargados todavía. Puedes usar este mes para cargar jornadas, reuniones o recordatorios.</span>`;
    } else {
      const payload  = { items };
      const nextItem = items.find(item => normalizePaymentDate(item.date) && normalizePaymentDate(item.date) >= today);
      const nextLabel = nextItem
        ? `${formatCalendarDate(nextItem.date)}${nextItem.time ? ' · ' + formatCalendarTime(nextItem.time) : ''} · ${escapeHtml(nextItem.school || 'Sin colegio')}`
        : 'sin próximos en el futuro';
      summary.innerHTML = `<strong>${escapeHtml(monthLabel)}</strong><span>${items.length} ${items.length === 1 ? 'ítem cargado' : 'ítems cargados'} · Próximo: ${nextLabel}</span>`;
    }
  }
  if (listWrap) renderCalendarMonthList(activeMonth, monthData);
}

function setCalendarMobileOpenMonth(month) {
  calendarMobileOpenMonthKey = calendarMobileOpenMonthKey === month ? null : month;
  syncCalendarMobileLayout();
}

function openCalendarCurrentMonth() {
  const month = CALENDAR_MONTH_KEYS[new Date().getMonth()] || CALENDAR_MONTH_KEYS[0];
  setCalendarMobileOpenMonth(month);
}

function openCalendarNextPlannedMonth() {
  const data = getCalendarPlannerData();
  const currentIndex = new Date().getMonth();
  const ordered = [...CALENDAR_MONTH_KEYS.slice(currentIndex), ...CALENDAR_MONTH_KEYS.slice(0, currentIndex)];
  const next = ordered.find(month => (data?.[month]?.items || []).length) || CALENDAR_MONTH_KEYS[currentIndex] || CALENDAR_MONTH_KEYS[0];
  setCalendarMobileOpenMonth(next);
}

function setCalendarPlannerNotes(month, value) {
  if (!CALENDAR_MONTH_KEYS.includes(month)) return;
  const data = getCalendarPlannerData();
  data[month] = data[month] || createEmptyCalendarMonth();
  data[month].notes = String(value || '');
  saveCalendarPlannerData(data);
}

function addCalendarPlannerItem(month) {
  const targetMonth = CALENDAR_MONTH_KEYS.includes(month) ? month : (CALENDAR_MONTH_KEYS[new Date().getMonth()] || CALENDAR_MONTH_KEYS[0]);
  const date  = normalizePaymentDate(document.getElementById(`cal-${month}-date`)?.value || '') || getTodayIsoDate();
  const school= document.getElementById(`cal-${month}-school`)?.value.trim() || '';
  const status= document.getElementById(`cal-${month}-status`)?.value || 'tentativo';
  const time  = document.getElementById(`cal-${month}-time`)?.value || '';
  const detail= document.getElementById(`cal-${month}-detail`)?.value.trim() || '';
  const data  = getCalendarPlannerData();
  data[targetMonth] = data[targetMonth] || createEmptyCalendarMonth();
  data[targetMonth].items = data[targetMonth].items || [];
  data[targetMonth].items.push({ id: 'ci_' + Date.now(), date, school, status, time, detail });
  saveCalendarPlannerData(data);
  const dateEl = document.getElementById(`cal-${month}-date`); if (dateEl) dateEl.value = '';
  const schoolEl = document.getElementById(`cal-${month}-school`); if (schoolEl) schoolEl.value = '';
  const timeEl = document.getElementById(`cal-${month}-time`); if (timeEl) timeEl.value = '';
  const detailEl = document.getElementById(`cal-${month}-detail`); if (detailEl) detailEl.value = '';
  renderCalendarPlanner();
}

function setCalendarPlannerItemField(month, itemId, field, value) {
  const data = getCalendarPlannerData();
  if (!data[month]) return;
  const item = (data[month].items || []).find(i => i.id === itemId);
  if (!item) return;
  if (field === 'date') item.date = normalizePaymentDate(value);
  else if (field === 'time') item.time = String(value || '');
  else item[field] = String(value || '');
  saveCalendarPlannerData(data);
  renderCalendarPlanner();
}

function removeCalendarPlannerItem(month, itemId) {
  const data = getCalendarPlannerData();
  if (!data[month]) return;
  data[month].items = (data[month].items || []).filter(i => i.id !== itemId);
  saveCalendarPlannerData(data);
  renderCalendarPlanner();
}

function seedCalendarPlanner() {
  const data = getCalendarPlannerData();
  CALENDAR_MONTH_KEYS.forEach(key => {
    data[key] = data[key] || createEmptyCalendarMonth();
    if (!data[key].notes) data[key].notes = CALENDAR_BASE_TEMPLATE[key] || '';
  });
  saveCalendarPlannerData(data);
  renderCalendarPlanner();
}

function clearCalendarPlanner() {
  if (!confirm('¿Borrar todos los datos del calendario anual?')) return;
  trackedRemoveItem(CALENDAR_STORAGE_KEY);
  trackedRemoveItem(CALENDAR_LEGACY_STORAGE_KEY);
  renderCalendarPlanner();
}

function syncCalendarPrintCopies(data) {
  document.querySelectorAll('[data-calendar-print]').forEach(node => {
    const key      = node.dataset.calendarPrint;
    const monthData= data?.[key] || createEmptyCalendarMonth();
    const items    = sortCalendarItems(Array.isArray(monthData.items) ? monthData.items : []);
    const notes    = String(monthData.notes || '').trim();
    const ul = node.querySelector('.calendar-print-list');
    const notesEl = node.querySelector('.calendar-print-notes');
    if (notesEl) notesEl.textContent = notes || CALENDAR_BASE_TEMPLATE[key] || '';
    if (ul) {
      if (!items.length) {
        ul.innerHTML = '<li class="calendar-print-empty">Sin movimientos cargados para este mes.</li>';
      } else {
        ul.innerHTML = items.map(item => {
          const parts = [formatCalendarDate(item.date), item.time ? formatCalendarTime(item.time) : '', item.school || 'Sin colegio', getCalendarStatusLabel(item.status)];
          return `<li>${parts.filter(Boolean).join(' · ')}</li>`;
        }).join('');
      }
    }
  });
}

function renderCalendarDerivedViews() {}

function updateCalendarSaveStatus(msg, tone = 'info') {
  const el = document.getElementById('calendarSaveStatus');
  if (el) { el.textContent = msg; el.dataset.tone = tone; }
}

function renderCalendarSchoolFilterOptions(data) {
  const select = document.getElementById('calendarSchoolFilter');
  if (!select) return;
  const agendaNames  = buildCalendarFlatItems(data).map(item => String(item.school || '').trim()).filter(Boolean);
  const boardNames   = getSchoolBoardData().map(item => String(item.name || '').trim()).filter(Boolean);
  const paymentNames = getPaymentBoardData().map(item => String(item.school || '').trim()).filter(Boolean);
  const selected     = String(getCalendarSchoolFilter() || '').trim();
  const names = [...new Set([...agendaNames, ...boardNames, ...paymentNames, selected].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  select.innerHTML = ['<option value="">Todos los colegios</option>'].concat(names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)).join('');
  select.value = selected;
}

function setCalendarPrintReference(value) {
  const safe = normalizePaymentDate(value) || getTodayIsoDate();
  trackedSetItem(CALENDAR_PRINT_REFERENCE_KEY, safe);
  renderCalendarDerivedViews();
  updateCalendarSaveStatus('Referencia de fecha actualizada · ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'success');
}

function setCalendarPrintReferenceToday() {
  setCalendarPrintReference(getTodayIsoDate());
}

function clearCalendarPrintMode() {}

function printCalendarPlanner() {
  document.body.dataset.printMode = 'calendar-annual';
  window.print();
}

function printCalendarDerived(mode) {
  document.body.dataset.printMode = `calendar-${mode}`;
  window.print();
}

// Day sheet / checklist de jornada
function normalizeCalendarDayChecklist(raw = {}) {
  const base = { camera: false, batteries: false, cards: false, background: false, schedule: false, contacts: false, route: false, space: false, forms: false, payments: false, retakes: false, closing: false };
  Object.keys(base).forEach(key => { base[key] = Boolean(raw?.[key]); });
  return base;
}

function getCalendarDayChecklistStore() {
  try {
    const raw = localStorage.getItem(CALENDAR_DAY_CHECKLIST_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const normalized = {};
    Object.entries(parsed).forEach(([key, value]) => { normalized[key] = normalizeCalendarDayChecklist(value); });
    return normalized;
  } catch (e) { return {}; }
}

function saveCalendarDayChecklistStore(store) {
  const safe = {};
  Object.entries(store || {}).forEach(([key, value]) => { safe[key] = normalizeCalendarDayChecklist(value); });
  trackedSetItem(CALENDAR_DAY_CHECKLIST_STORAGE_KEY, JSON.stringify(safe));
}

function setCalendarDayChecklistItem(itemKey, checked) {
  const context = getCurrentSectionContext();
  const dateKey = normalizePaymentDate(context.date) || getTodayIsoDate();
  const store   = getCalendarDayChecklistStore();
  if (!store[dateKey]) store[dateKey] = normalizeCalendarDayChecklist({});
  store[dateKey][itemKey] = Boolean(checked);
  saveCalendarDayChecklistStore(store);
}

function getCalendarDaySheetStore() {
  try {
    const raw = localStorage.getItem(CALENDAR_DAY_SHEET_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) { return {}; }
}

function saveCalendarDaySheetStore(store) {
  trackedSetItem(CALENDAR_DAY_SHEET_STORAGE_KEY, JSON.stringify(store || {}));
}

function setCalendarDaySheetField(fieldKey, value) {
  const context = getCurrentSectionContext();
  const dateKey = normalizePaymentDate(context.date) || getTodayIsoDate();
  const store   = getCalendarDaySheetStore();
  if (!store[dateKey]) store[dateKey] = {};
  store[dateKey][fieldKey] = String(value || '');
  saveCalendarDaySheetStore(store);
}

function renderCalendarPlanner() {
  const data = getCalendarPlannerData();
  CALENDAR_MONTH_KEYS.forEach(month => {
    const textarea = document.querySelector(`[data-calendar-notes="${month}"]`);
    if (textarea) textarea.value = data[month]?.notes || '';
    renderCalendarMonthList(month, data[month] || createEmptyCalendarMonth());
  });
  syncCalendarPrintCopies(data);
  renderCalendarSchoolFilterOptions(data);
  syncCalendarMobileLayout();
  renderMobileOpsDashboard();
}

// ─────────────────────────────────────────────
// REFRESH ORQUESTADO (refresca KPIs + dashboard)
// ─────────────────────────────────────────────

function onDataChange() {
  const schoolData  = getSchoolBoardData();
  const schoolNames = getUnifiedSchoolNames(schoolData, getKpiScope());
  renderKpiDashboard(schoolData, schoolNames);
  renderMobileOpsDashboard();
}

// ─────────────────────────────────────────────
// EVENTOS ADICIONALES (sobre los de Navigation)
// ─────────────────────────────────────────────

function initExtraEvents() {
  const modal = document.getElementById('modal-precio');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === this) cerrarModal();
    });
  }

  const backupInput = document.getElementById('backupFileInput');
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

  ['simStudents','simConversion','simPackPrice','simExtraAvg','simCanonPct','simPrintCost','simAssistant','simTravel','simEditHours','simHourRate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateSimulador);
  });

  ['propSchool','propAudience','propLevel','propModality','propStudents','propPackPrice','propValidity','propPaymentModel','propFocus','propNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', updateProposalGenerator); el.addEventListener('change', updateProposalGenerator); }
  });

  window.addEventListener('resize', () => syncCalendarMobileLayout());
  window.addEventListener('afterprint', clearCalendarPrintMode);
}

// ─────────────────────────────────────────────
// INIT APP
// ─────────────────────────────────────────────

function initApp() {
  // Módulo precio
  initPrecio();

  // Módulo Storage
  initStorage({
    onBackupStateChange: () => updateBackupUI(),
    showToast
  });

  // Módulo Navegación
  const savedWorkspace = localStorage.getItem(WORKSPACE_STORAGE_KEY);
  const workspace = VALID_WORKSPACES.includes(savedWorkspace) ? savedWorkspace : 'operativo';
  initNavigation({
    workspace,
    onWorkspaceChange: (ws) => {
      trackedSetItem(WORKSPACE_STORAGE_KEY, ws);
    }
  });

  // Módulo Cobros
  initCobrosStore({ showToast, onDataChange });

  // Módulo Seguimiento
  initSeguimientoModule({ showToast, onDataChange });

  // Limpiar UI deprecated
  pruneDeprecatedUi();

  // Cargar datos iniciales
  actualizarPreciosEnApp();
  loadChecklist();
  loadSimulatorState();
  loadWorkspaceUI();

  // Render boards
  const schoolData  = getSchoolBoardData();
  const schoolNames = getUnifiedSchoolNames(schoolData, getKpiScope());
  renderSchoolBoard();
  renderFollowupBoard();
  renderPaymentBoard(schoolData, getKpiScope());
  renderKpiDashboard(schoolData, schoolNames);
  renderCalendarPlanner();
  syncPaymentDateDefault();
  updateProposalGenerator();

  // Búsqueda
  buildSearchIndex();

  // Eventos
  initNavigationEvents();
  initExtraEvents();

  // PWA
  initPwa();

  // IA
  loadAiQuickComposer();

  // Backup UI
  renderMobileOpsDashboard();
  updateBackupUI();
  applyWorkspaceState();
  document.body.classList.remove('focus-mode');
  try { localStorage.removeItem('polar3_focus_mode'); } catch (e) {}

  handleTopbarAutoCollapse();

  // Sección inicial
  const target = location.hash.replace('#', '') || workspaceDefaults[workspace] || 'inicio';
  showSection(target, false);

  // Habilitar dirty tracking
  enableDirtyTracking();
  updateBackupUI();
  maybeShowBackupReminderToast();
}

// ─────────────────────────────────────────────
// EXPONER AL WINDOW (para onclick inline en HTML)
// ─────────────────────────────────────────────

window.showSection              = showSection;
window.toggleGroup              = toggleGroup;
window.toggleSidebar            = toggleSidebar;
window.closeSidebar             = closeSidebar;
window.toggleAcc                = toggleAcc;
window.printCurrentSection      = printCurrentSection;
window.switchWorkspace          = switchWorkspace;

// Precio y modal
window.editarPrecio             = editarPrecio;
window.guardarPrecio            = guardarPrecio;
window.cerrarModal              = cerrarModal;

// Checklist
window.toggleCheck              = toggleCheck;
window.resetChecklist           = resetChecklist;

// Scripts
window.copyScript               = copyScript;
window.filterGlosario           = filterGlosario;
window.toggleFocusMode          = toggleFocusMode;
window.toggleMeetingMode        = toggleMeetingMode;

// Workspace Hub
window.saveWorkspaceLink        = saveWorkspaceLink;
window.openWorkspaceLink        = openWorkspaceLink;

// IA
window.openPolarWhatsApp        = openPolarWhatsApp;
window.openPolarMail            = openPolarMail;
window.focusAiQuickPanel        = focusAiQuickPanel;
window.setAiQuickTemplate       = setAiQuickTemplate;
window.syncAiQuickComposer      = syncAiQuickComposer;
window.copyAiQuickPrompt        = copyAiQuickPrompt;
window.openAiQuickProvider      = openAiQuickProvider;

// Calendario
window.setCalendarMobileOpenMonth   = setCalendarMobileOpenMonth;
window.openCalendarCurrentMonth     = openCalendarCurrentMonth;
window.openCalendarNextPlannedMonth = openCalendarNextPlannedMonth;
window.addCalendarPlannerItem       = addCalendarPlannerItem;
window.setCalendarPlannerItemField  = setCalendarPlannerItemField;
window.removeCalendarPlannerItem    = removeCalendarPlannerItem;
window.seedCalendarPlanner          = seedCalendarPlanner;
window.clearCalendarPlanner         = clearCalendarPlanner;
window.printCalendarPlanner         = printCalendarPlanner;
window.printCalendarDerived         = printCalendarDerived;
window.setCalendarDaySheetField     = setCalendarDaySheetField;
window.setCalendarDayChecklistItem  = setCalendarDayChecklistItem;
window.setCalendarPrintReference    = setCalendarPrintReference;
window.setCalendarPrintReferenceToday = setCalendarPrintReferenceToday;
window.setCalendarSchoolFilter      = setCalendarSchoolFilter;

// KPIs
window.setKpiTicketMode = (mode) => setKpiTicketMode(mode, { onRender: () => {
  const sd = getSchoolBoardData();
  renderKpiDashboard(sd, getUnifiedSchoolNames(sd, getKpiScope()));
  renderCalendarPlanner();
}});
window.setKpiScope      = (scope) => setKpiScope(scope, { onRender: () => {
  const sd = getSchoolBoardData();
  renderKpiDashboard(sd, getUnifiedSchoolNames(sd, getKpiScope()));
}});
window.setKpiPeriodMode = (mode) => setKpiPeriodMode(mode, { onRender: () => {
  const sd = getSchoolBoardData();
  renderKpiDashboard(sd, getUnifiedSchoolNames(sd, getKpiScope()));
}});
window.setKpiPeriodValue= (val)  => setKpiPeriodValue(val, { onRender: () => {
  const sd = getSchoolBoardData();
  renderKpiDashboard(sd, getUnifiedSchoolNames(sd, getKpiScope()));
}});

// Simulador / Propuesta
window.updateSimulador          = updateSimulador;
window.syncSimulatorWithPack    = syncSimulatorWithPack;
window.updateProposalGenerator  = updateProposalGenerator;
window.copyProposalText         = copyProposalText;
window.syncProposalWithPack     = syncProposalWithPack;

// Cobranzas
window.addPaymentRecord         = addPaymentRecord;
window.setPaymentField          = setPaymentField;
window.setPaymentStatus         = setPaymentStatus;
window.setPaymentQuickStatus    = setPaymentQuickStatus;
window.removePaymentRecord      = removePaymentRecord;
window.seedPaymentBoard         = seedPaymentBoard;
window.clearPaymentBoard        = clearPaymentBoard;
window.fillMissingPaymentDates  = fillMissingPaymentDates;

// Seguimiento (cartera + followup)
window.addSchoolRecord          = addSchoolRecord;
window.setSchoolField           = setSchoolField;
window.removeSchoolRecord       = removeSchoolRecord;
window.seedSchoolBoard          = seedSchoolBoard;
window.clearSchoolBoard         = clearSchoolBoard;
window.addFollowupRecord        = addFollowupRecord;
window.setFollowupField         = setFollowupField;
window.removeFollowupRecord     = removeFollowupRecord;
window.seedFollowupBoard        = seedFollowupBoard;
window.clearFollowupBoard       = clearFollowupBoard;

// Backup
window.exportBackupJson         = exportBackupJson;
window.triggerBackupImport      = triggerBackupImport;
window.syncBackupPrefs          = syncBackupPrefs;
window.clearBackupHistory       = clearBackupHistory;

// PWA
window.installPolarApp          = installPolarApp;

// ─────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
