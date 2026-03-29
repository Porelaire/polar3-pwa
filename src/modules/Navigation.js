/**
 * Navigation.js — Polar[3] PWA v2.7.12
 * Gestión de secciones, workspaces, topbar, sidebar, búsqueda y tabbar móvil.
 * No tiene estado global propio: recibe el estado desde app.js via parámetros
 * o mediante el objeto `nav` exportado.
 */

import {
  sectionMap,
  sectionSpaces,
  workspaceDefaults,
  VALID_WORKSPACES,
  DEPRECATED_SECTION_REDIRECTS,
  SEARCH_EXCLUDED_SECTIONS,
  WORKSPACE_STORAGE_KEY
} from '../config.js';

// ─────────────────────────────────────────────
// ESTADO INTERNO DEL MÓDULO
// ─────────────────────────────────────────────

let currentWorkspace = 'operativo';
let searchIndex = [];
let searchActiveIndex = -1;

// Estado topbar auto-collapse
let lastScrollY = 0;
let topbarCollapsedState = false;
let topbarScrollTicking = false;
let topbarScrollLockUntil = 0;

// Callback inyectado por app.js para persistir cambios de workspace
let _onWorkspaceChange = null;

// ─────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────

/**
 * Inicializa el módulo de navegación.
 * @param {object} opts
 * @param {string} opts.workspace - Workspace inicial ('operativo' | 'comercial')
 * @param {function} opts.onWorkspaceChange - Callback(workspace) cuando cambia el workspace
 */
export function initNavigation({ workspace = 'operativo', onWorkspaceChange = null } = {}) {
  currentWorkspace = VALID_WORKSPACES.includes(workspace) ? workspace : 'operativo';
  _onWorkspaceChange = onWorkspaceChange;
}

// ─────────────────────────────────────────────
// HELPERS DE SECCIÓN
// ─────────────────────────────────────────────

export function sectionIdToKey(sectionId) {
  return Object.keys(sectionMap).find(key => sectionMap[key] === sectionId) || 'inicio';
}

export function spacesForSection(key) {
  return sectionSpaces[key] || ['operativo'];
}

export function sectionBelongsToWorkspace(key, workspace) {
  return spacesForSection(key).includes(workspace);
}

export function resolveSectionTarget(id) {
  return DEPRECATED_SECTION_REDIRECTS[id] || id;
}

export function getActiveSectionKey() {
  return sectionIdToKey(document.querySelector('.section.active')?.id || '');
}

export function getCurrentWorkspace() {
  return currentWorkspace;
}

// ─────────────────────────────────────────────
// SCROLL CONTAINER
// ─────────────────────────────────────────────

export function getScrollContainer() {
  return document.getElementById('main') || document.scrollingElement || document.documentElement;
}

// ─────────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────────

function normalizeWorkspaceLabel(workspace) {
  return workspace.charAt(0).toUpperCase() + workspace.slice(1);
}

function getSectionMeta(key) {
  const section = document.getElementById(sectionMap[key]);
  if (!section) return { title: 'Inicio', kicker: 'Panel principal' };
  const title = section.querySelector('.section-header h1')?.textContent?.trim()
    || (key === 'inicio' ? 'Inicio' : key);
  const kicker = section.querySelector('.breadcrumb')?.textContent?.trim()
    || 'Panel principal';
  return { title, kicker };
}

function updateTopbar(id) {
  const meta = getSectionMeta(id);
  const kicker = document.getElementById('currentSectionKicker');
  const title = document.getElementById('currentSectionTitle');
  const chip = document.getElementById('hashChip');
  if (kicker) kicker.textContent = meta.kicker;
  if (title) title.textContent = meta.title;
  if (chip) chip.textContent = `Ruta: #${id}`;
  document.title = `Polar[3] · ${normalizeWorkspaceLabel(currentWorkspace)} — ${meta.title}`;
}

export function setTopbarCollapsed(collapsed, { force = false } = {}) {
  const next = !!collapsed;
  if (!force && topbarCollapsedState === next) return;
  topbarCollapsedState = next;
  document.body.classList.toggle('topbar-collapsed', next);
  topbarScrollLockUntil = Date.now() + 260;
}

function evaluateTopbarAutoCollapse(currentY) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const sidebarOpen = document.getElementById('sidebar')?.classList.contains('open');
  const hasFocusedField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');

  if (isMobile || sidebarOpen || hasFocusedField) {
    setTopbarCollapsed(false, { force: false });
    lastScrollY = currentY;
    return;
  }

  if (Date.now() < topbarScrollLockUntil) {
    lastScrollY = currentY;
    return;
  }

  const delta = currentY - lastScrollY;

  if (currentY <= 72) {
    setTopbarCollapsed(false, { force: true });
  } else if (!topbarCollapsedState && currentY > 168 && delta > 16) {
    setTopbarCollapsed(true);
  } else if (topbarCollapsedState && delta < -18) {
    setTopbarCollapsed(false, { force: true });
  }

  lastScrollY = currentY;
}

export function handleTopbarAutoCollapse() {
  const scrollHost = getScrollContainer();
  const currentY = scrollHost?.scrollTop || window.scrollY || window.pageYOffset || 0;
  if (topbarScrollTicking) return;
  topbarScrollTicking = true;
  requestAnimationFrame(() => {
    topbarScrollTicking = false;
    evaluateTopbarAutoCollapse(currentY);
  });
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────

export function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('open');
  setTopbarCollapsed(false, { force: true });
}

export function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('open');
}

export function toggleGroup(id) {
  const g = document.getElementById(id);
  if (g) g.classList.toggle('open');
}

function openGroupForSection(id) {
  const node = document.querySelector(`.nav-group [data-section="${id}"]`);
  const group = node?.closest('.nav-group');
  if (group) group.classList.add('open');
}

// ─────────────────────────────────────────────
// TABBAR MÓVIL
// ─────────────────────────────────────────────

export function updateMobileTabbar(activeSection) {
  document.querySelectorAll('[data-mobile-tab]').forEach(btn => {
    const key = btn.dataset.mobileTab;
    const isActive = key !== 'menu' && key === activeSection;
    btn.classList.toggle('active', isActive);
  });
}

// ─────────────────────────────────────────────
// WORKSPACE
// ─────────────────────────────────────────────

function updateWorkspaceMeta() {
  const workspaceChip = document.getElementById('workspaceChip');
  const moduleChip = document.getElementById('moduleCountChip');
  const count = Object.keys(sectionMap).filter(key => sectionBelongsToWorkspace(key, currentWorkspace)).length;
  if (workspaceChip) workspaceChip.textContent = `Espacio: ${normalizeWorkspaceLabel(currentWorkspace)}`;
  if (moduleChip) moduleChip.textContent = `${count} módulos en ${currentWorkspace}`;
}

export function applyWorkspaceState() {
  document.body.dataset.workspace = currentWorkspace;
  document.querySelectorAll('[data-space]').forEach(node => {
    const spaces = (node.dataset.space || '').split(/\s+/).filter(Boolean);
    const visible = !spaces.length || spaces.includes(currentWorkspace);
    if (visible) node.removeAttribute('hidden');
    else node.setAttribute('hidden', 'hidden');
  });
  document.querySelectorAll('.workspace-btn[data-workspace]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.workspace === currentWorkspace);
  });
  updateWorkspaceMeta();
}

function ensureWorkspaceForSection(id) {
  const spaces = spacesForSection(id);
  if (!spaces.includes(currentWorkspace)) {
    currentWorkspace = spaces[0] || 'operativo';
    if (_onWorkspaceChange) _onWorkspaceChange(currentWorkspace);
    applyWorkspaceState();
  }
}

export function switchWorkspace(workspace, preferredSection = null) {
  currentWorkspace = VALID_WORKSPACES.includes(workspace) ? workspace : 'operativo';
  if (_onWorkspaceChange) _onWorkspaceChange(currentWorkspace);
  applyWorkspaceState();
  const currentKey = getActiveSectionKey();
  const target = preferredSection && sectionBelongsToWorkspace(preferredSection, workspace)
    ? preferredSection
    : (sectionBelongsToWorkspace(currentKey, workspace) ? currentKey : workspaceDefaults[workspace]);
  showSection(target);
}

// ─────────────────────────────────────────────
// NAVEGACIÓN PRINCIPAL
// ─────────────────────────────────────────────

export function showSection(id, pushHash = true) {
  id = resolveSectionTarget(id);
  if (!sectionMap[id]) id = 'inicio';
  ensureWorkspaceForSection(id);

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionMap[id]);
  if (target) target.classList.add('active');

  document.querySelectorAll('[data-section]').forEach(a => a.classList.remove('active'));
  document.querySelectorAll(`[data-section="${id}"]`).forEach(a => a.classList.add('active'));

  openGroupForSection(id);
  updateTopbar(id);
  document.body.dataset.section = id;
  setTopbarCollapsed(false, { force: true });
  updateMobileTabbar(id);

  if (pushHash && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);

  const scrollHost = getScrollContainer();
  if (scrollHost && typeof scrollHost.scrollTo === 'function') {
    scrollHost.scrollTo({ top: 0, behavior: 'auto' });
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
  closeSidebar();
  return false;
}

// ─────────────────────────────────────────────
// DEPURACIÓN DE UI DEPRECADA
// ─────────────────────────────────────────────

export function pruneDeprecatedUi() {
  const sectionIdsToRemove = [
    'sec-quien', 'sec-pack', 'sec-compromisos', 'sec-flujo', 'sec-economico',
    'sec-captura', 'sec-iluminacion', 'sec-lightroom', 'sec-photoshop',
    'sec-montaje', 'sec-imprenta', 'sec-archivos', 'sec-roles'
  ];
  sectionIdsToRemove.forEach(id => document.getElementById(id)?.remove());

  ['#grp-presentacion', '#grp-tecnico'].forEach(sel => {
    document.querySelectorAll(sel).forEach(node => node.remove());
  });

  ['flujo', 'economico', 'roles'].forEach(key => {
    document.querySelectorAll(`[data-section="${key}"]`).forEach(node => {
      const wrapper = node.closest('li, .quick-card, .nav-group') || node;
      wrapper.remove();
    });
  });

  document.querySelectorAll('.quick-card').forEach(card => {
    const action = card.getAttribute('onclick') || '';
    if (/showSection\('(quien|flujo)'\)/.test(action)) card.remove();
  });

  document.querySelectorAll('button[onclick], a[onclick]').forEach(node => {
    const action = node.getAttribute('onclick') || '';
    if (action.includes("showSection('flujo')")) {
      node.setAttribute('onclick', "showSection('calendario')");
      if (node.textContent?.trim() === 'Ver flujo completo') node.textContent = 'Ver calendario';
    }
    if (action.includes("showSection('pack')")) {
      node.setAttribute('onclick', "showSection('modalidades')");
      if (node.textContent?.trim() === 'Abrir pack y servicios') node.textContent = 'Abrir modalidades';
    }
    if (action.includes("showSection('compromisos')")) {
      node.setAttribute('onclick', "showSection('institucional')");
      if (node.textContent?.trim() === 'Ver compromisos') node.textContent = 'Ver propuesta base';
    }
    if (action.includes("showSection('archivos')")) {
      node.setAttribute('onclick', "showSection('workspace')");
      if (node.textContent?.trim() === 'Ver estructura de archivos') node.textContent = 'Ver estructura Workspace';
    }
  });
}

// ─────────────────────────────────────────────
// BÚSQUEDA
// ─────────────────────────────────────────────

export function buildSearchIndex() {
  searchIndex = Object.entries(sectionMap)
    .filter(([key]) => !SEARCH_EXCLUDED_SECTIONS.has(key))
    .map(([key, id]) => {
      const section = document.getElementById(id);
      const title = section?.querySelector('.section-header h1')?.textContent?.trim() || key;
      const kicker = section?.querySelector('.breadcrumb')?.textContent?.trim() || 'Panel principal';
      const bodyText = (section?.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        key,
        id,
        title,
        kicker,
        text: bodyText.toLowerCase(),
        preview: bodyText.slice(0, 180)
      };
    });
}

export function renderSearchResults(query) {
  const container = document.getElementById('searchResults');
  if (!container) return;
  const q = query.trim().toLowerCase();
  if (!q) {
    container.hidden = true;
    container.innerHTML = '';
    searchActiveIndex = -1;
    return;
  }

  const results = searchIndex
    .map(entry => {
      const titleHit  = entry.title.toLowerCase().includes(q) ? 5 : 0;
      const kickerHit = entry.kicker.toLowerCase().includes(q) ? 2 : 0;
      const bodyHit   = entry.text.includes(q) ? 1 : 0;
      return { ...entry, score: titleHit + kickerHit + bodyHit };
    })
    .filter(entry => entry.score > 0 && sectionBelongsToWorkspace(entry.key, currentWorkspace))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'es'))
    .slice(0, 8);

  if (!results.length) {
    container.hidden = false;
    container.innerHTML = '<div class="search-empty">No encontré coincidencias. Prueba con "retomas", "canon", "Forms", "QA" o "cooperadora".</div>';
    searchActiveIndex = -1;
    return;
  }

  container.hidden = false;
  container.innerHTML = results.map((entry, idx) => `
    <button class="search-item ${idx === 0 ? 'active' : ''}" type="button" data-search-index="${idx}" data-target="${entry.key}">
      <small>${entry.kicker}</small>
      <strong>${entry.title}</strong>
      <span>${entry.preview}…</span>
    </button>
  `).join('');
  searchActiveIndex = 0;

  container.querySelectorAll('.search-item').forEach(btn => {
    btn.addEventListener('click', () => navigateFromSearch(btn.dataset.target));
  });
}

export function syncSearchActiveItem() {
  const items = [...document.querySelectorAll('.search-item')];
  items.forEach((item, idx) => item.classList.toggle('active', idx === searchActiveIndex));
}

export function navigateFromSearch(target) {
  showSection(target);
  const input = document.getElementById('globalSearch');
  const container = document.getElementById('searchResults');
  if (input) input.value = '';
  if (container) {
    container.hidden = true;
    container.innerHTML = '';
  }
}

// ─────────────────────────────────────────────
// UTILIDADES MENORES
// ─────────────────────────────────────────────

export function toggleAcc(header) {
  if (!header) return;
  const item = header.closest('.faq-item, .accordion-item, .accordion');
  const body = (
    header.nextElementSibling?.classList?.contains('acc-body')
      ? header.nextElementSibling
      : item?.querySelector('.acc-body, .faq-body')
  ) || null;
  const willOpen = !header.classList.contains('open');
  header.classList.toggle('open', willOpen);
  body?.classList.toggle('open', willOpen);
  item?.classList.toggle('open', willOpen);
}

export function printCurrentSection() {
  window.print();
}

// ─────────────────────────────────────────────
// INICIALIZACIÓN DE EVENTOS
// ─────────────────────────────────────────────

/**
 * Conecta todos los listeners de navegación del DOM.
 * Llamar después de que el DOM esté listo.
 */
export function initNavigationEvents() {
  // Links de sección
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', evt => {
      evt.preventDefault();
      showSection(link.dataset.section);
    });
  });

  // Búsqueda global
  const input = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');

  if (input) {
    input.addEventListener('input', () => renderSearchResults(input.value));
    input.addEventListener('keydown', evt => {
      const items = [...document.querySelectorAll('.search-item')];
      if (!items.length) return;
      if (evt.key === 'ArrowDown') {
        evt.preventDefault();
        searchActiveIndex = Math.min(searchActiveIndex + 1, items.length - 1);
        syncSearchActiveItem();
      }
      if (evt.key === 'ArrowUp') {
        evt.preventDefault();
        searchActiveIndex = Math.max(searchActiveIndex - 1, 0);
        syncSearchActiveItem();
      }
      if (evt.key === 'Enter' && searchActiveIndex >= 0) {
        evt.preventDefault();
        navigateFromSearch(items[searchActiveIndex].dataset.target);
      }
      if (evt.key === 'Escape') {
        input.value = '';
        renderSearchResults('');
        input.blur();
      }
    });
  }

  // Cierre del panel de búsqueda al hacer clic fuera
  document.addEventListener('click', evt => {
    if (results && !evt.target.closest('.search-wrap')) {
      results.hidden = true;
    }
  });

  // Atajos de teclado: Ctrl+K y /
  document.addEventListener('keydown', evt => {
    if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'k') {
      evt.preventDefault();
      input?.focus();
      input?.select();
    }
    if (evt.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      evt.preventDefault();
      input?.focus();
    }
  });

  // Hash navigation
  window.addEventListener('hashchange', () => {
    const target = location.hash.replace('#', '') || 'inicio';
    showSection(target, false);
  });

  // Scroll → auto-collapse topbar
  getScrollContainer()?.addEventListener('scroll', handleTopbarAutoCollapse, { passive: true });

  // Resize → reset estado de scroll
  window.addEventListener('resize', () => {
    const host = getScrollContainer();
    lastScrollY = host?.scrollTop || window.scrollY || window.pageYOffset || 0;
    handleTopbarAutoCollapse();
  });

  // Foco en campos: des-colapsar topbar
  document.addEventListener('focusin', evt => {
    if (evt.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(evt.target.tagName)) {
      setTopbarCollapsed(false, { force: true });
    }
  });
}
