// Carga de datos desde IndexedDB hacia el store: perfil (rol) y registros.
import { abrirDB, obtenerRegistros, obtenerRol } from './db.js';
import { estado } from './store.js';
import { mostrarToast } from './ui.js';

/** Abre la base de datos y lee el rol guardado. Si falla, avisa sin bloquear la app. */
export async function cargarPerfil() {
  try {
    await abrirDB();
    estado.set({ rol: await obtenerRol() });
  } catch (error) {
    console.error('No se pudo leer el perfil:', error);
    mostrarToast('No se pudo abrir el almacenamiento del teléfono', 'error');
  }
}

/** Lee todos los registros de IndexedDB y los guarda en el store. */
export async function cargarRegistros() {
  try {
    estado.set({ registros: await obtenerRegistros() });
  } catch (error) {
    console.error('No se pudieron leer los registros:', error);
    mostrarToast('No se pudieron cargar tus registros', 'error');
  }
}

/** Registros del rol actual, del más reciente al más antiguo. */
export function registrosDelRol() {
  const rol = estado.get('rol');
  return estado.get('registros').filter((registro) => registro.rol === rol);
}
