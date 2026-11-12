// Pruebas del copiloto sin conexión: sumas de inventario, cosechas, avisos y gastos.
import { describe, expect, it } from 'vitest';
import { responderLocal, sumarCantidades, construirContexto } from '../js/copiloto-local.js';

const AHORA = new Date(2026, 4, 10).getTime();
const DIA = 86400000;

const registros = [
  { id: 1, fecha: AHORA - 2 * DIA, texto: 'Tengo 40 kilos de maíz', categoria: 'inventario', cultivo: 'maiz', cantidad: '40 kilos', estado: 'sincronizado' },
  { id: 2, fecha: AHORA - DIA, texto: 'Tengo 2 kilos de maíz', categoria: 'inventario', cultivo: 'maiz', cantidad: '2 kilos', estado: 'pendiente' },
  { id: 3, fecha: AHORA - 40 * DIA, texto: 'Sembré naranja', categoria: 'cultivo', cultivo: 'naranja', esSiembra: true, diasCosecha: 1460, estado: 'sincronizado' },
  { id: 4, fecha: AHORA - 5 * DIA, texto: 'Fertilicé naranja', categoria: 'actividad', cultivo: 'naranja', alerta: 'Guarda el ticket y consulta a SENASICA.', estado: 'sincronizado' },
  { id: 5, fecha: AHORA - 3 * DIA, texto: 'Vendí 10 bultos de cebolla a $800', categoria: 'venta', cultivo: 'cebolla', costo: 800, alerta: 'Documenta la venta por escrito.', estado: 'pendiente' },
  { id: 6, fecha: AHORA - 1 * DIA, texto: 'Compré abono por 350 pesos', categoria: 'actividad', costo: 350, estado: 'pendiente' },
];

describe('sumarCantidades', () => {
  it('suma cantidades de la misma unidad, con plural correcto', () => {
    expect(sumarCantidades(['40 kilos', '2 kilos'])).toBe('42 kilos');
    expect(sumarCantidades(['1 kilo', '1 kilo'])).toBe('2 kilos');
  });

  it('separa unidades distintas', () => {
    expect(sumarCantidades(['3 bultos', '2 hectareas'])).toBe('3 bultos y 2 hectáreas');
  });

  it('ignora cantidades sin unidad conocida y devuelve null si no queda nada', () => {
    expect(sumarCantidades(['algo raro', null])).toBeNull();
  });
});

describe('responderLocal', () => {
  it('suma el inventario de un cultivo', () => {
    expect(responderLocal('¿Cuánto maíz tengo?', registros, AHORA).texto).toBe('Tienes 42 kilos de maíz, según tus registros de inventario.');
  });

  it('avisa cuando no hay inventario del cultivo', () => {
    expect(responderLocal('¿Cuánto limón tengo?', registros, AHORA).texto).toContain('No tienes registros de inventario de limón');
  });

  it('calcula la próxima cosecha de una siembra', () => {
    const texto = responderLocal('¿Cuándo cosecho naranja?', registros, AHORA).texto;
    expect(texto).toContain('La próxima cosecha de naranja es estimada para el');
    expect(texto).toContain('días');
  });

  it('lista los avisos legales', () => {
    const texto = responderLocal('¿Qué avisos legales tengo?', registros, AHORA).texto;
    expect(texto).toContain('SENASICA');
    expect(texto).toContain('por escrito');
  });

  it('suma los gastos del mes, sin contar ventas', () => {
    expect(responderLocal('¿Cuánto he gastado este mes?', registros, AHORA).texto).toContain('$350');
  });

  it('suma las ventas del mes', () => {
    expect(responderLocal('¿Cuánto vendí este mes?', registros, AHORA).texto).toContain('$800');
  });

  it('cuenta los pendientes', () => {
    expect(responderLocal('¿Tengo pendientes?', registros, AHORA).texto).toContain('3 registros pendientes');
  });

  it('responde con sugerencias si no entiende la pregunta', () => {
    const respuesta = responderLocal('¿Quién es el presidente?', registros, AHORA);
    expect(respuesta.sugerencias.length).toBeGreaterThan(0);
  });
});

describe('construirContexto', () => {
  it('resume cada registro en una línea y respeta el máximo', () => {
    const contexto = construirContexto(registros, 2).split('\n');
    expect(contexto).toHaveLength(2);
    expect(contexto[0]).toContain('cultivo maiz');
  });
});
