// Chat copiloto: conversación con tus registros, con sugerencias y respuesta con IA o sin conexión.
import { guardarMensaje, obtenerMensajes } from '../db.js';
import { registrosDelRol } from '../datos.js';
import { preguntarCopiloto } from '../copiloto.js';
import { SUGERENCIAS } from '../copiloto-local.js';
import { $ } from '../componentes.js';
import { animarEntrada, refrescarIconos } from '../ui.js';

const MAX_MENSAJES_VISIBLES = 60;
const MOTIVO_IA = {
  'sin-clave': 'la IA no está configurada en el servidor',
  'clave-invalida': 'la clave de la IA no es válida',
  cuota: 'se alcanzó el límite de uso de la IA',
  timeout: 'la IA tardó demasiado',
  red: 'no hubo respuesta de la nube',
  servidor: 'el servicio de IA falló',
  'respuesta-invalida': 'la IA devolvió una respuesta incompleta',
};

/** Texto que explica de dónde vino la respuesta: IA, o motor local con el motivo si la IA falló. */
function etiquetaOrigen(mensaje) {
  if (mensaje.origen === 'nube') return 'Con IA';
  if (mensaje.origen !== 'local') return '';
  if (!mensaje.motivo || mensaje.motivo === 'sin-red') return 'Sin conexión, con tus registros';
  return `Con tus registros: ${MOTIVO_IA[mensaje.motivo] ?? 'la IA no respondió'}`;
}

let enviando = false;

/** Pinta la conversación completa y las sugerencias. */
export async function renderChat() {
  const mensajes = await obtenerMensajes();
  const lista = $('chat-mensajes');

  if (mensajes.length === 0) {
    lista.replaceChildren(
      crearBurbuja({
        autor: 'copiloto',
        texto: 'Soy tu copiloto de campo. Pregúntame sobre tu inventario, cosechas, avisos legales o gastos.',
      })
    );
  } else {
    lista.replaceChildren(...mensajes.slice(-MAX_MENSAJES_VISIBLES).map(crearBurbuja));
  }

  renderSugerencias();
  refrescarIconos();
  animarEntrada(Array.from(lista.children));
  lista.scrollTop = lista.scrollHeight;
}

/** Crea una burbuja del chat. Las del copiloto indican si la respuesta vino de la IA o del motor local. */
function crearBurbuja(mensaje) {
  const esUsuario = mensaje.autor === 'usuario';
  const contenedor = document.createElement('div');
  contenedor.className = `chat ${esUsuario ? 'chat-end' : 'chat-start'}`;

  const burbuja = document.createElement('div');
  burbuja.className = `chat-bubble whitespace-pre-line text-sm leading-relaxed ${esUsuario ? 'chat-bubble-primary' : ''}`;
  burbuja.textContent = mensaje.texto;
  contenedor.append(burbuja);

  const etiqueta = etiquetaOrigen(mensaje);
  if (etiqueta) {
    const pie = document.createElement('div');
    pie.className = 'chat-footer text-xs opacity-60';
    pie.textContent = etiqueta;
    contenedor.append(pie);
  }

  return contenedor;
}

/** Chips con preguntas sugeridas. Al tocarlos se envían directamente. */
function renderSugerencias() {
  $('chat-sugerencias').replaceChildren(
    ...SUGERENCIAS.map((texto) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'btn btn-sm btn-outline shrink-0 rounded-full';
      boton.textContent = texto;
      boton.addEventListener('click', () => enviar(texto));
      return boton;
    })
  );
}

/** Guarda la pregunta, pide la respuesta y guarda la respuesta del copiloto. */
async function enviar(texto) {
  const pregunta = texto.trim();
  if (!pregunta || enviando) return;
  enviando = true;

  $('chat-entrada').value = '';
  await guardarMensaje({ autor: 'usuario', texto: pregunta });
  await renderChat();

  const pensando = document.createElement('div');
  pensando.className = 'chat chat-start';
  pensando.innerHTML = '<span class="loading loading-dots loading-sm text-primary" aria-label="Pensando"></span>';
  $('chat-mensajes').append(pensando);

  try {
    const respuesta = await preguntarCopiloto(pregunta, registrosDelRol());
    await guardarMensaje({
      autor: 'copiloto',
      texto: respuesta.texto,
      origen: respuesta.origen,
      motivo: respuesta.motivo,
    });
  } catch (error) {
    console.error('El copiloto no pudo responder:', error);
    await guardarMensaje({
      autor: 'copiloto',
      texto: 'No pude responder en este momento. Intenta de nuevo.',
      origen: 'local',
      motivo: 'servidor',
    });
  } finally {
    enviando = false;
    await renderChat();
  }
}

/** Conecta el formulario del chat. */
export function configurarChat() {
  $('chat-formulario').addEventListener('submit', (evento) => {
    evento.preventDefault();
    enviar($('chat-entrada').value);
  });
}
