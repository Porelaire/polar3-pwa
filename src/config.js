/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * Archivo de Configuración Centralizado
 * 
 * Fuente de verdad para constantes, magic numbers y configuración global.
 * Los colores de marca se definen aquí como referencia, pero la fuente
 * de verdad visual son las CSS custom properties en styles.css (:root).
 */

// ═══════════════════════════════════════════════════════════════
// VERSIONADO Y CARACTERÍSTICAS
// ═══════════════════════════════════════════════════════════════

export const APP_VERSION = '2.8.0';
export const APP_NAME = 'Polar[3]';
export const APP_SUBTITLE = 'Sistema Operativo · Fotografía escolar';

export const FEATURE_FLAGS = {
  darkMode: true,        // Soporte dark mode disponible
  darkModeEnabled: false, // Toggle del usuario (se persiste en storage)
  offlineMode: true,
  autoBackup: true,
  analyticsPrivate: false,
  multiDeviceSync: false, // Futuro
  exportExcel: true,
  exportPDF: true
};

// ═══════════════════════════════════════════════════════════════
// STORAGE Y PERSISTENCIA
// ═══════════════════════════════════════════════════════════════

export const STORAGE_PREFIX = 'polar3_';
export const BACKUP_HISTORY_LIMIT = 40;
export const BACKUP_AUTO_INTERVAL_HOURS = 72;

/**
 * Keys de localStorage que la app controla.
 * Todas se guardan con el prefijo STORAGE_PREFIX.
 * Ej: storage.getItem('cobros') → localStorage['polar3_cobros']
 */
export const STORAGE_KEYS = {
  // Configuración de app
  workspace: 'workspace',
  lastSection: 'lastSection',
  theme: 'theme',
  language: 'language',

  // Datos de negocio
  precio: 'precio',
  cobros: 'cobros',
  paymentBoard: 'payment_board',
  schoolBoard: 'school_board',
  followupBoard: 'followup_board',
  checklist: 'checklist',

  // Backup
  backupPrefs: 'backup_prefs',
  backupMeta: 'backup_meta',
  backupHistory: 'backup_history',
  dirtyKeys: 'dirty_keys',

  // Workspace
  meetingMode: 'meeting_mode',
  calendarMobileOpenMonth: 'calendar_mobile_open_month_key'
};

// ═══════════════════════════════════════════════════════════════
// PRECIOS Y DATOS DE NEGOCIO
// ═══════════════════════════════════════════════════════════════

export const PACK_PRICE_DEFAULT = 15000; // ARS
export const CANON_PERCENTAGE = 0.20;    // 20% para cooperadora
export const SLA_DAYS_DELIVERY = { min: 15, max: 30 };

export const PACK_CONTENTS = {
  carpeta: '1 carpeta premium',
  impresiones: '2 fotos 20×30',
  tiraCarnet: '1 tira carnet',
  fotoDocente: '1 foto regalo docente',
  digital: 'Descarga digital + pendrive'
};

// ═══════════════════════════════════════════════════════════════
// WORKSPACES Y NAVEGACIÓN
// ═══════════════════════════════════════════════════════════════

export const WORKSPACES = ['operativo', 'comercial'];

export const WORKSPACE_DEFAULTS = {
  operativo: 'inicio',
  comercial: 'institucional'
};

export const WORKSPACE_LABELS = {
  operativo: 'Operativo',
  comercial: 'Comercial'
};

// ═══════════════════════════════════════════════════════════════
// SECCIONES: MAPA Y PERMISOS POR WORKSPACE
// ═══════════════════════════════════════════════════════════════

/**
 * Mapeo sección → id del elemento DOM.
 * Ej: showSection('cobranzas') → document.getElementById('sec-cobranzas')
 */
export const SECTION_MAP = {
  inicio: 'sec-inicio',
  appcenter: 'sec-appcenter',
  quien: 'sec-quien',
  pack: 'sec-pack',
  compromisos: 'sec-compromisos',
  flujo: 'sec-flujo',
  calendario: 'sec-calendario',
  economico: 'sec-economico',
  captacion: 'sec-captacion',
  scripts: 'sec-scripts',
  familias: 'sec-familias',
  marketing: 'sec-marketing',
  cartera: 'sec-cartera',
  captura: 'sec-captura',
  iluminacion: 'sec-iluminacion',
  lightroom: 'sec-lightroom',
  photoshop: 'sec-photoshop',
  montaje: 'sec-montaje',
  imprenta: 'sec-imprenta',
  archivos: 'sec-archivos',
  checklist: 'sec-checklist',
  seguimiento: 'sec-seguimiento',
  roles: 'sec-roles',
  emergencias: 'sec-emergencias',
  diagnostico: 'sec-diagnostico',
  sla: 'sec-sla',
  qa: 'sec-qa',
  pagos: 'sec-pagos',
  cobranzas: 'sec-cobranzas',
  forms: 'sec-forms',
  kpis: 'sec-kpis',
  simulador: 'sec-simulador',
  respaldos: 'sec-respaldos',
  institucional: 'sec-institucional',
  modalidades: 'sec-modalidades',
  propuesta: 'sec-propuesta',
  marca: 'sec-marca',
  workspace: 'sec-workspace'
};

/**
 * Qué workspace(s) pueden ver cada sección.
 * Si una sección no aparece acá, no es accesible.
 */
export const SECTION_SPACES = {
  inicio: ['operativo', 'comercial'],
  appcenter: ['operativo', 'comercial'],
  quien: ['operativo', 'comercial'],
  pack: ['operativo', 'comercial'],
  compromisos: ['operativo', 'comercial'],
  flujo: ['operativo'],
  calendario: ['operativo'],
  economico: ['operativo'],
  captacion: ['operativo', 'comercial'],
  scripts: ['operativo', 'comercial'],
  familias: ['operativo', 'comercial'],
  marketing: ['operativo', 'comercial'],
  cartera: ['operativo', 'comercial'],
  captura: ['operativo'],
  iluminacion: ['operativo'],
  lightroom: ['operativo'],
  photoshop: ['operativo'],
  montaje: ['operativo'],
  imprenta: ['operativo'],
  archivos: ['operativo'],
  checklist: ['operativo'],
  seguimiento: ['operativo'],
  roles: ['operativo'],
  emergencias: ['operativo'],
  diagnostico: ['operativo'],
  sla: ['operativo'],
  qa: ['operativo'],
  pagos: ['operativo'],
  cobranzas: ['operativo'],
  forms: ['operativo'],
  kpis: ['operativo'],
  simulador: ['operativo', 'comercial'],
  respaldos: ['operativo'],
  institucional: ['comercial'],
  modalidades: ['comercial'],
  propuesta: ['comercial'],
  marca: ['comercial'],
  workspace: ['operativo', 'comercial']
};

/**
 * Secciones que se eliminaron o renombraron.
 * Si un usuario tiene una guardada en localStorage, se redirige.
 */
export const DEPRECATED_SECTION_REDIRECTS = {
  quien: 'inicio',
  pack: 'modalidades',
  compromisos: 'institucional',
  flujo: 'calendario',
  economico: 'simulador',
  captura: 'checklist',
  iluminacion: 'checklist',
  lightroom: 'checklist',
  photoshop: 'checklist',
  montaje: 'checklist',
  imprenta: 'checklist',
  archivos: 'workspace',
  roles: 'checklist',
  onboarding: 'inicio',
  glosario: 'inicio'
};

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN
// ═══════════════════════════════════════════════════════════════

export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[0-9]{7,15}$/,
  currency: /^[0-9]{1,10}$/,
  schoolName: /^[a-záéíóúñ\s\d.°ª'-]{3,80}$/i,
  courseFormat: /^[0-9°ªñáéíóúA-Z\s°'-]{1,20}$/i
};

// ═══════════════════════════════════════════════════════════════
// DATOS DE NEGOCIO: COBRANZAS Y SEGUIMIENTO
// ═══════════════════════════════════════════════════════════════

export const COBRO_STATES = ['pendiente', 'pagado'];

export const FOLLOWUP_TYPES = ['ausente', 'retoma', 'pendiente'];
export const FOLLOWUP_STATUS = ['abierto', 'agendado', 'resuelto'];

export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'otro', label: 'Otro' }
];

// ═══════════════════════════════════════════════════════════════
// FOTOGRAFÍA: WORKFLOWS Y EQUIPAMIENTO
// ═══════════════════════════════════════════════════════════════

export const PHOTOGRAPHY_STAGES = {
  captura: 'Captura',
  iluminacion: 'Iluminación',
  lightroom: 'Lightroom (Post)',
  photoshop: 'Photoshop (Retoque)',
  montaje: 'Montaje',
  imprenta: 'Imprenta'
};

export const CHECKLIST_CATEGORIES = [
  'equipamiento',
  'setup',
  'sesion',
  'post',
  'entrega'
];

// ═══════════════════════════════════════════════════════════════
// CALENDARIO Y FECHAS
// ═══════════════════════════════════════════════════════════════

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DAYS_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

/** Mes de inicio del ciclo lectivo (1-indexed: 3 = Marzo) */
export const SCHOOL_YEAR_START_MONTH = 3;

// ═══════════════════════════════════════════════════════════════
// UI: DIMENSIONES Y TIMING
// ═══════════════════════════════════════════════════════════════

export const UI = {
  sidebarWidth: 268,          // px — sincronizar con --sidebar-w en CSS
  topbarHeight: 60,           // px
  mobileTabbarHeight: 60,     // px
  modalAnimDuration: 200,     // ms
  toastDuration: 3000,        // ms
  toastPosition: 'top-right', // posición del toast container
  transitionDuration: 200,    // ms
  debounceDelay: 300,         // ms para inputs de búsqueda
  scrollTopThreshold: 100     // px para mostrar botón "volver arriba"
};

export const BREAKPOINTS = {
  mobile: 320,
  tablet: 480,
  desktop: 768,
  wide: 1024,
  ultrawide: 1440
};

// ═══════════════════════════════════════════════════════════════
// COLORES (referencia JS — fuente de verdad: CSS :root)
// ═══════════════════════════════════════════════════════════════

export const BRAND_COLORS = {
  accent: '#00aeef',
  accentDark: '#0090c8',
  accentSoft: 'rgba(0,174,239,0.1)',
  accentSoft2: 'rgba(0,174,239,0.18)',

  // Light theme
  sidebarBg: '#161c26',
  textPrimary: '#1e2433',
  textSecondary: '#4a5568',
  textMuted: '#8a95a3',
  bgMain: '#f4f6f9',
  bgCard: '#ffffff',
  bgSoft: '#edf2f7',
  border: '#e2e8f0',

  // Status
  success: '#38a169',
  warning: '#d69e2e',
  danger: '#e53e3e'
};

// ═══════════════════════════════════════════════════════════════
// INTEGRACIONES EXTERNAS (IA, URLs)
// ═══════════════════════════════════════════════════════════════

export const AI_PROVIDER_URLS = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
  claude: 'https://claude.ai/'
};

export const AI_PROVIDER_INTENTS = {
  chatgpt: 'intent://chatgpt.com/#Intent;scheme=https;package=com.openai.chatgpt;S.browser_fallback_url=https%3A%2F%2Fchatgpt.com%2F;end',
  gemini: 'intent://gemini.google.com/app#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp;end',
  claude: 'intent://claude.ai/#Intent;scheme=https;package=com.anthropic.claude;S.browser_fallback_url=https%3A%2F%2Fclaude.ai%2F;end'
};

export const AI_TEMPLATE_LABELS = {
  consulta: 'Consulta operativa',
  cobranzas: 'Cobranzas / pagos',
  jornada: 'Jornada de toma',
  comercial: 'Mensaje comercial',
  kpis: 'Lectura de KPIs'
};

// ═══════════════════════════════════════════════════════════════
// CONTACTO Y DATOS DEL NEGOCIO
// ═══════════════════════════════════════════════════════════════

export const BUSINESS_INFO = {
  ownerName: 'Adrián Fernández',
  phone: '11 5523-8266',
  email: 'adrian@polar3.com.ar',
  location: 'CABA',
  website: 'https://polar3.com.ar',
  instagram: '@polar3.photo'
};

// ═══════════════════════════════════════════════════════════════
// TEXTOS / MENSAJES CONSTANTES
// ═══════════════════════════════════════════════════════════════

export const MESSAGES = {
  noData: 'Sin datos cargados.',
  loading: 'Cargando...',
  saving: 'Guardando...',
  saved: 'Guardado correctamente',
  error: 'Ocurrió un error',
  confirm: '¿Confirmás esta acción?',
  deleted: 'Eliminado correctamente',
  backupCreated: 'Respaldo creado exitosamente',
  backupRestored: 'Respaldo restaurado exitosamente',
  exportOk: 'Datos exportados correctamente',
  importOk: 'Datos importados correctamente',
  validationFail: 'Revisá los campos marcados en rojo'
};

// ═══════════════════════════════════════════════════════════════
// VALORES POR DEFECTO
// ═══════════════════════════════════════════════════════════════

export const DEFAULTS = {
  cobro: {
    estado: 'pendiente',
    metodoPago: 'transferencia'
  },
  followup: {
    estado: 'abierto'
  },
  backup: {
    intervalHours: 72,
    dirtyOnly: true,
    toastOnStart: true
  }
};

// ═══════════════════════════════════════════════════════════════
// DEFAULT EXPORT (compatibilidad con import default)
// ═══════════════════════════════════════════════════════════════

export default {
  APP_VERSION,
  APP_NAME,
  APP_SUBTITLE,
  FEATURE_FLAGS,
  STORAGE_PREFIX,
  STORAGE_KEYS,
  BACKUP_HISTORY_LIMIT,
  BACKUP_AUTO_INTERVAL_HOURS,
  PACK_PRICE_DEFAULT,
  CANON_PERCENTAGE,
  SLA_DAYS_DELIVERY,
  PACK_CONTENTS,
  WORKSPACES,
  WORKSPACE_DEFAULTS,
  WORKSPACE_LABELS,
  SECTION_MAP,
  SECTION_SPACES,
  DEPRECATED_SECTION_REDIRECTS,
  VALIDATION_RULES,
  COBRO_STATES,
  FOLLOWUP_TYPES,
  FOLLOWUP_STATUS,
  PAYMENT_METHODS,
  PHOTOGRAPHY_STAGES,
  CHECKLIST_CATEGORIES,
  MONTHS_ES,
  DAYS_ES,
  SCHOOL_YEAR_START_MONTH,
  UI,
  BREAKPOINTS,
  BRAND_COLORS,
  AI_PROVIDER_URLS,
  AI_PROVIDER_INTENTS,
  AI_TEMPLATE_LABELS,
  BUSINESS_INFO,
  MESSAGES,
  DEFAULTS
};
