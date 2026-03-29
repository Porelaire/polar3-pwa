/**
 * SeguimientoModule.js — Polar[3] PWA v2.7.12
 * Gestión de cartera de colegios (SchoolBoard) y seguimiento
 * de ausentes/retomas/pendientes (FollowupBoard).
 */

import {
  SCHOOL_BOARD_KEY,
  FOLLOWUP_BOARD_KEY,
  schoolBoardSeed,
  followupSeed
} from '../../config.js';
import { trackedSetItem, trackedRemoveItem } from '../Storage.js';
import { escapeHtml } from '../../stores/CobrosStore.js';

// ─────────────────────────────────────────────
// CALLBACKS INYECTADOS
// ─────────────────────────────────────────────

let _showToast = null;
let _onDataChange = null;

export function initSeguimientoModule({ showToast = null, onDataChange = null } = {}) {
  _showToast = showToast;
  _onDataChange = onDataChange;
}

// ─────────────────────────────────────────────
// SCHOOL BOARD — CRUD
// ─────────────────────────────────────────────

export function getSchoolBoardData() {
  try {
    const data = JSON.parse(localStorage.getItem(SCHOOL_BOARD_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveSchoolBoardData(data) {
  trackedSetItem(SCHOOL_BOARD_KEY, JSON.stringify(data));
}

export function addSchoolRecord(precioActual = 15000) {
  const name       = document.getElementById('schoolName')?.value.trim()       || '';
  const level      = document.getElementById('schoolLevel')?.value              || 'Jardín';
  const stage      = document.getElementById('schoolStage')?.value              || 'prospecto';
  const contact    = document.getElementById('schoolContact')?.value.trim()     || '';
  const renewal    = document.getElementById('schoolRenewal')?.value.trim()     || '';
  const nextAction = document.getElementById('schoolNextAction')?.value.trim()  || '';
  const risk       = document.getElementById('schoolRisk')?.value               || 'verde';
  const pack       = Number(document.getElementById('schoolPack')?.value        || precioActual);
  const notes      = document.getElementById('schoolNotes')?.value.trim()       || '';

  if (!name) return;

  const data = getSchoolBoardData();
  data.unshift({ id: 'sch_' + Date.now(), name, level, stage, contact, renewal, nextAction, risk, pack, notes });
  saveSchoolBoardData(data);

  ['schoolName', 'schoolContact', 'schoolRenewal', 'schoolNextAction', 'schoolNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const packEl  = document.getElementById('schoolPack');  if (packEl)  packEl.value  = precioActual;
  const stageEl = document.getElementById('schoolStage'); if (stageEl) stageEl.value = 'prospecto';
  const riskEl  = document.getElementById('schoolRisk');  if (riskEl)  riskEl.value  = 'verde';

  renderSchoolBoard();
}

export function setSchoolField(id, field, value) {
  const data = getSchoolBoardData().map(item =>
    item.id === id ? { ...item, [field]: field === 'pack' ? Number(value || 0) : value } : item
  );
  saveSchoolBoardData(data);
  renderSchoolBoard();
}

export function removeSchoolRecord(id) {
  saveSchoolBoardData(getSchoolBoardData().filter(item => item.id !== id));
  renderSchoolBoard();
}

export function seedSchoolBoard() {
  if (getSchoolBoardData().length) return;
  saveSchoolBoardData(schoolBoardSeed);
  renderSchoolBoard();
}

export function clearSchoolBoard() {
  if (!confirm('¿Vaciar la cartera de colegios?')) return;
  trackedRemoveItem(SCHOOL_BOARD_KEY);
  renderSchoolBoard();
}

// ─────────────────────────────────────────────
// SCHOOL BOARD — RENDER
// ─────────────────────────────────────────────

export function renderSchoolBoard() {
  const rows = document.getElementById('schoolBoardRows');
  if (!rows) return;

  const data = getSchoolBoardData();

  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted)">Sin instituciones cargadas.</td></tr>';
  } else {
    rows.innerHTML = data.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.name || '—')}</strong></td>
        <td>${escapeHtml(item.level || '—')}</td>
        <td>
          <select class="inline-select stage-${item.stage}" onchange="setSchoolField('${item.id}','stage', this.value)">
            <option value="prospecto"  ${item.stage === 'prospecto'  ? 'selected' : ''}>Prospecto</option>
            <option value="contacto"   ${item.stage === 'contacto'   ? 'selected' : ''}>Contacto</option>
            <option value="reunion"    ${item.stage === 'reunion'    ? 'selected' : ''}>Reunión</option>
            <option value="propuesta"  ${item.stage === 'propuesta'  ? 'selected' : ''}>Propuesta</option>
            <option value="activo"     ${item.stage === 'activo'     ? 'selected' : ''}>Activo</option>
            <option value="renovacion" ${item.stage === 'renovacion' ? 'selected' : ''}>Renovación</option>
            <option value="pausa"      ${item.stage === 'pausa'      ? 'selected' : ''}>En pausa</option>
          </select>
        </td>
        <td>${escapeHtml(item.contact || '—')}</td>
        <td><input class="inline-input" value="${escapeHtml(item.renewal || '')}" onchange="setSchoolField('${item.id}','renewal', this.value)" type="text"></td>
        <td><input class="inline-input" value="${escapeHtml(item.nextAction || '')}" onchange="setSchoolField('${item.id}','nextAction', this.value)" type="text"></td>
        <td>
          <select class="inline-select risk-${item.risk}" onchange="setSchoolField('${item.id}','risk', this.value)">
            <option value="verde"   ${item.risk === 'verde'   ? 'selected' : ''}>Verde</option>
            <option value="amarillo" ${item.risk === 'amarillo'? 'selected' : ''}>Amarillo</option>
            <option value="rojo"    ${item.risk === 'rojo'    ? 'selected' : ''}>Rojo</option>
          </select>
        </td>
        <td><input class="inline-input inline-input-sm" value="${escapeHtml(String(item.pack || ''))}" onchange="setSchoolField('${item.id}','pack', this.value)" type="number"></td>
        <td><input class="inline-input" value="${escapeHtml((item.notes || '').replace(/"/g, '&quot;'))}" onchange="setSchoolField('${item.id}','notes', this.value)" type="text"></td>
        <td><button class="mini-btn danger" type="button" onclick="removeSchoolRecord('${item.id}')">Eliminar</button></td>
      </tr>
    `).join('');
  }

  // Contadores resumen
  const total    = data.length;
  const active   = data.filter(item => item.stage === 'activo').length;
  const pipeline = data.filter(item => ['prospecto', 'contacto', 'reunion', 'propuesta'].includes(item.stage)).length;
  const renewal  = data.filter(item => item.stage === 'renovacion').length;
  const red      = data.filter(item => item.risk === 'rojo').length;

  const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setId('schoolCount',    String(total));
  setId('schoolActive',   String(active));
  setId('schoolPipeline', String(pipeline));
  setId('schoolRenew',    String(renewal));
  setId('schoolRiskRed',  String(red));

  const insight = document.getElementById('schoolInsight');
  if (insight) {
    if (!total)                        insight.textContent = 'Sin cartera cargada todavía.';
    else if (red > 0)                  insight.textContent = 'Hay instituciones en riesgo rojo. Revisa objeciones, tiempos políticos y define próximo paso concreto.';
    else if (renewal > 0)              insight.textContent = 'Tienes renovaciones abiertas. Conviene atacar primero los colegios más cercanos al ciclo.';
    else if (pipeline > active)        insight.textContent = 'El pipeline está creciendo. Prioriza cierre de propuestas y seguimiento de reuniones.';
    else                               insight.textContent = 'La cartera está relativamente estable. Puedes concentrarte en renovación y calidad de ejecución.';
  }

  if (_onDataChange) _onDataChange();
}

// ─────────────────────────────────────────────
// FOLLOWUP BOARD — CRUD
// ─────────────────────────────────────────────

export function getFollowupData() {
  try {
    const data = JSON.parse(localStorage.getItem(FOLLOWUP_BOARD_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function saveFollowupData(data) {
  trackedSetItem(FOLLOWUP_BOARD_KEY, JSON.stringify(data));
}

export function addFollowupRecord() {
  const school     = document.getElementById('followSchool')?.value.trim()  || '';
  const date       = document.getElementById('followDate')?.value            || '';
  const course     = document.getElementById('followCourse')?.value.trim()  || '';
  const type       = document.getElementById('followType')?.value           || 'ausente';
  const count      = Number(document.getElementById('followCount')?.value   || 1);
  const status     = document.getElementById('followStatus')?.value         || 'abierto';
  const nextAction = document.getElementById('followNext')?.value.trim()    || '';
  const owner      = document.getElementById('followOwner')?.value.trim()   || '';
  const notes      = document.getElementById('followNotes')?.value.trim()   || '';

  if (!school || !course) return;

  const data = getFollowupData();
  data.unshift({ id: 'fl_' + Date.now(), school, date, course, type, count, status, nextAction, owner, notes });
  saveFollowupData(data);

  ['followSchool', 'followDate', 'followCourse', 'followNext', 'followOwner', 'followNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const typeEl   = document.getElementById('followType');   if (typeEl)   typeEl.value   = 'ausente';
  const statusEl = document.getElementById('followStatus'); if (statusEl) statusEl.value = 'abierto';
  const countEl  = document.getElementById('followCount');  if (countEl)  countEl.value  = 1;

  renderFollowupBoard();
}

export function setFollowupField(id, field, value) {
  const data = getFollowupData().map(item =>
    item.id === id ? { ...item, [field]: field === 'count' ? Number(value || 0) : value } : item
  );
  saveFollowupData(data);
  renderFollowupBoard();
}

export function removeFollowupRecord(id) {
  saveFollowupData(getFollowupData().filter(item => item.id !== id));
  renderFollowupBoard();
}

export function seedFollowupBoard() {
  if (getFollowupData().length) return;
  saveFollowupData(followupSeed);
  renderFollowupBoard();
}

export function clearFollowupBoard() {
  if (!confirm('¿Vaciar pendientes, ausentes y retomas?')) return;
  trackedRemoveItem(FOLLOWUP_BOARD_KEY);
  renderFollowupBoard();
}

// ─────────────────────────────────────────────
// FOLLOWUP BOARD — RENDER
// ─────────────────────────────────────────────

export function renderFollowupBoard() {
  const rows = document.getElementById('followupRows');
  if (!rows) return;

  const data = getFollowupData();

  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted)">Sin controles cargados.</td></tr>';
  } else {
    rows.innerHTML = data.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.school || '—')}</strong></td>
        <td>${escapeHtml(item.date || '—')}</td>
        <td>${escapeHtml(item.course || '—')}</td>
        <td>
          <select class="inline-select type-${item.type}" onchange="setFollowupField('${item.id}','type', this.value)">
            <option value="ausente"   ${item.type === 'ausente'   ? 'selected' : ''}>Ausente</option>
            <option value="retoma"    ${item.type === 'retoma'    ? 'selected' : ''}>Retoma</option>
            <option value="pendiente" ${item.type === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          </select>
        </td>
        <td><input class="inline-input inline-input-sm" value="${escapeHtml(String(item.count || 1))}" onchange="setFollowupField('${item.id}','count', this.value)" type="number" min="1"></td>
        <td>
          <select class="inline-select status-${item.status}" onchange="setFollowupField('${item.id}','status', this.value)">
            <option value="abierto"  ${item.status === 'abierto'  ? 'selected' : ''}>Abierto</option>
            <option value="agendado" ${item.status === 'agendado' ? 'selected' : ''}>Agendado</option>
            <option value="resuelto" ${item.status === 'resuelto' ? 'selected' : ''}>Resuelto</option>
          </select>
        </td>
        <td><input class="inline-input" value="${escapeHtml(item.nextAction || '')}" onchange="setFollowupField('${item.id}','nextAction', this.value)" type="text"></td>
        <td><input class="inline-input" value="${escapeHtml(item.owner || '')}" onchange="setFollowupField('${item.id}','owner', this.value)" type="text"></td>
        <td><input class="inline-input" value="${escapeHtml((item.notes || '').replace(/"/g, '&quot;'))}" onchange="setFollowupField('${item.id}','notes', this.value)" type="text"></td>
        <td><button class="mini-btn danger" type="button" onclick="removeFollowupRecord('${item.id}')">Eliminar</button></td>
      </tr>
    `).join('');
  }

  const total  = data.length;
  const absent = data.filter(item => item.type === 'ausente').reduce((sum, item) => sum + Number(item.count || 0), 0);
  const retake = data.filter(item => item.type === 'retoma' && item.status !== 'resuelto').reduce((sum, item) => sum + Number(item.count || 0), 0);
  const open   = data.filter(item => item.status !== 'resuelto').reduce((sum, item) => sum + Number(item.count || 0), 0);

  const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setId('followCountAll', String(total));
  setId('followAbsent',   String(absent));
  setId('followRetake',   String(retake));
  setId('followOpen',     String(open));

  const insight = document.getElementById('followInsight');
  if (insight) {
    if (!total)        insight.textContent = 'Sin pendientes cargados todavía.';
    else if (retake > 0) insight.textContent = 'Hay retomas abiertas. Define fecha o criterio de cierre antes de avanzar con producción final.';
    else if (absent > 0) insight.textContent = 'Existen ausentes registrados. Decide si se absorben en una retoma o se cierran como ausentes definitivos.';
    else if (open > 0)   insight.textContent = 'Quedan pendientes operativos. Conviene cerrarlos antes de edición e impresión.';
    else                 insight.textContent = 'Control limpio: no quedan abiertos relevantes en esta vista.';
  }

  if (_onDataChange) _onDataChange();
}
