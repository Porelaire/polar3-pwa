/**
 * POLAR[3] SISTEMA OPERATIVO v2.8.0
 * KPIs — C\u00E1lculos de rentabilidad y m\u00E9tricas de negocio
 *
 * M\u00F3dulo de solo lectura: toma datos de CobrosStore y calcula KPIs.
 * No tiene estado propio, se recalcula on-demand.
 */

import { cobrosStore } from '../../stores/CobrosStore.js';
import {
  CANON_PERCENTAGE,
  PACK_PRICE_DEFAULT,
  MONTHS_ES
} from '../../config.js';

const COSTOS_DEFAULT = {
  impresion: 2500,
  carpeta: 800,
  pendrive: 1200,
  transporte: 500,
  insumos: 300,
  get totalPorPack() {
    return this.impresion + this.carpeta + this.pendrive + this.transporte + this.insumos;
  }
};

class KPIsManager {

  getDashboard(costos) {
    const stats = cobrosStore.getStats();
    const costoPack = costos ? this._calcCostoPack(costos) : COSTOS_DEFAULT.totalPorPack;
    const costoTotal = stats.totalPacks * costoPack;
    const canon = stats.totalMonto * CANON_PERCENTAGE;
    const ingresoNeto = stats.montoCobrado - canon;
    const ganancia = ingresoNeto - costoTotal;
    const margenNeto = stats.montoCobrado > 0
      ? Math.round((ganancia / stats.montoCobrado) * 10000) / 100 : 0;
    return {
      totalPacks: stats.totalPacks,
      totalCobros: stats.totalCobros,
      escuelasActivas: stats.escuelasUnicas,
      facturado: stats.totalMonto,
      cobrado: stats.montoCobrado,
      pendiente: stats.montoPendiente,
      porcentajeCobrado: stats.porcentajeCobrado,
      costoTotal, costoPorPack: costoPack, canon,
      ingresoNeto, ganancia, margenNeto,
      ticketPromedio: stats.ticketPromedio,
      precioPromedio: stats.totalPacks > 0
        ? Math.round(stats.totalMonto / stats.totalPacks) : PACK_PRICE_DEFAULT,
      packsPromedioPorEscuela: stats.escuelasUnicas > 0
        ? Math.round(stats.totalPacks / stats.escuelasUnicas) : 0
    };
  }

  getRankingEscuelas() { return cobrosStore.getStatsByEscuela(); }

  getEscuelasConDeuda() {
    return cobrosStore.getStatsByEscuela()
      .filter(e => e.pendiente > 0)
      .sort((a, b) => b.pendiente - a.pendiente);
  }

  getEvolucionMensual() {
    return cobrosStore.getStatsByMes().map(item => {
      const [year, month] = item.mes.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      const mesLabel = monthIdx >= 0 && monthIdx < 12
        ? `${MONTHS_ES[monthIdx]} ${year}` : item.mes;
      return { ...item, mesLabel };
    });
  }

  simular(params = {}) {
    const precio = params.precioPack || PACK_PRICE_DEFAULT;
    const alumnos = params.cantidadAlumnos || 100;
    const tasaConversion = (params.tasaConversion || 70) / 100;
    const canonPct = params.canonPorcentaje !== undefined
      ? params.canonPorcentaje / 100 : CANON_PERCENTAGE;
    const packsVendidos = Math.round(alumnos * tasaConversion);
    const facturacionBruta = packsVendidos * precio;
    const canon = facturacionBruta * canonPct;
    const costos = {
      impresion:  params.costoImpresion  !== undefined ? params.costoImpresion  : COSTOS_DEFAULT.impresion,
      carpeta:    params.costoCarpeta    !== undefined ? params.costoCarpeta    : COSTOS_DEFAULT.carpeta,
      pendrive:   params.costoPendrive   !== undefined ? params.costoPendrive   : COSTOS_DEFAULT.pendrive,
      transporte: params.costoTransporte !== undefined ? params.costoTransporte : COSTOS_DEFAULT.transporte,
      insumos:    params.costoInsumos    !== undefined ? params.costoInsumos    : COSTOS_DEFAULT.insumos
    };
    const costoPorPack = Object.values(costos).reduce((s, v) => s + v, 0);
    const costoTotal = packsVendidos * costoPorPack;
    const ingresoNeto = facturacionBruta - canon;
    const ganancia = ingresoNeto - costoTotal;
    const margenNeto = ingresoNeto > 0
      ? Math.round((ganancia / ingresoNeto) * 10000) / 100 : 0;
    return {
      precio, alumnos,
      tasaConversion: tasaConversion * 100,
      canonPorcentaje: canonPct * 100,
      packsVendidos, facturacionBruta, canon,
      costoTotal, costoPorPack, costos,
      ingresoNeto, ganancia, margenNeto,
      puntoEquilibrio: costoPorPack > 0
        ? Math.ceil(costoTotal / (precio - costoPorPack - (precio * canonPct))) : 0
    };
  }

  _calcCostoPack(costos) {
    return (costos.impresion  || COSTOS_DEFAULT.impresion)
         + (costos.carpeta    || COSTOS_DEFAULT.carpeta)
         + (costos.pendrive   || COSTOS_DEFAULT.pendrive)
         + (costos.transporte || COSTOS_DEFAULT.transporte)
         + (costos.insumos    || COSTOS_DEFAULT.insumos);
  }

  getCostosDefault() { return { ...COSTOS_DEFAULT }; }
}

export const kpis = new KPIsManager();
export default kpis;
