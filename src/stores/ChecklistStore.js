/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * ChecklistStore — State management para checklist de jornada
 *
 * Gestiona items de checklist por categoría (equipamiento, setup, sesión, post, entrega).
 * Soporta múltiples jornadas con historial.
 *
 * Uso:
 *   import { checklistStore } from './stores/ChecklistStore.js';
 *   checklistStore.init();
 *   checklistStore.toggle('item_123');
 *   checklistStore.onChange((items) => renderChecklist(items));
 */

import { storage } from '../modules/Storage.js';
import {
  STORAGE_KEYS,
  CHECKLIST_CATEGORIES,
  APP_VERSION
} from '../config.js';

// ═══════════════════════════════════════════════════════════════
// TEMPLATES DE CHECKLIST POR CATEGORÍA
// ═══════════════════════════════════════════════════════════════

/**
 * Items predefinidos para cada categoría.
 * Se usan como template al crear una jornada nueva.
 */
const CHECKLIST_TEMPLATES = {
  equipamiento: [
    { label: 'Cámara cargada y formateada (2 tarjetas)', icon: '📷' },
    { label: 'Lente retrato (85mm o 50mm)', icon: '🔭' },
    { label: 'Flash + baterías de repuesto', icon: '⚡' },
    { label: 'Trípode / monopie', icon: '🗼' },
    { label: 'Fondo gris + soporte', icon: '🎨' },
    { label: 'Notebook con Lightroom/Photoshop', icon: '💻' },
    { label: 'Cable USB / lector de tarjetas', icon: '🔌' },
    { label: 'Pendrive de entrega (backup)', icon: '💾' },
    { label: 'Kit de limpieza (sensor, lente)', icon: '🧹' },
    { label: 'Cinta gaffer / clamps', icon: '🔧' }
  ],
  setup: [
    { label: 'Armar set (fondo + luces + marca de piso)', icon: '🏗️' },
    { label: 'Configurar cámara (ISO, apertura, WB)', icon: '⚙️' },
    { label: 'Toma de prueba y revisión en pantalla', icon: '🖥️' },
    { label: 'Verificar encuadre y foco', icon: '🎯' },
    { label: 'Coordinar con docente el orden de salones', icon: '👩‍🏫' },
    { label: 'Preparar planilla espejo', icon: '📋' }
  ],
  sesion: [
    { label: 'Foto individual de cada alumno', icon: '👤' },
    { label: 'Foto grupal del curso', icon: '👥' },
    { label: 'Foto con docente', icon: '🎓' },
    { label: 'Verificar cantidad vs lista', icon: '✅' },
    { label: 'Anotar ausentes en planilla', icon: '📝' },
    { label: 'Backup parcial a notebook', icon: '💾' }
  ],
  post: [
    { label: 'Importar a Lightroom (catálogo nuevo)', icon: '📥' },
    { label: 'Selección y descarte', icon: '🗑️' },
    { label: 'Revelado base (exposure, WB, color)', icon: '🎨' },
    { label: 'Exportar a Photoshop para retoque', icon: '🖌️' },
    { label: 'AutoRecorte (script Polar3)', icon: '✂️' },
    { label: 'Fondo gris (script Polar3)', icon: '🖼️' },
    { label: 'Montaje de carpeta + tira carnet', icon: '📐' },
    { label: 'Control de calidad (QA visual)', icon: '🔍' }
  ],
  entrega: [
    { label: 'Enviar a imprenta', icon: '🖨️' },
    { label: 'Verificar impresiones recibidas', icon: '📦' },
    { label: 'Armar carpetas individuales', icon: '📁' },
    { label: 'Grabar pendrives / preparar descarga', icon: '💾' },
    { label: 'Entregar al jardín/escuela', icon: '🏫' },
    { label: 'Confirmar recepción con cooperadora', icon: '🤝' },
    { label: 'Facturar / registrar cobro', icon: '💰' }
  ]
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateItemId() {
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateJornadaId() {
  return `jornada_${Date.now()}`;
}

// ═══════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class ChecklistStore {
  constructor() {
    /**
     * Jornada activa.
     * @type {{id: string, escuela: string, fecha: string, items: Object[], completada: boolean}|null}
     */
    this.jornadaActiva = null;

    /**
     * Historial de jornadas completadas.
     * @type {Array}
     */
    this.historial = [];

    /** @type {Set<Function>} */
    this._listeners = new Set();

    /** @type {boolean} */
    this._initialized = false;
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────

  /**
   * Carga datos desde storage.
   */
  init() {
    if (this._initialized) return;

    const saved = storage.getItem(STORAGE_KEYS.checklist, null);

    if (saved && typeof saved === 'object') {
      this.jornadaActiva = saved.jornadaActiva || null;
      this.historial = Array.isArray(saved.historial) ? saved.historial : [];
    }

    this._initialized = true;
    console.log(`[ChecklistStore] Inicializado: jornada=${this.jornadaActiva ? 'activa' : 'ninguna'}, historial=${this.historial.length}`);
  }

  // ─────────────────────────────────────────────────────────────
  // JORNADA
  // ─────────────────────────────────────────────────────────────

  /**
   * Crea una jornada nueva con los items predefinidos.
   * Si hay una jornada activa, la archiva primero.
   * @param {string} escuela - Nombre de la institución
   * @param {string} [fecha] - Fecha ISO (default: hoy)
   * @param {string[]} [categorias] - Categorías a incluir (default: todas)
   * @returns {{success: boolean, id: string}}
   */
  crearJornada(escuela, fecha, categorias) {
    if (!escuela || escuela.trim().length < 2) {
      return { success: false, error: 'Escuela es requerida' };
    }

    // Archivar jornada activa si existe
    if (this.jornadaActiva) {
      this._archivarJornada();
    }

    const id = generateJornadaId();
    const cats = categorias || CHECKLIST_CATEGORIES;
    const items = [];

    cats.forEach(cat => {
      const template = CHECKLIST_TEMPLATES[cat] || [];
      template.forEach(t => {
        items.push({
          id: generateItemId(),
          categoria: cat,
          label: t.label,
          icon: t.icon || '☐',
          completado: false,
          timestamp: null,
          notas: ''
        });
      });
    });

    this.jornadaActiva = {
      id,
      escuela: escuela.trim(),
      fecha: fecha || new Date().toISOString().slice(0, 10),
      creadaAt: new Date().toISOString(),
      items,
      completada: false
    };

    this._persist();
    this._notify();

    console.log(`[ChecklistStore] Jornada creada: ${escuela} (${items.length} items)`);
    return { success: true, id };
  }

  /**
   * Devuelve la jornada activa (copia).
   * @returns {Object|null}
   */
  getJornadaActiva() {
    if (!this.jornadaActiva) return null;
    return {
      ...this.jornadaActiva,
      items: this.jornadaActiva.items.map(i => ({ ...i }))
    };
  }

  /**
   * Marca la jornada activa como completada y la archiva.
   * @returns {{success: boolean}}
   */
  completarJornada() {
    if (!this.jornadaActiva) {
      return { success: false, error: 'No hay jornada activa' };
    }

    this.jornadaActiva.completada = true;
    this.jornadaActiva.completadaAt = new Date().toISOString();

    this._archivarJornada();

    this._persist();
    this._notify();

    return { success: true };
  }

  /**
   * Descarta la jornada activa sin archivarla.
   * @returns {{success: boolean}}
   */
  descartarJornada() {
    if (!this.jornadaActiva) {
      return { success: false, error: 'No hay jornada activa' };
    }

    this.jornadaActiva = null;
    this._persist();
    this._notify();

    console.log('[ChecklistStore] Jornada descartada');
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // ITEMS
  // ─────────────────────────────────────────────────────────────

  /**
   * Toggle completado/no completado de un item.
   * @param {string} itemId
   * @returns {{success: boolean, completado?: boolean}}
   */
  toggle(itemId) {
    if (!this.jornadaActiva) {
      return { success: false, error: 'No hay jornada activa' };
    }

    const item = this.jornadaActiva.items.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Item no encontrado' };
    }

    item.completado = !item.completado;
    item.timestamp = item.completado ? new Date().toISOString() : null;

    this._persist();
    this._notify();

    return { success: true, completado: item.completado };
  }

  /**
   * Marca un item como completado.
   * @param {string} itemId
   * @returns {{success: boolean}}
   */
  check(itemId) {
    return this._setItemState(itemId, true);
  }

  /**
   * Desmarca un item.
   * @param {string} itemId
   * @returns {{success: boolean}}
   */
  uncheck(itemId) {
    return this._setItemState(itemId, false);
  }

  /**
   * Agrega una nota a un item.
   * @param {string} itemId
   * @param {string} nota
   * @returns {{success: boolean}}
   */
  setNota(itemId, nota) {
    if (!this.jornadaActiva) return { success: false, error: 'No hay jornada activa' };

    const item = this.jornadaActiva.items.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item no encontrado' };

    item.notas = (nota || '').trim();

    this._persist();
    this._notify();
    return { success: true };
  }

  /**
   * Agrega un item personalizado a la jornada activa.
   * @param {string} categoria
   * @param {string} label
   * @returns {{success: boolean, id?: string}}
   */
  addItem(categoria, label) {
    if (!this.jornadaActiva) return { success: false, error: 'No hay jornada activa' };
    if (!label || label.trim().length < 2) return { success: false, error: 'Label requerido' };

    const cat = CHECKLIST_CATEGORIES.includes(categoria) ? categoria : 'sesion';
    const id = generateItemId();

    this.jornadaActiva.items.push({
      id,
      categoria: cat,
      label: label.trim(),
      icon: '📌',
      completado: false,
      timestamp: null,
      notas: '',
      custom: true
    });

    this._persist();
    this._notify();
    return { success: true, id };
  }

  /**
   * Elimina un item personalizado.
   * @param {string} itemId
   * @returns {{success: boolean}}
   */
  removeItem(itemId) {
    if (!this.jornadaActiva) return { success: false, error: 'No hay jornada activa' };

    const idx = this.jornadaActiva.items.findIndex(i => i.id === itemId);
    if (idx === -1) return { success: false, error: 'Item no encontrado' };

    // Solo permitir eliminar items custom
    if (!this.jornadaActiva.items[idx].custom) {
      return { success: false, error: 'Solo se pueden eliminar items personalizados' };
    }

    this.jornadaActiva.items.splice(idx, 1);
    this._persist();
    this._notify();
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // CONSULTAS
  // ─────────────────────────────────────────────────────────────

  /**
   * Items de la jornada activa, opcionalmente filtrados por categoría.
   * @param {string} [categoria]
   * @returns {Object[]}
   */
  getItems(categoria) {
    if (!this.jornadaActiva) return [];

    const items = this.jornadaActiva.items;
    if (categoria) {
      return items.filter(i => i.categoria === categoria).map(i => ({ ...i }));
    }
    return items.map(i => ({ ...i }));
  }

  /**
   * Categorías disponibles con su progreso.
   * @returns {Array<{categoria: string, total: number, completados: number, porcentaje: number}>}
   */
  getProgresoPorCategoria() {
    if (!this.jornadaActiva) return [];

    const groups = {};
    this.jornadaActiva.items.forEach(item => {
      if (!groups[item.categoria]) {
        groups[item.categoria] = { categoria: item.categoria, total: 0, completados: 0 };
      }
      groups[item.categoria].total++;
      if (item.completado) groups[item.categoria].completados++;
    });

    return CHECKLIST_CATEGORIES
      .filter(cat => groups[cat])
      .map(cat => ({
        ...groups[cat],
        porcentaje: groups[cat].total > 0
          ? Math.round((groups[cat].completados / groups[cat].total) * 100)
          : 0
      }));
  }

  /**
   * Progreso global de la jornada activa.
   * @returns {{total: number, completados: number, porcentaje: number, pendientes: number}}
   */
  getProgresoGlobal() {
    if (!this.jornadaActiva) {
      return { total: 0, completados: 0, porcentaje: 0, pendientes: 0 };
    }

    const total = this.jornadaActiva.items.length;
    const completados = this.jornadaActiva.items.filter(i => i.completado).length;

    return {
      total,
      completados,
      pendientes: total - completados,
      porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0
    };
  }

  /**
   * Marca/desmarca todos los items de una categoría.
   * @param {string} categoria
   * @param {boolean} completado
   * @returns {{success: boolean, affected: number}}
   */
  toggleCategoria(categoria, completado) {
    if (!this.jornadaActiva) return { success: false, affected: 0 };

    let affected = 0;
    this.jornadaActiva.items.forEach(item => {
      if (item.categoria === categoria && item.completado !== completado) {
        item.completado = completado;
        item.timestamp = completado ? new Date().toISOString() : null;
        affected++;
      }
    });

    if (affected > 0) {
      this._persist();
      this._notify();
    }

    return { success: true, affected };
  }

  /**
   * Resetea todos los items (desmarcar todo).
   * @returns {{success: boolean}}
   */
  resetAll() {
    if (!this.jornadaActiva) return { success: false };

    this.jornadaActiva.items.forEach(item => {
      item.completado = false;
      item.timestamp = null;
    });

    this._persist();
    this._notify();
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // HISTORIAL
  // ─────────────────────────────────────────────────────────────

  /**
   * Devuelve el historial de jornadas (más recientes primero).
   * @param {number} [limit=20]
   * @returns {Array}
   */
  getHistorial(limit = 20) {
    return this.historial
      .slice(-limit)
      .reverse()
      .map(j => {
        const total = j.items ? j.items.length : 0;
        const completados = j.items ? j.items.filter(i => i.completado).length : 0;
        return {
          id: j.id,
          escuela: j.escuela,
          fecha: j.fecha,
          completada: j.completada,
          completadaAt: j.completadaAt,
          total,
          completados,
          porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0
        };
      });
  }

  /**
   * Obtiene una jornada del historial por ID.
   * @param {string} jornadaId
   * @returns {Object|null}
   */
  getJornadaHistorial(jornadaId) {
    const found = this.historial.find(j => j.id === jornadaId);
    return found ? { ...found, items: found.items.map(i => ({ ...i })) } : null;
  }

  /**
   * Elimina una jornada del historial.
   * @param {string} jornadaId
   * @returns {{success: boolean}}
   */
  deleteHistorial(jornadaId) {
    const idx = this.historial.findIndex(j => j.id === jornadaId);
    if (idx === -1) return { success: false, error: 'Jornada no encontrada' };

    this.historial.splice(idx, 1);
    this._persist();
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // LISTENERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Registra listener de cambios.
   * @param {Function} fn - (jornadaActiva) => void
   * @returns {Function} Unsuscribe
   */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** @private */
  _notify() {
    const snapshot = this.getJornadaActiva();
    this._listeners.forEach(fn => {
      try { fn(snapshot); } catch (e) { console.error('[ChecklistStore] Listener error:', e); }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // TEMPLATES
  // ─────────────────────────────────────────────────────────────

  /**
   * Devuelve los templates disponibles (para mostrar en UI).
   * @returns {Object}
   */
  getTemplates() {
    return JSON.parse(JSON.stringify(CHECKLIST_TEMPLATES));
  }

  /**
   * Devuelve las categorías disponibles.
   * @returns {string[]}
   */
  getCategorias() {
    return [...CHECKLIST_CATEGORIES];
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORT / IMPORT
  // ─────────────────────────────────────────────────────────────

  /**
   * Exporta datos completos.
   * @returns {Object}
   */
  export() {
    return {
      app: 'Polar3',
      module: 'checklist',
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      jornadaActiva: this.jornadaActiva,
      historial: this.historial
    };
  }

  /**
   * Importa datos.
   * @param {Object} data
   * @returns {{success: boolean, error?: string}}
   */
  import(data) {
    try {
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Formato inválido' };
      }

      if (data.jornadaActiva) {
        this.jornadaActiva = data.jornadaActiva;
      }
      if (Array.isArray(data.historial)) {
        this.historial = data.historial;
      }

      this._persist();
      this._notify();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────────────────────

  /** @private */
  _setItemState(itemId, completado) {
    if (!this.jornadaActiva) return { success: false, error: 'No hay jornada activa' };

    const item = this.jornadaActiva.items.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item no encontrado' };

    if (item.completado === completado) return { success: true };

    item.completado = completado;
    item.timestamp = completado ? new Date().toISOString() : null;

    this._persist();
    this._notify();
    return { success: true };
  }

  /** @private */
  _archivarJornada() {
    if (!this.jornadaActiva) return;

    this.historial.push({ ...this.jornadaActiva });

    // Limitar historial a 50 jornadas
    if (this.historial.length > 50) {
      this.historial = this.historial.slice(-50);
    }

    this.jornadaActiva = null;
  }

  /** @private */
  _persist() {
    storage.setItem(STORAGE_KEYS.checklist, {
      jornadaActiva: this.jornadaActiva,
      historial: this.historial
    });
  }

  /**
   * Recarga desde storage.
   */
  reload() {
    const saved = storage.getItem(STORAGE_KEYS.checklist, {});
    this.jornadaActiva = saved.jornadaActiva || null;
    this.historial = Array.isArray(saved.historial) ? saved.historial : [];
    this._notify();
    console.log('[ChecklistStore] Recargado');
  }

  /**
   * Limpia todo.
   */
  clear() {
    this.jornadaActiva = null;
    this.historial = [];
    this._persist();
    this._notify();
    console.log('[ChecklistStore] Limpiado');
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const checklistStore = new ChecklistStore();

export default checklistStore;
