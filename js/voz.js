// Manejo de voz: dictado (SpeechRecognition) y lectura (SpeechSynthesis).

// Compatibilidad: Chrome y Edge usan el prefijo webkit.
const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;

export const dictadoDisponible = Boolean(Reconocimiento);

let reconocimiento = null;

/**
 * Inicia el dictado en español de México.
 * onTexto recibe el texto reconocido; onError recibe un código de error; onFin se llama al terminar.
 * Devuelve true si la escucha inició correctamente.
 */
export function iniciarDictado({ onTexto, onError, onFin } = {}) {
  if (!dictadoDisponible) {
    onError?.('no-soportado');
    return false;
  }

  detenerDictado();

  const escucha = new Reconocimiento();
  escucha.lang = 'es-MX';
  escucha.interimResults = false;
  escucha.continuous = false;
  escucha.maxAlternatives = 1;

  escucha.onresult = (evento) => {
    const texto = evento.results[0]?.[0]?.transcript ?? '';
    onTexto?.(texto.trim());
  };

  escucha.onerror = (evento) => onError?.(evento.error);

  escucha.onend = () => {
    if (reconocimiento === escucha) reconocimiento = null;
    onFin?.();
  };

  reconocimiento = escucha;

  try {
    escucha.start();
    return true;
  } catch (error) {
    reconocimiento = null;
    onError?.(error.name);
    return false;
  }
}

/** Detiene el dictado en curso y conserva lo que ya se reconoció. */
export function detenerDictado() {
  if (!reconocimiento) return;
  const escucha = reconocimiento;
  reconocimiento = null;
  try {
    escucha.stop();
  } catch (error) {
    // Si ya estaba detenido, no hace falta hacer nada.
  }
}

/** Cancela la lectura en voz alta en curso. */
export function cancelarLectura() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/**
 * Revisa si el dispositivo puede dictar: navegador compatible, micrófono conectado y permiso concedido.
 * Devuelve 'listo', 'sin-microfono', 'denegado' o 'no-soportado'.
 */
export async function estadoMicrofono() {
  if (!navigator.mediaDevices?.enumerateDevices) return 'no-soportado';

  const dispositivos = await navigator.mediaDevices.enumerateDevices();
  if (!dispositivos.some((dispositivo) => dispositivo.kind === 'audioinput')) return 'sin-microfono';

  try {
    const permiso = await navigator.permissions.query({ name: 'microphone' });
    if (permiso.state === 'denied') return 'denegado';
  } catch (error) {
    // Algunos navegadores no permiten consultar el permiso: se intenta igual al dictar.
  }

  return 'listo';
}

/**
 * Abre el micrófono unos instantes para confirmar que funciona y devuelve un mensaje para el usuario.
 */
export async function probarMicrofono() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, mensaje: 'Este navegador no permite usar el micrófono' };
  }

  try {
    const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pista = flujo.getAudioTracks()[0];
    const nombre = pista?.label || 'micrófono predeterminado';
    flujo.getTracks().forEach((track) => track.stop());
    return { ok: true, mensaje: `Listo: ${nombre}` };
  } catch (error) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return { ok: false, mensaje: 'Permiso denegado. Actívalo en el navegador.' };
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return { ok: false, mensaje: 'No encontramos ningún micrófono' };
    }
    if (error.name === 'NotReadableError') {
      return { ok: false, mensaje: 'El micrófono está ocupado por otra app' };
    }
    return { ok: false, mensaje: 'No se pudo abrir el micrófono' };
  }
}

/**
 * Lee un texto en voz alta usando una voz en español.
 * Si el navegador aún no carga sus voces, usa la voz predeterminada en lugar de quedarse en silencio.
 */
export function hablar(texto, { onFin } = {}) {
  if (!('speechSynthesis' in window)) return false;

  const voces = window.speechSynthesis.getVoices();
  const vozEspanol = voces.find((voz) => /^es-MX/i.test(voz.lang)) ?? voces.find((voz) => /^es/i.test(voz.lang));

  cancelarLectura();

  const enunciado = new SpeechSynthesisUtterance(texto);
  enunciado.lang = vozEspanol?.lang ?? 'es-MX';
  if (vozEspanol) enunciado.voice = vozEspanol;
  enunciado.rate = 0.95;
  enunciado.onend = () => onFin?.();
  enunciado.onerror = () => onFin?.();

  window.speechSynthesis.speak(enunciado);
  return true;
}
