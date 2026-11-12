// Cliente de la IA: envía el registro al proxy del servidor y devuelve el análisis ya validado.
// No conoce la API Key: esa vive solo en el servidor.
import { ENDPOINT_IA } from './config.js';

const TIEMPO_MAXIMO_MS = 25000;

/** Error con un tipo legible para decidir cómo reaccionar (reintentar, detener o avisar). */
export class ErrorGemini extends Error {
  constructor(tipo, mensaje) {
    super(mensaje);
    this.name = 'ErrorGemini';
    this.tipo = tipo;
  }
}

/** Envía un registro al proxy y devuelve { categoria, cultivo, cantidad, esSiembra, diasCosecha, recomendacion, alerta }. */
export async function analizarRegistro(texto) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

  try {
    const respuesta = await fetch(ENDPOINT_IA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controlador.signal,
      body: JSON.stringify({ texto }),
    });

    const cuerpo = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new ErrorGemini(cuerpo?.error?.tipo ?? 'servidor', cuerpo?.error?.mensaje ?? 'Error del servicio de IA');
    }

    return cuerpo;
  } catch (error) {
    if (error instanceof ErrorGemini) throw error;
    if (error.name === 'AbortError') throw new ErrorGemini('timeout', 'La IA tardó demasiado en responder');
    throw new ErrorGemini('red', 'Sin conexión con el servicio de IA');
  } finally {
    clearTimeout(temporizador);
  }
}
