/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * KPIs — Cálculos de rentabilidad y métricas de negocio
 *
 * Módulo de solo lectura: toma datos de CobrosStore y calcula KPIs.
 * No tiene estado propio, se recalcula on-demand.
 *
 * Uso:
 *   import { kpis } from './modules/Business/KPIs.js';
 *   const dashboard = kpis.getDashboard();
 *   const simulacion = kpis.simular({ precioPack: 18000, cantidadAlumnos: 200 });
 */

import { cobrosStore } from '../../stores/CobrosStore.js';
import {
  CANON_PERCENTAGE,
  PACK_PRICE_DEFAULT,
  MONTHS_ES
} from '../../config.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES DE COSTOS ESTIMADOS
// ═══════════════════════════════════════════════════════════════

/**
 * Costos estimados por pack para cálculo de rentabilidad.
 * Estos valores se pueden ajustar desde la UI (simulador).
 */
const COSTOS_DEFAULT = {
  impresion: 2500,       // Costo imprenta por pack
  carpeta: 800,          // Carpeta premium
  pendrive: 1200,        // Pendrive + grabado
  transporte: 500,       // Prorrateado por pack
  insumos: 300,          // Papel, tinta tira carnet, etc.
  get totalPorPack() {
    return this.impresion + this.carpeta + this.pendrive + this.transporte + this.insumos;
  }
};

// ═══════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class KPIsManager {

  // ─────────────────────────────────────────────────────────────
  // DASHBOARD PRINCIPAL
  // ─────────────────────────────────────────────────────────────

  /**
   * Métricas principales para el dashboard.
   * @param {Object} [costos] - Override de costos por pack
   * @returns {Object}
   */
  getDashboard(costos) {
    const stats = cobrosStore.getStats();
    const costoPack = costos ? this._calcCostoPack(costos) : COSTOS_DEFAULT.totalPorPack;

    const costoTotal = stats.totalPacks * costoPack;
    const canon = stats.totalMonto * CANON_PERCENTAGE;
    const ingresoNeto = stats.montoCobrado - canon;
    const ganancia = ingresoNeto - costoTotal;
    const margenNeto = stats.montoCobrado > 0
      ? Math.round((ganancia / stats.montoCobrado) * 10000) / 100
      : 0;

    return {
      // Ventas
      totalPacks: stats.totalPacks,
      totalCobros: stats.totalCobros,
      escuelasActivas: stats.escuelasUnicas,

      // Montos
      facturado: stats.totalMonto,
      cobrado: stats.montoCobrado,
      pendiente: stats.montoPendiente,
      porcentajeCobrado: stats.porcentajeCobrado,

      // Costos
      costoTotal,
      costoPorPack: costoPack,
      canon,

      // Rentabilidad
      ingresoNeto,
      ganancia,
      margenNeto,

      // Promedios
      ticketPromedio: stats.ticketPromedio,
      precioPromedio: stats.totalPacks > 0
        ? Math.round(stats.totalMonto / stats.totalPacks)
        : PACK_PRICE_DEFAULT,

      // Ratios
      packsPromedioPorEscuela: stats.escuelasUnicas > 0
        ? Math.round(stats.totalPacks / stats.escuelasUnicas)
        : 0
    };
  }

  // ─────────────────────────────────────────────────────────────
  // MÉTRICAS POR ESCUELA
  // ─────────────────────────────────────────────────────────────

  /**
   * Ranking de escuelas por facturación.
   * @returns {Array}
   */
  getRankingEscuelas() {
    return cobrosStore.getStatsByEscuela();
  }

  /**
   * Escuelas con cobros pendientes (ordenadas por monto pendiente desc).
   * @returns {Array}
   */
  getEscuelasConDeuda() {
    return cobrosStore.getStatsByEscuela()
      .filter(e => e.pendiente > 0)
      .sort((a, b) => b.pendiente - a.pendiente);
  }

  // ─────────────────────────────────────────────────────────────
  // MÉTRICAS TEMPORALES
  // ─────────────────────────────────────────────────────────────

  /**
   * Evolución mensual de ventas y cobros.
   * @returns {Array<{mes: string, mesLabel: string, cobros: number, total: number, cobrado: number}>}
   */
  getEvolucionMensual() {
    return cobrosStore.getStatsByMes().map(item => {
      const [year, month] = item.mes.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      const mesLabel = monthIdx >= 0 && monthIdx < 12
        ? `${MONTHS_ES[monthIdx]} ${year}`
        : item.mes;

      return {
        ...item,
        mesLabel
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SIMULADOR
  // ─────────────────────────────────────────────────────────────

  /**
   * Simula escenarios de rentabilidad con parámetros custom.
   * @param {Object} params
   * @param {number} [params.precioPack] - Precio por pack
   * @param {number} [params.cantidadAlumnos] - Cantidad estimada de alumnos
   * @param {number} [params.tasaConversion] - % de familias que compran (0-100)
   * @param {number} [params.costoImpresion] - Costo imprenta por pack
   * @param {number} [params.costoCarpeta]
   * @param {number} [params.costoPendrive]
   * @param {number} [params.costoTransporte]
   * @param {number} [params.costoInsumos]
   * @param {number} [params.canonPorcentaje] - % canon cooperadora
   * @returns {Object}
   */
  simular(params = {}) {
    const precio = params.precioPack || PACK_PRICE_DEFAULT;
    const alumnos = params.cantidadAlumnos || 100;
    const tasaConversion = (params.tasaConversion || 70) / 100;
    const canonPct = params.canonPorcentaje !== undefined ? params.canonPorcentaje / 100 : CANON_PERCENTAGE;

    const packsVendidos = Math.round(alumnos * tasaConversion);
    const facturacionBruta = packsVendidos * precio;
    const canon = facturacionBruta * canonPct;

    const costos = {
      impresion: params.costoImpresion !== undefined ? params.costoImpresion : COSTOS_DEFAULT.impresion,
      carpeta: params.costoCarpeta !== undefined ? params.costoCarpeta : COSTOS_DEFAULT.carpeta,
      pendrive: params.costoPendrive !== undefined ? params.costoPendrive : COSTOS_DEFAULT.pendrive,
      transporte: params.costoTransporte !== undefined ? params.costoTransporte : COSTOS_DEFAULT.transporte,
      insumos: params.costoInsumos !== undefined ? params.costoInsumos : COSTOS_DEFAULT.insumos
    };

    const costoPorPack = Object.values(costos).reduce((s, v) => s + v, 0);
    const costoTotal = packsVendidos * costoPorPack;
    const ingresoNeto = facturacionBruta - canon;
    const ganancia = ingresoNeto - costoTotal;
    const margenNeto = ingresoNeto > 0
      ? Math.round((ganancia / ingresoNeto) * 10000) / 100
      : 0;

    return {
      // Inputs
      precio,
      alumnos,
      tasaConversion: tasaConversion * 100,
      canonPorcentaje: canonPct * 100,

      // Resultados
      packsVendidos,
      facturacionBruta,
      canon,
      costoTotal,
      costoPorPack,
      costos,
      ingresoNeto,
      ganancia,
      margenNeto,

      // Punto de equilibrio
      puntoEquilibrio: costoPorPack > 0
        ? Math.ceil(costoTotal / (precio - costoPorPack - (precio * canonPct)))
        : 0
    };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Calcula costo total por pack desde un objeto de costos parcial.
   * @param {Object} costos
   * @returns {number}
   * @private
   */
  _calcCostoPack(costos) {
    return (costos.impresion || COSTOS_DEFAULT.impresion)
      + (costos.carpeta || COSTOS_DEFAULT.carpeta)
      + (costos.pendrive || COSTOS_DEFAULT.pendrive)
      + (costos.transporte || COSTOS_DEFAULT.transporte)
      + (costos.insumos || COSTOS_DEFAULT.insumos);
  }

  /**
   * Devuelve los costos por defecto (para prellenar el simulador).
   * @returns {Object}
   */
  getCostosDefault() {
    return { ...COSTOS_DEFAULT };
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const kpis = new KPIsManager();

export default kpis;
