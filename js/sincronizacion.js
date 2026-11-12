// Sincronización con la IA: analiza los registros pendientes uno a uno y los marca como sincronizados.
import { obtenerPendientes, actualizarRegistro } from './db.js';
import { analizarRegistro } from './gemini.js';
import { estaEnLinea } from './network.js';
import { estado } from './store.js';
import { mostrarToast, mostrarSincronizacion, ocultarSincronizacion } from './ui.js';
import { cargarRegistros } from './datos.js';
import { plural } from './componentes.js';

const MAX_ANALISIS_POR_PASADA = 10;
const PAUSA_ENTRE_ANALISIS_MS = 1200;
// Errores que detienen la pasada completa: seguir solo gastaría llamadas fallidas.
const ERRORES_QUE_DETIENEN = ['sin-clave', 'clave-invalida', 'cuota', 'red', 'timeout'];

let alTerminar = () => {};

/** Registra la función que se ejecuta al terminar una pasada (normalmente, para re-renderizar). */
export function alTerminarSincronizacion(funcion) {
  alTerminar = funcion;
}

/** Analiza los registros pendientes con la IA y los marca como sincronizados. */
export async function sincronizarPendientes({ silencioso = false } = {}) {
  if (estado.get('sincronizando') || !estaEnLinea()) return;

  let pendientes;
  try {
    pendientes = (await obtenerPendientes()).slice(0, MAX_ANALISIS_POR_PASADA);
  } catch (error) {
    console.error('No se pudieron leer los pendientes:', error);
    return;
  }
  if (pendientes.length === 0) return;

  estado.set({ sincronizando: true });
  let analizados = 0;
  let mensajeError = null;

  try {
    for (const [indice, registro] of pendientes.entries()) {
      mostrarSincronizacion(`Analizando con IA (${indice + 1} de ${pendientes.length})...`);

      try {
        const analisis = await analizarRegistro(registro.texto);
        await actualizarRegistro(registro.id, { ...analisis, estado: 'sincronizado', auditadoPor: 'gemini', confianza: 'alta' });
        analizados++;
      } catch (error) {
        console.error('No se pudo analizar el registro:', error);
        // En segundo plano no se avisa por falta de configuración: lo verá quien desarrolla.
        if (!(silencioso && error.tipo === 'sin-clave')) mensajeError = mensajeErrorIA(error);
        if (ERRORES_QUE_DETIENEN.includes(error.tipo)) break;
      }

      if (indice < pendientes.length - 1) await esperar(PAUSA_ENTRE_ANALISIS_MS);
    }
  } finally {
    estado.set({ sincronizando: false });
    ocultarSincronizacion();
    await cargarRegistros();
    alTerminar();
  }

  if (mensajeError) {
    mostrarToast(mensajeError, 'alerta');
  } else if (analizados > 0) {
    mostrarToast(plural(analizados, 'registro analizado', 'registros analizados'));
  }
}

/** Traduce un error de la IA a un mensaje para el usuario. */
function mensajeErrorIA(error) {
  switch (error.tipo) {
    case 'sin-clave':
      return 'El servicio de IA no está configurado en el servidor';
    case 'clave-invalida':
      return 'La API Key de Gemini no es válida';
    case 'cuota':
      return 'Límite de Gemini alcanzado. Los registros seguirán pendientes';
    case 'red':
    case 'timeout':
      return 'Sin conexión con Gemini. Se reintentará al volver la red';
    default:
      return 'No se pudo analizar un registro. Se reintentará después';
  }
}

/** Pausa asíncrona para no saturar el límite de la API. */
function esperar(milisegundos) {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}
