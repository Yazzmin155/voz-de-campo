// Orquestador de Voz de Campo: arranque, router, eventos globales y conexión entre módulos.
import '@fontsource-variable/outfit';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/jetbrains-mono';
import '../css/style.css';
import { estado } from './store.js';
import { sonidosActivos, fijarSonidos, sonar } from './audio.js';
import { iniciarRouter, irA } from './router.js';
import { iniciarRed, suscribirRed } from './network.js';
import { iniciarActualizacion } from './actualizacion.js';
import { cargarRegistros } from './datos.js';
import { $, alternarLectura } from './componentes.js';
import { sincronizarPendientes, alTerminarSincronizacion } from './sincronizacion.js';
import { detenerDictado, cancelarLectura, probarMicrofono } from './voz.js';
import {
  refrescarIconos,
  activarMicroInteracciones,
  mostrarPantalla,
  pantallaActiva,
  renderizarNav,
  actualizarConexion,
  aplicarTema,
  abrirModal,
  mostrarToast,
  TEMAS,
} from './ui.js';
import { arrancarInicio, configurarInicio } from './pantallas/inicio.js';
import { renderDashboard, configurarDashboard } from './pantallas/dashboard.js';
import { renderHistorial } from './pantallas/historial.js';
import { renderMiCampo, configurarMiCampo } from './pantallas/micampo.js';
import { renderChat, configurarChat } from './pantallas/chat.js';
import {
  renderPasaporte,
  emitirPasaporte,
  copiarCodigo,
  verificarCodigo,
  iniciarEscaner,
  detenerEscaner,
} from './pantallas/pasaporte.js';
import { configurarGodMode } from './god-mode.js';

iniciar();

/** Arranca la app: prepara eventos y red, muestra el splash y sincroniza en segundo plano. */
async function iniciar() {
  refrescarIconos();
  activarMicroInteracciones();

  // La barra inferior se regenera cada vez que cambia el rol.
  estado.subscribe((valor, cambios) => {
    if ('rol' in cambios && valor.rol) renderizarNav(valor.rol);
  });

  iniciarRouter(mostrarYRenderizar);
  configurarEventos();
  alTerminarSincronizacion(() => renderPantalla(pantallaActiva()));

  iniciarRed();
  iniciarActualizacion();
  renderSelectorTemas();
  $('toggle-sonido').checked = sonidosActivos();

  await arrancarInicio();

  // La sincronización corre en segundo plano y no bloquea la interfaz.
  sincronizarPendientes({ silencioso: true });
}

/** Muestra una pantalla y la renderiza. El router la llama tanto al navegar como con el botón atrás. */
async function mostrarYRenderizar(pantalla, { enfocar } = {}) {
  // Apaga la cámara si el usuario sale del pasaporte.
  detenerEscaner();
  cancelarLectura();
  estado.set({ leyendo: null });
  if (estado.get('dictando')) detenerDictado();

  await cargarRegistros();
  await mostrarPantalla(pantalla);
  renderPantalla(pantalla);

  if (enfocar) $(enfocar)?.focus();
}

/** Muestra las cuatro opciones de tema con su muestra de color y marca la activa. */
function renderSelectorTemas() {
  $('selector-temas').replaceChildren(
    ...TEMAS.map((tema) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.setAttribute('role', 'radio');
      boton.dataset.temaOpcion = tema.id;
      boton.className = 'flex flex-col items-start gap-2 rounded-box border-2 bg-base-100 p-3 text-left';
      boton.innerHTML = `<span class="h-6 w-6 rounded-full border border-base-300" style="background-color: ${tema.color}" aria-hidden="true"></span>`;

      const nombre = document.createElement('span');
      nombre.className = 'text-sm font-semibold';
      nombre.textContent = tema.nombre;
      boton.append(nombre);

      boton.addEventListener('click', () => {
        aplicarTema(tema.id);
        sonar('toque');
      });
      return boton;
    })
  );

  aplicarTema(document.documentElement.dataset.theme);
}

/** Llena una pantalla con los datos actuales. */
function renderPantalla(id) {
  if (id === 'dashboard') renderDashboard();
  if (id === 'historial') renderHistorial();
  if (id === 'micampo') renderMiCampo();
  if (id === 'chat') renderChat();
  if (id === 'pasaporte') renderPasaporte();
  if (id === 'rol') $('btn-rol-volver').hidden = !estado.get('rol');
}

/** Conecta los eventos globales: navegación delegada, modales, Play, ajustes y conectividad. */
function configurarEventos() {
  configurarInicio();
  configurarDashboard();
  configurarMiCampo();
  configurarChat();
  configurarGodMode(() => renderPantalla(pantallaActiva()));

  $('btn-emitir-pasaporte').addEventListener('click', emitirPasaporte);
  $('btn-copiar-pasaporte').addEventListener('click', copiarCodigo);
  $('btn-escanear').addEventListener('click', iniciarEscaner);
  $('btn-detener-escaner').addEventListener('click', detenerEscaner);
  $('btn-verificar').addEventListener('click', () => verificarCodigo($('pasaporte-pegado').value.trim()));

  $('btn-ajuste-rol').addEventListener('click', () => irA('rol'));
  $('btn-probar-microfono').addEventListener('click', async () => {
    const boton = $('btn-probar-microfono');
    boton.disabled = true;
    $('estado-microfono').textContent = 'Probando...';
    const { ok, mensaje } = await probarMicrofono();
    $('estado-microfono').textContent = mensaje;
    boton.disabled = false;
    mostrarToast(mensaje, ok ? 'exito' : 'alerta');
  });
  $('toggle-sonido').addEventListener('change', (evento) => {
    fijarSonidos(evento.target.checked);
    if (evento.target.checked) sonar('toque');
  });

  document.addEventListener('click', (evento) => {
    const cerrar = evento.target.closest('[data-cerrar]');
    if (cerrar) {
      cerrar.closest('dialog')?.close();
      return;
    }

    const modal = evento.target.closest('[data-modal]');
    if (modal) {
      abrirModal(modal.dataset.modal);
      return;
    }

    const destino = evento.target.closest('[data-ir]');
    if (destino) {
      irA(destino.dataset.ir, { enfocar: destino.dataset.enfocar });
      return;
    }

    const leer = evento.target.closest('.btn-leer');
    if (leer) alternarLectura(Number(leer.closest('article').dataset.id));
  });

  // Al recuperar la conexión, se analizan los registros que quedaron pendientes.
  suscribirRed((enLinea) => {
    actualizarConexion(enLinea);
    if (enLinea) sincronizarPendientes({ silencioso: true });
  });
}
