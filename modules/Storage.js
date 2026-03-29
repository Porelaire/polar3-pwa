/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * Storage Manager
 *
 * Envoltorio seguro para localStorage con:
 * - Prefijo automático (polar3_)
 * - Backup automático con scheduling
 * - Dirty tracking para saber qué cambió
 * - Listeners onChange para reactividad entre módulos
 * - Export/import a archivo JSON
 * - Detección de cuota de storage
 * - Migración de keys antiguas
 * - Compatible con la estructura anterior de Polar3
 *
 * Uso:
 *   import { storage } from './modules/Storage.js';
 *   storage.setItem('cobros', [...]);
 *   storage.onChange('cobros', (newVal) => renderCobros(newVal));
 */

import {
  STORAGE_PREFIX,
  STORAGE_KEYS,
  BACKUP_HISTORY_LIMIT,
  BACKUP_AUTO_INTERVAL_HOURS,
  APP_VERSION,
  FEATURE_FLAGS
} from '../config.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES INTERNAS
// ═══════════════════════════════════════════════════════════════

/** Keys internas que no se incluyen en backups/exports de datos */
const INTERNAL_KEYS = [
  'dirty_keys',
  'backup_meta',
  'backup_history'
];

/** Prefijo de keys de backup (meta + data) */
const BACKUP_KEY_PREFIX = 'backup_';

/** Estimación del límite de localStorage (~5 MB en la mayoría de browsers) */
const STORAGE_QUOTA_ESTIMATE_KB = 5120;

// ═══════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class StorageManager {
  constructor() {
    this.prefix = STORAGE_PREFIX;
    this.initialized = false;

    /** @type {Map<string, Set<Function>>} Listeners por key */
    this._listeners = new Map();

    /** @type {Set<Function>} Listeners globales (cualquier cambio) */
    this._globalListeners = new Set();

    /** @type {number|null} Timer del auto-backup */
    this._autoBackupTimer = null;

    /** @type {boolean} Flag para evitar recursión en markDirty */
    this._markingDirty = false;
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────

  /**
   * Inicializa el storage manager.
   * Ejecuta migraciones, purga backups viejos y programa auto-backup.
   */
  init() {
    if (this.initialized) return;

    this._runMigrations();

    // Purgar backups > 30 días
    this.purgeOldBackups(30);

    // Programar auto-backup si está habilitado
    if (FEATURE_FLAGS.autoBackup) {
      this._scheduleAutoBackup();
    }

    this.initialized = true;
    console.log(`[Storage] Inicializado (${this.getAllKeys().length} keys, ${this.getStorageSize()} KB)`);
  }

  // ─────────────────────────────────────────────────────────────
  // CRUD BÁSICO
  // ─────────────────────────────────────────────────────────────

  /**
   * Obtiene un valor de localStorage.
   * @param {string} key - Sin el prefijo (ej: 'cobros')
   * @param {*} [defaultValue=null] - Valor por defecto si no existe
   * @returns {*} Valor parseado o string
   */
  getItem(key, defaultValue = null) {
    try {
      const fullKey = `${this.prefix}${key}`;
      const stored = localStorage.getItem(fullKey);

      if (stored === null) return defaultValue;

      try {
        return JSON.parse(stored);
      } catch {
        return stored;
      }
    } catch (err) {
      console.error(`[Storage] Error leyendo "${key}":`, err);
      return defaultValue;
    }
  }

  /**
   * Guarda un valor en localStorage.
   * Notifica listeners y marca como dirty para backup.
   * @param {string} key - Sin el prefijo
   * @param {*} value - Valor a guardar (se serializa a JSON)
   * @returns {boolean} true si se guardó correctamente
   */
  setItem(key, value) {
    try {
      const fullKey = `${this.prefix}${key}`;
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      localStorage.setItem(fullKey, serialized);

      // Marcar como modificado (sin recursión)
      this._markDirty(key);

      // Notificar listeners
      this._notify(key, value);

      return true;
    } catch (err) {
      // Detectar error de cuota
      if (this._isQuotaError(err)) {
        console.error(`[Storage] ¡Cuota excedida al guardar "${key}"! Intentá purgar backups o exportar datos.`);
      } else {
        console.error(`[Storage] Error guardando "${key}":`, err);
      }
      return false;
    }
  }

  /**
   * Elimina un valor de localStorage.
   * @param {string} key - Sin el prefijo
   * @returns {boolean}
   */
  removeItem(key) {
    try {
      const fullKey = `${this.prefix}${key}`;
      localStorage.removeItem(fullKey);

      this._markDirty(key);
      this._notify(key, undefined);

      return true;
    } catch (err) {
      console.error(`[Storage] Error eliminando "${key}":`, err);
      return false;
    }
  }

  /**
   * Verifica si una key existe.
   * @param {string} key - Sin el prefijo
   * @returns {boolean}
   */
  hasItem(key) {
    const fullKey = `${this.prefix}${key}`;
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * Obtiene todas las keys de la app (sin prefijo).
   * @returns {string[]}
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(this.prefix)) {
        keys.push(fullKey.slice(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * Obtiene solo las keys de datos de negocio (excluye internas y backups).
   * @returns {string[]}
   */
  getDataKeys() {
    return this.getAllKeys().filter(key => {
      if (INTERNAL_KEYS.includes(key)) return false;
      if (key.startsWith(BACKUP_KEY_PREFIX)) return false;
      return true;
    });
  }

  /**
   * Limpia todo el storage de la app (solo keys con nuestro prefijo).
   * @returns {boolean}
   */
  clear() {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => {
        localStorage.removeItem(`${this.prefix}${key}`);
      });
      console.log(`[Storage] Limpiado (${keys.length} keys)`);
      return true;
    } catch (err) {
      console.error('[Storage] Error limpiando:', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LISTENERS (reactividad entre módulos)
  // ─────────────────────────────────────────────────────────────

  /**
   * Escucha cambios en una key específica.
   * @param {string} key - Key a observar (sin prefijo)
   * @param {Function} fn - Callback: (newValue, key) => void
   * @returns {Function} Función para desuscribirse
   *
   * @example
   *   const unsub = storage.onChange('cobros', (cobros) => {
   *     renderTable(cobros);
   *   });
   *   // Más tarde: unsub();
   */
  onChange(key, fn) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(fn);
    return () => this._listeners.get(key)?.delete(fn);
  }

  /**
   * Escucha cualquier cambio en el storage.
   * @param {Function} fn - Callback: (key, newValue) => void
   * @returns {Function} Función para desuscribirse
   */
  onAnyChange(fn) {
    this._globalListeners.add(fn);
    return () => this._globalListeners.delete(fn);
  }

  /**
   * Notifica a los listeners de una key y a los globales.
   * @param {string} key
   * @param {*} value
   * @private
   */
  _notify(key, value) {
    // Listeners específicos
    const keyListeners = this._listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(fn => {
        try { fn(value, key); } catch (e) { console.error('[Storage] Listener error:', e); }
      });
    }

    // Listeners globales
    this._globalListeners.forEach(fn => {
      try { fn(key, value); } catch (e) { console.error('[Storage] Global listener error:', e); }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DIRTY TRACKING (qué cambió desde el último backup)
  // ─────────────────────────────────────────────────────────────

  /**
   * Marca una key como modificada.
   * Usa flag para evitar recursión (setItem → markDirty → setItem…).
   * @param {string} key
   * @private
   */
  _markDirty(key) {
    // No trackear keys internas ni backups
    if (INTERNAL_KEYS.includes(key) || key.startsWith(BACKUP_KEY_PREFIX)) return;
    if (this._markingDirty) return;

    this._markingDirty = true;
    try {
      const dirtyKeys = this._readRaw('dirty_keys', []);
      if (!dirtyKeys.includes(key)) {
        dirtyKeys.push(key);
        this._writeRaw('dirty_keys', dirtyKeys);
      }

      // Actualizar timestamp de último cambio
      const meta = this._readRaw('backup_meta', {});
      meta.lastChangeAt = new Date().toISOString();
      meta.dirty = true;
      this._writeRaw('backup_meta', meta);
    } catch (err) {
      console.error('[Storage] Error en markDirty:', err);
    } finally {
      this._markingDirty = false;
    }
  }

  /**
   * Lee directo de localStorage sin pasar por markDirty.
   * @param {string} key - Sin prefijo
   * @param {*} defaultValue
   * @returns {*}
   * @private
   */
  _readRaw(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(`${this.prefix}${key}`);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Escribe directo a localStorage sin pasar por markDirty ni notify.
   * @param {string} key - Sin prefijo
   * @param {*} value
   * @private
   */
  _writeRaw(key, value) {
    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    } catch (err) {
      console.error(`[Storage] Raw write error "${key}":`, err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BACKUP: CREAR / RESTAURAR / LISTAR / PURGAR
  // ─────────────────────────────────────────────────────────────

  /**
   * Crea un backup del estado actual.
   * Solo guarda keys de datos de negocio (excluye internas y otros backups).
   * @param {string} [description='Manual'] - Descripción del backup
   * @returns {{success: boolean, id?: string, meta?: Object, error?: string}}
   */
  createBackup(description = 'Manual') {
    try {
      const timestamp = Date.now();
      const id = `backup_${timestamp}`;

      // Snapshot solo de datos de negocio
      const dataKeys = this.getDataKeys();
      const data = {};
      dataKeys.forEach(key => {
        data[key] = this.getItem(key);
      });

      const meta = {
        id,
        fecha: new Date().toISOString(),
        description,
        version: APP_VERSION,
        keysCount: dataKeys.length
      };

      // Guardar (raw para no triggear dirty)
      this._writeRaw(`${id}_meta`, meta);
      this._writeRaw(`${id}_data`, data);

      // Agregar al historial
      const history = this._readRaw('backup_history', []);
      history.push({ id, fecha: meta.fecha, description });
      this._writeRaw('backup_history', history.slice(-BACKUP_HISTORY_LIMIT));

      // Limpiar dirty
      this._writeRaw('dirty_keys', []);

      // Actualizar meta global
      const backupMeta = this._readRaw('backup_meta', {});
      backupMeta.lastBackupAt = new Date().toISOString();
      backupMeta.dirty = false;
      this._writeRaw('backup_meta', backupMeta);

      console.log(`[Storage] Backup creado: ${id} (${dataKeys.length} keys)`);
      return { success: true, id, meta };
    } catch (err) {
      console.error('[Storage] Error creando backup:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Restaura un backup anterior.
   * Crea un backup de seguridad antes de restaurar.
   * @param {string} backupId
   * @returns {{success: boolean, error?: string}}
   */
  restoreBackup(backupId) {
    try {
      const backupData = this._readRaw(`${backupId}_data`);
      if (!backupData) {
        return { success: false, error: 'Backup no encontrado' };
      }

      // Backup de seguridad antes de restaurar
      this.createBackup('Pre-restauración (automático)');

      // Limpiar datos actuales (solo datos, no backups)
      this.getDataKeys().forEach(key => {
        localStorage.removeItem(`${this.prefix}${key}`);
      });

      // Restaurar
      let restored = 0;
      Object.entries(backupData).forEach(([key, value]) => {
        this.setItem(key, value);
        restored++;
      });

      console.log(`[Storage] Backup restaurado: ${backupId} (${restored} keys)`);
      return { success: true };
    } catch (err) {
      console.error('[Storage] Error restaurando backup:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Lista todos los backups disponibles (más recientes primero).
   * @returns {Array<{id: string, fecha: string, description: string, version?: string, keysCount?: number, canRestore: boolean}>}
   */
  listBackups() {
    const history = this._readRaw('backup_history', []);
    return history
      .map(item => {
        const meta = this._readRaw(`${item.id}_meta`, {});
        const hasData = this._readRaw(`${item.id}_data`) !== null;
        return {
          ...item,
          ...meta,
          canRestore: hasData
        };
      })
      .reverse();
  }

  /**
   * Elimina un backup específico.
   * @param {string} backupId
   * @returns {boolean}
   */
  deleteBackup(backupId) {
    try {
      localStorage.removeItem(`${this.prefix}${backupId}_meta`);
      localStorage.removeItem(`${this.prefix}${backupId}_data`);

      // Actualizar historial
      const history = this._readRaw('backup_history', []);
      const newHistory = history.filter(item => item.id !== backupId);
      this._writeRaw('backup_history', newHistory);

      console.log(`[Storage] Backup eliminado: ${backupId}`);
      return true;
    } catch (err) {
      console.error('[Storage] Error eliminando backup:', err);
      return false;
    }
  }

  /**
   * Elimina backups más antiguos que X días.
   * @param {number} [daysToKeep=30]
   * @returns {number} Cantidad eliminados
   */
  purgeOldBackups(daysToKeep = 30) {
    try {
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      const history = this._readRaw('backup_history', []);

      let deleted = 0;
      const newHistory = [];

      history.forEach(item => {
        const age = now - new Date(item.fecha).getTime();
        if (age > maxAge) {
          localStorage.removeItem(`${this.prefix}${item.id}_meta`);
          localStorage.removeItem(`${this.prefix}${item.id}_data`);
          deleted++;
        } else {
          newHistory.push(item);
        }
      });

      if (deleted > 0) {
        this._writeRaw('backup_history', newHistory);
        console.log(`[Storage] Backups purgados: ${deleted}`);
      }

      return deleted;
    } catch (err) {
      console.error('[Storage] Error purgando backups:', err);
      return 0;
    }
  }

  /**
   * Estado actual del sistema de backup.
   * @returns {{lastBackupAt: string|null, lastChangeAt: string|null, isDirty: boolean, backupCount: number, dirtyKeysCount: number, needsBackup: boolean}}
   */
  getBackupStatus() {
    const meta = this._readRaw('backup_meta', {});
    const history = this._readRaw('backup_history', []);
    const dirtyKeys = this._readRaw('dirty_keys', []);

    // Calcular si necesita backup
    let needsBackup = false;
    if (meta.dirty || dirtyKeys.length > 0) {
      if (!meta.lastBackupAt) {
        needsBackup = true;
      } else {
        const hoursSinceBackup = (Date.now() - new Date(meta.lastBackupAt).getTime()) / (1000 * 60 * 60);
        needsBackup = hoursSinceBackup >= BACKUP_AUTO_INTERVAL_HOURS;
      }
    }

    return {
      lastBackupAt: meta.lastBackupAt || null,
      lastChangeAt: meta.lastChangeAt || null,
      isDirty: meta.dirty || dirtyKeys.length > 0,
      backupCount: history.length,
      dirtyKeysCount: dirtyKeys.length,
      needsBackup
    };
  }

  // ─────────────────────────────────────────────────────────────
  // AUTO-BACKUP
  // ─────────────────────────────────────────────────────────────

  /**
   * Programa el auto-backup periódico.
   * Verifica cada hora si pasaron las horas configuradas desde el último backup.
   * @private
   */
  _scheduleAutoBackup() {
    // Chequear al iniciar
    this._checkAutoBackup();

    // Chequear cada hora
    this._autoBackupTimer = setInterval(() => {
      this._checkAutoBackup();
    }, 60 * 60 * 1000);
  }

  /**
   * Verifica si toca hacer auto-backup y lo ejecuta.
   * @private
   */
  _checkAutoBackup() {
    const status = this.getBackupStatus();
    if (status.needsBackup && status.dirtyKeysCount > 0) {
      console.log('[Storage] Auto-backup programado, ejecutando...');
      this.createBackup('Automático');
    }
  }

  /**
   * Detiene el auto-backup (para cleanup).
   */
  stopAutoBackup() {
    if (this._autoBackupTimer) {
      clearInterval(this._autoBackupTimer);
      this._autoBackupTimer = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORT / IMPORT (archivos JSON)
  // ─────────────────────────────────────────────────────────────

  /**
   * Exporta todos los datos de negocio como objeto JSON.
   * @returns {Object}
   */
  export() {
    const dataKeys = this.getDataKeys();
    const data = {};
    dataKeys.forEach(key => {
      data[key] = this.getItem(key);
    });

    return {
      app: 'Polar3',
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      recordCount: dataKeys.length,
      data
    };
  }

  /**
   * Exporta y dispara descarga como archivo .json.
   * @param {string} [filename] - Nombre del archivo (sin extensión)
   */
  downloadExport(filename) {
    const exportData = this.export();
    const name = filename || `polar3_export_${new Date().toISOString().slice(0, 10)}`;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    console.log(`[Storage] Export descargado: ${name}.json`);
  }

  /**
   * Importa datos desde un objeto JSON exportado.
   * @param {Object} exportData - Objeto con { data: { key: value, ... } }
   * @param {Object} [opts]
   * @param {boolean} [opts.merge=true] - true = merge, false = reemplazar todo
   * @param {boolean} [opts.backupFirst=true] - Hacer backup antes de importar
   * @returns {{success: boolean, imported: number, error?: string}}
   */
  import(exportData, opts = {}) {
    const { merge = true, backupFirst = true } = opts;

    try {
      if (!exportData || !exportData.data || typeof exportData.data !== 'object') {
        return { success: false, imported: 0, error: 'Formato de importación inválido' };
      }

      // Backup de seguridad
      if (backupFirst) {
        this.createBackup('Pre-importación (automático)');
      }

      // Si no es merge, limpiar datos actuales
      if (!merge) {
        this.getDataKeys().forEach(key => {
          localStorage.removeItem(`${this.prefix}${key}`);
        });
      }

      let imported = 0;
      Object.entries(exportData.data).forEach(([key, value]) => {
        if (this.setItem(key, value)) {
          imported++;
        }
      });

      console.log(`[Storage] Importados: ${imported} keys (merge=${merge})`);
      return { success: true, imported };
    } catch (err) {
      console.error('[Storage] Error importando:', err);
      return { success: false, imported: 0, error: err.message };
    }
  }

  /**
   * Abre un file picker y procesa el archivo JSON seleccionado.
   * @param {Object} [opts] - Opciones de import (merge, backupFirst)
   * @returns {Promise<{success: boolean, imported: number, error?: string}>}
   */
  importFromFile(opts = {}) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve({ success: false, imported: 0, error: 'No se seleccionó archivo' });
          return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target.result);
            const result = this.import(parsed, opts);
            resolve(result);
          } catch (err) {
            resolve({ success: false, imported: 0, error: 'El archivo no es JSON válido' });
          }
        };
        reader.onerror = () => {
          resolve({ success: false, imported: 0, error: 'Error leyendo el archivo' });
        };
        reader.readAsText(file);
      });

      input.click();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DIAGNÓSTICO Y CUOTA
  // ─────────────────────────────────────────────────────────────

  /**
   * Tamaño total del storage de la app en KB.
   * Cuenta tanto keys como valores (con prefijo).
   * @returns {number}
   */
  getStorageSize() {
    try {
      let bytes = 0;
      this.getAllKeys().forEach(key => {
        const fullKey = `${this.prefix}${key}`;
        const value = localStorage.getItem(fullKey) || '';
        // Cada char en JS = 2 bytes en UTF-16, pero localStorage suele contar chars
        bytes += fullKey.length + value.length;
      });
      return Math.round(bytes / 1024);
    } catch {
      return 0;
    }
  }

  /**
   * Desglose de tamaño por key (top N más pesadas).
   * Útil para diagnóstico cuando el storage crece mucho.
   * @param {number} [top=10]
   * @returns {Array<{key: string, sizeKB: number}>}
   */
  getStorageSizeBreakdown(top = 10) {
    const items = this.getAllKeys().map(key => {
      const value = localStorage.getItem(`${this.prefix}${key}`) || '';
      return { key, sizeKB: Math.round(value.length / 1024 * 100) / 100 };
    });

    items.sort((a, b) => b.sizeKB - a.sizeKB);
    return items.slice(0, top);
  }

  /**
   * Porcentaje estimado de uso de la cuota de localStorage.
   * @returns {number} 0-100
   */
  getUsagePercent() {
    const usedKB = this.getStorageSize();
    return Math.min(100, Math.round((usedKB / STORAGE_QUOTA_ESTIMATE_KB) * 100));
  }

  /**
   * Resumen completo del estado del storage (para pantalla de diagnóstico).
   * @returns {Object}
   */
  getDiagnostics() {
    return {
      version: APP_VERSION,
      totalKeys: this.getAllKeys().length,
      dataKeys: this.getDataKeys().length,
      sizeKB: this.getStorageSize(),
      usagePercent: this.getUsagePercent(),
      backup: this.getBackupStatus(),
      topKeys: this.getStorageSizeBreakdown(5)
    };
  }

  // ─────────────────────────────────────────────────────────────
  // MIGRACIÓN DE DATOS ANTIGUOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Ejecuta migraciones necesarias para compatibilidad.
   * Se corre una sola vez al init().
   * @private
   */
  _runMigrations() {
    // Migración 1: Keys sin prefijo → con prefijo
    // Versiones muy viejas de Polar3 guardaban sin 'polar3_'
    this._migrateLegacyKeys();

    // Migración 2: precio como string → number
    const precio = this.getItem(STORAGE_KEYS.precio);
    if (typeof precio === 'string' && precio !== '') {
      const parsed = parseInt(precio, 10);
      if (!isNaN(parsed)) {
        this.setItem(STORAGE_KEYS.precio, parsed);
        console.log('[Storage] Migración: precio string → number');
      }
    }
  }

  /**
   * Busca keys de Polar3 sin prefijo y las migra.
   * @private
   */
  _migrateLegacyKeys() {
    const knownKeys = Object.values(STORAGE_KEYS);

    knownKeys.forEach(key => {
      // Verificar si existe sin prefijo
      const legacyValue = localStorage.getItem(key);
      const prefixedExists = localStorage.getItem(`${this.prefix}${key}`) !== null;

      if (legacyValue !== null && !prefixedExists) {
        // Mover al nuevo formato
        localStorage.setItem(`${this.prefix}${key}`, legacyValue);
        localStorage.removeItem(key);
        console.log(`[Storage] Migración: "${key}" → "${this.prefix}${key}"`);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Detecta si un error es de cuota excedida.
   * @param {Error} err
   * @returns {boolean}
   * @private
   */
  _isQuotaError(err) {
    return (
      err.name === 'QuotaExceededError' ||
      err.code === 22 ||
      err.code === 1014 ||
      (err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }

  /**
   * Limpia listeners y timers (para testing o cleanup).
   */
  destroy() {
    this.stopAutoBackup();
    this._listeners.clear();
    this._globalListeners.clear();
    this.initialized = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const storage = new StorageManager();

export default storage;
