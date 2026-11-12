// Manejadores HTTP compartidos del proxy. Los usan Vite (desarrollo y preview) y las funciones serverless.
import { analizarTexto, configuracionDesdeEntorno, ErrorProxy } from './gemini-core.mjs';
import { responderChat } from './chat-core.mjs';

/** Convierte un resultado o un error en { estado, cuerpo }, con el mismo formato para todas las rutas. */
async function ejecutar(metodo, operacion) {
  if (metodo !== 'POST') {
    return { estado: 405, cuerpo: { error: { tipo: 'metodo', mensaje: 'Usa POST' } } };
  }

  try {
    return { estado: 200, cuerpo: await operacion() };
  } catch (error) {
    if (error instanceof ErrorProxy) {
      return { estado: error.estado, cuerpo: { error: { tipo: error.tipo, mensaje: error.message } } };
    }
    console.error('Error inesperado en el proxy:', error);
    return { estado: 500, cuerpo: { error: { tipo: 'interno', mensaje: 'Error interno del servidor' } } };
  }
}

/** POST /api/gemini: analiza un registro. */
export function manejarGemini(metodo, cuerpo, entorno) {
  return ejecutar(metodo, () => analizarTexto(cuerpo?.texto, configuracionDesdeEntorno(entorno)));
}

/** POST /api/chat: responde una pregunta con el contexto de registros. */
export function manejarChat(metodo, cuerpo, entorno) {
  return ejecutar(metodo, () => responderChat(cuerpo ?? {}, configuracionDesdeEntorno(entorno)));
}
