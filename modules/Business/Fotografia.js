/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * Fotografia — Workflows y contenido por etapa
 */

import { storage } from '../Storage.js';
import { PHOTOGRAPHY_STAGES, STORAGE_KEYS } from '../../config.js';

const ETAPA_CONTENT = {
  captura: {
    titulo: 'Captura',
    icon: '\u{1F4F7}',
    descripcion: 'Toma fotogr\u00E1fica en el jard\u00EDn/escuela.',
    tips: [
      'Configurar ISO 200-400, apertura f/4-5.6 para retratos n\u00EDtidos',
      'White balance manual seg\u00FAn la luz del sal\u00F3n',
      'Mantener velocidad m\u00EDn. 1/125 para evitar movimiento',
      'Usar fondo gris port\u00E1til para consistencia',
      'Disparar RAW siempre',
      'Marcar la posici\u00F3n del alumno con cinta en el piso',
      'Verificar enfoque en ojos despu\u00E9s de cada tanda'
    ],
    equipamiento: [
      'C\u00E1mara DSLR/Mirrorless',
      'Lente 85mm f/1.8 o 50mm f/1.4',
      'Flash speedlite + difusor',
      'Fondo gris plegable + soporte',
      'Tarjetas SD (x2 m\u00EDnimo)',
      'Bater\u00EDas de repuesto'
    ]
  },
  iluminacion: {
    titulo: 'Iluminaci\u00F3n',
    icon: '\u{1F4A1}',
    descripcion: 'Setup de luces para retrato escolar.',
    tips: [
      'Luz principal: 45\u00B0 lateral, ligeramente por encima',
      'Fill light o reflector para rellenar sombras',
      'Evitar sombras duras debajo de nariz/ment\u00F3n',
      'Si us\u00E1s flash: difusor siempre, potencia 1/4 a 1/8',
      'Con ventanales: usar como key light + reflector de relleno',
      'Verificar que no haya reflejos en anteojos'
    ],
    equipamiento: [
      'Flash principal + stand',
      'Softbox o paraguas',
      'Reflector plegable 5-en-1',
      'Flash secundario (opcional)',
      'Disparador/trigger inal\u00E1mbrico'
    ]
  },
  lightroom: {
    titulo: 'Lightroom (Post)',
    icon: '\u{1F3A8}',
    descripcion: 'Revelado digital y correcci\u00F3n de color.',
    tips: [
      'Crear cat\u00E1logo por escuela/jornada',
      'Aplicar perfil de c\u00E1mara como base',
      'Preset de revelado Polar3: WB, exposure, contrast',
      'Sync settings despu\u00E9s de ajustar la primera foto',
      'Exportar a Photoshop solo las seleccionadas',
      'Naming convention: Escuela_Curso_Alumno_001.jpg'
    ],
    equipamiento: [
      'Lightroom Classic',
      'Monitor calibrado (sRGB m\u00EDn.)',
      'Preset Polar3 instalado'
    ]
  },
  photoshop: {
    titulo: 'Photoshop (Retoque)',
    icon: '\u{1F58C}\uFE0F',
    descripcion: 'Retoque fino y automatizaci\u00F3n con Panel Polar3.',
    tips: [
      'Ejecutar Action de AutoRecorte para biom\u00E9tricas',
      'Fondo gris via script (claro/medio/oscuro seg\u00FAn skin tone)',
      'Retoque suave: no alterar la identidad del ni\u00F1o',
      'Panel Polar3: usar m\u00F3dulo post-proceso para Color y Efectos',
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
    icon: '\u{1F4D0}',
    descripcion: 'Armado de carpetas, tiras carnet e impresos.',
    tips: [
      'Template de carpeta 20\xD730 con m\u00E1rgenes de seguridad',
      'Tira carnet: 4 fotos 4\xD74cm, verificar DPI (300 m\u00EDn.)',
      'Verificar nombre del alumno vs foto',
      'Color profile: sRGB para impresi\u00F3n digital',
      'Guardar con naming consistente para imprenta'
    ],
    equipamiento: [
      'Templates PSD de carpeta',
      'Template tira carnet',
      'Action de montaje autom\u00E1tico'
    ]
  },
  imprenta: {
    titulo: 'Imprenta',
    icon: '\u{1F5A8}\uFE0F',
    descripcion: 'Env\u00EDo a imprenta y control de calidad.',
    tips: [
      'Verificar resoluci\u00F3n 300 DPI antes de enviar',
      'sRGB para impresi\u00F3n digital, CMYK solo si lo piden',
      'Enviar prueba de color antes del lote completo',
      'Solicitar muestra de papel (brillo, mate, semigloss)',
      'Verificar tama\u00F1os: 20\xD730, 13\xD718, 10\xD715, carnet',
      'Control de calidad visual al recibir: color, corte, manchas'
    ],
    equipamiento: [
      'Proveedor de impresi\u00F3n calibrado',
      'Muestras de referencia'
    ]
  }
};

class FotografiaManager {

  getEtapas() {
    return Object.entries(PHOTOGRAPHY_STAGES).map(([key, titulo]) => {
      const content = ETAPA_CONTENT[key] || {};
      return { key, titulo, icon: content.icon || '\u{1F4CB}', descripcion: content.descripcion || '' };
    });
  }

  getEtapaDetalle(etapaKey) {
    const content = ETAPA_CONTENT[etapaKey];
    if (!content) return null;
    return { key: etapaKey, ...content };
  }

  getTips(etapaKey)         { return ETAPA_CONTENT[etapaKey]?.tips || []; }
  getEquipamiento(etapaKey) { return ETAPA_CONTENT[etapaKey]?.equipamiento || []; }

  getBoard() {
    const saved = storage.getItem(STORAGE_KEYS.schoolBoard, null);
    if (saved) return saved;
    const columns = {};
    Object.entries(PHOTOGRAPHY_STAGES).forEach(([key, label]) => {
      columns[key] = { key, label, cards: [] };
    });
    return { columns, cards: [] };
  }

  addToBoard(escuela, etapa = 'captura', metadata = {}) {
    if (!escuela) return { success: false, error: 'Escuela requerida' };
    if (!PHOTOGRAPHY_STAGES[etapa]) return { success: false, error: 'Etapa inv\u00E1lida' };
    const board = this.getBoard();
    const id = `school_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const card = { id, escuela, etapa,
      creadaAt: new Date().toISOString(),
      movidaAt: new Date().toISOString(),
      ...metadata };
    if (!board.columns[etapa])
      board.columns[etapa] = { key: etapa, label: PHOTOGRAPHY_STAGES[etapa], cards: [] };
    board.columns[etapa].cards.push(id);
    if (!board.cards) board.cards = [];
    board.cards.push(card);
    storage.setItem(STORAGE_KEYS.schoolBoard, board);
    console.log(`[Fotografia] Escuela agregada: ${escuela} \u2192 ${etapa}`);
    return { success: true, id };
  }

  moveCard(cardId, nuevaEtapa) {
    if (!PHOTOGRAPHY_STAGES[nuevaEtapa]) return { success: false, error: 'Etapa inv\u00E1lida' };
    const board = this.getBoard();
    const card = board.cards.find(c => c.id === cardId);
    if (!card) return { success: false, error: 'Card no encontrada' };
    const etapaAnterior = card.etapa;
    if (board.columns[etapaAnterior])
      board.columns[etapaAnterior].cards = board.columns[etapaAnterior].cards.filter(id => id !== cardId);
    if (!board.columns[nuevaEtapa])
      board.columns[nuevaEtapa] = { key: nuevaEtapa, label: PHOTOGRAPHY_STAGES[nuevaEtapa], cards: [] };
    board.columns[nuevaEtapa].cards.push(cardId);
    card.etapa = nuevaEtapa;
    card.movidaAt = new Date().toISOString();
    storage.setItem(STORAGE_KEYS.schoolBoard, board);
    console.log(`[Fotografia] Card movida: ${cardId} \u2192 ${nuevaEtapa}`);
    return { success: true };
  }

  removeFromBoard(cardId) {
    const board = this.getBoard();
    const card = board.cards.find(c => c.id === cardId);
    if (!card) return { success: false, error: 'Card no encontrada' };
    if (board.columns[card.etapa])
      board.columns[card.etapa].cards = board.columns[card.etapa].cards.filter(id => id !== cardId);
    board.cards = board.cards.filter(c => c.id !== cardId);
    storage.setItem(STORAGE_KEYS.schoolBoard, board);
    return { success: true };
  }

  getBoardStats() {
    const board = this.getBoard();
    return Object.entries(PHOTOGRAPHY_STAGES).map(([key, label]) => ({
      etapa: key, label, count: board.columns[key]?.cards?.length || 0
    }));
  }
}

export const fotografia = new FotografiaManager();
export default fotografia;
