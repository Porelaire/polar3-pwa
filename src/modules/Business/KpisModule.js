/**
 * KpisModule.js — Polar[3] PWA v2.7.12
 * Cálculo y renderizado del dashboard de KPIs.
 * Depende de CobrosStore y SeguimientoModule para los datos.
 */

import {
  KPI_TICKET_MODE_KEY,
  KPI_SCOPE_KEY,
  KPI_PERIOD_MODE_KEY,
  KPI_PERIOD_VALUE_KEY,
  CANON_PERCENTAGE
} from '../../config.js';
import { trackedSetItem } from '../Storage.js';
import {
  getPaymentBoardData,
  normalizePaymentDate,
  normalizeSchoolKey,
  money,
  getCurrentMonthValue,
  getCurrentYearValue,
  normalizeMonthValue,
  formatMonthLabel
} from '../../stores/CobrosStore.js';

// ─────────────────────────────────────────────
// HELPERS LOCALES
// ─────────────────────────────────────────────

function normalizeFamilyKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function formatPercent(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const decimals = safe % 1 === 0 ? 0 : 1;
  return safe.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: 1 }) + '%';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setTextMany(ids, value) {
  ids.forEach(id => setText(id, value));
}

// ─────────────────────────────────────────────
// GETTERS DE ESTADO KPI (con localStorage)
// ─────────────────────────────────────────────

export function getKpiTicketMode() {
  const saved = localStorage.getItem(KPI_TICKET_MODE_KEY);
  return saved === 'family' ? 'family' : 'payment';
}

export function setKpiTicketMode(mode, { onRender = null } = {}) {
  const safeMode = mode === 'family' ? 'family' : 'payment';
  trackedSetItem(KPI_TICKET_MODE_KEY, safeMode);
  if (onRender) onRender();
}

export function getKpiScope() {
  return localStorage.getItem(KPI_SCOPE_KEY) || '';
}

export function setKpiScope(scope, { onRender = null } = {}) {
  trackedSetItem(KPI_SCOPE_KEY, String(scope || '').trim());
  if (onRender) onRender();
}

export function getKpiPeriodMode() {
  const saved = localStorage.getItem(KPI_PERIOD_MODE_KEY);
  return ['all', 'month_current', 'year_current', 'month_custom'].includes(saved) ? saved : 'all';
}

export function getKpiPeriodValue() {
  return normalizeMonthValue(localStorage.getItem(KPI_PERIOD_VALUE_KEY)) || getCurrentMonthValue();
}

export function setKpiPeriodMode(mode, { onRender = null } = {}) {
  const safeMode = ['all', 'month_current', 'year_current', 'month_custom'].includes(mode) ? mode : 'all';
  trackedSetItem(KPI_PERIOD_MODE_KEY, safeMode);
  if (safeMode === 'month_custom' && !normalizeMonthValue(localStorage.getItem(KPI_PERIOD_VALUE_KEY))) {
    trackedSetItem(KPI_PERIOD_VALUE_KEY, getCurrentMonthValue());
  }
  if (onRender) onRender();
}

export function setKpiPeriodValue(value, { onRender = null } = {}) {
  const safeValue = normalizeMonthValue(value) || getCurrentMonthValue();
  trackedSetItem(KPI_PERIOD_VALUE_KEY, safeValue);
  if (getKpiPeriodMode() !== 'month_custom') {
    trackedSetItem(KPI_PERIOD_MODE_KEY, 'month_custom');
  }
  if (onRender) onRender();
}

// ─────────────────────────────────────────────
// SYNC UI CONTROLS
// ─────────────────────────────────────────────

export function syncKpiTicketModeButtons(mode) {
  document.querySelectorAll('[data-kpi-ticket-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.kpiTicketMode === mode);
  });
}

export function syncKpiScopeSelectors(scope, schoolNames = []) {
  document.querySelectorAll('[data-kpi-scope-selector]').forEach(select => {
    const previous = scope || '';
    const options = ['<option value="">Global · todos los colegios</option>']
      .concat(schoolNames.map(name => `<option value="${String(name).replace(/"/g, '&quot;')}" ${name === previous ? 'selected' : ''}>${name}</option>`));
    select.innerHTML = options.join('');
    select.value = previous;
  });
}

export function syncKpiPeriodControls(mode, value) {
  const safeMode = ['all', 'month_current', 'year_current', 'month_custom'].includes(mode) ? mode : 'all';
  const safeValue = normalizeMonthValue(value) || getCurrentMonthValue();
  const allDates = getPaymentBoardData().map(item => normalizePaymentDate(item.date)).filter(Boolean).sort();
  const minMonth = allDates.length ? allDates[0].slice(0, 7) : '';
  const maxMonth = allDates.length ? allDates[allDates.length - 1].slice(0, 7) : '';

  document.querySelectorAll('[data-kpi-period-mode]').forEach(select => {
    select.value = safeMode;
  });
  document.querySelectorAll('[data-kpi-period-input]').forEach(input => {
    input.value = safeValue;
    input.disabled = safeMode !== 'month_custom';
    if (minMonth) input.min = minMonth;
    else input.removeAttribute('min');
    if (maxMonth) input.max = maxMonth;
    else input.removeAttribute('max');
  });
}

// ─────────────────────────────────────────────
// CÁLCULO DE MÉTRICAS
// ─────────────────────────────────────────────

export function computeKpiMetrics(schoolBoardData = []) {
  const allPayments = getPaymentBoardData();
  const allSchools = schoolBoardData;
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
    if (periodMode === 'year_current')  return date.slice(0, 4) === getCurrentYearValue();
    if (periodMode === 'month_custom')  return date.slice(0, 7) === periodValue;
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

  const canon = gross * CANON_PERCENTAGE;
  const effectiveRate = totalPayments ? (effectiveCount / totalPayments) * 100 : 0;
  const activeSchools = schools.filter(item => item.stage === 'activo').length;
  const scoped = !!normalizedScope;
  const scopeLabel = scoped ? scope : 'Global · todos los colegios';
  const scopeText = scoped ? `Vista filtrada por ${scope}.` : 'Vista consolidada de toda la operación.';
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
    ? (scoped ? 'Confirma si el colegio filtrado está efectivamente en producción.' : 'Volumen de operaciones actualmente en producción.')
    : (scoped ? 'La lectura financiera está filtrada por período, pero este KPI sigue mostrando el estado actual de la cartera.' : 'Con filtro temporal activo, este KPI sigue mostrando el estado actual de la cartera, no un histórico.');
  const institutionDetail = scoped
    ? `${activeSchools ? 'Sí' : 'No'} · ${scope}${schools.length ? '' : ' (aún no figura en cartera)'}`
    : `${activeSchools} activas sobre ${schools.length} instituciones en cartera`;

  return {
    scope, scoped, scopeLabel, scopeText, scopeFootnote,
    periodMode, periodValue, periodStatus, periodText, periodFootnote,
    payments, paymentsInScope, schools,
    totalPayments, datedInScopeCount, undatedCount,
    gross, effectiveCount, pendingCount,
    ticket, ticketMode, ticketFormula, ticketMeta, ticketModeLabel, ticketDetail,
    ticketPerPayment, ticketPerFamily, uniqueFamilyCount, duplicatePaymentCount,
    canon, effectiveRate, activeSchools,
    institutionTitle, institutionFormula, institutionMeta, institutionDetail
  };
}

// ─────────────────────────────────────────────
// RENDER DEL DASHBOARD
// ─────────────────────────────────────────────

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
  const filterTitle = `${metrics.scopeLabel} · ${metrics.periodStatus.replace('Período: ', '')}`;
  const filterMeta = `${metrics.scopeText} ${metrics.periodText}`;

  setText('kpiMobileExecutiveTitle', executive.title);
  setText('kpiMobileExecutiveMeta', executive.meta);
  setText('kpiMobileActionTitle', action.title);
  setText('kpiMobileActionMeta', action.meta);
  setText('kpiMobileFilterTitle', filterTitle);
  setText('kpiMobileFilterMeta', filterMeta);

  const pill  = document.getElementById('kpiMobileFocusPill');
  const focus = document.getElementById('kpiMobileFocus');
  if (pill) pill.textContent = executive.pill;
  if (focus) {
    focus.classList.remove('is-warning', 'is-danger', 'is-success');
    if (healthVariant === 'warning') focus.classList.add('is-warning');
    if (healthVariant === 'danger')  focus.classList.add('is-danger');
    if (healthVariant === 'success') focus.classList.add('is-success');
  }
}

/**
 * Actualiza todo el dashboard de KPIs.
 * @param {Array} schoolBoardData - Datos de cartera (de SeguimientoModule)
 * @param {string[]} schoolNames - Nombres unificados para los selectores de scope
 */
export function renderKpiDashboard(schoolBoardData = [], schoolNames = []) {
  const metrics = computeKpiMetrics(schoolBoardData);
  syncKpiTicketModeButtons(metrics.ticketMode);
  syncKpiScopeSelectors(metrics.scope, schoolNames);
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

  // Card de salud operativa
  const healthCard  = document.getElementById('kpiHealthCard');
  const healthText  = document.getElementById('kpiHealthText');
  const homeHealth  = document.getElementById('inicioKpiHealthText');
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
  if (homeHealth)  homeHealth.textContent = healthMessage;
  if (healthCard) {
    healthCard.className = 'ops-card';
    if (healthVariant === 'warning') healthCard.classList.add('ops-card-warning');
    if (healthVariant === 'danger')  healthCard.classList.add('ops-card-danger');
    if (healthVariant === 'success') healthCard.classList.add('ops-card-success');
  }

  renderKpiMobileFocus(metrics, healthVariant);
}
