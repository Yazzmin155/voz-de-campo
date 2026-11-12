// Copiloto: responde con la IA en la nube si hay red y con el motor local si no.
import { ENDPOINT_CHAT } from './config.js';
import { estaEnLinea } from './network.js';
import { responderLocal, construirContexto } from './copiloto-local.js';

/**
 * Responde una pregunta. Devuelve { texto, origen, motivo? }:
 * origen es "nube" o "local"; si la nube falló, motivo dice por qué (tipo de error del proxy).
 */
export async function preguntarCopiloto(pregunta, registros) {
  if (!estaEnLinea()) {
    return { ...responderLocal(pregunta, registros), origen: 'local', motivo: 'sin-red' };
  }

  let motivo = 'red';
  try {
    const respuesta = await fetch(ENDPOINT_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta, contexto: construirContexto(registros) }),
    });
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (respuesta.ok && cuerpo.texto) return { texto: cuerpo.texto, origen: 'nube' };
    motivo = cuerpo?.error?.tipo ?? 'servidor';
  } catch (error) {
    console.warn('El chat con IA no respondió:', error);
  }

  return { ...responderLocal(pregunta, registros), origen: 'local', motivo };
}
