// Pasaporte de lote: emite un código QR con el historial de una parcela y verifica códigos escaneados o pegados.
// Es demostrativo: el hash detecta si el contenido fue alterado, pero no es una certificación oficial.
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import reglas from '../reglas.json';
import { guardarPasaporte, obtenerParcelas } from '../db.js';
import { estado } from '../store.js';
import { registrosDelRol } from '../datos.js';
import { $ } from '../componentes.js';
import { activarHolografico, mostrarToast, refrescarIconos } from '../ui.js';
import { sonar } from '../audio.js';

/** Cuerpo del pasaporte con el historial de la parcela. No incluye datos personales. */
export function construirPasaporte(parcela, registros, emitido = new Date()) {
  const delLote = registros.filter((registro) => registro.parcelaId === parcela.id);

  return {
    version: 1,
    emitido: emitido.toISOString(),
    parcela: {
      nombre: parcela.nombre,
      cultivo: reglas.cultivos[parcela.cultivo]?.nombre ?? 'Otro',
      superficieHa: parcela.superficieHa,
    },
    practicas: {
      registros: delLote.length,
      siembras: delLote.filter((registro) => registro.esSiembra).length,
      agroquimicos: delLote.filter((registro) => registro.alerta && /SENASICA/.test(registro.alerta)).length,
      avisosLegales: delLote.filter((registro) => registro.alerta).length,
    },
  };
}

/** Huella SHA-256 en hexadecimal. Requiere un contexto seguro (https o localhost). */
async function sha256(texto) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Agrega la huella al cuerpo del pasaporte. */
export async function firmar(cuerpo) {
  return { ...cuerpo, hash: await sha256(JSON.stringify(cuerpo)) };
}

/** Indica si el contenido sigue coincidiendo con su huella. */
export async function verificar(pasaporte) {
  const { hash, ...cuerpo } = pasaporte;
  return (await sha256(JSON.stringify(cuerpo))) === hash;
}

/** Prepara la pantalla: parcelas para emitir (solo productor) y los controles de escaneo. */
export async function renderPasaporte() {
  const productor = estado.get('rol') === 'productor';
  $('pasaporte-emitir').hidden = !productor;
  if (productor) await llenarSelectorParcelas();
  refrescarIconos();
}

/** Rellena el selector con las parcelas del rol actual. */
async function llenarSelectorParcelas() {
  const parcelas = (await obtenerParcelas()).filter((parcela) => parcela.rol === estado.get('rol'));
  const selector = $('pasaporte-parcela');

  if (parcelas.length === 0) {
    selector.replaceChildren(new Option('Crea una parcela en Mi Campo primero', ''));
    $('btn-emitir-pasaporte').disabled = true;
    return;
  }

  selector.replaceChildren(...parcelas.map((parcela) => new Option(parcela.nombre, parcela.id)));
  $('btn-emitir-pasaporte').disabled = false;
}

/** Genera el pasaporte firmado de la parcela elegida, lo muestra como QR y lo guarda. */
export async function emitirPasaporte() {
  const id = Number($('pasaporte-parcela').value);
  const parcela = (await obtenerParcelas()).find((item) => item.id === id);
  if (!parcela) {
    mostrarToast('Elige una parcela para emitir su pasaporte', 'alerta');
    return;
  }

  try {
    const pasaporte = await firmar(construirPasaporte(parcela, registrosDelRol()));
    const texto = JSON.stringify(pasaporte);
    const qr = await QRCode.toDataURL(texto, { margin: 1, width: 240, errorCorrectionLevel: 'M' });

    const imagen = $('pasaporte-qr');
    imagen.src = qr;
    imagen.hidden = false;
    $('pasaporte-codigo').value = texto;
    $('pasaporte-salida').hidden = false;

    await guardarPasaporte({ parcelaId: id, nombre: parcela.nombre, hash: pasaporte.hash, contenido: texto });
    sonar('confirmacion');
    mostrarToast('Pasaporte generado');
  } catch (error) {
    console.error('No se pudo emitir el pasaporte:', error);
    mostrarToast('No se pudo emitir el pasaporte. Revisa que la página esté en un sitio seguro (https).', 'error');
  }
}

/** Copia el código del pasaporte al portapapeles. */
export async function copiarCodigo() {
  try {
    await navigator.clipboard.writeText($('pasaporte-codigo').value);
    mostrarToast('Código copiado');
  } catch (error) {
    mostrarToast('No se pudo copiar. Selecciona el texto y cópialo a mano.', 'alerta');
  }
}

/** Verifica un código pegado o escaneado y muestra el resultado. */
export async function verificarCodigo(texto) {
  let pasaporte;
  try {
    pasaporte = JSON.parse(texto);
  } catch (error) {
    mostrarToast('Ese código no es un pasaporte válido', 'alerta');
    return;
  }

  if (!pasaporte?.hash || !pasaporte?.parcela) {
    mostrarToast('Ese código no es un pasaporte válido', 'alerta');
    return;
  }

  const integro = await verificar(pasaporte);
  mostrarResultado(pasaporte, integro);
  sonar(integro ? 'confirmacion' : 'alerta');
}

/** Muestra la tarjeta con los datos del lote y si el contenido sigue íntegro. */
function mostrarResultado(pasaporte, integro) {
  const tarjeta = $('pasaporte-resultado');
  const { parcela, practicas } = pasaporte;

  $('res-nombre').textContent = parcela.nombre;
  $('res-detalle').textContent = `${parcela.cultivo} · ${parcela.superficieHa} ha`;
  $('res-practicas').textContent = `${practicas.registros} registros · ${practicas.siembras} siembras · ${practicas.avisosLegales} avisos legales`;
  $('res-emitido').textContent = new Date(pasaporte.emitido).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  const insignia = $('res-integridad');
  insignia.className = `badge badge-lg ${integro ? 'badge-success' : 'badge-warning'}`;
  insignia.textContent = integro ? 'Íntegro' : 'Alterado';
  $('res-nota').textContent = integro
    ? 'El contenido coincide con su firma. Es un pasaporte demostrativo, no una certificación oficial.'
    : 'El contenido no coincide con su firma: pudo modificarse después de emitirse.';

  tarjeta.hidden = false;
  if (integro) activarHolografico(tarjeta);
}

let flujo = null;
let cuadro = null;

/** Abre la cámara trasera y busca un código QR en cada cuadro hasta encontrarlo. */
export async function iniciarEscaner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    mostrarToast('Este navegador no permite usar la cámara. Pega el código a mano.', 'alerta');
    return;
  }

  try {
    flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch (error) {
    mostrarToast('Activa el permiso de cámara para escanear', 'alerta');
    return;
  }

  const video = $('pasaporte-video');
  video.srcObject = flujo;
  video.hidden = false;
  $('btn-detener-escaner').hidden = false;
  $('btn-escanear').hidden = true;
  await video.play();

  const lienzo = document.createElement('canvas');
  const contexto = lienzo.getContext('2d', { willReadFrequently: true });

  const barrer = () => {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      lienzo.width = video.videoWidth;
      lienzo.height = video.videoHeight;
      contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);
      const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
      const codigo = jsQR(imagen.data, imagen.width, imagen.height);

      if (codigo) {
        detenerEscaner();
        verificarCodigo(codigo.data);
        return;
      }
    }
    cuadro = requestAnimationFrame(barrer);
  };
  cuadro = requestAnimationFrame(barrer);
}

/** Apaga la cámara y detiene la búsqueda de códigos. */
export function detenerEscaner() {
  if (cuadro) cancelAnimationFrame(cuadro);
  cuadro = null;
  flujo?.getTracks().forEach((pista) => pista.stop());
  flujo = null;

  const video = $('pasaporte-video');
  video.srcObject = null;
  video.hidden = true;
  $('btn-detener-escaner').hidden = true;
  $('btn-escanear').hidden = false;
}
