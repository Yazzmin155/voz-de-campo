// Interfaz de Voz de Campo: navegación SPA, toasts, modales, íconos Lucide y animaciones GSAP.
import { gsap } from 'gsap';
import {
  createIcons,
  Sprout,
  Package,
  ChevronRight,
  Settings,
  House,
  PenLine,
  History,
  Tractor,
  ShoppingCart,
  Mic,
  MicOff,
  Save,
  Play,
  Square,
  WifiOff,
  Volume2,
  ArrowLeft,
  ArrowLeftRight,
  Trash2,
  ShieldCheck,
  LifeBuoy,
  Info,
  Moon,
  Crown,
  Check,
  CircleCheck,
  CircleAlert,
  ClipboardList,
  Clock,
  Banknote,
  TriangleAlert,
  Send,
  MessageCircle,
  QrCode,
  ScanLine,
  FlaskConical,
  MapPin,
  Plus,
  Copy,
  ShieldAlert,
  ClipboardCheck,
} from 'lucide';

// Solo se registran los íconos usados, para que el bundle no incluya toda la librería.
const MAPA_ICONOS = {
  Sprout,
  Package,
  ChevronRight,
  Settings,
  House,
  PenLine,
  History,
  Tractor,
  ShoppingCart,
  Mic,
  MicOff,
  Save,
  Play,
  Square,
  WifiOff,
  Volume2,
  ArrowLeft,
  ArrowLeftRight,
  Trash2,
  ShieldCheck,
  LifeBuoy,
  Info,
  Moon,
  Crown,
  Check,
  CircleCheck,
  CircleAlert,
  ClipboardList,
  Clock,
  Banknote,
  TriangleAlert,
  Send,
  MessageCircle,
  QrCode,
  ScanLine,
  FlaskConical,
  MapPin,
  Plus,
  Copy,
  ShieldAlert,
  ClipboardCheck,
};

// Etiqueta, ícono y clase de color de cada categoría devuelta por la IA.
export const CATEGORIAS_UI = {
  cultivo: { etiqueta: 'Cultivo', icono: 'sprout', clase: 'categoria-cultivo' },
  inventario: { etiqueta: 'Inventario', icono: 'package', clase: 'categoria-inventario' },
  actividad: { etiqueta: 'Actividad', icono: 'clipboard-list', clase: 'categoria-actividad' },
  venta: { etiqueta: 'Venta', icono: 'banknote', clase: 'categoria-venta' },
  alerta: { etiqueta: 'Alerta', icono: 'triangle-alert', clase: 'categoria-alerta' },
};

// Foto de lote por cultivo. Cualquier cultivo sin foto propia usa la imagen general.
const FOTOS_LOTE = {
  naranja: 'lote-limon.webp',
  limon: 'lote-limon.webp',
  maiz: 'lote-maiz.webp',
  agave: 'lote-agave.webp',
};

/** Ruta de la foto de lote para un cultivo, respetando la base de publicación de la app. */
export function imagenLote(cultivo) {
  return `${import.meta.env.BASE_URL}assets/images/${FOTOS_LOTE[cultivo] ?? 'lote-general.webp'}`;
}

// Nombre legible de cada cultivo.
export const NOMBRES_CULTIVO = {
  naranja: 'Naranja',
  agave: 'Agave',
  maiz: 'Maíz',
  limon: 'Limón',
  jitomate: 'Jitomate',
  cebolla: 'Cebolla',
  otro: 'Otro',
};

// Pantallas que muestran la barra inferior.
const PANTALLAS_CON_NAV = ['dashboard', 'historial', 'micampo'];

// Menús de la barra inferior según el rol.
const MENUS = {
  productor: [
    { pantalla: 'dashboard', icono: 'house', texto: 'Inicio' },
    { pantalla: 'dashboard', icono: 'pen-line', texto: 'Registrar', enfocar: 'entrada-texto' },
    { pantalla: 'historial', icono: 'history', texto: 'Historial' },
    { pantalla: 'micampo', icono: 'tractor', texto: 'Mi Campo' },
  ],
  comprador: [
    { pantalla: 'dashboard', icono: 'house', texto: 'Inicio' },
    { pantalla: 'dashboard', icono: 'pen-line', texto: 'Registrar', enfocar: 'entrada-texto' },
    { pantalla: 'historial', icono: 'shopping-cart', texto: 'Mis Compras' },
  ],
};

const ICONOS_TOAST = {
  exito: ['circle-check', 'alert-success'],
  alerta: ['circle-alert', 'alert-warning'],
  error: ['circle-alert', 'alert-error'],
};

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const puedeHover = window.matchMedia('(hover: hover)').matches;

/** Devuelve la duración indicada, o 0 si el usuario pidió reducir el movimiento. */
export function duracion(segundos) {
  return reducirMovimiento ? 0 : segundos;
}

/** Renderiza los íconos Lucide de los elementos <i data-lucide>. */
export function refrescarIconos() {
  createIcons({ icons: MAPA_ICONOS });
}

/** Reemplaza el contenido de un contenedor por un ícono Lucide. */
export function cambiarIcono(contenedor, nombre, clases = 'h-5 w-5') {
  contenedor.innerHTML = `<i data-lucide="${nombre}" class="${clases}" aria-hidden="true"></i>`;
  refrescarIconos();
}

/** Anima propiedades de un elemento y devuelve una promesa que se resuelve al terminar. */
export function animar(objetivo, propiedades) {
  return new Promise((resolver) => {
    gsap.to(objetivo, { ...propiedades, onComplete: resolver });
  });
}

/** Efecto de presión en un botón: se encoge y regresa con un rebote elástico. */
export function efectoPresion(elemento) {
  if (reducirMovimiento) return Promise.resolve();
  return new Promise((resolver) => {
    gsap.fromTo(
      elemento,
      { scale: 0.92 },
      { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', onComplete: resolver }
    );
  });
}

/** Reflejo holográfico que cruza la tarjeta cada pocos segundos. */
export function activarHolografico(elemento) {
  if (reducirMovimiento || elemento.querySelector('.brillo')) return;

  const brillo = document.createElement('span');
  brillo.className = 'brillo';
  brillo.setAttribute('aria-hidden', 'true');
  elemento.classList.add('holografico');
  elemento.append(brillo);

  gsap.fromTo(
    brillo,
    { xPercent: -120 },
    { xPercent: 260, duration: 1.4, ease: 'power2.inOut', repeat: -1, repeatDelay: 3.5 }
  );
}

/** Radar de voz: ecualizador simulado que se mueve mientras se escucha. Las alturas son ilustrativas. */
export function iniciarRadar(contenedor) {
  if (!contenedor.childElementCount) {
    contenedor.replaceChildren(...Array.from({ length: 15 }, () => document.createElement('span')));
  }
  contenedor.hidden = false;
  if (reducirMovimiento) return null;

  const barras = contenedor.querySelectorAll('span');
  return gsap.timeline({ repeat: -1 }).to(barras, {
    scaleY: () => 0.25 + Math.random() * 1.6,
    duration: 0.22,
    stagger: { each: 0.03, repeat: 1, yoyo: true },
    ease: 'sine.inOut',
  });
}

/** Detiene el radar y lo oculta. */
export function detenerRadar(contenedor, linea) {
  linea?.kill();
  if (contenedor) {
    gsap.to(contenedor.querySelectorAll('span'), { scaleY: 0.2, duration: 0.2 });
    contenedor.hidden = true;
  }
}

/** Pulso continuo y suave (por ejemplo, el micrófono mientras escucha). */
export function iniciarPulso(elemento) {
  if (reducirMovimiento) return null;
  return gsap.to(elemento, { scale: 1.12, duration: 0.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
}

/** Detiene un pulso creado con iniciarPulso y restablece la escala. */
export function detenerPulso(elemento, pulso) {
  pulso?.kill();
  gsap.set(elemento, { scale: 1 });
}

/** Animación de entrada escalonada (fade-in + slide-up) para una lista de elementos. */
export function animarEntrada(elementos) {
  if (!elementos.length) return;
  gsap.fromTo(
    elementos,
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: duracion(0.5),
      stagger: duracion(0.08),
      ease: 'back.out(1.2)',
      clearProps: 'transform,opacity',
    }
  );
}

/** Micro-interacciones globales: hover y presión en botones. */
export function activarMicroInteracciones() {
  if (reducirMovimiento) return;

  document.addEventListener('pointerdown', (evento) => {
    const boton = evento.target.closest?.('.btn');
    if (boton) gsap.to(boton, { scale: 0.97, duration: 0.1, ease: 'power1.out', overwrite: 'auto' });
  });

  const soltar = (evento) => {
    const boton = evento.target.closest?.('.btn');
    if (boton) gsap.to(boton, { scale: 1, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
  };
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', soltar);

  if (puedeHover) {
    document.addEventListener('pointerover', (evento) => {
      const boton = evento.target.closest?.('.btn');
      if (boton) gsap.to(boton, { scale: 1.03, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
    });
    document.addEventListener('pointerout', (evento) => {
      const boton = evento.target.closest?.('.btn');
      if (boton && !boton.contains(evento.relatedTarget)) {
        gsap.to(boton, { scale: 1, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
      }
    });
  }
}

/** Devuelve el id de la pantalla visible, o null si ninguna está visible. */
export function pantallaActiva() {
  const visible = document.querySelector('.pantalla:not([hidden])');
  return visible ? visible.id.replace('pantalla-', '') : null;
}

// Cola de transiciones: evita que dos navegaciones se encimen.
let colaNavegacion = Promise.resolve();

/** Muestra una pantalla con transición de opacidad (fade out / fade in). */
export function mostrarPantalla(id) {
  colaNavegacion = colaNavegacion.then(() => transicion(id)).catch((error) => {
    console.error('Error al cambiar de pantalla:', error);
  });
  return colaNavegacion;
}

async function transicion(id) {
  const destino = document.getElementById(`pantalla-${id}`);
  if (!destino) return;

  const actual = document.querySelector('.pantalla:not([hidden])');
  if (actual === destino) return;

  if (actual) {
    await animar(actual, { opacity: 0, y: -8, duration: duracion(0.18), ease: 'power1.in' });
    actual.hidden = true;
  }

  gsap.set(destino, { opacity: 0, y: 12 });
  destino.hidden = false;
  window.scrollTo(0, 0);

  const nav = document.getElementById('bottom-nav');
  nav.hidden = !PANTALLAS_CON_NAV.includes(id) || nav.childElementCount === 0;
  actualizarNavActiva(id);

  await animar(destino, { opacity: 1, y: 0, duration: duracion(0.28), ease: 'power2.out', clearProps: 'transform,opacity' });
}

/** Genera la barra inferior según el rol elegido. */
export function renderizarNav(rol) {
  const nav = document.getElementById('bottom-nav');
  const items = MENUS[rol] ?? [];

  nav.innerHTML = items
    .map(
      (item) => `
        <button type="button" class="flex-1" data-ir="${item.pantalla}"${item.enfocar ? ` data-enfocar="${item.enfocar}"` : ''}>
          <i data-lucide="${item.icono}" class="h-5 w-5" aria-hidden="true"></i>
          <span class="dock-label">${item.texto}</span>
        </button>`
    )
    .join('');

  refrescarIconos();
  actualizarNavActiva(pantallaActiva());
}

/** Marca como activo el ítem de la barra que corresponde a la pantalla visible. */
export function actualizarNavActiva(id) {
  const nav = document.getElementById('bottom-nav');
  nav.querySelectorAll('button').forEach((boton) => {
    const activo = boton.dataset.ir === id && !boton.dataset.enfocar;
    boton.classList.toggle('dock-active', activo);
    if (activo) {
      boton.setAttribute('aria-current', 'page');
    } else {
      boton.removeAttribute('aria-current');
    }
  });
}

/** Muestra una notificación temporal (toast) de DaisyUI. */
export function mostrarToast(mensaje, tipo = 'exito') {
  const contenedor = document.getElementById('toasts');
  const [icono, clase] = ICONOS_TOAST[tipo] ?? ICONOS_TOAST.exito;

  const alerta = document.createElement('div');
  alerta.className = `alert ${clase} shadow-lg`;
  alerta.setAttribute('role', 'status');

  const texto = document.createElement('span');
  texto.className = 'text-sm font-medium';
  texto.textContent = mensaje;

  alerta.innerHTML = `<i data-lucide="${icono}" class="h-5 w-5 shrink-0" aria-hidden="true"></i>`;
  alerta.append(texto);
  contenedor.append(alerta);
  refrescarIconos();

  gsap.fromTo(alerta, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: duracion(0.3), ease: 'power2.out' });

  const duracionVisible = tipo === 'exito' ? 2600 : 3800;
  setTimeout(async () => {
    await animar(alerta, { opacity: 0, y: -8, duration: duracion(0.25) });
    alerta.remove();
  }, duracionVisible);
}

/** Actualiza el punto de conexión: verde en línea, ámbar sin conexión. */
export function actualizarConexion(enLinea) {
  const punto = document.getElementById('indicador-conexion');
  punto.className = `h-3 w-3 shrink-0 rounded-full ${enLinea ? 'bg-success' : 'bg-warning'}`;
  punto.setAttribute('aria-label', enLinea ? 'En línea' : 'Sin conexión');

  // Banner de zona sin señal: tranquiliza al usuario y explica que nada se pierde.
  const banner = document.getElementById('banner-red');
  if (banner) banner.hidden = enLinea;
}

// Temas disponibles. El id coincide con el nombre del tema definido en css/style.css.
export const TEMAS = [
  { id: 'esmeralda', nombre: 'Esmeralda Campo', color: '#f6c223' },
  { id: 'tierra', nombre: 'Tierra y Cosecha', color: '#b5651d' },
  { id: 'agave', nombre: 'Agave y Niebla', color: '#4f7f6f' },
  { id: 'solar', nombre: 'Alto Contraste Solar', color: '#ffd400' },
];

/** Aplica un tema y lo guarda para la próxima visita. Un id desconocido se ignora. */
export function aplicarTema(id) {
  if (!TEMAS.some((tema) => tema.id === id)) return;

  document.documentElement.setAttribute('data-theme', id);
  document.querySelectorAll('[data-tema-opcion]').forEach((boton) => {
    const activo = boton.dataset.temaOpcion === id;
    boton.setAttribute('aria-checked', String(activo));
    boton.classList.toggle('border-primary', activo);
    boton.classList.toggle('border-base-300', !activo);
  });

  try {
    localStorage.setItem('vdc_tema', id);
  } catch (error) {
    // Si el almacenamiento está bloqueado, el tema solo dura esta sesión.
  }
}

/** Muestra el banner flotante de sincronización con un spinner de DaisyUI. */
export function mostrarSincronizacion(mensaje) {
  const banner = document.getElementById('banner-sync');
  document.getElementById('texto-sync').textContent = mensaje;

  // Cancela un fade out pendiente para que el banner no desaparezca durante el análisis.
  const estabaOculto = banner.hidden;
  gsap.killTweensOf(banner);
  banner.hidden = false;
  if (estabaOculto) {
    gsap.fromTo(banner, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: duracion(0.25), ease: 'power2.out' });
  } else {
    gsap.set(banner, { opacity: 1, y: 0 });
  }
}

/** Oculta el banner de sincronización con un fade out. */
export function ocultarSincronizacion() {
  const banner = document.getElementById('banner-sync');
  if (banner.hidden) return;

  gsap.killTweensOf(banner);
  animar(banner, { opacity: 0, y: -8, duration: duracion(0.2) }).then(() => {
    if (banner.style.opacity === '0') banner.hidden = true;
  });
}

/** Abre un modal de DaisyUI con una pequeña animación de entrada. */
export function abrirModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.showModal();
  gsap.fromTo(
    modal.querySelector('.modal-box'),
    { y: 40, opacity: 0 },
    { y: 0, opacity: 1, duration: duracion(0.25), ease: 'power2.out', clearProps: 'transform,opacity' }
  );
}
