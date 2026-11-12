// Pruebas del motor local: clasificación, cultivos, cantidades, costos y disparadores legales.
import { describe, expect, it } from 'vitest';
import {
  analizarLocal,
  detectarCultivo,
  detectarIntencion,
  diasHastaCosecha,
  extraerCantidad,
  extraerCosto,
  normalizar,
} from '../js/motorLocal.js';

describe('normalizar', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(normalizar('Maíz Limón')).toBe('maiz limon');
  });
});

describe('detectarCultivo', () => {
  it('reconoce plurales, acentos y sinónimos', () => {
    expect(detectarCultivo(normalizar('Tengo 40 elotes'))).toBe('maiz');
    expect(detectarCultivo(normalizar('Vendí jitomates'))).toBe('jitomate');
    expect(detectarCultivo(normalizar('Riego los limoneros'))).toBe('limon');
  });

  it('devuelve null si no hay cultivo conocido', () => {
    expect(detectarCultivo(normalizar('Compré semillas'))).toBeNull();
  });
});

describe('detectarIntencion', () => {
  it('da prioridad a venta sobre siembra y cosecha', () => {
    expect(detectarIntencion(normalizar('Vendí la cosecha de maíz'))).toMatchObject({ nombre: 'venta', categoria: 'venta' });
  });

  it('reconoce siembra y marca esSiembra', () => {
    expect(detectarIntencion(normalizar('Sembré naranja'))).toMatchObject({ nombre: 'siembra', esSiembra: true });
  });

  it('reconoce inventario', () => {
    expect(detectarIntencion(normalizar('Tengo 40 kilos de maíz'))).toMatchObject({ categoria: 'inventario' });
  });

  it('devuelve null si no hay intención clara', () => {
    expect(detectarIntencion(normalizar('Buen día'))).toBeNull();
  });
});

describe('extraerCantidad', () => {
  it('extrae número y unidad', () => {
    expect(extraerCantidad(normalizar('Fertilicé 2 hectáreas de naranja'))).toBe('2 hectareas');
    expect(extraerCantidad(normalizar('Tengo 40 kilos de maíz'))).toBe('40 kilos');
    expect(extraerCantidad(normalizar('3 bultos listos'))).toBe('3 bultos');
  });

  it('no confunde un costo con una cantidad', () => {
    expect(extraerCantidad(normalizar('Vendí a $800 pesos'))).toBeNull();
  });

  it('acepta decimales', () => {
    expect(extraerCantidad(normalizar('1.5 toneladas'))).toBe('1.5 toneladas');
  });
});

describe('extraerCosto', () => {
  it('lee el costo con signo de pesos o con la palabra pesos', () => {
    expect(extraerCosto('Vendí a $800')).toBe(800);
    expect(extraerCosto('Pagué 1,250 pesos por el flete')).toBe(1250);
  });

  it('devuelve null si no hay costo', () => {
    expect(extraerCosto('Sembré maíz')).toBeNull();
  });
});

describe('diasHastaCosecha', () => {
  it('usa el promedio del rango de la base de conocimiento', () => {
    expect(diasHastaCosecha('maiz')).toBe(120);
    expect(diasHastaCosecha('jitomate')).toBe(75);
    expect(diasHastaCosecha('naranja')).toBe(1460);
    expect(diasHastaCosecha('limon')).toBe(913);
  });

  it('devuelve null para cultivos sin dato o desconocidos', () => {
    expect(diasHastaCosecha('otro')).toBeNull();
    expect(diasHastaCosecha(null)).toBeNull();
  });
});

describe('analizarLocal', () => {
  it('devuelve null para texto vacío', () => {
    expect(analizarLocal('   ')).toBeNull();
    expect(analizarLocal(null)).toBeNull();
  });

  it('clasifica una siembra con días de cosecha', () => {
    const resultado = analizarLocal('Sembré 2 hectáreas de maíz');
    expect(resultado).toMatchObject({
      categoria: 'cultivo',
      cultivo: 'maiz',
      cantidad: '2 hectareas',
      esSiembra: true,
      diasCosecha: 120,
      auditadoPor: 'local',
      confianza: 'alta',
    });
  });

  it('alerta sobre SENASICA al mencionar fertilizante', () => {
    const resultado = analizarLocal('Fertilicé 2 hectáreas de naranja');
    expect(resultado.alerta).toContain('SENASICA');
    expect(resultado.alerta).toContain('carencia');
  });

  it('no da datos de anaquel en una aplicación', () => {
    const resultado = analizarLocal('Fertilicé 2 hectáreas de naranja');
    expect(resultado.recomendacion).toContain('Naranja');
    expect(resultado.recomendacion).not.toContain('frío');
  });

  it('da datos de anaquel cuando el registro es una venta', () => {
    expect(analizarLocal('Vendí 10 bultos de cebolla a $800').recomendacion).toContain('curada');
  });

  it('alerta sobre concesiones al mencionar riego o agua', () => {
    expect(analizarLocal('Regué el limón con agua del pozo').alerta).toContain('CONAGUA');
  });

  it('alerta sobre documentar por escrito en una venta, con costo', () => {
    const resultado = analizarLocal('Vendí 10 bultos de cebolla a $800');
    expect(resultado).toMatchObject({ categoria: 'venta', costo: 800, cantidad: '10 bultos' });
    expect(resultado.alerta).toContain('por escrito');
  });

  it('alerta sobre reportar plagas a las autoridades', () => {
    expect(analizarLocal('Hay gusano en el maíz').alerta).toContain('autoridades');
  });

  it('combina varias alertas sin repetirlas', () => {
    const resultado = analizarLocal('Fumigué con fertilizante y vendí la cosecha por contrato');
    expect(resultado.alerta).toContain('SENASICA');
    expect(resultado.alerta).toContain('por escrito');
  });

  it('marca confianza baja y pide el cultivo cuando no entiende el texto', () => {
    const resultado = analizarLocal('Hola, todo bien');
    expect(resultado).toMatchObject({ categoria: 'actividad', cultivo: null, confianza: 'baja' });
    expect(resultado.recomendacion).toContain('Agrega el cultivo');
    expect(resultado.alerta).toBeNull();
  });
});
