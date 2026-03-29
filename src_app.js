/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * App.js — Punto de entrada principal
 *
 * Inicializa todos los módulos, conecta eventos de UI,
 * y expone la API global para compatibilidad con HTML inline.
 *
 * Módulos integrados:
 *   - Storage (persistencia + backup)
 *   - Navigation (routing + sidebar + workspace)
 *   - CobrosStore (cobranzas CRUD)
 *   - ChecklistStore (jornada de toma)
 *   - KPIs (métricas de negocio)
 *   - Seguimiento (pendientes/retomas)
 *   - Fotografia (workflows)
 */

import { storage } from './modules/Storage.js';
import { navigation } from './modules/Navigation.js';
import { cobrosStore } from './stores/CobrosStore.js';
import { checklistStore } from './stores/ChecklistStore.js';
import { kpis } from './modules/Business/KPIs.js';
import { seguimiento } from './modules/Business/Seguimiento.js';
import { fotografia } from './modules/Business/Fotografia.js';

import {
  APP_VERSION,
  APP_NAME,
  FEATURE_FLAGS,
  STORAGE_KEYS,
  UI,
  MONTHS_ES,
  PAYMENT_METHODS
} from './config.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO GLOBAL DE LA APP
// ═══════════════════════════════════════════════════════════════

const app = {
  version: APP_VERSION,
  name: APP_NAME,
  ready: false
};

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

function initApp() {
  console.log(`%c${APP_NAME} v${APP_VERSION}`, 'color: #00aeef; font-size: 16px; font-weight: bold;');
  console.log('Inicializando módulos...');

  // 1. Storage primero (los demás dependen de él)
  storage.init();

  // 2. Stores de datos
  cobrosStore.init();
  checklistStore.init();
  seguimiento.init();

  // 3. Navegación (lee estado de storage, bindea DOM)
  navigation.init();

  // 4. Theme
  initTheme();

  // 5. UI: toasts, modales, formularios
  initToasts();
  initModals();
  initForms();

  // 6. Conectar listeners entre módulos
  connectListeners();

  // 7. Render inicial de secciones dinámicas
  renderDynamicSections();

  // 8. Backup check al iniciar
  checkBackupOnStart();

  // 9. Exponer API global (para onclick en HTML)
  exposeGlobalAPI();

  app.ready = true;
  console.log(`${APP_NAME} v${APP_VERSION} — Listo ✓`);
}

// ═══════════════════════════════════════════════════════════════
// THEME (Dark/Light mode)
// ═══════════════════════════════════════════════════════════════

function initTheme() {
  const saved = storage.getItem(STORAGE_KEYS.theme, 'auto');
  applyTheme(saved);
}

function applyTheme(mode) {
  const html = document.documentElement;

  if (mode === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else if (mode === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    // Auto: seguir prefers-color-scheme
    html.removeAttribute('data-theme');
  }

  storage.setItem(STORAGE_KEYS.theme, mode);
  updateThemeIcon(mode);
}

function toggleTheme() {
  const current = storage.getItem(STORAGE_KEYS.theme, 'auto');
  const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
  applyTheme(next);
}

function updateThemeIcon(mode) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const icons = { light: '☀️', dark: '🌙', auto: '🌗' };
  btn.textContent = icons[mode] || '🌗';
  btn.title = `Tema: ${mode}`;
}

// ═══════════════════════════════════════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════

let toastContainer = null;

function initToasts() {
  toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('role', 'status');
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }
}

/**
 * Muestra un toast de notificación.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration] - ms, default de config
 */
function showToast(message, type = 'info', duration) {
  if (!toastContainer) initToasts();

  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  const ms = duration || UI.toastDuration;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Cerrar">✕</button>
  `;

  // Cerrar al click
  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));

  toastContainer.appendChild(toast);

  // Auto-remove
  setTimeout(() => removeToast(toast), ms);
}

function removeToast(el) {
  if (!el || !el.parentNode) return;
  el.classList.add('toast-exit');
  setTimeout(() => el.remove(), 200);
}

// ═══════════════════════════════════════════════════════════════
// MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════

function initModals() {
  // Cerrar modales al clickear fuera
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal') && e.target.classList.contains('visible')) {
      closeModal(e.target);
    }
  });

  // Escape cierra el modal más alto
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.visible');
      if (openModal) closeModal(openModal);
    }
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalOrId) {
  const modal = typeof modalOrId === 'string'
    ? document.getElementById(modalOrId)
    : modalOrId;
  if (!modal) return;
  modal.classList.remove('visible');
  document.body.style.overflow = '';
}

/**
 * Modal de confirmación genérico.
 * @param {string} message
 * @param {Function} onConfirm
 * @param {string} [confirmText='Confirmar']
 */
function confirmDialog(message, onConfirm, confirmText = 'Confirmar') {
  const modal = document.getElementById('confirmModal');
  if (!modal) return;

  const msgEl = modal.querySelector('.modal-body');
  const btnConfirm = modal.querySelector('.btn-confirm');

  if (msgEl) msgEl.textContent = message;
  if (btnConfirm) {
    btnConfirm.textContent = confirmText;
    // Clonar para remover listeners anteriores
    const newBtn = btnConfirm.cloneNode(true);
    btnConfirm.replaceWith(newBtn);
    newBtn.addEventListener('click', () => {
      onConfirm();
      closeModal('confirmModal');
    });
  }

  openModal('confirmModal');
}

// ═══════════════════════════════════════════════════════════════
// FORMULARIOS
// ═══════════════════════════════════════════════════════════════

function initForms() {
  // Validación en tiempo real
  document.addEventListener('input', (e) => {
    if (e.target.matches('.input[data-validate]')) {
      validateField(e.target);
    }
  });

  // Form submit de cobranza
  const formCobro = document.getElementById('formCobro');
  if (formCobro) {
    formCobro.addEventListener('submit', (e) => {
      e.preventDefault();
      handleCobroSubmit(formCobro);
    });
  }

  // Form submit de seguimiento
  const formSeguimiento = document.getElementById('formSeguimiento');
  if (formSeguimiento) {
    formSeguimiento.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSeguimientoSubmit(formSeguimiento);
    });
  }
}

function validateField(input) {
  const rule = input.dataset.validate;
  const value = input.value.trim();

  input.classList.remove('input-valid', 'input-error');

  if (!value) return;

  let valid = true;
  switch (rule) {
    case 'required':
      valid = value.length > 0;
      break;
    case 'email':
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      break;
    case 'phone':
      valid = /^\+?[0-9]{7,15}$/.test(value.replace(/[^\d+]/g, ''));
      break;
    case 'currency':
      valid = /^[0-9]+$/.test(value) && parseInt(value) > 0;
      break;
  }

  input.classList.add(valid ? 'input-valid' : 'input-error');
}

function handleCobroSubmit(form) {
  const data = Object.fromEntries(new FormData(form));

  const result = cobrosStore.add(data);
  if (result.success) {
    showToast('Cobranza registrada', 'success');
    form.reset();
    renderCobros();
  } else {
    showToast(result.errors?.join(', ') || result.error || 'Error al guardar', 'error');
  }
}

function handleSeguimientoSubmit(form) {
  const data = Object.fromEntries(new FormData(form));

  const result = seguimiento.add(data);
  if (result.success) {
    showToast('Seguimiento registrado', 'success');
    form.reset();
    renderSeguimiento();
  } else {
    showToast(result.errors?.join(', ') || 'Error al guardar', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDERS DINÁMICOS
// ═══════════════════════════════════════════════════════════════

function renderDynamicSections() {
  renderCobros();
  renderKPIs();
  renderSeguimiento();
  renderChecklist();
}

// ─── Cobranzas ───
function renderCobros() {
  const container = document.getElementById('cobrosTableBody');
  if (!container) return;

  const records = cobrosStore.getAll();

  if (records.length === 0) {
    container.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:32px">Sin cobranzas registradas</td></tr>`;
    return;
  }

  // Ordenar por fecha desc
  const sorted = cobrosStore.sort(records, 'fechaCreacion', 'desc');

  container.innerHTML = sorted.map(r => `
    <tr data-id="${r.id}">
      <td>${r.escuela || '-'}</td>
      <td>${r.curso || '-'}</td>
      <td>${r.familia || '-'}</td>
      <td>${r.cantidad || 0}</td>
      <td>$${(r.total || 0).toLocaleString('es-AR')}</td>
      <td>
        <span class="badge ${r.estado === 'pagado' ? 'badge-success' : 'badge-warning'}">
          ${r.estado === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}
        </span>
      </td>
      <td>${r.metodoPago || '-'}</td>
      <td>
        <button class="btn btn-xs btn-ghost" onclick="app.toggleCobroEstado('${r.id}')" title="Cambiar estado">
          ${r.estado === 'pagado' ? '↩️' : '✅'}
        </button>
        <button class="btn btn-xs btn-ghost" onclick="app.deleteCobro('${r.id}')" title="Eliminar" style="color:var(--danger)">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Actualizar stats de la sección
  const statsContainer = document.getElementById('cobrosStats');
  if (statsContainer) {
    const stats = cobrosStore.getStats();
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total facturado</div>
        <div class="stat-value">$${stats.totalMonto.toLocaleString('es-AR')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cobrado</div>
        <div class="stat-value text-success">$${stats.montoCobrado.toLocaleString('es-AR')}</div>
        <div class="stat-sub">${stats.porcentajeCobrado}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pendiente</div>
        <div class="stat-value text-danger">$${stats.montoPendiente.toLocaleString('es-AR')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Packs vendidos</div>
        <div class="stat-value">${stats.totalPacks}</div>
      </div>
    `;
  }
}

// ─── KPIs ───
function renderKPIs() {
  const container = document.getElementById('kpisContainer');
  if (!container) return;

  const dashboard = kpis.getDashboard();

  container.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Facturación bruta</div>
        <div class="stat-value">$${dashboard.facturado.toLocaleString('es-AR')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ingreso neto</div>
        <div class="stat-value">$${dashboard.ingresoNeto.toLocaleString('es-AR')}</div>
        <div class="stat-sub">Canon: $${dashboard.canon.toLocaleString('es-AR')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ganancia</div>
        <div class="stat-value ${dashboard.ganancia >= 0 ? 'text-success' : 'text-danger'}">
          $${dashboard.ganancia.toLocaleString('es-AR')}
        </div>
        <div class="stat-sub">Margen: ${dashboard.margenNeto}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Escuelas activas</div>
        <div class="stat-value">${dashboard.escuelasActivas}</div>
        <div class="stat-sub">${dashboard.packsPromedioPorEscuela} packs/esc</div>
      </div>
    </div>
  `;
}

// ─── Seguimiento ───
function renderSeguimiento() {
  const container = document.getElementById('seguimientoList');
  if (!container) return;

  const records = seguimiento.getAll();
  const abiertos = records.filter(r => r.estado !== 'resuelto');

  if (abiertos.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <h3>Sin pendientes</h3>
      <p>No hay registros de seguimiento abiertos.</p>
    </div>`;
    return;
  }

  container.innerHTML = abiertos.map(r => {
    const badges = {
      ausente: 'badge-danger',
      retoma: 'badge-warning',
      pendiente: 'badge-accent'
    };
    const statusBadges = {
      abierto: 'badge-danger',
      agendado: 'badge-warning',
      resuelto: 'badge-success'
    };

    return `
      <div class="card" data-id="${r.id}">
        <div class="card-body" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <strong>${r.escuela}</strong> ${r.curso ? `· ${r.curso}` : ''}
            <div style="margin-top:4px">
              <span class="badge ${badges[r.tipo] || 'badge-neutral'}">${r.tipo}</span>
              <span class="badge ${statusBadges[r.estado] || 'badge-neutral'}">${r.estado}</span>
              ${r.cantidad ? `<span class="badge badge-neutral">${r.cantidad} alumnos</span>` : ''}
            </div>
            ${r.notas ? `<p class="text-muted" style="margin-top:8px;font-size:13px">${r.notas}</p>` : ''}
          </div>
          <div style="display:flex;gap:4px">
            ${r.estado !== 'resuelto' ? `<button class="btn btn-xs btn-success" onclick="app.resolverSeguimiento('${r.id}')">✓ Resolver</button>` : ''}
            <button class="btn btn-xs btn-ghost" onclick="app.deleteSeguimiento('${r.id}')" style="color:var(--danger)">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Checklist ───
function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  if (!container) return;

  const jornada = checklistStore.getJornadaActiva();
  if (!jornada) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>Sin jornada activa</h3>
        <p>Creá una nueva jornada para empezar el checklist.</p>
        <button class="btn btn-primary" onclick="app.nuevaJornada()">Nueva jornada</button>
      </div>
    `;
    return;
  }

  const progreso = checklistStore.getProgresoGlobal();
  const porCategoria = checklistStore.getProgresoPorCategoria();

  let html = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <strong>${jornada.escuela}</strong>
            <span class="text-muted"> · ${jornada.fecha}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="badge badge-accent">${progreso.completados}/${progreso.total}</span>
            <span class="stat-sub">${progreso.porcentaje}%</span>
          </div>
        </div>
        <div class="progress mt-8">
          <div class="progress-bar ${progreso.porcentaje === 100 ? 'progress-bar-success' : ''}" style="width:${progreso.porcentaje}%"></div>
        </div>
      </div>
    </div>
  `;

  porCategoria.forEach(cat => {
    html += `<div class="checklist-category-header">${cat.categoria} (${cat.completados}/${cat.total})</div>`;

    const items = checklistStore.getItems(cat.categoria);
    items.forEach(item => {
      html += `
        <div class="checklist-item ${item.completado ? 'completed' : ''}" onclick="app.toggleCheckItem('${item.id}')">
          <div class="checklist-check">${item.completado ? '✓' : ''}</div>
          <span class="checklist-icon">${item.icon}</span>
          <span class="checklist-label">${item.label}</span>
        </div>
      `;
    });
  });

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// CONNECT LISTENERS (reactividad entre módulos)
// ═══════════════════════════════════════════════════════════════

function connectListeners() {
  // Cuando cambian cobros → re-render tabla y KPIs
  cobrosStore.onChange(() => {
    renderCobros();
    renderKPIs();
  });

  // Cuando cambia checklist → re-render
  checklistStore.onChange(() => {
    renderChecklist();
  });

  // Cuando cambia seguimiento → re-render
  seguimiento.onChange(() => {
    renderSeguimiento();
  });

  // Al cambiar de sección, re-render de la sección destino
  navigation.onSectionChange((section) => {
    switch (section) {
      case 'cobranzas': renderCobros(); break;
      case 'kpis': renderKPIs(); break;
      case 'seguimiento': renderSeguimiento(); break;
      case 'checklist': renderChecklist(); break;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// BACKUP CHECK AL INICIAR
// ═══════════════════════════════════════════════════════════════

function checkBackupOnStart() {
  const status = storage.getBackupStatus();
  if (status.needsBackup) {
    showToast(`Último respaldo: ${status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleDateString('es-AR') : 'nunca'}. Recomendamos respaldar.`, 'warning', 5000);
  }
}

// ═══════════════════════════════════════════════════════════════
// API GLOBAL (para onclick en HTML)
// ═══════════════════════════════════════════════════════════════

function exposeGlobalAPI() {
  window.app = {
    version: APP_VERSION,

    // Navegación
    showSection: (s) => navigation.showSection(s),
    switchWorkspace: (w) => navigation.switchWorkspace(w),
    goHome: () => navigation.goHome(),
    toggleSidebar: () => navigation.toggleSidebar(),

    // Theme
    toggleTheme,

    // Toast
    showToast,

    // Modal
    openModal,
    closeModal,
    confirmDialog,

    // Cobranzas
    toggleCobroEstado: (id) => {
      const cobro = cobrosStore.getById(id);
      if (!cobro) return;
      const nuevoEstado = cobro.estado === 'pagado' ? 'pendiente' : 'pagado';
      cobrosStore.cambiarEstado(id, nuevoEstado);
    },
    deleteCobro: (id) => {
      confirmDialog('¿Eliminar esta cobranza?', () => {
        cobrosStore.delete(id);
        showToast('Cobranza eliminada', 'success');
      });
    },
    exportCobros: () => cobrosStore.downloadExport(),

    // Checklist
    nuevaJornada: () => {
      const nombre = prompt('Nombre de la escuela:');
      if (nombre) {
        checklistStore.crearJornada(nombre);
        showToast('Jornada creada', 'success');
      }
    },
    toggleCheckItem: (id) => {
      checklistStore.toggle(id);
    },
    completarJornada: () => {
      confirmDialog('¿Completar y archivar esta jornada?', () => {
        checklistStore.completarJornada();
        showToast('Jornada archivada', 'success');
      });
    },

    // Seguimiento
    resolverSeguimiento: (id) => {
      seguimiento.resolver(id);
      showToast('Marcado como resuelto', 'success');
    },
    deleteSeguimiento: (id) => {
      confirmDialog('¿Eliminar este registro?', () => {
        seguimiento.delete(id);
        showToast('Eliminado', 'success');
      });
    },

    // Storage / Backup
    createBackup: () => {
      const result = storage.createBackup('Manual');
      if (result.success) showToast('Respaldo creado', 'success');
      else showToast('Error al crear respaldo', 'error');
    },
    exportAll: () => storage.downloadExport(),
    importFromFile: async () => {
      const result = await storage.importFromFile({ merge: true });
      if (result.success) {
        showToast(`Importados ${result.imported} registros`, 'success');
        // Recargar todos los stores
        cobrosStore.reload();
        checklistStore.reload();
        seguimiento.reload();
        renderDynamicSections();
      } else {
        showToast(result.error || 'Error al importar', 'error');
      }
    },

    // Acceso directo a módulos (debugging)
    _storage: storage,
    _navigation: navigation,
    _cobros: cobrosStore,
    _checklist: checklistStore,
    _seguimiento: seguimiento,
    _kpis: kpis,
    _fotografia: fotografia
  };
}

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
