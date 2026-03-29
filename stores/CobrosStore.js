/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * CobrosStore — State management para cobranzas
 *
 * Mantiene índices para búsquedas O(1) por ID y por escuela.
 * Incluye validación inline, filtros múltiples, stats y export.
 * Notifica listeners cuando cambian los datos.
 *
 * Uso:
 *   import { cobrosStore } from './stores/CobrosStore.js';
 *   cobrosStore.init();
 *   cobrosStore.add({ escuela: 'Jardín Sol', curso: 'Sala 5', ... });
 *   cobrosStore.onChange((records) => renderTable(records));
 */

import { storage } from '../modules/Storage.js';
import {
  STORAGE_KEYS,
  COBRO_STATES,
  PAYMENT_METHODS,
  PACK_PRICE_DEFAULT,
  CANON_PERCENTAGE,
  DEFAULTS,
  APP_VERSION,
  VALIDATION_RULES
} from '../config.js';

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN INLINE
// ═══════════════════════════════════════════════════════════════

/**
 * Valida un objeto cobro antes de guardarlo.
 * @param {Object} cobro
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateCobro(cobro) {
  const errors = [];

  if (!cobro.escuela || typeof cobro.escuela !== 'string' || cobro.escuela.trim().length < 2) {
    errors.push('Escuela es requerida (mín. 2 caracteres)');
  }

  if (!cobro.curso || typeof cobro.curso !== 'string' || cobro.curso.trim().length < 1) {
    errors.push('Curso es requerido');
  }

  if (cobro.cantidad !== undefined && cobro.cantidad !== null) {
    const cant = Number(cobro.cantidad);
    if (isNaN(cant) || cant < 0) {
      errors.push('Cantidad debe ser un número >= 0');
    }
  }

  if (cobro.precio !== undefined && cobro.precio !== null) {
    const precio = Number(cobro.precio);
    if (isNaN(precio) || precio < 0) {
      errors.push('Precio debe ser un número >= 0');
    }
  }

  if (cobro.estado && !COBRO_STATES.includes(cobro.estado)) {
    errors.push(`Estado inválido: "${cobro.estado}". Valores: ${COBRO_STATES.join(', ')}`);
  }

  if (cobro.metodoPago) {
    const validMethods = PAYMENT_METHODS.map(m => m.value);
    if (!validMethods.includes(cobro.metodoPago)) {
      errors.push(`Método de pago inválido: "${cobro.metodoPago}"`);
    }
  }

  if (cobro.email && !VALIDATION_RULES.email.test(cobro.email)) {
    errors.push('Formato de email inválido');
  }

  if (cobro.telefono) {
    const clean = cobro.telefono.replace(/[^\d+]/g, '');
    if (clean.length > 0 && !VALIDATION_RULES.phone.test(clean)) {
      errors.push('Teléfono debe tener 7-15 dígitos');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitiza strings para prevenir XSS básico.
 * @param {string} str
 * @returns {string}
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Genera un ID único para un cobro.
 * @returns {string}
 */
function generateId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 11);
  return `cobro_${ts}_${rand}`;
}

// ═══════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class CobrosStore {
  constructor() {
    /** @type {Array<Object>} Registros de cobranzas */
    this.records = [];

    /** @type {Object<string, number>} Índice id → posición en array */
    this._indexById = {};

    /** @type {Object<string, number[]>} Índice escuela → posiciones */
    this._indexByEscuela = {};

    /** @type {Set<Function>} Listeners de cambio */
    this._listeners = new Set();

    /** @type {boolean} */
    this._initialized = false;
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────

  /**
   * Carga datos desde storage y construye índices.
   * Llamar una vez al iniciar la app.
   */
  init() {
    if (this._initialized) return;

    this.records = storage.getItem(STORAGE_KEYS.cobros, []);

    // Asegurar que es un array
    if (!Array.isArray(this.records)) {
      console.warn('[CobrosStore] Datos corruptos, reseteando a array vacío');
      this.records = [];
    }

    this._rebuildIndexes();
    this._initialized = true;

    console.log(`[CobrosStore] Inicializado: ${this.records.length} registros, ${this.getEscuelas().length} escuelas`);
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────

  /**
   * Agrega una cobranza nueva.
   * @param {Object} data - Datos del cobro (sin id ni fechas)
   * @returns {{success: boolean, id?: string, error?: string, errors?: string[]}}
   */
  add(data) {
    // Sanitizar strings
    const cleaned = this._sanitizeRecord(data);

    // Defaults
    cleaned.estado = cleaned.estado || DEFAULTS.cobro.estado;
    cleaned.metodoPago = cleaned.metodoPago || DEFAULTS.cobro.metodoPago;
    cleaned.cantidad = Number(cleaned.cantidad) || 0;
    cleaned.precio = Number(cleaned.precio) || PACK_PRICE_DEFAULT;
    cleaned.total = cleaned.cantidad * cleaned.precio;

    // Validar
    const validation = validateCobro(cleaned);
    if (!validation.valid) {
      console.warn('[CobrosStore] Validación fallida:', validation.errors);
      return { success: false, error: 'Validación fallida', errors: validation.errors };
    }

    // Generar ID y timestamps
    const id = cleaned.id || generateId();
    const now = new Date().toISOString();

    const record = {
      ...cleaned,
      id,
      fechaCreacion: cleaned.fechaCreacion || now,
      fechaModificacion: now
    };

    // Verificar duplicado
    if (this._indexById[id] !== undefined) {
      return { success: false, error: `ID duplicado: ${id}` };
    }

    // Agregar al array
    const idx = this.records.length;
    this.records.push(record);

    // Actualizar índice por ID
    this._indexById[id] = idx;

    // Actualizar índice por escuela
    const escuela = record.escuela;
    if (!this._indexByEscuela[escuela]) {
      this._indexByEscuela[escuela] = [];
    }
    this._indexByEscuela[escuela].push(idx);

    // Persistir y notificar
    this._persist();
    this._notify();

    console.log(`[CobrosStore] Agregado: ${id}`);
    return { success: true, id };
  }

  /**
   * Obtiene un cobro por ID.
   * @param {string} id
   * @returns {Object|null} Copia del registro (no referencia directa)
   */
  getById(id) {
    const idx = this._indexById[id];
    if (idx === undefined) return null;
    return { ...this.records[idx] };
  }

  /**
   * Actualiza un cobro existente.
   * @param {string} id
   * @param {Object} updates - Campos a actualizar
   * @returns {{success: boolean, error?: string, errors?: string[]}}
   */
  update(id, updates) {
    const idx = this._indexById[id];
    if (idx === undefined) {
      return { success: false, error: 'Cobro no encontrado' };
    }

    const current = this.records[idx];
    const cleaned = this._sanitizeRecord(updates);

    // Merge
    const merged = {
      ...current,
      ...cleaned,
      id, // No permitir cambiar el ID
      fechaCreacion: current.fechaCreacion, // No modificar fecha de creación
      fechaModificacion: new Date().toISOString()
    };

    // Recalcular total si cambiaron precio o cantidad
    if (cleaned.precio !== undefined || cleaned.cantidad !== undefined) {
      merged.cantidad = Number(merged.cantidad) || 0;
      merged.precio = Number(merged.precio) || 0;
      merged.total = merged.cantidad * merged.precio;
    }

    // Validar
    const validation = validateCobro(merged);
    if (!validation.valid) {
      return { success: false, error: 'Validación fallida', errors: validation.errors };
    }

    // Si cambió la escuela, actualizar índice
    if (cleaned.escuela && cleaned.escuela !== current.escuela) {
      // Quitar del índice viejo
      const oldList = this._indexByEscuela[current.escuela];
      if (oldList) {
        const pos = oldList.indexOf(idx);
        if (pos > -1) oldList.splice(pos, 1);
        if (oldList.length === 0) delete this._indexByEscuela[current.escuela];
      }

      // Agregar al índice nuevo
      if (!this._indexByEscuela[cleaned.escuela]) {
        this._indexByEscuela[cleaned.escuela] = [];
      }
      this._indexByEscuela[cleaned.escuela].push(idx);
    }

    // Guardar
    this.records[idx] = merged;
    this._persist();
    this._notify();

    console.log(`[CobrosStore] Actualizado: ${id}`);
    return { success: true };
  }

  /**
   * Elimina un cobro por ID.
   * @param {string} id
   * @returns {{success: boolean, error?: string}}
   */
  delete(id) {
    const idx = this._indexById[id];
    if (idx === undefined) {
      return { success: false, error: 'Cobro no encontrado' };
    }

    // Remover del array
    this.records.splice(idx, 1);

    // Reconstruir índices (splice desplaza posiciones)
    this._rebuildIndexes();

    // Persistir y notificar
    this._persist();
    this._notify();

    console.log(`[CobrosStore] Eliminado: ${id}`);
    return { success: true };
  }

  /**
   * Cambia el estado de un cobro (pendiente ↔ pagado).
   * Shortcut de update para el caso más común.
   * @param {string} id
   * @param {string} nuevoEstado - 'pendiente' | 'pagado'
   * @param {Object} [extras] - Datos adicionales (metodoPago, comprobante, etc.)
   * @returns {{success: boolean, error?: string}}
   */
  cambiarEstado(id, nuevoEstado, extras = {}) {
    if (!COBRO_STATES.includes(nuevoEstado)) {
      return { success: false, error: `Estado inválido: ${nuevoEstado}` };
    }

    const updates = { estado: nuevoEstado, ...extras };

    // Si se marca como pagado y no tiene fecha de pago, agregarla
    if (nuevoEstado === 'pagado' && !extras.fechaPago) {
      updates.fechaPago = new Date().toISOString();
    }

    return this.update(id, updates);
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

  /**
   * Cantidad total de registros.
   * @returns {number}
   */
  get count() {
    return this.records.length;
  }

  /**
   * Busca cobros por escuela (O(1) lookup + copy).
   * @param {string} escuela
   * @returns {Object[]}
   */
  findByEscuela(escuela) {
    const indices = this._indexByEscuela[escuela] || [];
    return indices.map(idx => ({ ...this.records[idx] }));
  }

  /**
   * Lista de escuelas únicas.
   * @returns {string[]}
   */
  getEscuelas() {
    return Object.keys(this._indexByEscuela).sort();
  }

  /**
   * Filtra registros con criterios múltiples.
   * Todos los criterios se combinan con AND.
   * @param {Object} criteria
   * @param {string} [criteria.escuela] - Escuela exacta
   * @param {string} [criteria.estado] - 'pendiente' | 'pagado'
   * @param {string} [criteria.metodoPago] - Método de pago
   * @param {string} [criteria.mes] - Formato 'YYYY-MM' para filtrar por fecha
   * @param {number} [criteria.minTotal] - Total mínimo
   * @param {number} [criteria.maxTotal] - Total máximo
   * @param {string} [criteria.texto] - Búsqueda de texto en escuela, curso, familia, notas
   * @returns {Object[]}
   */
  filter(criteria = {}) {
    const textoBusqueda = criteria.texto ? criteria.texto.toLowerCase().trim() : null;

    return this.records.filter(record => {
      // Filtro por escuela
      if (criteria.escuela && record.escuela !== criteria.escuela) return false;

      // Filtro por estado
      if (criteria.estado && record.estado !== criteria.estado) return false;

      // Filtro por método de pago
      if (criteria.metodoPago && record.metodoPago !== criteria.metodoPago) return false;

      // Filtro por mes (YYYY-MM)
      if (criteria.mes) {
        const fechaRef = record.fecha || record.fechaCreacion || '';
        if (!fechaRef.startsWith(criteria.mes)) return false;
      }

      // Filtro por rango de total
      if (criteria.minTotal !== undefined && (record.total || 0) < criteria.minTotal) return false;
      if (criteria.maxTotal !== undefined && (record.total || 0) > criteria.maxTotal) return false;

      // Búsqueda de texto
      if (textoBusqueda) {
        const haystack = [
          record.escuela,
          record.curso,
          record.familia,
          record.notas,
          record.comprobante
        ].filter(Boolean).join(' ').toLowerCase();

        if (!haystack.includes(textoBusqueda)) return false;
      }

      return true;
    }).map(r => ({ ...r }));
  }

  /**
   * Ordena registros por un campo.
   * @param {Object[]} records - Array de registros (no muta el original)
   * @param {string} field - Campo por el que ordenar
   * @param {'asc'|'desc'} [direction='desc']
   * @returns {Object[]}
   */
  sort(records, field, direction = 'desc') {
    const sorted = [...records];
    const mult = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      // Números
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * mult;
      }

      // Fechas (ISO strings)
      if (field.includes('fecha') || field.includes('Fecha')) {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
        return (valA - valB) * mult;
      }

      // Strings
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
      return valA.localeCompare(valB, 'es') * mult;
    });

    return sorted;
  }

  // ─────────────────────────────────────────────────────────────
  // ESTADÍSTICAS
  // ─────────────────────────────────────────────────────────────

  /**
   * Estadísticas generales de cobranzas.
   * @param {Object} [criteria] - Filtros opcionales (mismos que filter())
   * @returns {Object}
   */
  getStats(criteria) {
    const records = criteria ? this.filter(criteria) : this.records;

    const totalCobros = records.length;
    const totalMonto = records.reduce((sum, r) => sum + (r.total || 0), 0);

    const pagados = records.filter(r => r.estado === 'pagado');
    const montoCobrado = pagados.reduce((sum, r) => sum + (r.total || 0), 0);

    const pendientes = records.filter(r => r.estado === 'pendiente');
    const montoPendiente = pendientes.reduce((sum, r) => sum + (r.total || 0), 0);

    const totalPacks = records.reduce((sum, r) => sum + (r.cantidad || 0), 0);
    const canon = montoCobrado * CANON_PERCENTAGE;

    return {
      totalCobros,
      totalPacks,
      totalMonto,
      montoCobrado,
      montoPendiente,
      canon,
      netoPostCanon: montoCobrado - canon,
      porcentajeCobrado: totalMonto > 0 ? Math.round((montoCobrado / totalMonto) * 10000) / 100 : 0,
      cantidadPagados: pagados.length,
      cantidadPendientes: pendientes.length,
      escuelasUnicas: criteria
        ? [...new Set(records.map(r => r.escuela))].length
        : Object.keys(this._indexByEscuela).length,
      ticketPromedio: totalCobros > 0 ? Math.round(totalMonto / totalCobros) : 0
    };
  }

  /**
   * Stats agrupados por escuela.
   * @returns {Array<{escuela: string, cobros: number, packs: number, total: number, cobrado: number, pendiente: number, porcentaje: number}>}
   */
  getStatsByEscuela() {
    const groups = {};

    this.records.forEach(r => {
      const key = r.escuela || '(sin escuela)';
      if (!groups[key]) {
        groups[key] = { escuela: key, cobros: 0, packs: 0, total: 0, cobrado: 0, pendiente: 0 };
      }
      const g = groups[key];
      g.cobros++;
      g.packs += (r.cantidad || 0);
      g.total += (r.total || 0);
      if (r.estado === 'pagado') {
        g.cobrado += (r.total || 0);
      } else {
        g.pendiente += (r.total || 0);
      }
    });

    return Object.values(groups).map(g => ({
      ...g,
      porcentaje: g.total > 0 ? Math.round((g.cobrado / g.total) * 10000) / 100 : 0
    })).sort((a, b) => b.total - a.total);
  }

  /**
   * Stats agrupados por mes.
   * @returns {Array<{mes: string, cobros: number, total: number, cobrado: number}>}
   */
  getStatsByMes() {
    const groups = {};

    this.records.forEach(r => {
      const fecha = r.fecha || r.fechaCreacion || '';
      const mes = fecha.slice(0, 7) || 'sin-fecha';
      if (!groups[mes]) {
        groups[mes] = { mes, cobros: 0, total: 0, cobrado: 0 };
      }
      const g = groups[mes];
      g.cobros++;
      g.total += (r.total || 0);
      if (r.estado === 'pagado') {
        g.cobrado += (r.total || 0);
      }
    });

    return Object.values(groups).sort((a, b) => a.mes.localeCompare(b.mes));
  }

  // ─────────────────────────────────────────────────────────────
  // LISTENERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Registra un listener que se ejecuta cuando cambian los datos.
   * @param {Function} fn - (records: Object[]) => void
   * @returns {Function} Función para desuscribirse
   *
   * @example
   *   const unsub = cobrosStore.onChange((records) => {
   *     renderTable(records);
   *     updateBadge(records.length);
   *   });
   */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /**
   * Notifica a todos los listeners.
   * @private
   */
  _notify() {
    const snapshot = this.getAll();
    this._listeners.forEach(fn => {
      try { fn(snapshot); } catch (e) { console.error('[CobrosStore] Listener error:', e); }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORT / IMPORT
  // ─────────────────────────────────────────────────────────────

  /**
   * Exporta cobranzas como objeto JSON.
   * @returns {Object}
   */
  export() {
    return {
      app: 'Polar3',
      module: 'cobros',
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      recordCount: this.records.length,
      data: this.records.map(r => ({ ...r }))
    };
  }

  /**
   * Exporta y descarga como archivo .json.
   * @param {string} [filename]
   */
  downloadExport(filename) {
    const exported = this.export();
    const name = filename || `polar3_cobros_${new Date().toISOString().slice(0, 10)}`;
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    console.log(`[CobrosStore] Export descargado: ${name}.json`);
  }

  /**
   * Importa cobranzas desde un objeto JSON.
   * @param {Object} importData - { data: [...cobros] }
   * @param {Object} [opts]
   * @param {boolean} [opts.merge=true] - true = agrega, false = reemplaza todo
   * @param {boolean} [opts.preserveIds=true] - Mantener IDs originales si no hay conflicto
   * @returns {{success: boolean, imported: number, skipped: number, error?: string}}
   */
  import(importData, opts = {}) {
    const { merge = true, preserveIds = true } = opts;

    try {
      if (!importData || !Array.isArray(importData.data)) {
        return { success: false, imported: 0, skipped: 0, error: 'Formato inválido: se espera { data: [...] }' };
      }

      // Si no es merge, limpiar datos actuales
      if (!merge) {
        this.records = [];
        this._rebuildIndexes();
      }

      let imported = 0;
      let skipped = 0;

      importData.data.forEach(rawRecord => {
        // Si preserveIds y ya existe, skip
        if (preserveIds && rawRecord.id && this._indexById[rawRecord.id] !== undefined) {
          skipped++;
          return;
        }

        // Si no preserveIds, quitar el id para que add() genere uno nuevo
        const record = { ...rawRecord };
        if (!preserveIds) {
          delete record.id;
        }

        const result = this.add(record);
        if (result.success) {
          imported++;
        } else {
          skipped++;
        }
      });

      console.log(`[CobrosStore] Importados: ${imported}, saltados: ${skipped}`);
      return { success: true, imported, skipped };
    } catch (err) {
      console.error('[CobrosStore] Error importando:', err);
      return { success: false, imported: 0, skipped: 0, error: err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────

  /**
   * Recarga datos desde storage (útil post-import global o restore).
   */
  reload() {
    this.records = storage.getItem(STORAGE_KEYS.cobros, []);
    if (!Array.isArray(this.records)) this.records = [];
    this._rebuildIndexes();
    this._notify();
    console.log(`[CobrosStore] Recargado: ${this.records.length} registros`);
  }

  /**
   * Limpia todos los cobros.
   */
  clear() {
    this.records = [];
    this._indexById = {};
    this._indexByEscuela = {};
    this._persist();
    this._notify();
    console.log('[CobrosStore] Datos limpiados');
  }

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Persiste el array de records a storage.
   * @private
   */
  _persist() {
    storage.setItem(STORAGE_KEYS.cobros, this.records);
  }

  /**
   * Reconstruye todos los índices desde cero.
   * Necesario después de splice (delete) o reload.
   * @private
   */
  _rebuildIndexes() {
    this._indexById = {};
    this._indexByEscuela = {};

    this.records.forEach((record, idx) => {
      // Por ID
      if (record.id) {
        this._indexById[record.id] = idx;
      }

      // Por escuela
      const escuela = record.escuela || '(sin escuela)';
      if (!this._indexByEscuela[escuela]) {
        this._indexByEscuela[escuela] = [];
      }
      this._indexByEscuela[escuela].push(idx);
    });
  }

  /**
   * Sanitiza strings de un registro.
   * @param {Object} data
   * @returns {Object}
   * @private
   */
  _sanitizeRecord(data) {
    const cleaned = {};
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        cleaned[key] = sanitize(value.trim());
      } else {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const cobrosStore = new CobrosStore();

export default cobrosStore;
