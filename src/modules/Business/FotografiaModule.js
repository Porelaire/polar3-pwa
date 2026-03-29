/**
 * FotografiaModule.js — Polar[3] PWA v2.7.12
 * Gestión del precio de pack, simulador financiero y generador de propuesta.
 */

import {
  PRECIO_STORAGE_KEY,
  PRECIO_DEFAULT,
  CANON_PERCENTAGE,
  SIMULATOR_VOLUMES
} from '../../config.js';
import { trackedSetItem } from '../Storage.js';
import { money } from '../../stores/CobrosStore.js';

// ─────────────────────────────────────────────
// ESTADO (en memoria)
// ─────────────────────────────────────────────

let precioActual = PRECIO_DEFAULT;

// ─────────────────────────────────────────────
// PRECIO GLOBAL
// ─────────────────────────────────────────────

export function getPrecioActual() {
  return precioActual;
}

export function initPrecio() {
  precioActual = parseInt(localStorage.getItem(PRECIO_STORAGE_KEY), 10) || PRECIO_DEFAULT;
  actualizarPreciosEnApp();
}

function formatPrecio(n) {
  return Number(n).toLocaleString('es-AR');
}

export function actualizarPreciosEnApp() {
  const f = formatPrecio(precioActual);
  const c = formatPrecio(Math.round(precioActual * CANON_PERCENTAGE));

  document.querySelectorAll('.precio-val, .precio-val2').forEach(el => el.textContent = f);
  document.querySelectorAll('.canon-val').forEach(el => el.textContent = c);

  const display = document.getElementById('precio-display');
  if (display) display.textContent = f;

  const schoolPack = document.getElementById('schoolPack');
  if (schoolPack && !schoolPack.value) schoolPack.value = precioActual;

  document.querySelectorAll('.precio-cell').forEach(el => el.textContent = '$' + f);

  const totales = document.querySelectorAll('.precio-total-cell');
  totales.forEach((el, i) => {
    const vol = SIMULATOR_VOLUMES[i];
    if (vol !== undefined) el.textContent = '$' + formatPrecio(precioActual * vol);
  });

  document.querySelectorAll('[data-global-pack-text]').forEach(el => {
    el.textContent = '$' + formatPrecio(precioActual);
  });
}

export function editarPrecio() {
  const input = document.getElementById('precio-input');
  if (input) input.value = precioActual;
  const modal = document.getElementById('modal-precio');
  if (modal) modal.style.display = 'flex';
}

export function guardarPrecio() {
  const input = document.getElementById('precio-input');
  if (!input) return;
  const v = parseInt(input.value, 10);
  if (v > 0) {
    precioActual = v;
    trackedSetItem(PRECIO_STORAGE_KEY, v);
    actualizarPreciosEnApp();
  }
  cerrarModal();
}

export function cerrarModal() {
  const modal = document.getElementById('modal-precio');
  if (modal) modal.style.display = 'none';
}

// ─────────────────────────────────────────────
// SIMULADOR FINANCIERO
// ─────────────────────────────────────────────

function getSimulatorValues() {
  const val = id => Number(document.getElementById(id)?.value || 0);
  return {
    students:   val('simStudents'),
    conversion: val('simConversion') / 100,
    packPrice:  val('simPackPrice'),
    extraAvg:   val('simExtraAvg'),
    canonPct:   val('simCanonPct') / 100,
    printCost:  val('simPrintCost'),
    assistant:  val('simAssistant'),
    travel:     val('simTravel'),
    editHours:  val('simEditHours'),
    hourRate:   val('simHourRate')
  };
}

export function updateSimulador() {
  const v = getSimulatorValues();
  const sales  = Math.round(v.students * v.conversion);
  const base   = sales * v.packPrice;
  const extras = sales * v.extraAvg;
  const gross  = base + extras;
  const canon  = gross * v.canonPct;
  const print  = sales * v.printCost;
  const edit   = v.editHours * v.hourRate;
  const direct = print + edit + v.assistant + v.travel;
  const net    = gross - canon - direct;
  const ticket = v.students ? gross / v.students : 0;
  const margin = gross ? (net / gross) * 100 : 0;

  const safe = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  safe('simSales',  String(sales));
  safe('simGross',  money(gross));
  safe('simNet',    money(net));
  safe('simTicket', money(ticket));
  safe('simBase',   money(base));
  safe('simExtras', money(extras));
  safe('simCanon',  money(canon));
  safe('simPrint',  money(print));
  safe('simEdit',   money(edit));
  safe('simDirect', money(direct));

  const decision = document.getElementById('simDecision');
  if (decision) {
    if (gross <= 0)       decision.textContent = 'Sin ingresos estimados, el escenario no es utilizable.';
    else if (margin >= 35) decision.textContent = `Escenario sano: margen estimado ${margin.toFixed(1)}%. Buen candidato para priorizar o renovar.`;
    else if (margin >= 20) decision.textContent = `Escenario aceptable: margen estimado ${margin.toFixed(1)}%. Conviene revisar canon, extras o eficiencia de edición.`;
    else if (net > 0)     decision.textContent = `Escenario justo: margen ${margin.toFixed(1)}%. Solo tomarlo si aporta volumen estratégico o apertura a crecer.`;
    else                  decision.textContent = `Escenario débil o negativo: margen ${margin.toFixed(1)}%. No cerrar sin cambiar precio, conversión, costos o alcance.`;
  }

  trackedSetItem('polar3_simulador', JSON.stringify({
    students:   v.students,
    conversion: v.conversion * 100,
    packPrice:  v.packPrice,
    extraAvg:   v.extraAvg,
    canonPct:   v.canonPct * 100,
    printCost:  v.printCost,
    assistant:  v.assistant,
    travel:     v.travel,
    editHours:  v.editHours,
    hourRate:   v.hourRate
  }));
}

export function syncSimulatorWithPack() {
  const input = document.getElementById('simPackPrice');
  if (input) input.value = precioActual;
  updateSimulador();
}

export function loadSimulatorState() {
  const saved = JSON.parse(localStorage.getItem('polar3_simulador') || 'null');
  const fieldMap = {
    students:   'simStudents',
    conversion: 'simConversion',
    packPrice:  'simPackPrice',
    extraAvg:   'simExtraAvg',
    canonPct:   'simCanonPct',
    printCost:  'simPrintCost',
    assistant:  'simAssistant',
    travel:     'simTravel',
    editHours:  'simEditHours',
    hourRate:   'simHourRate'
  };
  if (saved) {
    Object.entries(saved).forEach(([key, value]) => {
      const el = document.getElementById(fieldMap[key]);
      if (el) el.value = value;
    });
  } else {
    const pack = document.getElementById('simPackPrice');
    if (pack) pack.value = precioActual;
  }
  updateSimulador();
}

// ─────────────────────────────────────────────
// GENERADOR DE PROPUESTA
// ─────────────────────────────────────────────

function modalityCopy(modality) {
  const map = {
    'Básica': [
      'retratos individuales y foto grupal por curso',
      'una jornada prolija, simple de coordinar y sin sobrecarga institucional',
      'comunicación clara para familias y cooperadora'
    ],
    'Completa': [
      'retrato individual, foto grupal y complementos acordados',
      'más valor percibido sin perder orden operativo ni trazabilidad',
      'equilibrio entre cobertura, presentación y experiencia de jornada'
    ],
    'Institucional': [
      'cobertura ajustada al objetivo específico del colegio',
      'alcance definido desde el inicio para evitar ambigüedades',
      'posible adaptación a actos, piezas institucionales o requerimientos especiales'
    ]
  };
  return map[modality] || map['Completa'];
}

function audienceCopy(audience) {
  const map = {
    cooperadora: 'La propuesta está pensada para aliviar carga operativa, dar claridad de cobro y sostener una jornada ordenada para toda la comunidad.',
    directivos:  'La propuesta está pensada para cuidar la experiencia institucional, la privacidad, la organización del día y la comunicación con las familias.',
    mixto:       'La propuesta combina foco institucional y operativo, buscando una jornada clara para directivos, cooperadora, docentes y familias.'
  };
  return map[audience] || map.mixto;
}

function paymentModelCopy(model) {
  const map = {
    formulario: 'Los pedidos pueden gestionarse por formulario digital con comprobante obligatorio y aceptación visible de términos y condiciones.',
    sobres:     'El colegio puede optar por un esquema de sobres cerrados, con circuito claro de recepción y rendición.',
    mixto:      'El circuito puede combinar formulario digital y excepciones operativas puntuales definidas desde el inicio.'
  };
  return map[model] || map.formulario;
}

export function updateProposalGenerator() {
  const school       = document.getElementById('propSchool')?.value.trim()     || 'la institución';
  const audience     = document.getElementById('propAudience')?.value           || 'cooperadora';
  const level        = document.getElementById('propLevel')?.value              || 'Jardín';
  const modality     = document.getElementById('propModality')?.value           || 'Completa';
  const students     = Number(document.getElementById('propStudents')?.value    || 0);
  const packPrice    = Number(document.getElementById('propPackPrice')?.value   || precioActual);
  const validity     = Number(document.getElementById('propValidity')?.value    || 7);
  const paymentModel = document.getElementById('propPaymentModel')?.value       || 'formulario';
  const focus        = document.getElementById('propFocus')?.value.trim()       || 'orden, trazabilidad y una experiencia cuidada';
  const notes        = document.getElementById('propNotes')?.value.trim()       || '';

  const bullets     = modalityCopy(modality);
  const audienceLine  = audienceCopy(audience);
  const paymentLine   = paymentModelCopy(paymentModel);
  const estimated     = students
    ? `La estimación base considera aproximadamente ${students} alumnos y un valor de pack de ${money(packPrice)}.`
    : 'La propuesta se ajusta según el volumen real del colegio y la modalidad acordada.';

  const preview = document.getElementById('proposalPreview');
  if (preview) {
    preview.innerHTML = `
      <div class="proposal-doc proposal-doc-sheet">
        <div class="proposal-kicker">Polar3 · propuesta preliminar</div>
        <div class="proposal-headline">
          <h3>Propuesta para ${school}</h3>
          <div class="proposal-meta">
            <span>${level}</span>
            <span>${modality}</span>
            <span>Validez ${validity} días</span>
          </div>
        </div>
        <p>${audienceLine}</p>
        <p>El enfoque general es sostener <strong>${focus}</strong>, evitando improvisación, sobrecarga interna y mensajes ambiguos.</p>
        <div class="proposal-box">
          <strong>Qué incluye esta modalidad</strong>
          <ul>${bullets.map(item => `<li>${item}</li>`).join('')}</ul>
        </div>
        <div class="proposal-box">
          <strong>Cómo trabaja Polar3</strong>
          <ul>
            <li>Jornada ordenada, con circuito claro y lenguaje visual institucional.</li>
            <li>Trazabilidad operativa desde la toma hasta la entrega.</li>
            <li>Privacidad e integridad de imagen como criterio central, especialmente en menores.</li>
          </ul>
        </div>
        <div class="proposal-box proposal-box-soft">
          <strong>Circuito de cobro y condiciones base</strong>
          <p>${paymentLine}</p>
          <p>${estimated}</p>
        </div>
        ${notes ? `<div class="proposal-box"><strong>Notas / alcance específico</strong><p>${notes}</p></div>` : ''}
        <div class="proposal-box">
          <strong>Privacidad y resguardo</strong>
          <p>Las fotografías de menores se tratan con especial cuidado. No se publican sin autorización expresa y la edición corrige luz, color o detalles menores sin alterar identidad ni expresión.</p>
        </div>
        <div class="proposal-box proposal-box-cta">
          <strong>Siguiente paso sugerido</strong>
          <p>Si la modalidad les resulta adecuada, el siguiente paso es definir alcance, calendario tentativo, circuito de cobro y condiciones operativas para cerrar una propuesta final.</p>
        </div>
      </div>
    `;
  }

  const plain = [
    `Propuesta Polar3 para ${school}`,
    '',
    `Público principal: ${audience}`,
    `Nivel: ${level}`,
    `Modalidad: ${modality}`,
    `Validez: ${validity} días`,
    '',
    audienceLine,
    '',
    `Enfoque: ${focus}.`,
    '',
    'Qué incluye:',
    ...bullets.map(item => `- ${item}`),
    '',
    'Circuito de cobro:',
    paymentLine,
    '',
    estimated,
    notes ? '' : null,
    notes ? `Notas: ${notes}` : null,
    '',
    'Privacidad: no se publican imágenes de menores sin autorización expresa y la edición no altera identidad ni expresión.',
    '',
    'Siguiente paso: definir alcance, calendario tentativo, circuito de cobro y condiciones operativas para cerrar una propuesta final.'
  ].filter(Boolean).join('\n');

  trackedSetItem('polar3_propuesta_texto', plain);
}
