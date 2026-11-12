// Micro-sonidos de interfaz sintetizados con WebAudio. No necesitan archivos de audio.
const LLAVE_SONIDO = 'vdc_sonido';

let contexto = null;

/** Indica si los sonidos están activados. Por defecto sí. */
export function sonidosActivos() {
  try {
    return localStorage.getItem(LLAVE_SONIDO) !== 'off';
  } catch (error) {
    return true;
  }
}

/** Activa o desactiva los sonidos y lo guarda para la próxima visita. */
export function fijarSonidos(activo) {
  try {
    localStorage.setItem(LLAVE_SONIDO, activo ? 'on' : 'off');
  } catch (error) {
    // Sin almacenamiento, el ajuste dura solo esta sesión.
  }
}

/** Devuelve el contexto de audio, creándolo la primera vez. Los navegadores exigen un gesto del usuario. */
function obtenerContexto() {
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!Contexto) return null;

  contexto ??= new Contexto();
  if (contexto.state === 'suspended') contexto.resume();
  return contexto;
}

/** Toca un tono corto con envolvente suave para evitar clics. */
function tono({ frecuencia, hasta, inicio = 0, duracion = 0.12, tipo = 'sine', volumen = 0.15 }) {
  const audio = obtenerContexto();
  if (!audio) return;

  const t0 = audio.currentTime + inicio;
  const oscilador = audio.createOscillator();
  const ganancia = audio.createGain();

  oscilador.type = tipo;
  oscilador.frequency.setValueAtTime(frecuencia, t0);
  if (hasta) oscilador.frequency.exponentialRampToValueAtTime(hasta, t0 + duracion);

  ganancia.gain.setValueAtTime(0.0001, t0);
  ganancia.gain.exponentialRampToValueAtTime(volumen, t0 + 0.01);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);

  oscilador.connect(ganancia).connect(audio.destination);
  oscilador.start(t0);
  oscilador.stop(t0 + duracion + 0.02);
}

/**
 * Reproduce un sonido de interfaz:
 * confirmacion (registro guardado), radar (inicia el dictado), alerta (aviso legal) o toque.
 */
export function sonar(evento) {
  if (!sonidosActivos()) return;

  try {
    switch (evento) {
      case 'confirmacion':
        tono({ frecuencia: 660, duracion: 0.1 });
        tono({ frecuencia: 880, inicio: 0.08, duracion: 0.14 });
        break;
      case 'radar':
        tono({ frecuencia: 300, hasta: 900, duracion: 0.2, tipo: 'triangle' });
        break;
      case 'alerta':
        tono({ frecuencia: 520, duracion: 0.18, tipo: 'square', volumen: 0.07 });
        tono({ frecuencia: 520, inicio: 0.24, duracion: 0.18, tipo: 'square', volumen: 0.07 });
        break;
      case 'toque':
        tono({ frecuencia: 740, duracion: 0.05, volumen: 0.08 });
        break;
    }
  } catch (error) {
    // Un fallo de audio nunca debe afectar la app.
  }
}
