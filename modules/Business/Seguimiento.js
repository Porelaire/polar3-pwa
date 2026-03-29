/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * Seguimiento — Gesti\u00F3n de pendientes, ausentes y retomas
 */

import { storage } from '../Storage.js';
import {
  STORAGE_KEYS,
  FOLLOWUP_TYPES,
  FOLLOWUP_STATUS,
  APP_VERSION
} from '../../config.js';

function generateId() {
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function validateRecord(data) {
  const errors = [];
  if (!data.escuela || data.escuela.trim().length < 2)
    errors.push('Escuela es requerida');
  if (!data.tipo || !FOLLOWUP_TYPES.includes(data.tipo))
    errors.push(`Tipo inv\u00E1lido. Valores: ${FOLLOWUP_TYPES.join(', ')}`);
  if (data.estado && !FOLLOWUP_STATUS.includes(data.estado))
    errors.push(`Estado inv\u00E1lido. Valores: ${FOLLOWUP_STATUS.join(', ')}`);
  return { valid: errors.length === 0, errors };
}

class SeguimientoManager {
  constructor() {
    this.records = [];
    this._listeners = new Set();
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this.records = storage.getItem(STORAGE_KEYS.followupBoard, []);
    if (!Array.isArray(this.records)) this.records = [];
    this._initialized = true;
    console.log(`[Seguimiento] Inicializado: ${this.records.length} registros`);
  }

  add(data) {
    const cleaned = {};
    Object.entries(data).forEach(([k, v]) => {
      cleaned[k] = typeof v === 'string' ? sanitize(v.trim()) : v;
    });
    cleaned.estado = cleaned.estado || 'abierto';
    cleaned.cantidad = Number(cleaned.cantidad) || 0;
    const validation = validateRecord(cleaned);
    if (!validation.valid) return { success: false, errors: validation.errors };
    const id = cleaned.id || generateId();
    const now = new Date().toISOString();
    const record = {
      ...cleaned, id,
      fechaCreacion: cleaned.fechaCreacion || now,
      fechaModificacion: now
    };
    this.records.push(record);
    this._persist();
    this._notify();
    console.log(`[Seguimiento] Agregado: ${id} (${record.tipo})`);
    return { success: true, id };
  }

  getById(id) {
    const r = this.records.find(r => r.id === id);
    return r ? { ...r } : null;
  }

  update(id, updates) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, error: 'No encontrado' };
    const cleaned = {};
    Object.entries(updates).forEach(([k, v]) => {
      cleaned[k] = typeof v === 'string' ? sanitize(v.trim()) : v;
    });
    const merged = {
      ...this.records[idx], ...cleaned, id,
      fechaCreacion: this.records[idx].fechaCreacion,
      fechaModificacion: new Date().toISOString()
    };
    const validation = validateRecord(merged);
    if (!validation.valid)
      return { success: false, error: 'Validaci\u00F3n fallida', errors: validation.errors };
    this.records[idx] = merged;
    this._persist();
    this._notify();
    return { success: true };
  }

  delete(id) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, error: 'No encontrado' };
    this.records.splice(idx, 1);
    this._persist();
    this._notify();
    console.log(`[Seguimiento] Eliminado: ${id}`);
    return { success: true };
  }

  cambiarEstado(id, nuevoEstado, nota) {
    if (!FOLLOWUP_STATUS.includes(nuevoEstado))
      return { success: false, error: `Estado inv\u00E1lido: ${nuevoEstado}` };
    const updates = { estado: nuevoEstado };
    if (nota) updates.notas = nota;
    if (nuevoEstado === 'resuelto') updates.fechaResolucion = new Date().toISOString();
    return this.update(id, updates);
  }

  resolver(id, nota)           { return this.cambiarEstado(id, 'resuelto', nota); }
  agendar(id, proximaAccion)   { return this.update(id, { estado: 'agendado', proximaAccion: proximaAccion || '' }); }
  getAll()                     { return this.records.map(r => ({ ...r })); }
  get count()                  { return this.records.length; }

  filter(criteria = {}) {
    const texto = criteria.texto ? criteria.texto.toLowerCase().trim() : null;
    return this.records.filter(r => {
      if (criteria.tipo   && r.tipo   !== criteria.tipo)   return false;
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

  getAbiertos()   { return this.filter({ estado: 'abierto' }); }
  getAgendados()  { return this.filter({ estado: 'agendado' }); }
  getResueltos()  { return this.filter({ estado: 'resuelto' }); }
  getByTipo(tipo) { return this.filter({ tipo }); }

  getEscuelasConPendientes() {
    const s = new Set();
    this.records.forEach(r => { if (r.estado !== 'resuelto') s.add(r.escuela); });
    return [...s].sort();
  }

  getStats() {
    const total     = this.records.length;
    const abiertos  = this.records.filter(r => r.estado === 'abierto').length;
    const agendados = this.records.filter(r => r.estado === 'agendado').length;
    const resueltos = this.records.filter(r => r.estado === 'resuelto').length;
    const porTipo   = {};
    FOLLOWUP_TYPES.forEach(t => {
      porTipo[t] = this.records.filter(r => r.tipo === t && r.estado !== 'resuelto').length;
    });
    const alumnosAfectados = this.records
      .filter(r => r.estado !== 'resuelto')
      .reduce((sum, r) => sum + (r.cantidad || 0), 0);
    return {
      total, abiertos, agendados, resueltos, porTipo, alumnosAfectados,
      escuelasAfectadas: this.getEscuelasConPendientes().length,
      tasaResolucion: total > 0 ? Math.round((resueltos / total) * 100) : 0
    };
  }

  onChange(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }

  _notify() {
    const snap = this.getAll();
    this._listeners.forEach(fn => { try { fn(snap); } catch(e) { console.error('[Seguimiento]', e); } });
  }

  export() {
    return {
      app: 'Polar3', module: 'seguimiento', version: APP_VERSION,
      exportDate: new Date().toISOString(),
      recordCount: this.records.length,
      data: this.records.map(r => ({ ...r }))
    };
  }

  import(importData, opts = {}) {
    const { merge = true } = opts;
    try {
      if (!importData || !Array.isArray(importData.data))
        return { success: false, error: 'Formato inv\u00E1lido' };
      if (!merge) this.records = [];
      let imported = 0;
      importData.data.forEach(r => { if (this.add(r).success) imported++; });
      return { success: true, imported };
    } catch (err) { return { success: false, error: err.message }; }
  }

  reload() {
    this.records = storage.getItem(STORAGE_KEYS.followupBoard, []);
    if (!Array.isArray(this.records)) this.records = [];
    this._notify();
    console.log(`[Seguimiento] Recargado: ${this.records.length}`);
  }

  clear() { this.records = []; this._persist(); this._notify(); }
  _persist() { storage.setItem(STORAGE_KEYS.followupBoard, this.records); }
}

export const seguimiento = new SeguimientoManager();
export default seguimiento;
