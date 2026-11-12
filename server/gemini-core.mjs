// Núcleo del proxy de Gemini. Lo usan el middleware de desarrollo (Vite) y la función serverless.
// La API Key solo existe en el servidor: nunca llega al navegador.

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELO_POR_DEFECTO = 'gemini-3.5-flash-lite';
const MAX_CARACTERES = 1000;

export const CATEGORIAS = ['cultivo', 'inventario', 'actividad', 'venta', 'alerta'];
export const CULTIVOS = ['naranja', 'maiz', 'limon', 'jitomate', 'cebolla', 'otro'];

// Prompt de sistema: define el rol, el JSON esperado y la base de conocimiento.
const PROMPT_SISTEMA = `Eres un asistente agrícola experto para pequeños productores de México. Recibes un texto informal y debes devolver SOLO un JSON válido con esta estructura exacta:
{
  "categoria": "cultivo" | "inventario" | "actividad" | "venta" | "alerta",
  "cultivo": "naranja" | "maiz" | "limon" | "jitomate" | "cebolla" | "otro" | null,
  "cantidad": "string o null",
  "esSiembra": true | false,
  "diasCosecha": número entero o null,
  "recomendacion": "1-2 frases accionables basadas en la base de conocimiento",
  "alerta": "1-2 frases de alerta legal si aplica, o null"
}
Base de conocimiento: Naranja (cosecha 3-5 años, anaquel 3-6 semanas frío), Maíz (90-150 días, elote 3-5 días ambiente), Limón (2-3 años, anaquel 3-6 semanas frío), Jitomate (60-90 días, anaquel 1-3 semanas), Cebolla (90-150 días, curada 3-6 meses).
Disparadores legales: Si menciona fertilizante/agroquímico, alerta sobre guardar ticket y SENASICA. Si menciona agua/riego, alerta sobre concesiones. Si menciona venta/contrato, alerta sobre documentar por escrito. Si menciona plagas, alerta sobre reportar a autoridades.
Reglas para esSiembra y diasCosecha: esSiembra es true solo si el texto describe una siembra o plantación nueva. diasCosecha son los días desde la siembra hasta la cosecha según la base de conocimiento; para naranja y limón convierte los años a días usando el valor medio del rango. Si no es una siembra, usa null.
No inventes información. Devuelve SOLO el JSON.`;

// Esquema que Gemini debe respetar al responder.
const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    categoria: { type: 'STRING', enum: CATEGORIAS },
    cultivo: { type: 'STRING', enum: CULTIVOS, nullable: true },
    cantidad: { type: 'STRING', nullable: true },
    esSiembra: { type: 'BOOLEAN' },
    diasCosecha: { type: 'INTEGER', nullable: true },
    recomendacion: { type: 'STRING' },
    alerta: { type: 'STRING', nullable: true },
  },
  required: ['categoria', 'cultivo', 'cantidad', 'esSiembra', 'diasCosecha', 'recomendacion', 'alerta'],
};

/** Error con un tipo legible y un código HTTP sugerido para la respuesta al cliente. */
export class ErrorProxy extends Error {
  constructor(tipo, mensaje, estado = 500) {
    super(mensaje);
    this.name = 'ErrorProxy';
    this.tipo = tipo;
    this.estado = estado;
  }
}

/**
 * Analiza un texto con Gemini y devuelve los campos normalizados.
 * @param {string} texto Registro del productor.
 * @param {{ apiKey?: string, modelo?: string }} opciones Clave y modelo del servidor.
 */
export async function analizarTexto(texto, { apiKey, modelo = MODELO_POR_DEFECTO } = {}) {
  if (!apiKey) throw new ErrorProxy('sin-clave', 'El servidor no tiene API Key de Gemini configurada');
  if (typeof texto !== 'string' || !texto.trim()) {
    throw new ErrorProxy('peticion-invalida', 'El texto del registro es obligatorio', 400);
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 20000);

  try {
    const respuesta = await fetch(`${URL_BASE}/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controlador.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT_SISTEMA }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Registro del productor:\n"""${texto.slice(0, MAX_CARACTERES)}"""` }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', responseSchema: ESQUEMA, temperature: 0.2 },
      }),
    });

    if (!respuesta.ok) throw await errorDeGoogle(respuesta);

    const cuerpo = await respuesta.json();
    const contenido = cuerpo?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!contenido) throw new ErrorProxy('respuesta-invalida', 'Gemini no devolvió contenido', 502);

    return normalizar(parsearJson(contenido));
  } catch (error) {
    if (error instanceof ErrorProxy) throw error;
    if (error.name === 'AbortError') throw new ErrorProxy('timeout', 'Gemini tardó demasiado en responder', 504);
    if (error instanceof SyntaxError) throw new ErrorProxy('respuesta-invalida', 'Respuesta de Gemini mal formada', 502);
    throw new ErrorProxy('red', 'No se pudo contactar a Gemini', 502);
  } finally {
    clearTimeout(temporizador);
  }
}

/** Convierte un error HTTP de Google en un ErrorProxy. No registra la clave. */
async function errorDeGoogle(respuesta) {
  let detalle = '';
  try {
    detalle = (await respuesta.json())?.error?.message ?? '';
  } catch (error) {
    // Respuesta de error sin JSON: se usa solo el código HTTP.
  }
  console.warn(`Gemini respondió con error ${respuesta.status}: ${detalle}`);

  if (respuesta.status === 429) return new ErrorProxy('cuota', 'Límite de uso de Gemini alcanzado', 429);
  if (respuesta.status === 401 || respuesta.status === 403) {
    return new ErrorProxy('clave-invalida', 'La API Key no tiene permiso', 502);
  }
  if (respuesta.status === 400 && /key/i.test(detalle)) {
    return new ErrorProxy('clave-invalida', 'La API Key no es válida', 502);
  }
  return new ErrorProxy('servidor', `Error del servicio de Gemini (${respuesta.status})`, 502);
}

/** Parsea el texto devuelto por Gemini, quitando cercas de código si las incluye. */
function parsearJson(texto) {
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(limpio);
  } catch (error) {
    throw new ErrorProxy('respuesta-invalida', 'Gemini devolvió un JSON inválido', 502);
  }
}

/** Valida el JSON recibido y devuelve solo los campos que guarda la app. */
function normalizar(datos) {
  if (!CATEGORIAS.includes(datos?.categoria)) {
    throw new ErrorProxy('respuesta-invalida', 'Categoría desconocida', 502);
  }

  const recomendacion = typeof datos.recomendacion === 'string' ? datos.recomendacion.trim() : '';
  if (!recomendacion) throw new ErrorProxy('respuesta-invalida', 'Falta la recomendación', 502);

  return {
    categoria: datos.categoria,
    cultivo: CULTIVOS.includes(datos.cultivo) ? datos.cultivo : null,
    cantidad: textoONulo(datos.cantidad),
    esSiembra: datos.esSiembra === true,
    diasCosecha: Number.isInteger(datos.diasCosecha) && datos.diasCosecha > 0 ? datos.diasCosecha : null,
    recomendacion,
    alerta: textoONulo(datos.alerta),
  };
}

/** Devuelve el texto recortado, o null si está vacío o no es texto. */
function textoONulo(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

/** Lee la clave y el modelo desde variables de entorno del servidor. */
export function configuracionDesdeEntorno(entorno) {
  return {
    apiKey: entorno.GEMINI_API_KEY || '',
    modelo: entorno.GEMINI_MODELO || MODELO_POR_DEFECTO,
  };
}
