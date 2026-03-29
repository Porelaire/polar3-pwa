/**
 * config.js — Polar[3] PWA v2.7.12
 * Todas las constantes y valores de configuración centralizados.
 * No contiene lógica de negocio ni efectos secundarios.
 */

// ─────────────────────────────────────────────
// APP METADATA
// ─────────────────────────────────────────────

export const POLAR3_APP_VERSION = '2.7.12';
export const PWA_CACHE_LABEL = 'Polar3 PWA';

// ─────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────

export const POLAR3_STORAGE_PREFIX = 'polar3_';

// Backup
export const BACKUP_META_KEY      = 'polar3_backup_meta';
export const BACKUP_HISTORY_KEY   = 'polar3_backup_history';
export const BACKUP_PREFS_KEY     = 'polar3_backup_prefs';
export const BACKUP_HISTORY_LIMIT = 40;

// Precio global
export const PRECIO_STORAGE_KEY   = 'polar3_precio';
export const PRECIO_DEFAULT       = 15000;

// Workspace
export const WORKSPACE_STORAGE_KEY = 'polar3_workspace';

// Boards / datos de negocio
export const PAYMENT_BOARD_KEY     = 'polar3_payment_board';
export const SCHOOL_BOARD_KEY      = 'polar3_school_board';
export const FOLLOWUP_BOARD_KEY    = 'polar3_followup_board';
export const CHECKLIST_KEY         = 'polar3_checklist';

// KPIs
export const KPI_TICKET_MODE_KEY   = 'polar3_kpi_ticket_mode';
export const KPI_SCOPE_KEY         = 'polar3_kpi_scope';
export const KPI_PERIOD_MODE_KEY   = 'polar3_kpi_period_mode';
export const KPI_PERIOD_VALUE_KEY  = 'polar3_kpi_period_value';

// Calendario
export const CALENDAR_STORAGE_KEY                = 'polar3_work_calendar_v2';
export const CALENDAR_LEGACY_STORAGE_KEY         = 'polar3_work_calendar_v1';
export const CALENDAR_PRINT_REFERENCE_KEY        = 'polar3_calendar_print_reference';
export const CALENDAR_PRINT_SCHOOL_FILTER_KEY    = 'polar3_calendar_print_school_filter';
export const CALENDAR_DAY_SHEET_STORAGE_KEY      = 'polar3_calendar_day_sheet_v1';
export const CALENDAR_DAY_CHECKLIST_STORAGE_KEY  = 'polar3_calendar_day_checklist_v1';

// ─────────────────────────────────────────────
// NAVEGACIÓN — secciones y workspaces
// ─────────────────────────────────────────────

/** Mapea clave de sección → ID del elemento DOM */
export const sectionMap = {
  inicio:        'sec-inicio',
  appcenter:     'sec-appcenter',
  quien:         'sec-quien',
  pack:          'sec-pack',
  compromisos:   'sec-compromisos',
  flujo:         'sec-flujo',
  calendario:    'sec-calendario',
  economico:     'sec-economico',
  captacion:     'sec-captacion',
  scripts:       'sec-scripts',
  familias:      'sec-familias',
  marketing:     'sec-marketing',
  cartera:       'sec-cartera',
  captura:       'sec-captura',
  iluminacion:   'sec-iluminacion',
  lightroom:     'sec-lightroom',
  photoshop:     'sec-photoshop',
  montaje:       'sec-montaje',
  imprenta:      'sec-imprenta',
  archivos:      'sec-archivos',
  checklist:     'sec-checklist',
  seguimiento:   'sec-seguimiento',
  roles:         'sec-roles',
  emergencias:   'sec-emergencias',
  diagnostico:   'sec-diagnostico',
  sla:           'sec-sla',
  qa:            'sec-qa',
  pagos:         'sec-pagos',
  cobranzas:     'sec-cobranzas',
  forms:         'sec-forms',
  kpis:          'sec-kpis',
  simulador:     'sec-simulador',
  respaldos:     'sec-respaldos',
  institucional: 'sec-institucional',
  modalidades:   'sec-modalidades',
  propuesta:     'sec-propuesta',
  marca:         'sec-marca',
  workspace:     'sec-workspace'
};

/** Mapea clave de sección → workspaces a los que pertenece */
export const sectionSpaces = {
  inicio:        ['operativo', 'comercial'],
  appcenter:     ['operativo', 'comercial'],
  quien:         ['operativo', 'comercial'],
  pack:          ['operativo', 'comercial'],
  compromisos:   ['operativo', 'comercial'],
  flujo:         ['operativo'],
  calendario:    ['operativo'],
  economico:     ['operativo'],
  captacion:     ['operativo', 'comercial'],
  scripts:       ['operativo', 'comercial'],
  familias:      ['operativo', 'comercial'],
  marketing:     ['operativo', 'comercial'],
  cartera:       ['operativo', 'comercial'],
  captura:       ['operativo'],
  iluminacion:   ['operativo'],
  lightroom:     ['operativo'],
  photoshop:     ['operativo'],
  montaje:       ['operativo'],
  imprenta:      ['operativo'],
  archivos:      ['operativo'],
  checklist:     ['operativo'],
  seguimiento:   ['operativo'],
  roles:         ['operativo'],
  emergencias:   ['operativo'],
  diagnostico:   ['operativo'],
  sla:           ['operativo'],
  qa:            ['operativo'],
  pagos:         ['operativo'],
  cobranzas:     ['operativo'],
  forms:         ['operativo'],
  kpis:          ['operativo'],
  simulador:     ['operativo', 'comercial'],
  respaldos:     ['operativo'],
  institucional: ['comercial'],
  modalidades:   ['comercial'],
  propuesta:     ['comercial'],
  marca:         ['comercial'],
  workspace:     ['operativo', 'comercial']
};

/** Sección inicial por defecto para cada workspace */
export const workspaceDefaults = {
  operativo: 'inicio',
  comercial: 'institucional'
};

/** Workspaces válidos */
export const VALID_WORKSPACES = ['operativo', 'comercial'];

/**
 * Secciones deprecadas → redirigen a otra sección activa.
 * Se usan para migración sin romper bookmarks o estado guardado.
 */
export const DEPRECATED_SECTION_REDIRECTS = {
  quien:      'inicio',
  pack:       'modalidades',
  compromisos:'institucional',
  flujo:      'calendario',
  economico:  'simulador',
  captura:    'checklist',
  iluminacion:'checklist',
  lightroom:  'checklist',
  photoshop:  'checklist',
  montaje:    'checklist',
  imprenta:   'checklist',
  archivos:   'workspace',
  roles:      'checklist',
  onboarding: 'inicio',
  glosario:   'inicio'
};

/** Secciones excluidas del índice de búsqueda (las deprecadas) */
export const SEARCH_EXCLUDED_SECTIONS = new Set(Object.keys(DEPRECATED_SECTION_REDIRECTS));

// ─────────────────────────────────────────────
// CALENDARIO
// ─────────────────────────────────────────────

export const CALENDAR_MONTH_KEYS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export const CALENDAR_MONTH_LABELS = {
  enero:      'Enero',
  febrero:    'Febrero',
  marzo:      'Marzo',
  abril:      'Abril',
  mayo:       'Mayo',
  junio:      'Junio',
  julio:      'Julio',
  agosto:     'Agosto',
  septiembre: 'Septiembre',
  octubre:    'Octubre',
  noviembre:  'Noviembre',
  diciembre:  'Diciembre'
};

export const CALENDAR_STATUS_LABELS = {
  tentativo:      'Tentativo',
  confirmado:     'Confirmado',
  jornada:        'Jornada',
  reunion:        'Reunión',
  edicion:        'Edición',
  entrega:        'Entrega',
  retoma:         'Retoma',
  cobranza:       'Cobranza',
  administrativo: 'Administrativo'
};

export const CALENDAR_STATUS_OPTIONS = Object.keys(CALENDAR_STATUS_LABELS);

export const CALENDAR_BASE_TEMPLATE = {
  enero:      'Revisar equipo, actualizar precios, ordenar materiales comerciales y definir agenda tentativa.',
  febrero:    'Contactar colegios, cerrar fechas, preparar formularios, contratos y materiales.',
  marzo:      'Confirmar primeras jornadas, grupos y circuito de cobro. Preparar plan B por lluvia.',
  abril:      'Sostener tomas masivas, controlar edición y entregas parciales.',
  mayo:       'Continuar jornadas, revisar pendientes y mantener ritmo de producción.',
  junio:      'Cerrar cuellos de botella y ordenar próximas entregas.',
  julio:      'Avanzar edición acumulada, retomas y orden administrativo.',
  agosto:     'Programar retomas, actos y campañas de segunda mitad del año.',
  septiembre: 'Seguir retomas, campañas familiares y agenda de cierre.',
  octubre:    'Últimas tomas, egresados y definición de plazos finales.',
  noviembre:  'Edición masiva, producción, entregas y liquidaciones.',
  diciembre:  'Cierre de cobranzas, rendiciones, KPIs y renovaciones.'
};

/** Etiquetas del checklist de día de jornada */
export const CALENDAR_DAY_CHECKLIST_LABELS = {
  camera:   'Cámara principal, lente y flash revisados',
  batteries:'Baterías cargadas y cargadores listos',
  cards:    'Tarjetas vacías / respaldo preparado',
  background:'Fondo, soportes y extensiones cargados',
  schedule: 'Horario, cursos y secuencia confirmados',
  contacts: 'Referentes y contactos a mano',
  route:    'Ruta, llegada y acceso revisados',
  space:    'Espacio / set y plan B definidos',
  forms:    'Formularios, autorizaciones y pendientes revisados',
  payments: 'Sistema de cobro / QR / sobres listos',
  retakes:  'Ausentes, retomas y casos especiales anotados',
  closing:  'Plan de cierre, backup y próximo paso definido'
};

// ─────────────────────────────────────────────
// KPIs
// ─────────────────────────────────────────────

/** Modos válidos para el ticket KPI */
export const KPI_TICKET_MODES = ['familia', 'alumno'];

/** Modos válidos de período KPI */
export const KPI_PERIOD_MODES = ['month_current', 'month_custom', 'all'];

// ─────────────────────────────────────────────
// IA — proveedores y plantillas
// ─────────────────────────────────────────────

export const AI_PROVIDER_URLS = {
  chatgpt: 'https://chatgpt.com/',
  gemini:  'https://gemini.google.com/app',
  claude:  'https://claude.ai/'
};

export const AI_PROVIDER_INTENTS = {
  chatgpt: 'intent://chatgpt.com/#Intent;scheme=https;package=com.openai.chatgpt;S.browser_fallback_url=https%3A%2F%2Fchatgpt.com%2F;end',
  gemini:  'intent://gemini.google.com/app#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp;end',
  claude:  'intent://claude.ai/#Intent;scheme=https;package=com.anthropic.claude;S.browser_fallback_url=https%3A%2F%2Fclaude.ai%2F;end'
};

export const AI_TEMPLATE_LABELS = {
  consulta:  'Consulta operativa',
  cobranzas: 'Cobranzas / pagos',
  jornada:   'Jornada de toma',
  comercial:  'Mensaje comercial',
  kpis:       'Lectura de KPIs'
};

// ─────────────────────────────────────────────
// DATOS SEMILLA (seed data para onboarding)
// ─────────────────────────────────────────────

export const paymentBoardSeed = [
  {
    id: 'ex1',
    school: 'Jardín Arco Iris',
    date: '2026-03-08',
    name: 'Sofía Pérez',
    course: 'Sala 5 A',
    amount: 15000,
    status: 'validado',
    receipt: 'MP-3021',
    note: 'Pack base'
  },
  {
    id: 'ex2',
    school: 'Instituto San Martín',
    date: '2026-03-11',
    name: 'Tomás Díaz',
    course: 'Sala 4 B',
    amount: 15000,
    status: 'observado',
    receipt: 'Comprobante ilegible',
    note: 'Pedir reenvío'
  },
  {
    id: 'ex3',
    school: 'Escuela Modelo Sur',
    date: '2026-02-26',
    name: 'Emma Roldán',
    course: 'Sala 5 A',
    amount: 17500,
    status: 'liquidado',
    receipt: 'Transferencia',
    note: 'Pack + extra digital'
  }
];

export const schoolBoardSeed = [
  {
    id: 'sch1',
    name: 'Jardín Arco Iris',
    level: 'Jardín',
    stage: 'renovacion',
    contact: 'Cooperadora · Laura',
    renewal: 'Abril 2026',
    nextAction: 'Confirmar fecha de reunión',
    risk: 'amarillo',
    pack: 15000,
    notes: 'Buen vínculo. Piden propuesta simplificada.'
  },
  {
    id: 'sch2',
    name: 'Instituto San Martín',
    level: 'Primaria',
    stage: 'propuesta',
    contact: 'Secretaría',
    renewal: '—',
    nextAction: 'Enviar propuesta completa',
    risk: 'verde',
    pack: 15000,
    notes: 'Interés en modalidad completa.'
  },
  {
    id: 'sch3',
    name: 'Escuela Modelo Sur',
    level: 'Mixto',
    stage: 'activo',
    contact: 'Cooperadora',
    renewal: 'Agosto 2026',
    nextAction: 'Revisar conversión del último año',
    risk: 'verde',
    pack: 15000,
    notes: 'Histórico estable.'
  },
  {
    id: 'sch4',
    name: 'Colegio Nuevo Horizonte',
    level: 'Primaria',
    stage: 'contacto',
    contact: 'Directivo',
    renewal: '—',
    nextAction: 'Segundo seguimiento',
    risk: 'rojo',
    pack: 16000,
    notes: 'Respuesta lenta y decisión política abierta.'
  }
];

export const followupSeed = [
  {
    id: 'fl1',
    school: 'Jardín Arco Iris',
    date: '2026-04-12',
    course: 'Sala 5 A',
    type: 'ausente',
    count: 2,
    status: 'abierto',
    nextAction: 'Consultar si habrá retoma',
    owner: 'Adrián',
    notes: 'Dos ausentes justificados.'
  },
  {
    id: 'fl2',
    school: 'Instituto San Martín',
    date: '2026-05-03',
    course: '2° B',
    type: 'retoma',
    count: 1,
    status: 'agendado',
    nextAction: 'Retoma viernes 8:00',
    owner: 'Adrián',
    notes: 'Ojos cerrados en individual.'
  },
  {
    id: 'fl3',
    school: 'Escuela Modelo Sur',
    date: '2026-05-15',
    course: 'Sala 4',
    type: 'pendiente',
    count: 1,
    status: 'abierto',
    nextAction: 'Falta grupal del turno tarde',
    owner: 'Asistente',
    notes: 'Definir si se resuelve misma semana.'
  }
];

// ─────────────────────────────────────────────
// REGLAS DE NEGOCIO
// ─────────────────────────────────────────────

/** Porcentaje del canon sobre el precio del pack (20%) */
export const CANON_PERCENTAGE = 0.2;

/** Volúmenes de referencia para tabla de simulador */
export const SIMULATOR_VOLUMES = [300, 400, 500];

/** Intervalo por defecto para recordatorio de backup (horas) */
export const BACKUP_DEFAULT_INTERVAL_HOURS = 72;
