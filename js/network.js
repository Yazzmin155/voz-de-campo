// Conectividad: detecta la red real, permite simular "zona sin señal" y avisa a la app cuando cambia.

const suscriptores = new Set();
let simulacionSinRed = false;

/** Indica si hay conexión, teniendo en cuenta la simulación de zona sin señal. */
export function estaEnLinea() {
  return !simulacionSinRed && navigator.onLine;
}

/** Suscribe una función que recibe true/false cada vez que cambia la conexión. Devuelve la función para cancelar. */
export function suscribirRed(funcion) {
  suscriptores.add(funcion);
  return () => suscriptores.delete(funcion);
}

/** Activa o desactiva la simulación de zona sin señal (útil para demos). */
export function simularSinRed(activa) {
  simulacionSinRed = activa;
  notificar();
}

/** Empieza a escuchar los eventos online y offline del navegador. */
export function iniciarRed() {
  window.addEventListener('online', notificar);
  window.addEventListener('offline', notificar);
  notificar();
}

/** Avisa a todos los suscriptores del estado actual. */
function notificar() {
  const enLinea = estaEnLinea();
  suscriptores.forEach((funcion) => funcion(enLinea));
}
