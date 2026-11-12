// Chat copiloto con Gemini en la nube. Responde preguntas usando solo el contexto de registros que envía la app.
import { ErrorProxy } from './gemini-core.mjs';

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELO_POR_DEFECTO = 'gemini-3.5-flash-lite';
const MAX_PREGUNTA = 300;
const MAX_CONTEXTO = 6000;

const PROMPT_CHAT = `Eres el copiloto agrícola de Voz de Campo, para pequeños productores y compradores de México.
Responde en español, en dos o cuatro frases claras y accionables.
Usa SOLO la información de los registros que se te dan. Si la pregunta no se puede responder con ellos, dilo y sugiere qué registrar.
No inventes cantidades, fechas ni precios. Si mencionas agroquímicos, recuerda consultar la etiqueta y a SENASICA.`;

/**
 * Responde una pregunta con Gemini usando el contexto de registros.
 * @param {{ pregunta: string, contexto?: string }} entrada
 * @param {{ apiKey?: string, modelo?: string }} opciones
 */
export async function responderChat({ pregunta, contexto = '' }, { apiKey, modelo = MODELO_POR_DEFECTO } = {}) {
  if (!apiKey) throw new ErrorProxy('sin-clave', 'El servidor no tiene API Key de Gemini configurada');
  if (typeof pregunta !== 'string' || !pregunta.trim()) {
    throw new ErrorProxy('peticion-invalida', 'La pregunta es obligatoria', 400);
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 20000);

  try {
    const respuesta = await fetch(`${URL_BASE}/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controlador.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT_CHAT }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Registros del usuario:\n"""${String(contexto).slice(0, MAX_CONTEXTO)}"""\n\nPregunta: ${pregunta.slice(0, MAX_PREGUNTA)}`,
              },
            ],
          },
        ],
        // Los modelos Gemini 3 gastan tokens en razonamiento: con un límite bajo la respuesta llega vacía.
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    });

    if (!respuesta.ok) {
      if (respuesta.status === 429) throw new ErrorProxy('cuota', 'Límite de uso de Gemini alcanzado', 429);
      throw new ErrorProxy('servidor', `Error del servicio de Gemini (${respuesta.status})`, 502);
    }

    const cuerpo = await respuesta.json();
    const partes = cuerpo?.candidates?.[0]?.content?.parts ?? [];
    const texto = partes
      .filter((parte) => !parte.thought && typeof parte.text === 'string')
      .map((parte) => parte.text)
      .join('')
      .trim();
    if (!texto) throw new ErrorProxy('respuesta-invalida', 'Gemini no devolvió respuesta', 502);

    return { texto };
  } catch (error) {
    if (error instanceof ErrorProxy) throw error;
    if (error.name === 'AbortError') throw new ErrorProxy('timeout', 'Gemini tardó demasiado en responder', 504);
    throw new ErrorProxy('red', 'No se pudo contactar a Gemini', 502);
  } finally {
    clearTimeout(temporizador);
  }
}
