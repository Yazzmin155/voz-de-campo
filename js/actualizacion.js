// Actualizaciones de la app: avisa cuando hay una nueva versión del Service Worker y la aplica solo si el usuario lo pide.

let actualizacionPedidaPorUsuario = false;

/** Registra el Service Worker (solo en producción) y muestra el aviso de nueva versión cuando corresponde. */
export function iniciarActualizacion() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  // Al aplicar una actualización, la página se recarga una sola vez para usar la versión nueva.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (actualizacionPedidaPorUsuario) window.location.reload();
  });

  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((registro) => {
      if (registro.waiting && navigator.serviceWorker.controller) mostrarAviso(registro);

      registro.addEventListener('updatefound', () => {
        const nueva = registro.installing;
        nueva?.addEventListener('statechange', () => {
          if (nueva.state === 'installed' && navigator.serviceWorker.controller) mostrarAviso(registro);
        });
      });
    })
    .catch((error) => console.error('No se pudo registrar el Service Worker:', error));
}

/** Muestra el banner de nueva versión con el botón para actualizar. */
function mostrarAviso(registro) {
  const banner = document.getElementById('banner-actualizacion');
  const boton = document.getElementById('btn-actualizar');
  if (!banner || !boton) return;

  banner.hidden = false;
  boton.onclick = () => {
    actualizacionPedidaPorUsuario = true;
    registro.waiting?.postMessage('SKIP_WAITING');
  };
}
