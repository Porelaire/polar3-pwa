/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * Fotografía — Workflows y contenido por etapa
 *
 * Módulo de referencia para las etapas del flujo fotográfico.
 * Provee contenido, tips y guías por stage para la sección educativa.
 * También gestiona el board de escuelas (pipeline visual).
 *
 * Uso:
 *   import { fotografia } from './modules/Business/Fotografia.js';
 *   const etapas = fotografia.getEtapas();
 *   const tips = fotografia.getTips('captura');
 */

import { storage } from '../Storage.js';
import { PHOTOGRAPHY_STAGES, STORAGE_KEYS } from '../../config.js';

// ═══════════════════════════════════════════════════════════════
// CONTENIDO POR ETAPA
// ═══════════════════════════════════════════════════════════════

const ETAPA_CONTENT = {
  captura: {
    titulo: 'Captura',
    icon: '📷',
    descripcion: 'Toma fotográfica en el jardín/escuela.',
    tips: [
      'Configurar ISO 200-400, apertura f/4-5.6 para retratos nítidos',
      'White balance manual según la luz del salón',
      'Mantener velocidad mín. 1/125 para evitar movimiento',
      'Usar fondo gris portátil para consistencia',
      'Disparar RAW siempre',
      'Marcar la posición del alumno con cinta en el piso',
      'Verificar enfoque en ojos después de cada tanda'
    ],
    equipamiento: [
      'Cámara DSLR/Mirrorless',
      'Lente 85mm f/1.8 o 50mm f/1.4',
      'Flash speedlite + difusor',
      'Fondo gris plegable + soporte',
      'Tarjetas SD (x2 mínimo)',
      'Baterías de repuesto'
    ]
  },
  iluminacion: {
    titulo: 'Iluminación',
    icon: '💡',
    descripcion: 'Setup de luces para retrato escolar.',
    tips: [
      'Luz principal: 45° lateral, ligeramente por encima',
      'Fill light o reflector para rellenar sombras',
      'Evitar sombras duras debajo de nariz/mentón',
      'Si usás flash: difusor siempre, potencia 1/4 a 1/8',
      'Con ventanales: usar como key light + reflector de relleno',
      'Verificar que no haya reflejos en anteojos'
    ],
    equipamiento: [
      'Flash principal + stand',
      'Softbox o paraguas',
      'Reflector plegable 5-en-1',
      'Flash secundario (opcional)',
      'Disparador/trigger inalámbrico'
    ]
  },
  lightroom: {
    titulo: 'Lightroom (Post)',
    icon: '🎨',
    descripcion: 'Revelado digital y corrección de color.',
    tips: [
      'Crear catálogo por escuela/jornada',
      'Aplicar perfil de cámara como base',
      'Preset de revelado Polar3: WB, exposure, contrast',
      'Sync settings después de ajustar la primera foto',
      'Exportar a Photoshop solo las seleccionadas',
      'Naming convention: Escuela_Curso_Alumno_001.jpg'
    ],
    equipamiento: [
      'Lightroom Classic',
      'Monitor calibrado (sRGB mín.)',
      'Preset Polar3 instalado'
    ]
  },
  photoshop: {
    titulo: 'Photoshop (Retoque)',
    icon: '🖌️',
    descripcion: 'Retoque fino y automatización con Panel Polar3.',
    tips: [
      'Ejecutar Action de AutoRecorte para biométricas',
      'Fondo gris via script (claro/medio/oscuro según skin tone)',
      'Retoque suave: no alterar la identidad del niño',
      'Panel Polar3: usar módulo post-proceso para Color y Efectos',
      'Modo lote para volumen (Action + Batch)',
      'Verificar recorte en preview antes de guardar'
    ],
    equipamiento: [
      'Photoshop CS6+ / CC',
      'Panel Polar3 instalado',
      'Actions de AutoRecorte y Fondo Gris'
    ]
  },
  montaje: {
    titulo: 'Montaje',
    icon: '📐',
    descripcion: 'Armado de carpetas, tiras carnet e impresos.',
    tips: [
      'Template de carpeta 20×30 con márgenes de seguridad',
      'Tira carnet: 4 fotos 4×4cm, verificar DPI (300 mín.)',
      'Verificar nombre del alumno vs foto',
      'Color profile: sRGB para impresión digital',
      'Guardar con naming consistente para imprenta'
    ],
    equipamiento: [
      'Templates PSD de carpeta',
      'Template tira carnet',
      'Action de montaje automático'
    ]
  },
  imprenta: {
    titulo: 'Imprenta',
    icon: '🖨️',
    descripcion: 'Envío a imprenta y control de calidad.',
    tips: [
      'Verificar resolución 300 DPI antes de enviar',
      'sRGB para impresión digital, CMYK solo si lo piden',
      'Enviar prueba de color antes del lote completo',
      'Solicitar muestra de papel (brillo, mate, semigloss)',
      'Verificar tamaños: 20×30, 13×18, 10×15, carnet',
      'Control de calidad visual al recibir: color, corte, manchas'
    ],
    equipamiento: [
      'Proveedor de impresión calibrado',
      'Muestras de referencia'
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class FotografiaManager {

  // ─────────────────────────────────────────────────────────────
  // CONTENIDO POR ETAPA
  // ─────────────────────────────────────────────────────────────

  /**
   * Devuelve todas las etapas con su contenido.
   * @returns {Array<{key: string, titulo: string, icon: string, descripcion: string}>}
   */
  getEtapas() {
    return Object.entries(PHOTOGRAPHY_STAGES).map(([key, titulo]) => {
      const content = ETAPA_CONTENT[key] || {};
      return {
        key,
        titulo,
        icon: content.icon || '📋',
        descripcion: content.descripcion || ''
      };
    });
  }

  /**
   * Contenido completo de una etapa.
   * @param {string} etapaKey
   * @returns {Object|null}
   */
  getEtapaDetalle(etapaKey) {
    const content = ETAPA_CONTENT[etapaKey];
    if (!content) return null;

    return {
      key: etapaKey,
      ...content
    };
  }

  /**
   * Tips de una etapa.
   * @param {string} etapaKey
   * @returns {string[]}
   */
  getTips(etapaKey) {
    return ETAPA_CONTENT[etapaKey]?.tips || [];
  }

  /**
   * Equipamiento de una etapa.
   * @param {string} etapaKey
   * @returns {string[]}
   */
  getEquipamiento(etapaKey) {
    return ETAPA_CONTENT[etapaKey]?.equipamiento || [];
  }

  // ─────────────────────────────────────────────────────────────
  // SCHOOL BOARD (pipeline de escuelas)
  // ─────────────────────────────────────────────────────────────

  /**
   * Obtiene el board de escuelas.
   * Cada escuela tiene un stage (etapa en la que está).
   * @returns {Object} { columns: {...stages}, cards: [...] }
   */
  getBoard() {
    const saved = storage.getItem(STORAGE_KEYS.schoolBoard, null);
    if (saved) return saved;

    // Board vacío con columnas predefinidas
    const columns = {};
    Object.entries(PHOTOGRAPHY_STAGES).forEach(([key, label]) => {
      columns[key] = { key, label, cards: [] };
    });

    return { columns, cards: [] };
  }

  /**
   * Agrega una escuela al board.
   * @param {string} escuela
   * @param {string} [etapa='captura'] - Etapa inicial
   * @param {Object} [metadata] - Info adicional (curso, fecha, cantidad, etc.)
   * @returns {{success: boolean, id: string}}
   */
  addToBoard(escuela, etapa = 'captura', metadata = {}) {
    if (!escuela) return { success: false, error: 'Escuela requerida' };
    if (!PHOTOGRAPHY_STAGES[etapa]) return { success: false, error: 'Etapa inválida' };

    const board = this.getBoard();
    const id = `school_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const card = {
      id,
      escuela,
      etapa,
      creadaAt: new Date().toISOString(),
      movidaAt: new Date().toISOString(),
      ...metadata
    };

    if (!board.columns[etapa]) {
      board.columns[etapa] = { key: etapa, label: PHOTOGRAPHY_STAGES[etapa], cards: [] };
    }
    board.columns[etapa].cards.push(id);

    if (!board.cards) board.cards = [];
    board.cards.push(card);

    storage.setItem(STORAGE_KEYS.schoolBoard, board);

    console.log(`[Fotografia] Escuela agregada al board: ${escuela} → ${etapa}`);
    return { success: true, id };
  }

  /**
   * Mueve una escuela a otra etapa.
   * @param {string} cardId
   * @param {string} nuevaEtapa
   * @returns {{success: boolean}}
   */
  moveCard(cardId, nuevaEtapa) {
    if (!PHOTOGRAPHY_STAGES[nuevaEtapa]) return { success: false, error: 'Etapa inválida' };

    const board = this.getBoard();
    const card = board.cards.find(c => c.id === cardId);
    if (!card) return { success: false, error: 'Card no encontrada' };

    const etapaAnterior = card.etapa;

    // Remover de la columna anterior
    if (board.columns[etapaAnterior]) {
      board.columns[etapaAnterior].cards = board.columns[etapaAnterior].cards.filter(id => id !== cardId);
    }

    // Agregar a la nueva columna
    if (!board.columns[nuevaEtapa]) {
      board.columns[nuevaEtapa] = { key: nuevaEtapa, label: PHOTOGRAPHY_STAGES[nuevaEtapa], cards: [] };
    }
    board.columns[nuevaEtapa].cards.push(cardId);

    // Actualizar la card
    card.etapa = nuevaEtapa;
    card.movidaAt = new Date().toISOString();

    storage.setItem(STORAGE_KEYS.schoolBoard, board);

    console.log(`[Fotografia] Card movida: ${cardId} → ${nuevaEtapa}`);
    return { success: true };
  }

  /**
   * Elimina una card del board.
   * @param {string} cardId
   * @returns {{success: boolean}}
   */
  removeFromBoard(cardId) {
    const board = this.getBoard();
    const card = board.cards.find(c => c.id === cardId);
    if (!card) return { success: false, error: 'Card no encontrada' };

    // Remover de la columna
    if (board.columns[card.etapa]) {
      board.columns[card.etapa].cards = board.columns[card.etapa].cards.filter(id => id !== cardId);
    }

    // Remover del array de cards
    board.cards = board.cards.filter(c => c.id !== cardId);

    storage.setItem(STORAGE_KEYS.schoolBoard, board);
    return { success: true };
  }

  /**
   * Stats del board: cuántas escuelas en cada etapa.
   * @returns {Array<{etapa: string, label: string, count: number}>}
   */
  getBoardStats() {
    const board = this.getBoard();
    return Object.entries(PHOTOGRAPHY_STAGES).map(([key, label]) => ({
      etapa: key,
      label,
      count: board.columns[key]?.cards?.length || 0
    }));
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const fotografia = new FotografiaManager();

export default fotografia;
