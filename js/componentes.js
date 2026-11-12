// Componentes y utilidades de vista compartidas por las pantallas: tarjetas, estados vacíos y lectura en voz alta.
import { estado } from './store.js';
import { hablar, cancelarLectura } from './voz.js';
import { cambiarIcono, CATEGORIAS_UI, imagenLote } from './ui.js';

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatoFechaLarga = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Fecha larga en formato mexicano, sin hora. */
export function formatearFechaLarga(fecha) {
  return formatoFechaLarga.format(fecha);
}

/** Atajo para obtener un elemento por id. */
export const $ = (id) => document.getElementById(id);

/** Texto con singular o plural según la cantidad. */
export function plural(cantidad, singular, plurales) {
  return `${cantidad} ${cantidad === 1 ? singular : plurales}`;
}

/** Fecha corta en formato mexicano, con hora. */
export function formatearFechaCorta(ms) {
  return formatoFecha.format(new Date(ms));
}

/** Crea un bloque de estado vacío con ícono, texto y botón opcional. */
export function crearVacio({ icono, titulo, texto, accion }) {
  const bloque = document.createElement('div');
  bloque.className =
    'flex flex-col items-center gap-3 rounded-box border border-dashed border-base-300 bg-base-100 p-8 text-center';
  bloque.innerHTML = `
    <span class="flex h-14 w-14 items-center justify-center rounded-full bg-base-200">
      <i data-lucide="${icono}" class="h-7 w-7 text-base-content" aria-hidden="true"></i>
    </span>
    <p class="font-bold">${titulo}</p>
    <p class="text-sm opacity-70">${texto}</p>
    ${accion ? `<button type="button" class="btn btn-primary btn-sm" data-ir="dashboard" data-enfocar="entrada-texto">${accion}</button>` : ''}
  `;
  return bloque;
}

/** Clona la plantilla de registro y la llena con los datos y el análisis de la IA. */
export function crearTarjeta(registro) {
  const fragmento = $('plantilla-registro').content.cloneNode(true);
  const articulo = fragmento.querySelector('article');
  articulo.dataset.id = registro.id;

  const fecha = fragmento.querySelector('time');
  fecha.dateTime = new Date(registro.fecha).toISOString();
  fecha.textContent = formatearFechaCorta(registro.fecha);

  const imagen = fragmento.querySelector('.imagen-cultivo');
  imagen.hidden = !registro.cultivo;
  if (registro.cultivo) imagen.src = imagenLote(registro.cultivo);

  const etiqueta = fragmento.querySelector('.etiqueta-categoria');
  const categoria = CATEGORIAS_UI[registro.categoria];
  if (categoria) {
    etiqueta.textContent = categoria.etiqueta;
    etiqueta.classList.add(categoria.clase);
  } else {
    etiqueta.hidden = true;
  }

  // Reloj mientras espera el análisis; check verde cuando la IA ya lo procesó.
  const sincronizado = registro.estado === 'sincronizado';
  const indicador = fragmento.querySelector('.indicador-sync');
  indicador.innerHTML = `<i data-lucide="${sincronizado ? 'circle-check' : 'clock'}" class="h-4 w-4 ${sincronizado ? 'text-success' : 'text-warning'}" aria-hidden="true"></i>`;
  indicador.setAttribute('role', 'img');
  indicador.setAttribute('aria-label', sincronizado ? 'Analizado con IA' : 'Análisis local, pendiente de IA');

  fragmento.querySelector('.texto').textContent = registro.texto;

  const bloqueRecomendacion = fragmento.querySelector('.bloque-recomendacion');
  bloqueRecomendacion.classList.toggle('hidden', !registro.recomendacion);
  fragmento.querySelector('.texto-recomendacion').textContent = registro.recomendacion ?? '';

  const bloqueAlerta = fragmento.querySelector('.bloque-alerta');
  bloqueAlerta.classList.toggle('hidden', !registro.alerta);
  fragmento.querySelector('.texto-alerta').textContent = registro.alerta ?? '';

  return fragmento;
}

/** Texto que se lee en voz alta: el registro, su recomendación y su alerta si existen. */
export function textoLectura(registro) {
  return [registro.texto, registro.recomendacion, registro.alerta].filter(Boolean).join('. ');
}

/** Inicia o detiene la lectura de un registro. Si no hay voces, no hace nada. */
export function alternarLectura(id) {
  if (estado.get('leyendo') === id) {
    cancelarLectura();
    estado.set({ leyendo: null });
    actualizarBotonesLectura();
    return;
  }

  const registro = estado.get('registros').find((item) => item.id === id);
  if (!registro) return;

  const iniciada = hablar(textoLectura(registro), {
    onFin: () => {
      if (estado.get('leyendo') === id) {
        estado.set({ leyendo: null });
        actualizarBotonesLectura();
      }
    },
  });
  if (!iniciada) return;

  estado.set({ leyendo: id });
  actualizarBotonesLectura();
}

/** Refleja en todos los botones Play si su registro se está leyendo. */
export function actualizarBotonesLectura() {
  document.querySelectorAll('.btn-leer').forEach((boton) => {
    const id = Number(boton.closest('article')?.dataset.id);
    const leyendo = id === estado.get('leyendo');
    boton.setAttribute('aria-label', leyendo ? 'Detener lectura' : 'Escuchar registro');
    cambiarIcono(boton, leyendo ? 'square' : 'play', 'h-4 w-4');
  });
}
