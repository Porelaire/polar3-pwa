/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * Seguimiento — Gestión de pendientes, ausentes y retomas
 *
 * Tracks: alumnos ausentes, retomas pendientes, acciones de seguimiento.
 * Cada registro tiene un tipo (ausente/retoma/pendiente) y un estado
 * (abierto/agendado/resuelto).
 *
 * Uso:
 *   import { seguimiento } from './modules/Business/Seguimiento.js';
 *   seguimiento.init();
 *   seguimiento.add({ escuela: '...', tipo: 'ausente', ... });
 */

import { storage } from '../Storage.js';
import {
  STORAGE_KEYS,
  FOLLOWUP_TYPES,
  FOLLOWUP_STATUS,
  APP_VERSION
} from '../../config.js';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateId() {
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function validateRecord(data) {
  const errors = [];

  if (!data.escuela || data.escuela.trim().length < 2) {
    errors.push('Escuela es requerida');
  }

  if (!data.tipo || !FOLLOWUP_TYPES.includes(data.tipo)) {
    errors.push(`Tipo inválido. Valores: ${FOLLOWUP_TYPES.join(', ')}`);
  }

  if (data.estado && !FOLLOWUP_STATUS.includes(data.estado)) {
    errors.push(`Estado inválido. Valores: ${FOLLOWUP_STATUS.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class SeguimientoManager {
  constructor() {
    /** @type {Array<Object>} */
    this.records = [];

    /** @type {Set<Function>} */
    this._listeners = new Set();

    /** @type {boolean} */
    this._initialized = false;
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────

  init() {
    if (this._initialized) return;

    this.records = storage.getItem(STORAGE_KEYS.followupBoard, []);
    if (!Array.isArray(this.records)) {
      this.records = [];
    }

    this._initialized = true;
    console.log(`[Seguimiento] Inicializado: ${this.records.length} registros`);
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────

  /**
   * Agrega un registro de seguimiento.
   * @param {Object} data
   * @param {string} data.escuela
   * @param {string} [data.curso]
   * @param {string} data.tipo - 'ausente' | 'retoma' | 'pendiente'
   * @param {number} [data.cantidad] - Alumnos afectados
   * @param {string} [data.proximaAccion]
   * @param {string} [data.responsable]
   * @param {string} [data.notas]
   * @returns {{success: boolean, id?: string, errors?: string[]}}
   */
  add(data) {
    const cleaned = {};
    Object.entries(data).forEach(([k, v]) => {
      cleaned[k] = typeof v === 'string' ? sanitize(v.trim()) : v;
    });

    cleaned.estado = cleaned.estado || 'abierto';
    cleaned.cantidad = Number(cleaned.cantidad) || 0;

    const validation = validateRecord(cleaned);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const id = cleaned.id || generateId();
    const now = new Date().toISOString();

    const record = {
      ...cleaned,
      id,
      fechaCreacion: cleaned.fechaCreacion || now,
      fechaModificacion: now
    };

    this.records.push(record);
    this._persist();
    this._notify();

    console.log(`[Seguimiento] Agregado: ${id} (${record.tipo})`);
    return { success: true, id };
  }

  /**
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    const record = this.records.find(r => r.id === id);
    return record ? { ...record } : null;
  }

  /**
   * @param {string} id
   * @param {Object} updates
   * @returns {{success: boolean, error?: string}}
   */
  update(id, updates) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, error: 'No encontrado' };

    const cleaned = {};
    Object.entries(updates).forEach(([k, v]) => {
      cleaned[k] = typeof v === 'string' ? sanitize(v.trim()) : v;
    });

    const merged = {
      ...this.records[idx],
      ...cleaned,
      id,
      fechaCreacion: this.records[idx].fechaCreacion,
      fechaModificacion: new Date().toISOString()
    };

    const validation = validateRecord(merged);
    if (!validation.valid) {
      return { success: false, error: 'Validación fallida', errors: validation.errors };
    }

    this.records[idx] = merged;
    this._persist();
    this._notify();

    return { success: true };
  }

  /**
   * @param {string} id
   * @returns {{success: boolean, error?: string}}
   */
  delete(id) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, error: 'No encontrado' };

    this.records.splice(idx, 1);
    this._persist();
    this._notify();

    console.log(`[Seguimiento] Eliminado: ${id}`);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // CAMBIOS DE ESTADO
  // ─────────────────────────────────────────────────────────────

  /**
   * Cambia el estado de un registro.
   * @param {string} id
   * @param {string} nuevoEstado - 'abierto' | 'agendado' | 'resuelto'
   * @param {string} [nota] - Nota opcional al cambiar estado
   * @returns {{success: boolean}}
   */
  cambiarEstado(id, nuevoEstado, nota) {
    if (!FOLLOWUP_STATUS.includes(nuevoEstado)) {
      return { success: false, error: `Estado inválido: ${nuevoEstado}` };
    }

    const updates = { estado: nuevoEstado };
    if (nota) updates.notas = nota;
    if (nuevoEstado === 'resuelto') {
      updates.fechaResolucion = new Date().toISOString();
    }

    return this.update(id, updates);
  }

  /**
   * Shortcut: marcar como resuelto.
   * @param {string} id
   * @param {string} [nota]
   * @returns {{success: boolean}}
   */
  resolver(id, nota) {
    return this.cambiarEstado(id, 'resuelto', nota);
  }

  /**
   * Shortcut: agendar retoma.
   * @param {string} id
   * @param {string} proximaAccion
   * @returns {{success: boolean}}
   */
  agendar(id, proximaAccion) {
    return this.update(id, {
      estado: 'agendado',
      proximaAccion: proximaAccion || ''
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CONSULTAS Y FILTROS
  // ─────────────────────────────────────────────────────────────

  /**
   * Todos los registros (copia).
   * @returns {Object[]}
   */
  getAll() {
    return this.records.map(r => ({ ...r }));
  }

  /** @returns {number} */
  get count() {
    return this.records.length;
  }

  /**
   * Filtra registros.
   * @param {Object} criteria
   * @param {string} [criteria.tipo]
   * @param {string} [criteria.estado]
   * @param {string} [criteria.escuela]
   * @param {string} [criteria.texto] - Búsqueda libre
   * @returns {Object[]}
   */
  filter(criteria = {}) {
    const texto = criteria.texto ? criteria.texto.toLowerCase().trim() : null;

    return this.records.filter(r => {
      if (criteria.tipo && r.tipo !== criteria.tipo) return false;
      if (criteria.estado && r.estado !== criteria.estado) return false;
      if (criteria.escuela && r.escuela !== criteria.escuela) return false;

      if (texto) {
        const haystack = [r.escuela, r.curso, r.notas, r.proximaAccion, r.responsable]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(texto)) return false;
      }

      return true;
    }).map(r => ({ ...r }));
  }

  /**
   * Solo registros abiertos (no resueltos).
   * @returns {Object[]}
   */
  getAbiertos() {
    return this.filter({ estado: 'abierto' });
  }

  /**
   * Solo registros agendados.
   * @returns {Object[]}
   */
  getAgendados() {
    return this.filter({ estado: 'agendado' });
  }

  /**
   * Solo registros resueltos.
   * @returns {Object[]}
   */
  getResueltos() {
    return this.filter({ estado: 'resuelto' });
  }

  /**
   * Registros por tipo.
   * @param {string} tipo - 'ausente' | 'retoma' | 'pendiente'
   * @returns {Object[]}
   */
  getByTipo(tipo) {
    return this.filter({ tipo });
  }

  /**
   * Escuelas únicas con registros abiertos.
   * @returns {string[]}
   */
  getEscuelasConPendientes() {
    const escuelas = new Set();
    this.records.forEach(r => {
      if (r.estado !== 'resuelto') {
        escuelas.add(r.escuela);
      }
    });
    return [...escuelas].sort();
  }

  // ─────────────────────────────────────────────────────────────
  // ESTADÍSTICAS
  // ─────────────────────────────────────────────────────────────

  /**
   * Stats generales de seguimiento.
   * @returns {Object}
   */
  getStats() {
    const total = this.records.length;
    const abiertos = this.records.filter(r => r.estado === 'abierto').length;
    const agendados = this.records.filter(r => r.estado === 'agendado').length;
    const resueltos = this.records.filter(r => r.estado === 'resuelto').length;

    const porTipo = {};
    FOLLOWUP_TYPES.forEach(t => {
      porTipo[t] = this.records.filter(r => r.tipo === t && r.estado !== 'resuelto').length;
    });

    const alumnosAfectados = this.records
      .filter(r => r.estado !== 'resuelto')
      .reduce((sum, r) => sum + (r.cantidad || 0), 0);

    return {
      total,
      abiertos,
      agendados,
      resueltos,
      porTipo,
      alumnosAfectados,
      escuelasAfectadas: this.getEscuelasConPendientes().length,
      tasaResolucion: total > 0 ? Math.round((resueltos / total) * 100) : 0
    };
  }

  // ─────────────────────────────────────────────────────────────
  // LISTENERS
  // ─────────────────────────────────────────────────────────────

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** @private */
  _notify() {
    const snapshot = this.getAll();
    this._listeners.forEach(fn => {
      try { fn(snapshot); } catch (e) { console.error('[Seguimiento] Listener error:', e); }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORT / IMPORT
  // ─────────────────────────────────────────────────────────────

  export() {
    return {
      app: 'Polar3',
      module: 'seguimiento',
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      recordCount: this.records.length,
      data: this.records.map(r => ({ ...r }))
    };
  }

  import(importData, opts = {}) {
    const { merge = true } = opts;
    try {
      if (!importData || !Array.isArray(importData.data)) {
        return { success: false, error: 'Formato inválido' };
      }

      if (!merge) {
        this.records = [];
      }

      let imported = 0;
      importData.data.forEach(record => {
        const result = this.add(record);
        if (result.success) imported++;
      });

      return { success: true, imported };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────

  reload() {
    this.records = storage.getItem(STORAGE_KEYS.followupBoard, []);
    if (!Array.isArray(this.records)) this.records = [];
    this._notify();
    console.log(`[Seguimiento] Recargado: ${this.records.length}`);
  }

  clear() {
    this.records = [];
    this._persist();
    this._notify();
  }

  /** @private */
  _persist() {
    storage.setItem(STORAGE_KEYS.followupBoard, this.records);
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const seguimiento = new SeguimientoManager();

export default seguimiento;
