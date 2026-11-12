// Pantallas de inicio: splash, onboarding y selección de rol.
import { gsap } from 'gsap';
import { cambiarRol } from '../db.js';
import { estado } from '../store.js';
import { irA } from '../router.js';
import { animar, duracion, efectoPresion, mostrarToast } from '../ui.js';
import { cargarPerfil } from '../datos.js';
import { $ } from '../componentes.js';

const LLAVE_ONBOARDING = 'vdc_onboarding_visto';
const TOTAL_SLIDES = 3;
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const LLAVE_SPLASH = 'vdc_splash_visto';

/** Carga el perfil y decide la primera pantalla. El splash animado solo se muestra la primera vez. */
export async function arrancarInicio() {
  if (splashVisto()) {
    $('pantalla-splash').hidden = true;
    await cargarPerfil();
    await decidirRuta();
    return;
  }

  await Promise.all([cargarPerfil(), animarSplash()]);
  await ocultarSplash();
  marcarSplashVisto();
  await decidirRuta();
}

/** Indica si el splash ya se mostró en esta instalación. */
function splashVisto() {
  try {
    return localStorage.getItem(LLAVE_SPLASH) === '1';
  } catch (error) {
    return false;
  }
}

/** Guarda que el splash ya se mostró, para no repetirlo en cada apertura. */
function marcarSplashVisto() {
  try {
    localStorage.setItem(LLAVE_SPLASH, '1');
  } catch (error) {
    // Sin almacenamiento, el splash volverá a mostrarse en la próxima visita.
  }
}

/** Decide qué pantalla mostrar tras el splash: onboarding (primera vez), rol o dashboard. */
async function decidirRuta() {
  if (!onboardingVisto()) {
    await irA('onboarding', { reemplazar: true });
    return;
  }
  await irA(estado.get('rol') ? 'dashboard' : 'rol', { reemplazar: true });
}

/** Separa el título en letras para animarlas una por una. */
function prepararTitulo() {
  const titulo = $('splash-titulo');
  const letras = Array.from(titulo.textContent).map((caracter) => {
    const span = document.createElement('span');
    span.className = 'letra';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = caracter === ' ' ? '\u00a0' : caracter;
    return span;
  });
  titulo.replaceChildren(...letras);
}

/** Anima el splash (logo, texto y barra de progreso de 2 segundos). Se resuelve al terminar. */
function animarSplash() {
  prepararTitulo();

  const logo = $('splash-logo');
  const letras = $('splash-titulo').querySelectorAll('.letra');
  const progreso = $('splash-progreso');
  const avance = { valor: 0 };

  const entrada = gsap.timeline();
  entrada
    .fromTo(logo, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: duracion(0.7), ease: 'power2.out' })
    .fromTo(
      letras,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: duracion(0.25), stagger: duracion(0.05), ease: 'power2.out' },
      '-=0.1'
    );

  // Latido suave del logo mientras carga (solo si el usuario no pidió reducir movimiento).
  if (!reducirMovimiento) {
    entrada.to(logo, { scale: 1.05, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  return new Promise((resolver) => {
    gsap.to(avance, {
      valor: 100,
      duration: 2,
      ease: 'none',
      onUpdate: () => {
        progreso.value = avance.valor;
      },
      onComplete: () => {
        entrada.kill();
        resolver();
      },
    });
  });
}

/** Oculta el splash con un fade out. */
async function ocultarSplash() {
  const splash = $('pantalla-splash');
  await animar(splash, { opacity: 0, duration: duracion(0.4), ease: 'power1.in' });
  splash.hidden = true;
}

/** Marca el punto activo del carrusel y cambia el texto del botón final. */
function actualizarOnboarding(indice) {
  estado.set({ onboardingIndice: indice });

  $('puntos-onboarding').querySelectorAll('span').forEach((punto, posicion) => {
    const activo = posicion === indice;
    punto.classList.toggle('w-6', activo);
    punto.classList.toggle('bg-primary', activo);
    punto.classList.toggle('w-2', !activo);
    punto.classList.toggle('bg-base-300', !activo);
  });

  $('texto-siguiente').textContent = indice === TOTAL_SLIDES - 1 ? 'Comenzar' : 'Siguiente';
}

/** Desplaza el carrusel a una diapositiva. */
function irASlide(indice) {
  const carrusel = $('carrusel-onboarding');
  carrusel.scrollTo({ left: indice * carrusel.clientWidth, behavior: reducirMovimiento ? 'auto' : 'smooth' });
  actualizarOnboarding(indice);
}

/** Guarda que el tutorial ya se vio y continúa a la selección de rol (o al dashboard). */
async function finalizarOnboarding() {
  try {
    localStorage.setItem(LLAVE_ONBOARDING, '1');
  } catch (error) {
    // Sin localStorage, el tutorial volverá a mostrarse en la próxima visita.
  }
  await irA(estado.get('rol') ? 'dashboard' : 'rol');
}

/** Indica si el usuario ya vio el onboarding. */
function onboardingVisto() {
  try {
    return localStorage.getItem(LLAVE_ONBOARDING) === '1';
  } catch (error) {
    return false;
  }
}

/** Guarda el rol elegido en IndexedDB y entra al dashboard correspondiente. */
async function elegirRol(boton) {
  if (estado.get('ocupado')) return;
  estado.set({ ocupado: true });

  try {
    await efectoPresion(boton);
    await cambiarRol(boton.dataset.rol);
    estado.set({ rol: boton.dataset.rol });
    await irA('dashboard');
  } catch (error) {
    console.error('No se pudo guardar el rol:', error);
    mostrarToast('No se pudo guardar tu perfil, intenta de nuevo', 'error');
  } finally {
    estado.set({ ocupado: false });
  }
}

/** Conecta los controles de onboarding y selección de rol. */
export function configurarInicio() {
  $('btn-saltar').addEventListener('click', finalizarOnboarding);
  $('btn-siguiente').addEventListener('click', () => {
    if (estado.get('onboardingIndice') < TOTAL_SLIDES - 1) {
      irASlide(estado.get('onboardingIndice') + 1);
    } else {
      finalizarOnboarding();
    }
  });

  $('carrusel-onboarding').addEventListener(
    'scroll',
    (evento) => {
      const carrusel = evento.currentTarget;
      const indice = Math.round(carrusel.scrollLeft / carrusel.clientWidth);
      if (indice !== estado.get('onboardingIndice')) actualizarOnboarding(indice);
    },
    { passive: true }
  );

  document.querySelectorAll('[data-rol]').forEach((boton) => {
    boton.addEventListener('click', () => elegirRol(boton));
  });
}
