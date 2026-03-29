/**
 * CobrosStore.js — Polar[3] PWA v2.7.12
 * Gestión del tablero de cobranzas (pagos por familia/alumno).
 * Incluye CRUD, filtros, render de tabla + vista móvil, y helpers de fecha/escuela.
 */

import { PAYMENT_BOARD_KEY, paymentBoardSeed } from '../config.js';
import { trackedSetItem, trackedRemoveItem } from '../modules/Storage.js';

// ─────────────────────────────────────────────
// CALLBACKS INYECTADOS
// ─────────────────────────────────────────────

let _showToast = null;
let _onDataChange = null;  // notifica a KPIs y dashboard móvil

export function initCobrosStore({ showToast = null, onDataChange = null } = {}) {
  _showToast = showToast;
  _onDataChange = onDataChange;
}

// ─────────────────────────────────────────────
// HELPERS DE FECHA / ESCUELA
// ─────────────────────────────────────────────

export function normalizePaymentDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeSchoolKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizeMonthValue(value) {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : '';
}

export function getCurrentMonthValue() {
  return getTodayIsoDate().slice(0, 7);
}

export function getCurrentYearValue() {
  return getTodayIsoDate().slice(0, 4);
}

export function formatCalendarDate(value) {
  const safe = normalizePaymentDate(value);
  if (!safe) return 'Sin fecha';
  const [year, month, day] = safe.split('-').map(Number);
  const dt = new Date(year, month - 1, day);
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatMonthLabel(value) {
  const safe = normalizeMonthValue(value);
  if (!safe) return 'mes sin definir';
  const [year, month] = safe.split('-').map(Number);
  const dt = new Date(year, month - 1, 1);
  return dt.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function money(n) {
  const num = Number.isFinite(Number(n)) ? Number(n) : 0;
  return '$' + Math.round(num).toLocaleString('es-AR');
}

// ─────────────────────────────────────────────
// ESTADO DE FILTROS UI (en memoria)
// ─────────────────────────────────────────────

const paymentBoardUiState = {
  search: '',
  status: ''
};

// ─────────────────────────────────────────────
// CRUD — datos
// ─────────────────────────────────────────────

export function getPaymentBoardData() {
  try {
    const data = JSON.parse(localStorage.getItem(PAYMENT_BOARD_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      ...item,
      school:  String(item.school  || '').trim(),
      name:    String(item.name    || '').trim(),
      course:  String(item.course  || '').trim(),
      receipt: String(item.receipt || '').trim(),
      note:    String(item.note    || '').trim(),
      date:    normalizePaymentDate(item.date)
    }));
  } catch (e) {
    return [];
  }
}

export function savePaymentBoardData(data) {
  trackedSetItem(PAYMENT_BOARD_KEY, JSON.stringify(data));
}

export function addPaymentRecord() {
  const school  = document.getElementById('paymentSchool')?.value.trim() || '';
  const name    = document.getElementById('paymentName')?.value.trim() || '';
  const course  = document.getElementById('paymentCourse')?.value.trim() || '';
  const date    = normalizePaymentDate(document.getElementById('paymentDate')?.value) || getTodayIsoDate();
  const amount  = parseInt(document.getElementById('paymentAmount')?.value || '0', 10);
  const status  = document.getElementById('paymentStatus')?.value || 'pendiente';
  const receipt = document.getElementById('paymentReceipt')?.value.trim() || '';
  const note    = document.getElementById('paymentNote')?.value.trim() || '';

  if (!name || !amount) return;

  const data = getPaymentBoardData();
  data.unshift({ id: 'pay_' + Date.now(), school, date, name, course, amount, status, receipt, note });
  savePaymentBoardData(data);

  ['paymentSchool', 'paymentName', 'paymentCourse', 'paymentAmount', 'paymentReceipt', 'paymentNote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const statusEl = document.getElementById('paymentStatus');
  if (statusEl) statusEl.value = 'pendiente';
  const dateEl = document.getElementById('paymentDate');
  if (dateEl) dateEl.value = getTodayIsoDate();

  if (_showToast) _showToast('Registro de cobranza guardado.', 'success');
  renderPaymentBoard();
  document.getElementById('paymentName')?.focus();
}

export function setPaymentField(id, field, value) {
  const data = getPaymentBoardData().map(item => {
    if (item.id !== id) return item;
    let nextValue = value;
    if (field === 'school') nextValue = String(value || '').trim();
    if (field === 'date')   nextValue = normalizePaymentDate(value);
    return { ...item, [field]: nextValue };
  });
  savePaymentBoardData(data);
  renderPaymentBoard();
}

export function setPaymentStatus(id, status) {
  setPaymentField(id, 'status', status);
}

export function setPaymentQuickStatus(id, status) {
  setPaymentField(id, 'status', status);
}

export function removePaymentRecord(id) {
  savePaymentBoardData(getPaymentBoardData().filter(item => item.id !== id));
  renderPaymentBoard();
}

export function seedPaymentBoard() {
  if (getPaymentBoardData().length) return;
  savePaymentBoardData(paymentBoardSeed);
  renderPaymentBoard();
}

export function clearPaymentBoard() {
  if (!confirm('¿Vaciar el tablero de cobranzas?')) return;
  trackedRemoveItem(PAYMENT_BOARD_KEY);
  renderPaymentBoard();
}

export function fillMissingPaymentDates() {
  const data = getPaymentBoardData();
  const missing = data.filter(item => !normalizePaymentDate(item.date)).length;
  if (!missing) {
    if (_showToast) _showToast('No hay registros sin fecha para completar.', 'warning');
    return;
  }
  const today = getTodayIsoDate();
  savePaymentBoardData(data.map(item => normalizePaymentDate(item.date) ? item : { ...item, date: today }));
  renderPaymentBoard();
  if (_showToast) _showToast(`Se completaron ${missing} fecha(s) faltante(s) con ${today}.`, 'success');
}

export function syncPaymentDateDefault() {
  const input = document.getElementById('paymentDate');
  if (input && !input.value) input.value = getTodayIsoDate();
}

// ─────────────────────────────────────────────
// FILTROS
// ─────────────────────────────────────────────

export function getPaymentStatusLabel(status) {
  return ({
    pendiente: 'Pendiente',
    observado: 'Observado',
    validado:  'Validado',
    liquidado: 'Liquidado'
  })[status] || 'Pendiente';
}

function getPaymentFilteredData(data = getPaymentBoardData()) {
  const search = String(paymentBoardUiState.search || '').trim().toLowerCase();
  const status = paymentBoardUiState.status || '';
  return data.filter(item => {
    if (status && item.status !== status) return false;
    if (!search) return true;
    const haystack = [item.school, item.name, item.course, item.receipt, item.note, item.date, item.status]
      .map(v => String(v || '').toLowerCase()).join(' ');
    return haystack.includes(search);
  });
}

export function setPaymentSearch(value) {
  paymentBoardUiState.search = String(value || '').trim();
  renderPaymentBoard();
}

export function setPaymentStatusFilter(value) {
  paymentBoardUiState.status = value || '';
  renderPaymentBoard();
}

export function clearPaymentFilters() {
  paymentBoardUiState.search = '';
  paymentBoardUiState.status = '';
  const searchEl = document.getElementById('paymentSearch');
  const statusEl = document.getElementById('paymentFilterStatus');
  if (searchEl) searchEl.value = '';
  if (statusEl) statusEl.value = '';
  renderPaymentBoard();
}

// ─────────────────────────────────────────────
// DATALIST DE COLEGIOS
// ─────────────────────────────────────────────

export function getUnifiedSchoolNames(schoolBoardData = [], kpiScope = '') {
  const paymentNames = getPaymentBoardData().map(item => String(item.school || '').trim()).filter(Boolean);
  const boardNames = schoolBoardData.map(item => String(item.name || '').trim()).filter(Boolean);
  const scopeName = String(kpiScope || '').trim();
  return [...new Set([...boardNames, ...paymentNames, scopeName].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

export function renderPaymentSchoolOptions(schoolBoardData = [], kpiScope = '') {
  const list = document.getElementById('paymentSchoolOptions');
  if (!list) return;
  const names = getUnifiedSchoolNames(schoolBoardData, kpiScope);
  list.innerHTML = names.map(name => `<option value="${String(name).replace(/"/g, '&quot;')}"></option>`).join('');
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

export function renderPaymentBoard(schoolBoardData = [], kpiScope = '') {
  const rows = document.getElementById('paymentsBoardRows');
  const mobileList = document.getElementById('paymentMobileList');
  if (!rows) return;

  const data = getPaymentBoardData();
  const filteredData = getPaymentFilteredData(data);

  renderPaymentSchoolOptions(schoolBoardData, kpiScope);

  // Tabla desktop
  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">Sin registros todavía.</td></tr>';
  } else if (!filteredData.length) {
    rows.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">No hay registros para este filtro.</td></tr>';
  } else {
    rows.innerHTML = filteredData.map(item => {
      const school  = escapeHtml(item.school  || '');
      const date    = escapeHtml(item.date    || '');
      const name    = escapeHtml(item.name    || '');
      const course  = escapeHtml(item.course  || '');
      const receipt = escapeHtml(item.receipt || '');
      const note    = escapeHtml(item.note    || '');
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
              <option value="observado"  ${item.status === 'observado'  ? 'selected' : ''}>Observado</option>
              <option value="validado"   ${item.status === 'validado'   ? 'selected' : ''}>Validado</option>
              <option value="liquidado"  ${item.status === 'liquidado'  ? 'selected' : ''}>Liquidado</option>
            </select>
          </td>
          <td>${receipt || '—'}</td>
          <td>${note || '—'}</td>
          <td><button class="mini-btn danger" type="button" onclick="removePaymentRecord('${item.id}')">Eliminar</button></td>
        </tr>
      `;
    }).join('');
  }

  // Lista móvil
  if (mobileList) {
    if (!data.length) {
      mobileList.innerHTML = '<div class="payment-mobile-empty">Todavía no hay registros de cobranzas.</div>';
    } else if (!filteredData.length) {
      mobileList.innerHTML = '<div class="payment-mobile-empty">No hay resultados con ese filtro.</div>';
    } else {
      mobileList.innerHTML = filteredData.map(item => {
        const school  = escapeHtml(item.school  || 'Sin institución');
        const name    = escapeHtml(item.name    || 'Sin nombre');
        const course  = escapeHtml(item.course  || 'Sin curso');
        const receipt = escapeHtml(item.receipt || 'Sin comprobante');
        const note    = escapeHtml(item.note    || 'Sin observación');
        const prettyDate  = escapeHtml(formatCalendarDate(item.date));
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
                  <option value="observado"  ${item.status === 'observado'  ? 'selected' : ''}>Observado</option>
                  <option value="validado"   ${item.status === 'validado'   ? 'selected' : ''}>Validado</option>
                  <option value="liquidado"  ${item.status === 'liquidado'  ? 'selected' : ''}>Liquidado</option>
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
          </article>
        `;
      }).join('');
    }
  }

  // Totales y resumen
  const total    = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const pending  = data.filter(item => ['pendiente', 'observado'].includes(item.status))
                       .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const settled  = data.filter(item => item.status === 'liquidado')
                       .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const assignedSchools = new Set(data.map(item => normalizeSchoolKey(item.school)).filter(Boolean)).size;
  const unassigned = data.filter(item => !normalizeSchoolKey(item.school)).length;
  const undated    = data.filter(item => !normalizePaymentDate(item.date)).length;

  const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setId('payCount',        String(data.length));
  setId('payTotal',        money(total));
  setId('payPending',      money(pending));
  setId('paySettled',      money(settled));
  setId('paySchoolsLinked', `${assignedSchools} vinculados · ${unassigned} sin colegio · ${undated} sin fecha`);

  const insight = document.getElementById('paymentInsight');
  if (insight) {
    if (!data.length)            insight.textContent = 'Aún no hay datos cargados.';
    else if (undated > 0)        insight.textContent = `Hay ${undated} cobro(s) sin fecha. Completa esa columna para habilitar KPIs confiables por período.`;
    else if (unassigned > 0)     insight.textContent = `Hay ${unassigned} cobro(s) sin institución asignada. Completa esa columna para habilitar KPIs confiables por colegio.`;
    else if (pending > settled && pending > 0) insight.textContent = 'Hoy tienes más dinero en seguimiento que liquidado. Conviene atacar observados y pendientes antes de producir.';
    else if (settled >= total * 0.6) insight.textContent = 'Buen nivel de cierre: la mayor parte del tablero ya está liquidada o lista para conciliación.';
    else                         insight.textContent = 'Tablero equilibrado, pero todavía conviene revisar observados para no frenar producción.';
  }

  const feedback = document.getElementById('paymentFilterFeedback');
  if (feedback) {
    if (!data.length) {
      feedback.textContent = 'Sin registros cargados todavía.';
    } else if (!paymentBoardUiState.search && !paymentBoardUiState.status) {
      feedback.textContent = `Mostrando todos los registros (${data.length}).`;
    } else {
      feedback.textContent = `Mostrando ${filteredData.length} de ${data.length} registro(s)${
        paymentBoardUiState.status ? ` · estado ${getPaymentStatusLabel(paymentBoardUiState.status).toLowerCase()}` : ''
      }${
        paymentBoardUiState.search ? ` · búsqueda "${paymentBoardUiState.search}"` : ''
      }.`;
    }
  }

  if (_onDataChange) _onDataChange();
}
