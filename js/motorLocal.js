// Motor local: clasifica un registro sin red usando reglas y la base de conocimiento de reglas.json.
// Es determinista y no inventa datos: solo extrae lo que aparece en el texto o en las reglas.
import reglas from './reglas.json';

/** Minúsculas y sin acentos, para comparar palabras sin importar cómo se escribieron. */
export function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Escapa caracteres especiales para usar una palabra dentro de una expresión regular. */
function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Indica si el texto normalizado contiene alguna de las palabras al inicio de una palabra. */
function contiene(textoNormalizado, palabras) {
  return palabras.some((palabra) => new RegExp(`\\b${escaparRegex(normalizar(palabra))}`).test(textoNormalizado));
}

/** Devuelve la clave del cultivo mencionado en el texto, o null si no hay ninguno. */
export function detectarCultivo(textoNormalizado) {
  const entrada = Object.entries(reglas.cultivos).find(([, cultivo]) => contiene(textoNormalizado, cultivo.palabras));
  return entrada ? entrada[0] : null;
}

/** Devuelve la intención del registro (venta, siembra, cosecha, inventario o aplicación), en ese orden de prioridad. */
export function detectarIntencion(textoNormalizado) {
  const orden = ['venta', 'siembra', 'cosecha', 'inventario', 'aplicacion'];
  for (const nombre of orden) {
    const intencion = reglas.intenciones[nombre];
    if (contiene(textoNormalizado, intencion.palabras)) {
      return { nombre, categoria: intencion.categoria, esSiembra: intencion.esSiembra === true };
    }
  }
  return null;
}

/** Devuelve los disparadores legales activos, sin repetir alertas. */
function disparadoresActivos(textoNormalizado) {
  const alertas = reglas.disparadores
    .filter((disparador) => contiene(textoNormalizado, disparador.palabras))
    .map((disparador) => disparador.alerta);
  return [...new Set(alertas)];
}

/** Devuelve la unidad canónica de una palabra ("kilos" -> "kilo"), o null si no es una unidad conocida. */
export function unidadCanonica(palabra) {
  const entrada = Object.entries(reglas.unidades).find(([, variantes]) => variantes.includes(normalizar(palabra)));
  return entrada ? entrada[0] : null;
}

/** Extrae la primera cantidad con unidad conocida, como "40 kilos" o "2 hectáreas". */
export function extraerCantidad(textoNormalizado) {
  const unidades = Object.values(reglas.unidades)
    .flat()
    .sort((a, b) => b.length - a.length)
    .map(escaparRegex);
  const patron = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${unidades.join('|')})\\b`);
  const coincidencia = textoNormalizado.match(patron);
  return coincidencia ? `${coincidencia[1]} ${coincidencia[2]}` : null;
}

/** Extrae un costo en pesos cuando el texto lo indica con "$" o "pesos". */
export function extraerCosto(texto) {
  const normal = normalizar(texto);
  const coincidencia =
    normal.match(/\$\s*(\d[\d,]*(?:\.\d+)?)/) ?? normal.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:pesos|mxn)\b/);
  return coincidencia ? Number(coincidencia[1].replace(/,/g, '')) : null;
}

/** Días estimados de cosecha de un cultivo, usando el promedio del rango de la base de conocimiento. */
export function diasHastaCosecha(cultivo) {
  const datos = reglas.cultivos[cultivo];
  if (!datos) return null;
  if (datos.cosechaDias) return Math.round((datos.cosechaDias.min + datos.cosechaDias.max) / 2);
  if (datos.cosechaAnios) return Math.round(((datos.cosechaAnios.min + datos.cosechaAnios.max) / 2) * 365);
  return null;
}

/** Recomendación breve: el dato del cultivo que aplica a la intención del registro. */
function construirRecomendacion(cultivo, intencion, dias) {
  if (!cultivo) return 'Agrega el cultivo en el registro para recibir recomendaciones específicas.';

  const datos = reglas.cultivos[cultivo];
  if (intencion?.esSiembra && dias) return `${datos.nombre}: cosecha estimada en unos ${dias} días.`;
  if (intencion?.nombre === 'venta' || intencion?.nombre === 'inventario') {
    return `${datos.nombre}: se conserva ${datos.anaquel}.`;
  }
  return `${datos.nombre}: registro guardado. Anota la fecha de cosecha para estimar el siguiente ciclo.`;
}

/**
 * Analiza un texto y devuelve los campos del registro.
 * Devuelve null si el texto está vacío.
 */
export function analizarLocal(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return null;

  const textoNormalizado = normalizar(texto);
  const cultivo = detectarCultivo(textoNormalizado);
  const intencion = detectarIntencion(textoNormalizado);
  const esSiembra = intencion?.esSiembra === true;
  const dias = esSiembra ? diasHastaCosecha(cultivo) : null;
  const alertas = disparadoresActivos(textoNormalizado);

  return {
    categoria: intencion?.categoria ?? 'actividad',
    cultivo,
    cantidad: extraerCantidad(textoNormalizado),
    costo: extraerCosto(texto),
    esSiembra,
    diasCosecha: dias,
    recomendacion: construirRecomendacion(cultivo, intencion, dias),
    alerta: alertas.length ? alertas.join(' ') : null,
    auditadoPor: 'local',
    confianza: cultivo && intencion ? 'alta' : intencion || cultivo ? 'media' : 'baja',
  };
}
