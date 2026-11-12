// Navegación con el historial del navegador: el botón atrás de Android vuelve a la pantalla anterior.

let alCambiar = null;
let pantallaActual = null;

/** Registra la función que muestra y renderiza una pantalla, y escucha el botón atrás. */
export function iniciarRouter(manejador) {
  alCambiar = manejador;

  window.addEventListener('popstate', (evento) => {
    const id = evento.state?.pantalla;
    if (!id) return;
    pantallaActual = id;
    alCambiar(id, { desdeHistorial: true });
  });
}

/**
 * Navega a una pantalla. Por defecto añade una entrada al historial.
 * Con reemplazar: true no se añade entrada (útil para splash, onboarding y redirecciones).
 */
export function navegar(id, { reemplazar = false, enfocar } = {}) {
  if (reemplazar) {
    history.replaceState({ pantalla: id }, '', `#${id}`);
  } else if (pantallaActual !== id) {
    history.pushState({ pantalla: id }, '', `#${id}`);
  }

  pantallaActual = id;
  return alCambiar(id, { desdeHistorial: false, enfocar });
}

/** Atajo para navegar sin enfocar ni reemplazar, o con las opciones indicadas. */
export function irA(pantalla, opciones = {}) {
  return navegar(pantalla, opciones);
}

/** Pantalla que se muestra en este momento según el router. */
export function pantallaRouter() {
  return pantallaActual;
}
