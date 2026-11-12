// God Mode: herramientas para demostraciones. Se abre tocando cinco veces la versión en Ajustes.
// Solo afecta los datos de este dispositivo y los marca como datos de prueba.
import { guardarParcela, guardarRegistro, obtenerRegistros } from './db.js';
import { analizarLocal } from './motorLocal.js';
import { simularSinRed } from './network.js';
import { estado } from './store.js';
import { sonar } from './audio.js';
import { $ } from './componentes.js';
import { mostrarToast, refrescarIconos } from './ui.js';

const DIA_MS = 86400000;
const TOQUES_PARA_ABRIR = 5;
const VENTANA_TOQUES_MS = 2000;

const PARCELAS_DEMO = [
  { nombre: 'Naranjal Norte', cultivo: 'naranja', superficieHa: 4 },
  { nombre: 'Milpa Sur', cultivo: 'maiz', superficieHa: 2 },
];

// Registros de demostración: el texto pasa por el motor local igual que uno real.
const REGISTROS_DEMO = [
  { texto: 'Sembré naranja en el terreno norte', parcela: 'Naranjal Norte', diasAtras: 300 },
  { texto: 'Sembré 2 hectáreas de maíz', parcela: 'Milpa Sur', diasAtras: 45 },
  { texto: 'Tengo 40 kilos de maíz', diasAtras: 3 },
  { texto: 'Tengo 12 bultos de cebolla', diasAtras: 6 },
  { texto: 'Fertilicé 2 hectáreas de naranja', parcela: 'Naranjal Norte', diasAtras: 5 },
  { texto: 'Vendí 10 bultos de cebolla a $800', diasAtras: 4 },
  { texto: 'Compré abono por 350 pesos', diasAtras: 2 },
];

let toques = 0;
let ultimoToque = 0;

/** Conecta el acceso oculto y los controles del God Mode. */
export function configurarGodMode(alCambiarDatos) {
  $('version-app').addEventListener('click', () => {
    const ahora = Date.now();
    toques = ahora - ultimoToque > VENTANA_TOQUES_MS ? 1 : toques + 1;
    ultimoToque = ahora;

    if (toques >= TOQUES_PARA_ABRIR) {
      toques = 0;
      $('god-mode').hidden = false;
      refrescarIconos();
      mostrarToast('Modo God activado');
    }
  });

  $('god-sembrar').addEventListener('click', () => sembrarDatos(alCambiarDatos));
  $('god-forzar-alerta').addEventListener('click', () => forzarAlerta(alCambiarDatos));
  $('god-sin-red').addEventListener('change', (evento) => simularSinRed(evento.target.checked));
}

/** Crea dos parcelas y registros de ejemplo. No los duplica si ya existen. */
async function sembrarDatos(alCambiarDatos) {
  const rol = estado.get('rol') ?? 'productor';
  const existentes = (await obtenerRegistros()).some((registro) => registro.datosPrueba);
  if (existentes) {
    mostrarToast('Ya hay datos de prueba en este dispositivo', 'alerta');
    return;
  }

  try {
    const idParcelas = {};
    for (const parcela of PARCELAS_DEMO) {
      idParcelas[parcela.nombre] = await guardarParcela({ rol, datosPrueba: true, ...parcela });
    }

    for (const registro of REGISTROS_DEMO) {
      await guardarRegistro({
        rol,
        texto: registro.texto,
        fecha: Date.now() - registro.diasAtras * DIA_MS,
        parcelaId: registro.parcela ? idParcelas[registro.parcela] : null,
        datosPrueba: true,
        ...analizarLocal(registro.texto),
      });
    }

    mostrarToast('Datos de prueba creados');
    sonar('confirmacion');
    await alCambiarDatos();
  } catch (error) {
    console.error('No se pudieron sembrar los datos de prueba:', error);
    mostrarToast('No se pudieron crear los datos de prueba', 'error');
  }
}

/** Agrega un registro con aviso legal crítico para mostrar el escudo y su brillo. */
async function forzarAlerta(alCambiarDatos) {
  const texto = 'Fertilicé con urea y hay gusano en la milpa';
  try {
    await guardarRegistro({
      rol: estado.get('rol') ?? 'productor',
      texto,
      fecha: Date.now(),
      datosPrueba: true,
      ...analizarLocal(texto),
    });
    sonar('alerta');
    mostrarToast('Alerta crítica registrada', 'alerta');
    await alCambiarDatos();
  } catch (error) {
    console.error('No se pudo forzar la alerta:', error);
    mostrarToast('No se pudo registrar la alerta', 'error');
  }
}
