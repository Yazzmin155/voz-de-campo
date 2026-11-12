// Dashboard: escudo legal, resumen, captura por voz o texto, guardado y últimos registros.
import { gsap } from 'gsap';
import { guardarRegistro, obtenerParcelas } from '../db.js';
import { estado } from '../store.js';
import { iniciarDictado, detenerDictado, estadoMicrofono } from '../voz.js';
import { analizarLocal } from '../motorLocal.js';
import { sincronizarPendientes } from '../sincronizacion.js';
import { cargarRegistros, registrosDelRol } from '../datos.js';
import { $, crearVacio, crearTarjeta, actualizarBotonesLectura } from '../componentes.js';
import { sonar } from '../audio.js';
import {
  cambiarIcono,
  iniciarPulso,
  detenerPulso,
  efectoPresion,
  animarEntrada,
  refrescarIconos,
  mostrarToast,
  activarHolografico,
  iniciarRadar,
  detenerRadar,
} from '../ui.js';

const DIAS_VENTANA_ESCUDO = 30;
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let brilloEscudo = null;
let lineaRadar = null;

/** Renderiza el dashboard según el rol: textos, escudo legal, resumen, Plan Pro y registros recientes. */
export function renderDashboard() {
  const productor = estado.get('rol') === 'productor';
  const propios = registrosDelRol();

  $('saludo').textContent = productor ? 'Hola, Productor' : 'Hola, Comprador';
  $('entrada-texto').placeholder = productor
    ? 'Ej. Hoy vendí 3 bultos de frijol a 800 pesos...'
    : 'Ej. Compré 20 kilos de maíz a 9 pesos...';
  $('titulo-recientes').textContent = productor ? 'Últimos registros' : 'Mis Compras';
  $('bloque-plan-pro').hidden = productor;
  $('acceso-pasaporte-texto').textContent = productor ? 'Pasaporte QR' : 'Escanear lote';
  llenarSelectorParcela();

  $('stat-total').textContent = propios.length;
  $('stat-pendientes').textContent = propios.filter((registro) => registro.estado === 'pendiente').length;

  renderEscudo(propios, productor);

  const lista = $('lista-recientes');
  const recientes = propios.slice(0, 2);
  if (recientes.length === 0) {
    lista.replaceChildren(
      crearVacio({
        icono: 'clipboard-list',
        titulo: 'Aún no tienes registros',
        texto: 'Dicta o escribe tu primer registro y aparecerá aquí.',
      })
    );
  } else {
    lista.replaceChildren(...recientes.map(crearTarjeta));
  }

  refrescarIconos();
  actualizarBotonesLectura();
  animarEntrada(Array.from(lista.children));
}

/** Rellena el selector de parcela con las del rol actual. Solo el productor asigna parcelas. */
async function llenarSelectorParcela() {
  const selector = $('entrada-parcela');
  const productor = estado.get('rol') === 'productor';
  selector.hidden = !productor;
  if (!productor) return;

  try {
    const parcelas = (await obtenerParcelas()).filter((parcela) => parcela.rol === 'productor');
    const actual = selector.value;
    selector.replaceChildren(new Option('Sin parcela', ''), ...parcelas.map((parcela) => new Option(parcela.nombre, parcela.id)));
    selector.value = actual;
  } catch (error) {
    console.error('No se pudieron leer las parcelas:', error);
  }
}

/** Escudo legal: cuenta los avisos de los últimos 30 días. Con avisos, la tarjeta respira con un brillo ámbar. */
function renderEscudo(propios, productor) {
  const tarjeta = $('tarjeta-escudo');
  tarjeta.hidden = !productor;
  if (!productor) return;

  const desde = Date.now() - DIAS_VENTANA_ESCUDO * 86400000;
  const avisos = propios.filter((registro) => registro.alerta && registro.fecha >= desde).length;
  const icono = $('escudo-icono');

  if (avisos === 0) {
    icono.className = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success text-success-content';
    $('escudo-titulo').textContent = 'Todo en orden';
    $('escudo-detalle').textContent = `Sin avisos legales en los últimos ${DIAS_VENTANA_ESCUDO} días.`;
    detenerBrilloEscudo(tarjeta);
    return;
  }

  icono.className = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-warning text-warning-content';
  $('escudo-titulo').textContent = avisos === 1 ? 'Un aviso legal' : `${avisos} avisos legales`;
  $('escudo-detalle').textContent = 'Revisa tus tickets de agroquímicos, permisos de riego y contratos de venta.';
  iniciarBrilloEscudo(tarjeta);
}

/** Respiración lumínica ámbar de la tarjeta del escudo, mientras haya avisos. */
function iniciarBrilloEscudo(tarjeta) {
  if (reducirMovimiento || brilloEscudo) return;
  brilloEscudo = gsap.to(tarjeta, {
    boxShadow: '0 0 0 4px rgb(237 129 49 / 0.25), 0 0 28px 4px rgb(237 129 49 / 0.45)',
    duration: 1.6,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });
}

/** Detiene la respiración del escudo y limpia el brillo. */
function detenerBrilloEscudo(tarjeta) {
  brilloEscudo?.kill();
  brilloEscudo = null;
  gsap.set(tarjeta, { clearProps: 'boxShadow' });
}

/** Traduce los códigos de error de la Web Speech API a mensajes para el usuario. */
function mensajeErrorVoz(codigo) {
  switch (codigo) {
    case 'no-soportado':
      return 'Tu navegador no soporta dictado. Usa Chrome o Edge.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Activa el permiso del micrófono en tu navegador.';
    case 'audio-capture':
      return 'No encontramos un micrófono. Revisa que esté conectado.';
    case 'network':
      return 'El dictado necesita internet en este navegador.';
    case 'no-speech':
      return 'No escuchamos nada. Habla cerca del micrófono.';
    default:
      return 'No se pudo escuchar, intenta de nuevo';
  }
}

/** Mensajes para cuando el micrófono no está listo antes de empezar a dictar. */
const MENSAJE_ESTADO_MIC = {
  'sin-microfono': 'No encontramos un micrófono en este dispositivo',
  denegado: 'Activa el permiso del micrófono en tu navegador',
};

/** Actualiza el micrófono, el radar y el indicador "Escuchando...". */
function setDictando(activo) {
  estado.set({ dictando: activo });
  const boton = $('btn-microfono');

  boton.setAttribute('aria-pressed', String(activo));
  boton.setAttribute('aria-label', activo ? 'Detener dictado' : 'Dictar por voz');
  cambiarIcono(boton, activo ? 'mic-off' : 'mic', 'h-5 w-5');
  $('estado-dictado').hidden = !activo;

  detenerPulso(boton, estado.get('pulsoMic'));
  estado.set({ pulsoMic: activo ? iniciarPulso(boton) : null });

  if (activo) {
    lineaRadar = iniciarRadar($('radar-voz'));
    sonar('radar');
  } else {
    detenerRadar($('radar-voz'), lineaRadar);
    lineaRadar = null;
  }
}

/** Inicia o detiene el dictado. El texto reconocido se añade a la barra de entrada. */
async function alternarDictado() {
  if (estado.get('dictando')) {
    detenerDictado();
    return;
  }

  const microfono = await estadoMicrofono();
  if (MENSAJE_ESTADO_MIC[microfono]) {
    mostrarToast(MENSAJE_ESTADO_MIC[microfono], 'alerta');
    return;
  }

  const iniciado = iniciarDictado({
    onTexto: (texto) => {
      if (!texto) return;
      const entrada = $('entrada-texto');
      entrada.value = [entrada.value.trim(), texto].filter(Boolean).join(' ');
    },
    onError: (codigo) => {
      setDictando(false);
      if (codigo !== 'aborted') mostrarToast(mensajeErrorVoz(codigo), 'alerta');
    },
    onFin: () => setDictando(false),
  });

  setDictando(iniciado);
}

/** Valida el texto, guarda el registro con el análisis local y lo envía a la IA si hay conexión. */
async function guardar(boton) {
  const entrada = $('entrada-texto');
  const texto = entrada.value.trim();

  if (!texto) {
    mostrarToast('Escribe o dicta tu registro antes de guardar', 'alerta');
    return;
  }

  if (estado.get('dictando')) detenerDictado();
  await efectoPresion(boton);

  try {
    // El motor local clasifica al instante, sin red. La IA lo audita después, si hay conexión.
    const analisis = analizarLocal(texto);
    const parcelaId = Number($('entrada-parcela').value) || null;
    await guardarRegistro({ rol: estado.get('rol'), texto, parcelaId, ...analisis });
    entrada.value = '';
    await cargarRegistros();
    renderDashboard();
    mostrarToast('Registro guardado');
    sonar(analisis.alerta ? 'alerta' : 'confirmacion');
    sincronizarPendientes();
  } catch (error) {
    console.error('No se pudo guardar el registro:', error);
    mostrarToast('No se pudo guardar el registro, intenta de nuevo', 'error');
  }
}

/** Conecta el micrófono, el guardado y el brillo holográfico de la tarjeta Plan Pro. */
export function configurarDashboard() {
  $('btn-microfono').addEventListener('click', alternarDictado);
  $('btn-guardar').addEventListener('click', (evento) => guardar(evento.currentTarget));
  activarHolografico($('bloque-plan-pro'));
}
