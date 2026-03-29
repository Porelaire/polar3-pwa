/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * FotografÃ­a â€” Workflows y contenido por etapa
 */

import { storage } from '../Storage.js';
import { PHOTOGRAPHY_STAGES, STORAGE_KEYS } from '../../config.js';

const ETAPA_CONTENT = {
  captura: {
    titulo: 'Captura', icon: 'ðŸ“·',
    descripcion: 'Toma fotogrÃ¡fica en el jardÃ­n/escuela.',
    tips: [
      'Configurar ISO 200-400, apertura f/4-5.6 para retratos nÃ­tidos',
      'White balance manual segÃºn la luz del salÃ³n',
      'Mantener velocidad mÃ­n. 1/125 para evitar movimiento',
      'Usar fondo gris portÃ¡til para consistencia',
      'Disparar RAW siempre',
      'Marcar la posiciÃ³n del alumno con cinta en el piso',
      'Verificar enfoque en ojos despuÃ©s de cada tanda'
    ],
    equipamiento: ['CÃ¡mara DSLR/Mirrorless','Lente 85mm f/1.8 o 50mm f/1.4',
      'Flash speedlite + difusor','Fondo gris plegable + soporte',
      'Tarjetas SD (x2 mÃ­nimo)','BaterÃ­as de repuesto']
  },
  iluminacion: {
    titulo: 'IluminaciÃ³n', icon: 'ðŸ’¡',
    descripcion: 'Setup de luces para retrato escolar.',
    tips: [
      'Luz principal: 45Â° lateral, ligeramente por encima',
      'Fill light o reflector para rellenar sombras',
      'Evitar sombras duras debajo de nariz/mentÃ³n',
      'Si usÃ¡s flash: difusor siempre, potencia 1/4 a 1/8',
      'Con ventanales: usar como key light + reflector de relleno',
      'Verificar que no haya reflejos en anteojos'
    ],
    equipamiento: ['Flash principal + stand','Softbox o paraguas',
      'Reflector plegable 5-en-1','Flash secundario (opcional)','Disparador/trigger inalÃ¡mbrico']
  },
  lightroom: {
    titulo: 'Lightroom (Post)', icon: 'ðŸŽ¨',
    descripcion: 'Revelado digital y correcciÃ³n de color.',
    tips: [
      'Crear catÃ¡logo por escuela/jornada',
      'Aplicar perfil de cÃ¡mara como base',
      'Preset de revelado Polar3: WB, exposure, contrast',
      'Sync settings despuÃ©s de ajustar la primera foto',
      'Exportar a Photoshop solo las seleccionadas',
      'Naming convention: Escuela_Curso_Alumno_001.jpg'
    ],
    equipamiento: ['Lightroom Classic','Monitor calibrado (sRGB mÃ­n.)','Preset Polar3 instalado']
  },
  photoshop: {
    titulo: 'Photoshop (Retoque)', icon: 'ðŸ–Œï¸',
    descripcion: 'Retoque fino y automatizaciÃ³n con Panel Polar3.',
    tips: [
      'Ejecutar Action de AutoRecorte para biomÃ©tricas',
      'Fondo gris via script (claro/medio/oscuro segÃºn skin tone)',
      'Retoque suave: no alterar la identidad del niÃ±o',
      'Panel Polar3: usar mÃ³dulo post-proceso para Color y Efectos',
      'Modo lote para volumen (Action + Batch)',
      'Verificar recorte en preview antes de guardar'
    ],
    equipamiento: ['Photoshop CS6+ / CC','Panel Polar3 instalado','Actions de AutoRecorte y Fondo Gris']
  },
  montaje: {
    titulo: 'Montaje', icon: 'ðŸ“',
    descripcion: 'Armado de carpetas, tiras carnet e impresos.',
    tips: [
      'Template de carpeta 20Ã—30 con mÃ¡rgenes de seguridad',
      'Tira carnet: 4 fotos 4Ã—4cm, verificar DPI (300 mÃ­n.)',
      'Verificar nombre del alumno vs foto',
      'Color profile: sRGB para impresiÃ³n digital',
      'Guardar con naming consistente para imprenta'
    ],
    equipamiento: ['Templates PSD de carpeta','Template tira carnet','Action de montaje automÃ¡tico']
  },
  imprenta: {
    titulo: 'Imprenta', icon: 'ðŸ–¨ï¸',
    descripcion: 'EnvÃ­o a imprenta y control de calidad.',
    tips: [
      'Verificar resoluciÃ³n 300 DPI antes de enviar',
      'sRGB para impresiÃ³n digital, CMYK solo si lo piden',
      'Enviar prueba de color antes del lote completo',
      'Solicitar muestra de papel (brillo, mate, semigloss)',
      'Verificar tamaÃ±os: 20Ã—30, 13Ã—18, 10Ã—15, carnet',
      'Control de calidad visual al recibir: color, corte, manchas'
    ],
    equipamiento: ['Proveedor de impresiÃ³n calibrado','Muestras de referencia']
  }
};

class FotografiaManager {

  getEtapas() {
    return Object.entries(PHOTOGRAPHY_STAGES).map(([key, titulo]) => {
      const content = ETAPA_CONTENT[key] || {};
      return { key, titulo, icon: content.icon || 'ðŸ“‹', descripcion: content.descripcion || '' };
    });
  }

  getEtapaDetalle(etapaKey) {
    const content = ETAPA_CONTENT[etapaKey];
    if (!content) return null;
    return { key: etapaKey, ...content };
  }

  getTips(etapaKey)          { return ETAPA_CONTENT[etapaKey]?.tips || []; }
  getEquipamiento(etapaKey)  { return ETAPA_CONTENT[etapaKey]?.equipamiento || []; }

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
    if (!PHOTOGRAPHY_STAGES[etapa]) return { success: false, error: 'Etapa invÃ¡lida' };
    const board = this.getBoard();
    const id = `school_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const card = {
      id, escuela, etapa,
      creadaAt: new Date().toISOString(),
      movidaAt: new Date().toISOString(),
      ...metadata
    };
    if (!board.columns[etapa]) board.columns[etapa] = { key: etapa, label: PHOTOGRAPHY_STAGES[etapa], cards: [] };
    board.columns[etapa].cards.push(id);
    if (!board.cards) board.cards = [];
    board.cards.push(card);
    storage.setItem(STORAGE_KEYS.schoolBoard, board);
    console.log(`[Fotografia] Escuela agregada: ${escuela} â†’ ${etapa}`);
    return { success: true, id };
  }

  moveCard(cardId, nuevaEtapa) {
    if (!PHOTOGRAPHY_STAGES[nuevaEtapa]) return { success: false, error: 'Etapa invÃ¡lida' };
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
    console.log(`[Fotografia] Card movida: ${cardId} â†’ ${nuevaEtapa}`);
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
      etapa: key, label,
      count: board.columns[key]?.cards?.length || 0
    }));
  }
}

export const fotografia = new FotografiaManager();
export default fotografia;