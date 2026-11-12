// Historial: lista completa de registros del rol actual, con estado vacío y llamada a la acción.
import { estado } from '../store.js';
import { registrosDelRol } from '../datos.js';
import { $, crearVacio, crearTarjeta, actualizarBotonesLectura } from '../componentes.js';
import { animarEntrada, refrescarIconos } from '../ui.js';

/** Renderiza la lista completa de registros o un estado vacío con llamada a la acción. */
export function renderHistorial() {
  const productor = estado.get('rol') === 'productor';
  const registros = registrosDelRol();
  const lista = $('lista-historial');
  const vacio = $('vacio-historial');

  $('titulo-historial').textContent = productor ? 'Historial' : 'Mis Compras';

  if (registros.length === 0) {
    lista.replaceChildren();
    lista.hidden = true;
    vacio.hidden = false;
    vacio.replaceChildren(
      crearVacio({
        icono: 'clipboard-list',
        titulo: 'Aún no tienes registros',
        texto: 'Dicta o escribe tu primer registro y aparecerá aquí.',
        accion: 'Crear registro',
      })
    );
  } else {
    lista.hidden = false;
    vacio.hidden = true;
    lista.replaceChildren(...registros.map(crearTarjeta));
  }

  refrescarIconos();
  actualizarBotonesLectura();
  animarEntrada(Array.from((registros.length ? lista : vacio).children));
}
