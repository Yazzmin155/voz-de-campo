// Mi Campo: perfil, parcelas, inventario analizado, próximas cosechas y borrado de datos.
import { borrarTodo, guardarParcela, obtenerParcelas } from '../db.js';
import { estado } from '../store.js';
import { irA } from '../router.js';
import { registrosDelRol } from '../datos.js';
import { $, crearVacio, plural, formatearFechaCorta, formatearFechaLarga } from '../componentes.js';
import { NOMBRES_CULTIVO, abrirModal, animarEntrada, refrescarIconos, mostrarToast, imagenLote } from '../ui.js';
import { sonar } from '../audio.js';

/** Muestra el perfil del productor, sus parcelas, inventario y próximas cosechas. */
export function renderMiCampo() {
  const propios = registrosDelRol();
  const pendientes = propios.filter((registro) => registro.estado === 'pendiente').length;

  $('campo-rol').textContent = estado.get('rol') === 'comprador' ? 'Comprador' : 'Productor';
  $('campo-resumen').textContent = `${plural(propios.length, 'registro', 'registros')} · ${pendientes} pendientes de análisis`;

  renderInventario(propios);
  renderCosechas(propios);
  renderParcelas();
  refrescarIconos();
}

/** Lista las parcelas del rol con sus registros. Sin parcelas, muestra cómo crear la primera. */
async function renderParcelas() {
  const lista = $('lista-parcelas');
  let parcelas;
  try {
    parcelas = (await obtenerParcelas()).filter((parcela) => parcela.rol === estado.get('rol'));
  } catch (error) {
    console.error('No se pudieron leer las parcelas:', error);
    mostrarToast('No se pudieron cargar tus parcelas', 'error');
    return;
  }

  if (parcelas.length === 0) {
    lista.replaceChildren(crearVacioParcela());
  } else {
    const registros = registrosDelRol();
    lista.replaceChildren(...parcelas.map((parcela) => crearItemParcela(parcela, registros)));
  }

  refrescarIconos();
  animarEntrada(Array.from(lista.children));
}

/** Estado vacío de parcelas con botón que abre el formulario. */
function crearVacioParcela() {
  const bloque = crearVacio({
    icono: 'map-pin',
    titulo: 'Aún no tienes parcelas',
    texto: 'Crea tu primera parcela para llevar su historial y generar su pasaporte.',
  });
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn btn-primary btn-sm';
  boton.dataset.modal = 'modal-parcela';
  boton.innerHTML = '<i data-lucide="plus" class="h-4 w-4" aria-hidden="true"></i>Nueva parcela';
  bloque.querySelector('p:last-of-type').after(boton);
  return bloque;
}

/** Tarjeta de parcela con su cultivo, superficie y número de registros. */
function crearItemParcela(parcela, registros) {
  const cantidad = registros.filter((registro) => registro.parcelaId === parcela.id).length;
  const articulo = document.createElement('article');
  articulo.className = 'card card-border bg-base-100 shadow-sm';
  articulo.innerHTML = `
    <div class="card-body flex-row items-center gap-4 p-4">
      <img class="h-14 w-14 shrink-0 rounded-xl object-cover" alt="" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p class="nombre truncate font-bold"></p>
        <p class="detalle text-sm opacity-80"></p>
        <p class="conteo font-mono text-xs opacity-60"></p>
      </div>
    </div>`;

  articulo.querySelector('img').src = imagenLote(parcela.cultivo);
  articulo.querySelector('.nombre').textContent = parcela.nombre;
  articulo.querySelector('.detalle').textContent = `${NOMBRES_CULTIVO[parcela.cultivo] ?? 'Sin cultivo'} · ${parcela.superficieHa} ha`;
  articulo.querySelector('.conteo').textContent = plural(cantidad, 'registro', 'registros');
  return articulo;
}

/** Lista los registros de inventario analizados por la IA. */
function renderInventario(propios) {
  const lista = $('lista-inventario');
  const inventario = propios.filter((registro) => registro.categoria === 'inventario');

  if (inventario.length === 0) {
    lista.replaceChildren(
      crearVacio({
        icono: 'package',
        titulo: 'Sin inventario registrado',
        texto: 'Di algo como "tengo 40 kilos de maíz" y aparecerá aquí.',
        accion: 'Registrar',
      })
    );
  } else {
    lista.replaceChildren(...inventario.map(crearItemInventario));
  }

  animarEntrada(Array.from(lista.children));
}

/** Crea una tarjeta de inventario con cultivo, cantidad y fecha del registro. */
function crearItemInventario(registro) {
  const articulo = document.createElement('article');
  articulo.className = 'card card-border bg-base-100 shadow-sm';
  articulo.innerHTML = `
    <div class="card-body flex-row items-center gap-4 p-4">
      <span class="categoria-inventario flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        <i data-lucide="package" class="h-5 w-5" aria-hidden="true"></i>
      </span>
      <div class="min-w-0 flex-1">
        <p class="nombre font-bold"></p>
        <p class="cantidad font-mono text-sm opacity-80"></p>
        <p class="fecha font-mono text-xs opacity-60"></p>
      </div>
    </div>`;

  articulo.querySelector('.nombre').textContent = NOMBRES_CULTIVO[registro.cultivo] ?? 'Sin cultivo especificado';
  articulo.querySelector('.cantidad').textContent = registro.cantidad ?? 'Cantidad no indicada';
  articulo.querySelector('.fecha').textContent = formatearFechaCorta(registro.fecha);
  return articulo;
}

/** Calcula la fecha estimada de cosecha de cada siembra y la lista en orden. */
function renderCosechas(propios) {
  const lista = $('lista-cosechas');
  const hoy = Date.now();

  const cosechas = propios
    .filter((registro) => registro.esSiembra && registro.diasCosecha)
    .map((registro) => {
      const fechaCosecha = new Date(registro.fecha);
      fechaCosecha.setDate(fechaCosecha.getDate() + registro.diasCosecha);
      return { registro, fechaCosecha };
    })
    .sort((a, b) => a.fechaCosecha - b.fechaCosecha);

  if (cosechas.length === 0) {
    lista.replaceChildren(
      crearVacio({
        icono: 'sprout',
        titulo: 'Sin siembras registradas',
        texto: 'Registra una siembra, por ejemplo "sembré naranja en el terreno norte", y la IA calculará la cosecha.',
        accion: 'Registrar',
      })
    );
  } else {
    lista.replaceChildren(...cosechas.map((cosecha) => crearItemCosecha(cosecha, hoy)));
  }

  animarEntrada(Array.from(lista.children));
}

/** Crea una tarjeta de cosecha con la fecha estimada y los días restantes. */
function crearItemCosecha({ registro, fechaCosecha }, hoy) {
  const diasRestantes = Math.ceil((fechaCosecha.getTime() - hoy) / 86400000);
  const articulo = document.createElement('article');
  articulo.className = 'card card-border bg-base-100 shadow-sm';
  articulo.innerHTML = `
    <div class="card-body flex-row items-center gap-4 p-4">
      <span class="categoria-cultivo flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        <i data-lucide="sprout" class="h-5 w-5" aria-hidden="true"></i>
      </span>
      <div class="min-w-0 flex-1">
        <p class="nombre font-bold"></p>
        <p class="fecha font-mono text-sm opacity-80"></p>
        <p class="estado text-xs font-semibold"></p>
      </div>
    </div>`;

  articulo.querySelector('.nombre').textContent = NOMBRES_CULTIVO[registro.cultivo] ?? 'Cultivo';
  articulo.querySelector('.fecha').textContent = `Cosecha estimada: ${formatearFechaLarga(fechaCosecha)}`;

  const estadoCosecha = articulo.querySelector('.estado');
  estadoCosecha.textContent = diasRestantes <= 0 ? 'Lista para cosechar' : `Faltan ${plural(diasRestantes, 'día', 'días')}`;
  estadoCosecha.classList.add(diasRestantes <= 0 ? 'text-success' : 'opacity-70');
  return articulo;
}

/** Valida y guarda la parcela del formulario. */
async function guardarParcelaDesdeFormulario(evento) {
  evento.preventDefault();

  const nombre = $('parcela-nombre').value.trim();
  const superficieHa = Number($('parcela-superficie').value);
  if (!nombre || !(superficieHa > 0)) {
    mostrarToast('Escribe un nombre y una superficie mayor a cero', 'alerta');
    return;
  }

  try {
    await guardarParcela({
      rol: estado.get('rol'),
      nombre,
      cultivo: $('parcela-cultivo').value,
      superficieHa,
    });
    $('form-parcela').reset();
    $('modal-parcela').close();
    mostrarToast('Parcela creada');
    sonar('confirmacion');
    renderParcelas();
  } catch (error) {
    console.error('No se pudo guardar la parcela:', error);
    mostrarToast('No se pudo guardar la parcela, intenta de nuevo', 'error');
  }
}

/** Borra todos los datos del dispositivo y vuelve a la selección de rol. */
async function confirmarBorrado() {
  $('modal-borrar').close();

  try {
    await borrarTodo();
    estado.set({ rol: null, registros: [] });
    mostrarToast('Datos borrados');
    await irA('rol');
  } catch (error) {
    console.error('No se pudieron borrar los datos:', error);
    mostrarToast('No se pudieron borrar los datos, intenta de nuevo', 'error');
  }
}

/** Conecta los controles de Mi Campo. */
export function configurarMiCampo() {
  $('btn-cambiar-rol-campo').addEventListener('click', () => irA('rol'));
  $('btn-borrar-campo').addEventListener('click', () => abrirModal('modal-borrar'));
  $('btn-confirmar-borrar').addEventListener('click', confirmarBorrado);
  $('form-parcela').addEventListener('submit', guardarParcelaDesdeFormulario);
}
