// Copiloto sin conexión: responde preguntas frecuentes sobre los registros guardados, sin modelo de lenguaje.
// Es un motor de intenciones sobre IndexedDB: inventario, cosechas, avisos, pendientes y gastos.
import reglas from './reglas.json';
import { normalizar, detectarCultivo, unidadCanonica } from './motorLocal.js';

const DIA_MS = 86400000;

export const SUGERENCIAS = [
  '¿Cuánto maíz tengo?',
  '¿Cuándo cosecho?',
  '¿Qué avisos legales tengo?',
  '¿Cuánto he gastado este mes?',
];

const PLURALES = {
  kilo: 'kilos',
  tonelada: 'toneladas',
  bulto: 'bultos',
  costal: 'costales',
  hectarea: 'hectáreas',
  litro: 'litros',
  planta: 'plantas',
};

const formatoFecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const formatoCorto = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

/** Formatea un número con separadores de miles y como máximo dos decimales. */
function numero(valor) {
  return valor.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

/** Suma cantidades como "40 kilos" y "2 kilos" por unidad. Devuelve "42 kilos" o null si no hay ninguna válida. */
export function sumarCantidades(cantidades) {
  const totales = {};

  for (const cantidad of cantidades) {
    const coincidencia = cantidad?.match(/^(\d+(?:[.,]\d+)?)\s+(\S+)/);
    if (!coincidencia) continue;

    const unidad = unidadCanonica(coincidencia[2]);
    if (!unidad) continue;

    totales[unidad] = (totales[unidad] ?? 0) + Number(coincidencia[1].replace(',', '.'));
  }

  const partes = Object.entries(totales).map(([unidad, valor]) => {
    const etiqueta = valor === 1 ? unidad : PLURALES[unidad];
    return `${numero(valor)} ${etiqueta}`;
  });

  return partes.length ? partes.join(' y ') : null;
}

/** Fecha estimada de cosecha de una siembra registrada. */
function fechaCosecha(registro) {
  const fecha = new Date(registro.fecha);
  fecha.setDate(fecha.getDate() + registro.diasCosecha);
  return fecha;
}

/** Respuesta sobre inventario: suma las cantidades de los registros de inventario. */
function respuestaInventario(registros, cultivo) {
  const nombre = cultivo ? reglas.cultivos[cultivo].nombre : null;
  const inventario = registros.filter(
    (registro) => registro.categoria === 'inventario' && (!cultivo || registro.cultivo === cultivo)
  );

  if (inventario.length === 0) {
    const de = nombre ? ` de ${nombre.toLowerCase()}` : '';
    return `No tienes registros de inventario${de}. Puedes decir, por ejemplo, "tengo 40 kilos de maíz".`;
  }

  const total = sumarCantidades(inventario.map((registro) => registro.cantidad));
  if (!total) {
    return `Tienes ${inventario.length} registros de inventario, pero sin cantidades claras para sumar.`;
  }

  const de = nombre ? ` de ${nombre.toLowerCase()}` : '';
  return `Tienes ${total}${de}, según tus registros de inventario.`;
}

/** Respuesta sobre cosechas: la próxima fecha estimada de las siembras registradas. */
function respuestaCosechas(registros, cultivo, ahora) {
  const nombre = cultivo ? reglas.cultivos[cultivo].nombre : null;
  const siembras = registros
    .filter((registro) => registro.esSiembra && registro.diasCosecha && (!cultivo || registro.cultivo === cultivo))
    .map((registro) => ({ registro, cosecha: fechaCosecha(registro) }))
    .sort((a, b) => a.cosecha - b.cosecha);

  const de = nombre ? ` de ${nombre.toLowerCase()}` : '';
  if (siembras.length === 0) {
    return `No tienes siembras${de} registradas. Registra una siembra y calcularé la cosecha.`;
  }

  const proxima = siembras.find(({ cosecha }) => cosecha.getTime() >= ahora);
  if (!proxima) {
    return `Tus siembras${de} ya llegaron a la fecha estimada de cosecha.`;
  }

  const dias = Math.ceil((proxima.cosecha.getTime() - ahora) / DIA_MS);
  return `La próxima cosecha${de} es estimada para el ${formatoFecha.format(proxima.cosecha)}, en ${dias} ${dias === 1 ? 'día' : 'días'}.`;
}

/** Respuesta sobre avisos legales: los cinco más recientes. */
function respuestaAvisos(registros) {
  const avisos = registros
    .filter((registro) => registro.alerta)
    .sort((a, b) => b.fecha - a.fecha)
    .slice(0, 5);

  if (avisos.length === 0) return 'No tienes avisos legales registrados.';

  const lineas = avisos.map((registro) => `${formatoCorto.format(new Date(registro.fecha))}: ${registro.alerta}`);
  return `Tus avisos legales más recientes:\n${lineas.join('\n')}`;
}

/** Respuesta sobre gastos o ventas del mes en curso, según la pregunta. */
function respuestaDinero(texto, registros, ahora) {
  const fecha = new Date(ahora);
  const delMes = registros.filter((registro) => {
    const f = new Date(registro.fecha);
    return f.getMonth() === fecha.getMonth() && f.getFullYear() === fecha.getFullYear() && registro.costo;
  });

  const esVenta = /vend|ingres/.test(texto);
  const filtrados = delMes.filter((registro) => (esVenta ? registro.categoria === 'venta' : registro.categoria !== 'venta'));
  const total = filtrados.reduce((suma, registro) => suma + registro.costo, 0);

  if (filtrados.length === 0) {
    return esVenta
      ? 'No tienes ventas con precio registradas este mes.'
      : 'No tienes gastos con precio registrados este mes.';
  }

  const monto = total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  return esVenta
    ? `Este mes registras ventas por ${monto}, en ${filtrados.length} registros.`
    : `Este mes registras gastos por ${monto}, en ${filtrados.length} registros.`;
}

/**
 * Responde una pregunta con los registros guardados.
 * Devuelve { texto, sugerencias? }. Sin coincidencia, muestra sugerencias.
 */
export function responderLocal(pregunta, registros, ahora = Date.now()) {
  const texto = normalizar(pregunta ?? '');
  const cultivo = detectarCultivo(texto);

  if (/gast|costo|cuanto.*(vend|gane)|ventas|ingres/.test(texto)) {
    return { texto: respuestaDinero(texto, registros, ahora) };
  }
  if (/aviso|alerta|legal|senasica|conagua|contrato/.test(texto)) {
    return { texto: respuestaAvisos(registros) };
  }
  if (/cosech|cuando/.test(texto)) {
    return { texto: respuestaCosechas(registros, cultivo, ahora) };
  }
  if (/pendiente|analiz/.test(texto)) {
    const pendientes = registros.filter((registro) => registro.estado === 'pendiente').length;
    return {
      texto: pendientes
        ? `Tienes ${pendientes} ${pendientes === 1 ? 'registro pendiente' : 'registros pendientes'} de análisis con IA. Se analizan al tener señal.`
        : 'No tienes registros pendientes de análisis.',
    };
  }
  if (/tengo|inventario|cuanto|cuantos|cuantas|hay/.test(texto)) {
    return { texto: respuestaInventario(registros, cultivo) };
  }

  return {
    texto: 'Puedo responder sobre tu inventario, cosechas, avisos legales, pendientes y gastos. Prueba con una de estas preguntas.',
    sugerencias: SUGERENCIAS,
  };
}

/** Resume los registros para enviarlos como contexto a la IA en la nube. Acotado para no enviar de más. */
export function construirContexto(registros, maximo = 40) {
  return registros
    .slice(0, maximo)
    .map((registro) => {
      const partes = [
        formatoCorto.format(new Date(registro.fecha)),
        registro.categoria && `categoría ${registro.categoria}`,
        registro.cultivo && `cultivo ${registro.cultivo}`,
        registro.cantidad && `cantidad ${registro.cantidad}`,
        registro.costo && `costo ${registro.costo} pesos`,
        registro.esSiembra && registro.diasCosecha && `siembra con cosecha en ${registro.diasCosecha} días`,
      ].filter(Boolean);
      return `- ${partes.join(', ')}: "${registro.texto}"`;
    })
    .join('\n');
}
