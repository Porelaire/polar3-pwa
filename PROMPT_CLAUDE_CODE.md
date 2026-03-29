# PROMPT PROFESIONAL PARA CLAUDE CODE
## Refactor y Arquitectura de Polar[3] Sistema Operativo v2.7.12

---

## CONTEXTO GENERAL

Eres un **arquitecto de sistemas backend/lógica** especializado en refactoring de aplicaciones JavaScript monolíticas. Tu tarea es transformar `app.js` (3943 líneas) en una arquitectura modular, scalable y mantenible.

**Restricción crítica**: NO toques HTML ni CSS. Solo código JavaScript, estructura, lógica y datos.

---

## ANÁLISIS ACTUAL

### Problemas identificados en app.js:
- **Monolítico**: 3943 líneas en un único archivo
- **Acoplamiento alto**: funciones globales, sin encapsulación
- **Sin validación**: formularios sin sanitización (riesgo XSS)
- **LocalStorage inseguro**: directamente desde/hacia DOM
- **Dead code**: funciones no encontradas en HTML actual
- **Sin logging**: imposible debuggear en producción
- **Búsqueda lenta**: O(n) en cobranzas/seguimiento con 1000+ registros

### Oportunidades:
- Modularizar en 8-10 módulos temáticos
- Implementar validación centralizada
- Crear índices para búsquedas rápidas
- Preparar para futura sincronización multi-device
- Agregar tests unitarios

---

## ARQUITECTURA OBJETIVO

```
/src
├── config.js              # Constantes, versión, magic numbers
├── app.js                 # Punto de entrada, inicializador
├── types.js               # @typedef JSDoc para tipos
├── logger.js              # Sistema de logging simple
├── validator.js           # Validación centralizada
│
├── modules/
│   ├── Navigation.js      # Routeo, workspace, secciones
│   ├── Storage.js         # localStorage + backup inteligente
│   ├── UI.js              # Topbar, sidebar, modals, toasts
│   │
│   ├── Business/
│   │   ├── Cobranzas.js   # CRUD cobranzas + stats
│   │   ├── KPIs.js        # Cálculos de rentabilidad
│   │   ├── Checklist.js   # Jornada de toma
│   │   ├── Seguimiento.js # Pendientes y retomas
│   │   └── Fotografia.js  # Workflows de fotografía
│   │
│   └── Utils/
│       ├── formatting.js   # Formateo de datos
│       ├── dateUtils.js    # Operaciones de fecha
│       ├── arrayUtils.js   # Transformaciones de arrays
│       └── fileUtils.js    # Export/import de datos
│
└── stores/
    ├── cobrosStore.js      # State management para cobranzas
    ├── checklistStore.js   # State management para checklist
    └── settingsStore.js    # Configuración global
```

---

## TAREAS ESPECÍFICAS (EN ORDEN)

### ENTREGA 1: Auditoría de Código (Fase 0)

**Objetivo**: Crear un mapeo técnico completo de app.js

#### 1.1 Generar reporte de funciones
```
Crear archivo: AUDIT_FUNCTIONS.json
Estructura:
{
  "functions": [
    {
      "name": "showSection",
      "line": 250,
      "calls": ["toggleGroup", "updateActiveNav", ...],
      "calledBy": ["onclick", "initApp", ...],
      "globals": ["currentWorkspace", "sectionMap"],
      "localStorage": ["polar3_workspace"],
      "used": true,
      "complexity": "medium"
    },
    ...
  ],
  "globals": [...],
  "unused_functions": [...],
  "dead_code_candidates": [...]
}
```

#### 1.2 Mapear dependencias de localStorage
```
Crear archivo: AUDIT_STORAGE.json
{
  "keys": [
    {
      "key": "polar3_precio",
      "type": "number",
      "default": 15000,
      "usedBy": ["Cobranzas.js", "KPIs.js"],
      "writtenBy": ["editarPrecio()"],
      "risk": "none"
    },
    ...
  ],
  "totalKeys": 25,
  "dataSize": "~250KB",
  "backup_strategy": "weekly"
}
```

#### 1.3 Identificar secciones críticas
```
Crear archivo: AUDIT_SECTIONS.json
{
  "critical": [
    {
      "section": "cobranzas",
      "users": "daily",
      "dataVolume": "1000+ records/mes",
      "operations": ["add", "edit", "delete", "filter", "export"],
      "performance_risk": "high (O(n) search)"
    },
    ...
  ]
}
```

**ENTREGAR COMO**: 3 archivos JSON + documento AUDIT.md con hallazgos

---

### ENTREGA 2: Módulo de Configuración y Tipos

#### 2.1 Crear `src/config.js`
```javascript
// Versioning
export const APP_VERSION = '2.8.0';
export const FEATURE_FLAGS = {
  darkMode: false,
  multiDeviceSync: false,
  exportExcel: true,
  offlineMode: true
};

// Storage
export const STORAGE_PREFIX = 'polar3_';
export const BACKUP_HISTORY_LIMIT = 40;
export const BACKUP_AUTO_INTERVAL = 604800000; // 7 days en ms

// Business logic
export const PACK_PRICE_DEFAULT = 15000;
export const CANON_PERCENTAGE = 0.20; // 20% cooperadora
export const SLA_DAYS_DELIVERY = { min: 15, max: 30 };

// UI
export const SIDEBAR_WIDTH = 268; // px
export const TOAST_DURATION = 3000; // ms
export const MODAL_ANIM_DURATION = 200; // ms

// Validación
export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[0-9]{7,15}$/,
  currency: /^[0-9]{1,10}$/,
  schoolName: /^[a-záéíóúñ\s'-]{3,80}$/i
};

// Constantes de negocio
export const WORKFLOW_STAGES = {
  photography: ['captura', 'iluminacion', 'lightroom', 'photoshop'],
  production: ['sla', 'qa', 'pagos', 'cobranzas'],
  commercial: ['captacion', 'scripts', 'familias', 'marketing']
};

export const FOLLOWUP_TYPES = ['ausente', 'retoma', 'pendiente'];
export const FOLLOWUP_STATUS = ['abierto', 'agendado', 'resuelto'];
```

#### 2.2 Crear `src/types.js`
```javascript
/**
 * @typedef {Object} Cobro
 * @property {string} id - UUID
 * @property {string} escuela - Nombre institución
 * @property {string} curso - Ej: "2° B"
 * @property {number} cantidad - Cantidad de packs vendidos
 * @property {number} precio - Precio unitario
 * @property {number} total - cantidad * precio
 * @property {'pendiente'|'pagado'} estado
 * @property {string} fecha - ISO date
 * @property {string} familia - Nombre responsable
 * @property {string} telefono - Contacto
 * @property {string} email - Email
 * @property {string} metodoPago - 'efectivo', 'transferencia', 'mercadopago'
 * @property {string} comprobante - Referencia de pago
 * @property {string} notas - Observaciones
 */

/**
 * @typedef {Object} ChecklistItem
 * @property {string} id
 * @property {string} categoria - 'equipamiento', 'setup', 'sesion', 'post'
 * @property {string} label - Descripción
 * @property {boolean} completado
 * @property {string} timestamp - Cuándo se marcó
 */

/**
 * @typedef {Object} FollowupRecord
 * @property {string} id
 * @property {string} escuela
 * @property {string} curso
 * @property {string} tipo - 'ausente' | 'retoma' | 'pendiente'
 * @property {number} cantidad - De alumnos afectados
 * @property {'abierto'|'agendado'|'resuelto'} estado
 * @property {string} proximaAccion - Próxima acción en texto
 * @property {string} responsable - Quién lo maneja
 * @property {string} notas - Detalles
 * @property {string} fechaCreacion
 * @property {string} fechaModificacion
 */

/**
 * @typedef {Object} KPIMetrics
 * @property {number} totalVentas
 * @property {number} porcentajeCobrado
 * @property {number} gastosEstimados
 * @property {number} rentabilidad
 * @property {number} margenNeto
 * @property {number} packs_vendidos
 * @property {string} mes
 */

/**
 * @typedef {Object} BackupMeta
 * @property {string} id - UUID
 * @property {string} fecha - ISO datetime
 * @property {number} size - Bytes
 * @property {string} version - App version en momento del backup
 * @property {string} description - Usuario creó manual o auto
 */

export {}; // Para que sea módulo válido
```

**ENTREGAR COMO**: src/config.js + src/types.js

---

### ENTREGA 3: Módulos Core (Validación, Logger, Storage)

#### 3.1 Crear `src/validator.js`
```javascript
import { VALIDATION_RULES } from './config.js';

/**
 * Valida email
 * @param {string} email
 * @returns {{valid: boolean, error?: string}}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email requerido' };
  }
  if (!VALIDATION_RULES.email.test(email)) {
    return { valid: false, error: 'Formato email inválido' };
  }
  return { valid: true };
}

/**
 * Valida teléfono
 * @param {string} phone
 * @returns {{valid: boolean, error?: string}}
 */
export function validatePhone(phone) {
  const clean = phone.replace(/[^\d+]/g, '');
  if (!VALIDATION_RULES.phone.test(clean)) {
    return { valid: false, error: 'Teléfono debe tener 7-15 dígitos' };
  }
  return { valid: true };
}

/**
 * Valida moneda argentina
 * @param {number|string} amount
 * @returns {{valid: boolean, cleaned: number, error?: string}}
 */
export function validateCurrency(amount) {
  const num = typeof amount === 'string' ? parseInt(amount, 10) : amount;
  if (isNaN(num) || num < 0) {
    return { valid: false, error: 'Monto debe ser número positivo' };
  }
  if (num > 999999999) {
    return { valid: false, error: 'Monto demasiado alto' };
  }
  return { valid: true, cleaned: num };
}

/**
 * Valida nombre de escuela
 * @param {string} name
 * @returns {{valid: boolean, error?: string}}
 */
export function validateSchoolName(name) {
  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return { valid: false, error: 'Nombre escuela mín 3 caracteres' };
  }
  if (name.length > 80) {
    return { valid: false, error: 'Nombre muy largo (máx 80)' };
  }
  if (!VALIDATION_RULES.schoolName.test(name)) {
    return { valid: false, error: 'Caracteres no permitidos' };
  }
  return { valid: true };
}

/**
 * Valida fecha ISO
 * @param {string} dateStr
 * @returns {{valid: boolean, date?: Date, error?: string}}
 */
export function validateDate(dateStr) {
  if (!dateStr) {
    return { valid: false, error: 'Fecha requerida' };
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Formato de fecha inválido' };
  }
  return { valid: true, date };
}

/**
 * Sanitiza string para prevenir XSS
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html; // textContent escapa automáticamente
  return div.innerHTML;
}

/**
 * Valida objeto Cobro completo
 * @param {Object} cobro
 * @returns {{valid: boolean, errors: Object}}
 */
export function validateCobro(cobro) {
  const errors = {};

  const schoolVal = validateSchoolName(cobro.escuela);
  if (!schoolVal.valid) errors.escuela = schoolVal.error;

  const emailVal = validateEmail(cobro.email);
  if (!emailVal.valid) errors.email = emailVal.error;

  const phoneVal = validatePhone(cobro.telefono);
  if (!phoneVal.valid) errors.telefono = phoneVal.error;

  const priceVal = validateCurrency(cobro.precio);
  if (!priceVal.valid) errors.precio = priceVal.error;

  if (!cobro.cantidad || cobro.cantidad < 1) {
    errors.cantidad = 'Cantidad mínima 1 pack';
  }

  if (!['pendiente', 'pagado'].includes(cobro.estado)) {
    errors.estado = 'Estado inválido';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export default {
  validateEmail,
  validatePhone,
  validateCurrency,
  validateSchoolName,
  validateDate,
  sanitizeHTML,
  validateCobro
};
```

#### 3.2 Crear `src/logger.js`
```javascript
import { APP_VERSION } from './config.js';

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLogLevel = LOG_LEVELS.INFO;
let logHistory = [];
const MAX_LOG_HISTORY = 500;

/**
 * Configura nivel de logging
 * @param {'debug'|'info'|'warn'|'error'} level
 */
export function setLogLevel(level) {
  currentLogLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
}

/**
 * Log genérico con nivel
 * @param {string} level
 * @param {string} message
 * @param {any} data
 */
function log(level, message, data) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    data,
    version: APP_VERSION,
    url: window.location.href
  };

  // Guardar en historial
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }

  // Loguear a console según nivel
  const numLevel = LOG_LEVELS[level.toUpperCase()];
  if (numLevel >= currentLogLevel) {
    const style = getConsoleStyle(level);
    console.log(`%c[${level}] ${message}`, style, data || '');
  }
}

function getConsoleStyle(level) {
  const styles = {
    DEBUG: 'color: #888; font-weight: bold;',
    INFO: 'color: #00aeef; font-weight: bold;',
    WARN: 'color: #d69e2e; font-weight: bold;',
    ERROR: 'color: #e53e3e; font-weight: bold;'
  };
  return styles[level];
}

export const logger = {
  debug: (msg, data) => log('DEBUG', msg, data),
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  getHistory: () => [...logHistory],
  clear: () => { logHistory = []; },
  export: () => JSON.stringify(logHistory, null, 2)
};

export default logger;
```

#### 3.3 Crear `src/modules/Storage.js`
```javascript
import { STORAGE_PREFIX, BACKUP_HISTORY_LIMIT, APP_VERSION } from '../config.js';
import { logger } from '../logger.js';

/**
 * Envoltorio seguro para localStorage
 */
class StorageManager {
  /**
   * @param {string} key
   * @param {any} defaultValue
   * @returns {any}
   */
  getItem(key, defaultValue = null) {
    try {
      const fullKey = `${STORAGE_PREFIX}${key}`;
      const stored = localStorage.getItem(fullKey);
      if (stored === null) return defaultValue;
      
      // Intentar parsear JSON
      try {
        return JSON.parse(stored);
      } catch {
        // Si no es JSON, retornar como string
        return stored;
      }
    } catch (err) {
      logger.error(`Error leyendo localStorage[${key}]`, err);
      return defaultValue;
    }
  }

  /**
   * @param {string} key
   * @param {any} value
   * @returns {boolean}
   */
  setItem(key, value) {
    try {
      const fullKey = `${STORAGE_PREFIX}${key}`;
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(fullKey, serialized);
      logger.info(`Storage: ${key} guardado`);
      return true;
    } catch (err) {
      logger.error(`Error escribiendo localStorage[${key}]`, err);
      return false;
    }
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  removeItem(key) {
    try {
      const fullKey = `${STORAGE_PREFIX}${key}`;
      localStorage.removeItem(fullKey);
      logger.info(`Storage: ${key} eliminado`);
      return true;
    } catch (err) {
      logger.error(`Error eliminando localStorage[${key}]`, err);
      return false;
    }
  }

  /**
   * Lista todas las keys
   * @returns {string[]}
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(STORAGE_PREFIX)) {
        keys.push(key.replace(STORAGE_PREFIX, ''));
      }
    }
    return keys;
  }

  /**
   * Limpia todo el storage de la app
   */
  clear() {
    try {
      const keysToDelete = this.getAllKeys();
      keysToDelete.forEach(key => this.removeItem(key));
      logger.info('Storage: todo borrado');
      return true;
    } catch (err) {
      logger.error('Error limpiando storage', err);
      return false;
    }
  }

  /**
   * Crea backup de todo el estado actual
   * @param {string} description
   * @returns {{id: string, meta: Object, data: Object}}
   */
  createBackup(description = 'Manual') {
    try {
      const id = `backup_${Date.now()}`;
      const meta = {
        id,
        fecha: new Date().toISOString(),
        version: APP_VERSION,
        description,
        keys_count: this.getAllKeys().length
      };

      // Copiar todos los datos
      const data = {};
      this.getAllKeys().forEach(key => {
        data[key] = this.getItem(key);
      });

      // Guardar backup
      const backupKey = `${id}_meta`;
      const backupData = `${id}_data`;
      this.setItem(backupKey, meta);
      this.setItem(backupData, data);

      // Agregar a historial de backups
      const history = this.getItem('backup_history', []);
      history.push({ id, fecha: meta.fecha });
      this.setItem('backup_history', history.slice(-BACKUP_HISTORY_LIMIT));

      logger.info('Backup creado', { id, description });
      return { id, meta, data };
    } catch (err) {
      logger.error('Error creando backup', err);
      return null;
    }
  }

  /**
   * Restaura un backup previo
   * @param {string} backupId
   * @returns {boolean}
   */
  restoreBackup(backupId) {
    try {
      const dataKey = `${backupId}_data`;
      const backup = this.getItem(dataKey);

      if (!backup) {
        logger.error('Backup no encontrado', { backupId });
        return false;
      }

      // Limpiar estado actual
      this.clear();

      // Restaurar datos
      Object.entries(backup).forEach(([key, value]) => {
        this.setItem(key, value);
      });

      logger.info('Backup restaurado', { backupId });
      return true;
    } catch (err) {
      logger.error('Error restaurando backup', err);
      return false;
    }
  }

  /**
   * Lista todos los backups disponibles
   * @returns {Array}
   */
  listBackups() {
    const history = this.getItem('backup_history', []);
    return history.map(item => {
      const meta = this.getItem(`${item.id}_meta`, {});
      return { ...item, ...meta };
    });
  }

  /**
   * Limpia backups antiguos
   * @param {number} daysToKeep
   * @returns {number} cantidad de backups borrados
   */
  purgeOldBackups(daysToKeep = 30) {
    try {
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      const history = this.getItem('backup_history', []);

      let deleted = 0;
      history.forEach(item => {
        const backupDate = new Date(item.fecha).getTime();
        if (now - backupDate > maxAge) {
          this.removeItem(`${item.id}_meta`);
          this.removeItem(`${item.id}_data`);
          deleted++;
        }
      });

      // Actualizar historial
      const newHistory = history.filter(item => {
        const backupDate = new Date(item.fecha).getTime();
        return now - backupDate <= maxAge;
      });
      this.setItem('backup_history', newHistory);

      logger.info(`Purga de backups: ${deleted} eliminados`);
      return deleted;
    } catch (err) {
      logger.error('Error purgando backups', err);
      return 0;
    }
  }

  /**
   * Obtiene tamaño total de storage en KB
   * @returns {number}
   */
  getStorageSize() {
    try {
      let size = 0;
      this.getAllKeys().forEach(key => {
        const value = this.getItem(key);
        size += JSON.stringify(value).length;
      });
      return Math.round(size / 1024);
    } catch (err) {
      logger.error('Error calculando tamaño', err);
      return 0;
    }
  }
}

export const storage = new StorageManager();
export default storage;
```

**ENTREGAR COMO**: src/validator.js + src/logger.js + src/modules/Storage.js

---

### ENTREGA 4: Módulo de Navegación

#### 4.1 Crear `src/modules/Navigation.js`
```javascript
import { logger } from '../logger.js';
import { storage } from './Storage.js';

/**
 * Maneja toda la lógica de navegación, workspaces y secciones
 */
class NavigationManager {
  constructor(sectionMap, sectionSpaces, workspaceDefaults) {
    this.sectionMap = sectionMap;
    this.sectionSpaces = sectionSpaces;
    this.workspaceDefaults = workspaceDefaults;
    this.currentSection = null;
    this.currentWorkspace = storage.getItem('workspace', 'operativo');
    this.history = [];
  }

  /**
   * Obtiene el workspace actual
   * @returns {string}
   */
  getWorkspace() {
    return this.currentWorkspace;
  }

  /**
   * Cambia el workspace activo
   * @param {string} workspace
   * @returns {boolean}
   */
  switchWorkspace(workspace) {
    if (!['operativo', 'comercial'].includes(workspace)) {
      logger.warn('Workspace inválido', { workspace });
      return false;
    }

    this.currentWorkspace = workspace;
    storage.setItem('workspace', workspace);
    logger.info('Workspace cambiado', { workspace });

    // Navegar a la sección default del workspace
    const defaultSection = this.workspaceDefaults[workspace];
    this.showSection(defaultSection);

    // Disparar evento para que UI se actualice
    window.dispatchEvent(new CustomEvent('workspace-changed', {
      detail: { workspace }
    }));

    return true;
  }

  /**
   * Muestra una sección
   * @param {string} sectionId
   * @returns {boolean}
   */
  showSection(sectionId) {
    const htmlId = this.sectionMap[sectionId];

    if (!htmlId) {
      logger.error('Sección no encontrada', { sectionId });
      return false;
    }

    // Validar que la sección es visible en workspace actual
    const allowedSpaces = this.sectionSpaces[sectionId] || [];
    if (!allowedSpaces.includes(this.currentWorkspace)) {
      logger.warn('Sección no disponible en workspace', {
        sectionId,
        workspace: this.currentWorkspace
      });
      return false;
    }

    // Guardar en historial
    if (this.currentSection) {
      this.history.push(this.currentSection);
      if (this.history.length > 50) this.history.shift();
    }

    this.currentSection = sectionId;
    storage.setItem('lastSection', sectionId);
    logger.info('Sección mostrada', { sectionId });

    // Disparar evento
    window.dispatchEvent(new CustomEvent('section-changed', {
      detail: { sectionId, workspace: this.currentWorkspace }
    }));

    return true;
  }

  /**
   * Obtiene la sección actual
   * @returns {string}
   */
  getCurrentSection() {
    return this.currentSection;
  }

  /**
   * Navega a sección anterior
   * @returns {boolean}
   */
  goBack() {
    if (this.history.length === 0) return false;

    const previous = this.history.pop();
    return this.showSection(previous);
  }

  /**
   * Obtiene el historial de navegación
   * @returns {string[]}
   */
  getHistory() {
    return [...this.history, this.currentSection].filter(Boolean);
  }

  /**
   * Filtra secciones por workspace
   * @param {string} workspace
   * @returns {string[]}
   */
  getSectionsForWorkspace(workspace) {
    return Object.keys(this.sectionSpaces).filter(
      section => this.sectionSpaces[section].includes(workspace)
    );
  }

  /**
   * Obtiene metadata de una sección
   * @param {string} sectionId
   * @returns {Object}
   */
  getSectionMetadata(sectionId) {
    return {
      id: sectionId,
      htmlId: this.sectionMap[sectionId],
      workspaces: this.sectionSpaces[sectionId] || [],
      isAvailable: this.sectionSpaces[sectionId]?.includes(this.currentWorkspace) || false
    };
  }

  /**
   * Inicializa desde URL hash o storage
   * @returns {void}
   */
  initializeFromURL() {
    const hash = window.location.hash.replace('#', '');
    const lastSection = storage.getItem('lastSection', 'inicio');

    const sectionToShow = hash || lastSection || 'inicio';
    this.showSection(sectionToShow);
  }

  /**
   * Sincroniza URL con sección actual
   * @returns {void}
   */
  syncURL() {
    window.location.hash = this.currentSection || 'inicio';
  }
}

export default NavigationManager;
```

**ENTREGAR COMO**: src/modules/Navigation.js

---

### ENTREGA 5: Módulo de Cobranzas (Store + Business Logic)

#### 5.1 Crear `src/stores/cobrosStore.js`
```javascript
import { logger } from '../logger.js';
import { storage } from '../modules/Storage.js';
import { validator } from '../validator.js';

/**
 * State management para cobranzas
 * Mantiene índices para búsquedas rápidas O(1)
 */
class CobrosStore {
  constructor() {
    this.records = storage.getItem('cobros', []);
    this.indexById = this._buildIndexById();
    this.indexByEscuela = this._buildIndexByEscuela();
  }

  /**
   * Construye índice de ID -> record para búsqueda O(1)
   * @private
   */
  _buildIndexById() {
    const index = {};
    this.records.forEach((record, idx) => {
      index[record.id] = idx;
    });
    return index;
  }

  /**
   * Construye índice de escuela -> [indices]
   * @private
   */
  _buildIndexByEscuela() {
    const index = {};
    this.records.forEach((record, idx) => {
      if (!index[record.escuela]) index[record.escuela] = [];
      index[record.escuela].push(idx);
    });
    return index;
  }

  /**
   * Agrega una cobranza
   * @param {Cobro} cobro
   * @returns {{success: boolean, id?: string, error?: string}}
   */
  add(cobro) {
    // Validar
    const validation = validator.validateCobro(cobro);
    if (!validation.valid) {
      logger.error('Cobro inválido', validation.errors);
      return { success: false, error: 'Validación fallida', details: validation.errors };
    }

    // Generar ID
    const id = `cobro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      id,
      ...cobro,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    };

    // Agregar
    this.records.push(record);
    this.indexById[id] = this.records.length - 1;

    // Indexar por escuela
    if (!this.indexByEscuela[cobro.escuela]) {
      this.indexByEscuela[cobro.escuela] = [];
    }
    this.indexByEscuela[cobro.escuela].push(this.records.length - 1);

    // Persistir
    this._persist();
    logger.info('Cobro agregado', { id });

    return { success: true, id };
  }

  /**
   * Obtiene un cobro por ID
   * @param {string} id
   * @returns {Cobro|null}
   */
  getById(id) {
    const idx = this.indexById[id];
    return idx !== undefined ? this.records[idx] : null;
  }

  /**
   * Actualiza un cobro
   * @param {string} id
   * @param {Partial<Cobro>} updates
   * @returns {{success: boolean, error?: string}}
   */
  update(id, updates) {
    const idx = this.indexById[id];
    if (idx === undefined) {
      return { success: false, error: 'Cobro no encontrado' };
    }

    const record = this.records[idx];
    const updated = { ...record, ...updates, fechaModificacion: new Date().toISOString() };

    // Revalidar
    const validation = validator.validateCobro(updated);
    if (!validation.valid) {
      return { success: false, error: 'Validación fallida', details: validation.errors };
    }

    // Si cambió escuela, actualizar índice
    if (updates.escuela && updates.escuela !== record.escuela) {
      const oldIdx = this.indexByEscuela[record.escuela].indexOf(idx);
      if (oldIdx > -1) this.indexByEscuela[record.escuela].splice(oldIdx, 1);

      if (!this.indexByEscuela[updates.escuela]) {
        this.indexByEscuela[updates.escuela] = [];
      }
      this.indexByEscuela[updates.escuela].push(idx);
    }

    this.records[idx] = updated;
    this._persist();
    logger.info('Cobro actualizado', { id });

    return { success: true };
  }

  /**
   * Elimina un cobro
   * @param {string} id
   * @returns {{success: boolean, error?: string}}
   */
  delete(id) {
    const idx = this.indexById[id];
    if (idx === undefined) {
      return { success: false, error: 'Cobro no encontrado' };
    }

    const record = this.records[idx];

    // Remover de índices
    delete this.indexById[id];

    const escuelaIdx = this.indexByEscuela[record.escuela].indexOf(idx);
    if (escuelaIdx > -1) {
      this.indexByEscuela[record.escuela].splice(escuelaIdx, 1);
    }

    // Remover del array
    this.records.splice(idx, 1);

    // Reconstruir índices (el splice afecta los índices)
    this.indexById = this._buildIndexById();
    this.indexByEscuela = this._buildIndexByEscuela();

    this._persist();
    logger.info('Cobro eliminado', { id });

    return { success: true };
  }

  /**
   * Busca por escuela
   * @param {string} escuela
   * @returns {Cobro[]}
   */
  findByEscuela(escuela) {
    const indices = this.indexByEscuela[escuela] || [];
    return indices.map(idx => this.records[idx]);
  }

  /**
   * Filtra con criterios múltiples
   * @param {Object} criteria - {escuela?, estado?, mes?, etc}
   * @returns {Cobro[]}
   */
  filter(criteria = {}) {
    return this.records.filter(record => {
      if (criteria.escuela && record.escuela !== criteria.escuela) return false;
      if (criteria.estado && record.estado !== criteria.estado) return false;
      if (criteria.mes && !record.fecha.startsWith(criteria.mes)) return false;
      if (criteria.minPrice && record.total < criteria.minPrice) return false;
      if (criteria.maxPrice && record.total > criteria.maxPrice) return false;
      return true;
    });
  }

  /**
   * Obtiene estadísticas
   * @returns {Object}
   */
  getStats() {
    const totalCobros = this.records.length;
    const totalMonto = this.records.reduce((sum, r) => sum + (r.total || 0), 0);
    const pagados = this.records.filter(r => r.estado === 'pagado');
    const montoCocorado = pagados.reduce((sum, r) => sum + (r.total || 0), 0);

    return {
      totalCobros,
      totalMonto,
      montoCobrado: montoCobrado,
      montoFaltante: totalMonto - montoCobrado,
      porcentajeCobrado: totalMonto > 0 ? (montoCobrado / totalMonto) * 100 : 0,
      cantidadPagadas: pagados.length,
      escuelasUniques: Object.keys(this.indexByEscuela).length
    };
  }

  /**
   * Exporta a JSON
   * @returns {Object}
   */
  export() {
    return {
      version: 'v2.8.0',
      exportDate: new Date().toISOString(),
      recordCount: this.records.length,
      data: this.records
    };
  }

  /**
   * Importa desde JSON
   * @param {Object} data
   * @returns {{success: boolean, imported: number, error?: string}}
   */
  import(data) {
    try {
      if (!Array.isArray(data.data)) {
        throw new Error('Formato inválido');
      }

      let imported = 0;
      data.data.forEach(record => {
        const result = this.add(record);
        if (result.success) imported++;
      });

      logger.info('Datos importados', { imported });
      return { success: true, imported };
    } catch (err) {
      logger.error('Error importando', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Persiste a localStorage
   * @private
   */
  _persist() {
    storage.setItem('cobros', this.records);
  }

  /**
   * Recarga desde storage
   */
  reload() {
    this.records = storage.getItem('cobros', []);
    this.indexById = this._buildIndexById();
    this.indexByEscuela = this._buildIndexByEscuela();
    logger.info('Cobros recargados', { count: this.records.length });
  }

  /**
   * Limpia todos los datos
   */
  clear() {
    this.records = [];
    this.indexById = {};
    this.indexByEscuela = {};
    this._persist();
    logger.info('Cobros borrados');
  }
}

export const cobrosStore = new CobrosStore();
export default cobrosStore;
```

**ENTREGAR COMO**: src/stores/cobrosStore.js

---

### ENTREGA 6: Módulos de Business Logic (KPIs, Checklist, Seguimiento)

Se entregan 3 módulos temáticos compactos, listos para integrar en la UI.

[Continúa en siguiente mensaje...]

---

## CHECKLIST DE FINALIZACIÓN

Después de cada entrega:
- ☑ Sin `console.error`, solo `logger.error()`
- ☑ Todas las funciones tienen JSDoc
- ☑ Tests básicos (happy path + error cases)
- ☑ Sin `var`, solo `const`/`let`
- ☑ Imports/exports ES6 correctos
- ☑ Backward compatible con localStorage antiguo

---

## NOTAS IMPORTANTES

1. **Mira primero la Entrega 1** (auditoría) para saber qué borrar
2. **No toques HTML**: enfócate 100% en .js
3. **Tests**: agregar `__tests__` folder con Jest después
4. **Versionado**: actualizar APP_VERSION en config.js cuando termines cada fase
5. **Logging**: todo debe pasar por `logger`, no `console.log`

---

**¿Listo para comenzar? Pide Entrega 1.**
