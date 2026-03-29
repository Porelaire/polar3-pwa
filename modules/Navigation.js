/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * Módulo de Navegación
 *
 * Controla: workspaces, secciones, sidebar, mobile tabbar,
 * breadcrumb, hash routing y redirecciones de secciones deprecadas.
 *
 * Uso:
 *   import { navigation } from './modules/Navigation.js';
 *   navigation.init();
 *   navigation.showSection('cobranzas');
 *   navigation.switchWorkspace('comercial');
 */

import {
  SECTION_MAP,
  SECTION_SPACES,
  WORKSPACE_DEFAULTS,
  WORKSPACE_LABELS,
  WORKSPACES,
  DEPRECATED_SECTION_REDIRECTS,
  STORAGE_KEYS,
  UI
} from '../config.js';

import { storage } from './Storage.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO INTERNO
// ═══════════════════════════════════════════════════════════════

/** @type {string} Workspace activo: 'operativo' | 'comercial' */
let currentWorkspace = 'operativo';

/** @type {string} Sección activa (key de SECTION_MAP) */
let currentSection = 'inicio';

/** @type {boolean} Sidebar abierto en mobile */
let sidebarOpen = false;

/** @type {Set<Function>} Listeners de cambio de sección */
const sectionListeners = new Set();

/** @type {Set<Function>} Listeners de cambio de workspace */
const workspaceListeners = new Set();

// ═══════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class NavigationManager {

  // ─────────────────────────────────────────────────────────────
  // INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────

  /**
   * Inicializa el sistema de navegación.
   * Restaura workspace y sección desde localStorage, bindea eventos.
   */
  init() {
    // Restaurar workspace guardado
    const savedWorkspace = storage.getItem(STORAGE_KEYS.workspace, 'operativo');
    currentWorkspace = WORKSPACES.includes(savedWorkspace) ? savedWorkspace : 'operativo';

    // Restaurar última sección (con fallback y validación)
    const savedSection = storage.getItem(STORAGE_KEYS.lastSection, null);
    const resolvedSection = this._resolveSection(savedSection);
    currentSection = resolvedSection;

    // Bindear eventos del DOM
    this._bindSidebar();
    this._bindNavLinks();
    this._bindMobileTabbar();
    this._bindHashChange();
    this._bindKeyboard();

    // Aplicar estado inicial
    this._applyWorkspace(currentWorkspace);
    this.showSection(currentSection, { saveState: false, animate: false });

    // Verificar si hay hash en la URL
    this._handleHashOnLoad();

    console.log(`[Nav] Inicializado: workspace=${currentWorkspace}, section=${currentSection}`);
  }

  // ─────────────────────────────────────────────────────────────
  // WORKSPACES
  // ─────────────────────────────────────────────────────────────

  /**
   * Cambia el workspace activo.
   * @param {string} workspace - 'operativo' | 'comercial'
   */
  switchWorkspace(workspace) {
    if (!WORKSPACES.includes(workspace)) {
      console.warn(`[Nav] Workspace inválido: ${workspace}`);
      return;
    }

    if (workspace === currentWorkspace) return;

    currentWorkspace = workspace;
    storage.setItem(STORAGE_KEYS.workspace, workspace);

    // Aplicar visibilidad de nav items
    this._applyWorkspace(workspace);

    // Si la sección actual no pertenece al nuevo workspace, redirigir
    const allowed = SECTION_SPACES[currentSection];
    if (!allowed || !allowed.includes(workspace)) {
      const defaultSection = WORKSPACE_DEFAULTS[workspace] || 'inicio';
      this.showSection(defaultSection);
    }

    // Notificar listeners
    workspaceListeners.forEach(fn => {
      try { fn(workspace); } catch (e) { console.error('[Nav] Listener error:', e); }
    });

    console.log(`[Nav] Workspace → ${workspace}`);
  }

  /**
   * @returns {string} Workspace activo
   */
  getWorkspace() {
    return currentWorkspace;
  }

  /**
   * @returns {string} Label legible del workspace activo
   */
  getWorkspaceLabel() {
    return WORKSPACE_LABELS[currentWorkspace] || currentWorkspace;
  }

  // ─────────────────────────────────────────────────────────────
  // SECCIONES
  // ─────────────────────────────────────────────────────────────

  /**
   * Muestra una sección y oculta las demás.
   * @param {string} sectionKey - Key de SECTION_MAP (ej: 'cobranzas')
   * @param {Object} [opts]
   * @param {boolean} [opts.saveState=true] - Persistir en localStorage
   * @param {boolean} [opts.animate=true] - Aplicar animación de entrada
   * @param {boolean} [opts.updateHash=true] - Actualizar hash de la URL
   * @param {boolean} [opts.closeSidebar=true] - Cerrar sidebar en mobile
   */
  showSection(sectionKey, opts = {}) {
    const {
      saveState = true,
      animate = true,
      updateHash = true,
      closeSidebar = true
    } = opts;

    // Resolver redirecciones
    const resolved = this._resolveSection(sectionKey);
    if (!resolved) {
      console.warn(`[Nav] Sección desconocida: ${sectionKey}`);
      return;
    }

    // Verificar permisos de workspace
    const allowed = SECTION_SPACES[resolved];
    if (allowed && !allowed.includes(currentWorkspace)) {
      console.warn(`[Nav] Sección "${resolved}" no disponible en workspace "${currentWorkspace}"`);
      return;
    }

    const domId = SECTION_MAP[resolved];
    if (!domId) {
      console.warn(`[Nav] Sin DOM id para sección: ${resolved}`);
      return;
    }

    const targetEl = document.getElementById(domId);
    if (!targetEl) {
      console.warn(`[Nav] Elemento no encontrado: #${domId}`);
      return;
    }

    const previousSection = currentSection;
    currentSection = resolved;

    // Ocultar todas las secciones
    document.querySelectorAll('.section.active').forEach(el => {
      el.classList.remove('active');
    });

    // Mostrar la nueva
    targetEl.classList.add('active');

    // Animación
    if (animate) {
      targetEl.style.animation = 'none';
      // Force reflow
      void targetEl.offsetHeight;
      targetEl.style.animation = '';
    }

    // Scroll al top
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo(0, 0);

    // Actualizar nav activa
    this._updateActiveNav(resolved);

    // Actualizar topbar
    this._updateTopbar(resolved);

    // Persistir
    if (saveState) {
      storage.setItem(STORAGE_KEYS.lastSection, resolved);
    }

    // Hash
    if (updateHash && resolved !== 'inicio') {
      history.replaceState(null, '', `#${resolved}`);
    } else if (updateHash && resolved === 'inicio') {
      history.replaceState(null, '', window.location.pathname);
    }

    // Cerrar sidebar mobile
    if (closeSidebar && sidebarOpen) {
      this.closeSidebar();
    }

    // Notificar
    sectionListeners.forEach(fn => {
      try { fn(resolved, previousSection); } catch (e) { console.error('[Nav] Listener error:', e); }
    });

    console.log(`[Nav] Sección → ${resolved}`);
  }

  /**
   * @returns {string} Sección activa
   */
  getSection() {
    return currentSection;
  }

  /**
   * Verifica si una sección está activa.
   * @param {string} sectionKey
   * @returns {boolean}
   */
  isActive(sectionKey) {
    return currentSection === sectionKey;
  }

  /**
   * Devuelve las secciones visibles en el workspace actual.
   * @returns {string[]}
   */
  getAvailableSections() {
    return Object.keys(SECTION_SPACES).filter(key => {
      const spaces = SECTION_SPACES[key];
      return spaces && spaces.includes(currentWorkspace);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────────────────────

  /** Abre el sidebar (mobile drawer) */
  openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (!sidebar) return;

    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('visible');
    sidebarOpen = true;

    // ARIA
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');

    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
  }

  /** Cierra el sidebar (mobile drawer) */
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (!sidebar) return;

    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
    sidebarOpen = false;

    // ARIA
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');

    // Restaurar scroll
    document.body.style.overflow = '';
  }

  /** Toggle del sidebar */
  toggleSidebar() {
    sidebarOpen ? this.closeSidebar() : this.openSidebar();
  }

  /**
   * @returns {boolean}
   */
  isSidebarOpen() {
    return sidebarOpen;
  }

  // ─────────────────────────────────────────────────────────────
  // NAV GROUPS (acordeón en sidebar)
  // ─────────────────────────────────────────────────────────────

  /**
   * Toggle de un grupo de navegación (acordeón).
   * @param {HTMLElement} headerEl - El .nav-group-header clickeado
   */
  toggleGroup(headerEl) {
    const group = headerEl.closest('.nav-group');
    if (!group) return;

    const wasOpen = group.classList.contains('open');

    // Cerrar todos los grupos del mismo nivel
    const parent = group.parentElement;
    if (parent) {
      parent.querySelectorAll(':scope > .nav-group.open').forEach(g => {
        g.classList.remove('open');
      });
    }

    // Si estaba cerrado, abrir
    if (!wasOpen) {
      group.classList.add('open');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EVENTOS (suscripción)
  // ─────────────────────────────────────────────────────────────

  /**
   * Registra un listener de cambio de sección.
   * @param {Function} fn - (newSection, previousSection) => void
   * @returns {Function} Función para desuscribirse
   */
  onSectionChange(fn) {
    sectionListeners.add(fn);
    return () => sectionListeners.delete(fn);
  }

  /**
   * Registra un listener de cambio de workspace.
   * @param {Function} fn - (newWorkspace) => void
   * @returns {Function} Función para desuscribirse
   */
  onWorkspaceChange(fn) {
    workspaceListeners.add(fn);
    return () => workspaceListeners.delete(fn);
  }

  // ─────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Resuelve una sección: si es deprecada la redirige,
   * si no existe devuelve el default del workspace.
   * @param {string|null} sectionKey
   * @returns {string}
   * @private
   */
  _resolveSection(sectionKey) {
    if (!sectionKey) {
      return WORKSPACE_DEFAULTS[currentWorkspace] || 'inicio';
    }

    // Redirección de secciones deprecadas
    if (DEPRECATED_SECTION_REDIRECTS[sectionKey]) {
      const redirected = DEPRECATED_SECTION_REDIRECTS[sectionKey];
      console.log(`[Nav] Redirigiendo "${sectionKey}" → "${redirected}"`);
      return redirected;
    }

    // Verificar que exista en el mapa
    if (SECTION_MAP[sectionKey]) {
      return sectionKey;
    }

    // Fallback
    console.warn(`[Nav] Sección "${sectionKey}" no existe, usando default`);
    return WORKSPACE_DEFAULTS[currentWorkspace] || 'inicio';
  }

  /**
   * Aplica visibilidad de items de nav según workspace.
   * Muestra/oculta items con data-workspace.
   * @param {string} workspace
   * @private
   */
  _applyWorkspace(workspace) {
    // Toggle botón activo del workspace switcher
    document.querySelectorAll('[data-workspace-btn]').forEach(btn => {
      const ws = btn.getAttribute('data-workspace-btn');
      btn.classList.toggle('active', ws === workspace);
    });

    // Mostrar/ocultar items de nav según workspace
    document.querySelectorAll('[data-section]').forEach(el => {
      const sectionKey = el.getAttribute('data-section');
      const spaces = SECTION_SPACES[sectionKey];
      if (spaces) {
        const visible = spaces.includes(workspace);
        // Buscar el contenedor más cercano (li o nav-group)
        const container = el.closest('.nav-group') || el.closest('li') || el;
        container.style.display = visible ? '' : 'none';
      }
    });

    // Actualizar label en topbar si existe
    const wsLabel = document.getElementById('workspaceLabel');
    if (wsLabel) {
      wsLabel.textContent = WORKSPACE_LABELS[workspace] || workspace;
    }
  }

  /**
   * Marca el nav link activo en sidebar.
   * @param {string} sectionKey
   * @private
   */
  _updateActiveNav(sectionKey) {
    // Quitar active de todos
    document.querySelectorAll('.nav-item-direct.active, .nav-sub li a.active').forEach(el => {
      el.classList.remove('active');
    });

    // Buscar el link correspondiente y activar
    const link = document.querySelector(`[data-section="${sectionKey}"]`);
    if (link) {
      link.classList.add('active');

      // Si está dentro de un nav-group, abrirlo
      const group = link.closest('.nav-group');
      if (group && !group.classList.contains('open')) {
        group.classList.add('open');
      }
    }

    // Actualizar mobile tabbar si existe
    this._updateMobileTabbar(sectionKey);
  }

  /**
   * Actualiza título y breadcrumb del topbar.
   * @param {string} sectionKey
   * @private
   */
  _updateTopbar(sectionKey) {
    const titleEl = document.getElementById('topbarTitle');
    const breadcrumbEl = document.getElementById('topbarBreadcrumb');

    // Buscar el label desde el nav link
    const link = document.querySelector(`[data-section="${sectionKey}"]`);
    const label = link ? link.textContent.trim() : sectionKey;

    if (titleEl) {
      titleEl.textContent = label;
    }

    if (breadcrumbEl) {
      const wsLabel = WORKSPACE_LABELS[currentWorkspace] || currentWorkspace;
      breadcrumbEl.innerHTML = `${wsLabel} <span style="margin:0 6px;opacity:0.4">›</span> ${label}`;
    }
  }

  /**
   * Actualiza el estado activo del mobile tabbar.
   * @param {string} sectionKey
   * @private
   */
  _updateMobileTabbar(sectionKey) {
    document.querySelectorAll('.mobile-tabbar-btn').forEach(btn => {
      const target = btn.getAttribute('data-section') || btn.getAttribute('data-tab');
      btn.classList.toggle('active', target === sectionKey);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BINDINGS DE EVENTOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Bindea toggle del sidebar (hamburger) y overlay.
   * @private
   */
  _bindSidebar() {
    // Botón hamburger
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSidebar();
      });
    }

    // Overlay para cerrar
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeSidebar());
    }
  }

  /**
   * Bindea todos los links de navegación.
   * Soporta: data-section, nav-group-header, data-workspace-btn.
   * @private
   */
  _bindNavLinks() {
    // Links directos a secciones
    document.addEventListener('click', (e) => {
      // Link a sección
      const sectionLink = e.target.closest('[data-section]');
      if (sectionLink) {
        e.preventDefault();
        const key = sectionLink.getAttribute('data-section');
        this.showSection(key);
        return;
      }

      // Header de nav group (acordeón)
      const groupHeader = e.target.closest('.nav-group-header');
      if (groupHeader) {
        e.preventDefault();
        this.toggleGroup(groupHeader);
        return;
      }

      // Botón de workspace
      const wsBtn = e.target.closest('[data-workspace-btn]');
      if (wsBtn) {
        e.preventDefault();
        const ws = wsBtn.getAttribute('data-workspace-btn');
        this.switchWorkspace(ws);
        return;
      }
    });
  }

  /**
   * Bindea botones del mobile tabbar.
   * @private
   */
  _bindMobileTabbar() {
    document.querySelectorAll('.mobile-tabbar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-section') || btn.getAttribute('data-tab');
        if (target === 'menu') {
          this.toggleSidebar();
        } else if (target) {
          this.showSection(target);
        }
      });
    });
  }

  /**
   * Maneja cambios de hash en la URL.
   * @private
   */
  _bindHashChange() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== currentSection) {
        this.showSection(hash, { updateHash: false });
      }
    });
  }

  /**
   * Si la página carga con un hash, navegar a esa sección.
   * @private
   */
  _handleHashOnLoad() {
    const hash = window.location.hash.replace('#', '');
    if (hash && SECTION_MAP[hash]) {
      this.showSection(hash, { saveState: true, updateHash: false });
    }
  }

  /**
   * Keyboard shortcuts globales.
   * Escape cierra sidebar/modales.
   * @private
   */
  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Escape → cerrar sidebar
      if (e.key === 'Escape' && sidebarOpen) {
        this.closeSidebar();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────

  /**
   * Navega a la sección default del workspace actual.
   */
  goHome() {
    const home = WORKSPACE_DEFAULTS[currentWorkspace] || 'inicio';
    this.showSection(home);
  }

  /**
   * Devuelve info de estado para debugging / export.
   * @returns {Object}
   */
  getState() {
    return {
      workspace: currentWorkspace,
      section: currentSection,
      sidebarOpen,
      availableSections: this.getAvailableSections()
    };
  }

  /**
   * Fuerza re-render de la navegación (útil post-import de datos).
   */
  refresh() {
    this._applyWorkspace(currentWorkspace);
    this._updateActiveNav(currentSection);
    this._updateTopbar(currentSection);
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const navigation = new NavigationManager();

export default navigation;
