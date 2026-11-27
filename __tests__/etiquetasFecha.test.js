import {
  etiquetaCampoSerie,
  etiquetaCeldaHeatmap,
  etiquetaDiaSelector,
  etiquetaFecha,
} from '../src/utils/etiquetasFecha';

describe('etiquetasFecha (Spec 026, CA-4)', () => {
  test('fecha local completa en español, inicio y fin de mes y bisiesto', () => {
    expect(etiquetaFecha('2026-11-27')).toBe('viernes 27 de noviembre de 2026');
    expect(etiquetaFecha('2026-01-01')).toBe('jueves 1 de enero de 2026');
    expect(etiquetaFecha('2026-12-31')).toBe('jueves 31 de diciembre de 2026');
    expect(etiquetaFecha('2028-02-29')).toBe('martes 29 de febrero de 2028');
  });

  test('rechaza fechas inválidas', () => {
    expect(etiquetaFecha('2027-02-29')).toBe('');
    expect(etiquetaFecha('2026-13-01')).toBe('');
    expect(etiquetaFecha('hola')).toBe('');
    expect(etiquetaFecha(undefined)).toBe('');
  });

  test('opciones sin año ni día de la semana', () => {
    expect(etiquetaFecha('2026-11-27', { conAnio: false })).toBe('viernes 27 de noviembre');
    expect(etiquetaFecha('2026-11-27', { conAnio: false, conDiaSemana: false })).toBe('27 de noviembre');
  });

  test('selector semanal con hoy y actividad', () => {
    expect(etiquetaDiaSelector({ fecha: '2026-11-27', esHoy: true, tieneActividad: true })).toBe(
      'viernes 27 de noviembre, hoy, con actividad'
    );
    expect(etiquetaDiaSelector({ fecha: '2026-11-21' })).toBe('sábado 21 de noviembre');
    expect(etiquetaDiaSelector({ fecha: 'x' })).toBe('');
  });

  test('celda de calendario: nivel, hoy y futuro', () => {
    expect(etiquetaCeldaHeatmap({ fecha: '2026-11-27', nivel: 2, esHoy: true })).toBe(
      'viernes 27 de noviembre, hoy, actividad nivel 2 de 4'
    );
    expect(etiquetaCeldaHeatmap({ fecha: '2026-11-02' })).toBe('lunes 2 de noviembre, sin actividad');
    expect(etiquetaCeldaHeatmap({ fecha: '2026-11-02', nivel: 9 })).toBe(
      'lunes 2 de noviembre, actividad nivel 4 de 4'
    );
    expect(etiquetaCeldaHeatmap({ fecha: '2026-11-28', esFutura: true })).toBe('sábado 28 de noviembre, día futuro');
  });

  test('campos de serie en Live Mode', () => {
    expect(etiquetaCampoSerie({ campo: 'peso', serie: 1 })).toBe('Peso en kilogramos, serie 1');
    expect(etiquetaCampoSerie({ campo: 'peso', serie: 2, unidad: 'lb' })).toBe('Peso en libras, serie 2');
    expect(etiquetaCampoSerie({ campo: 'repeticiones', serie: 3 })).toBe('Repeticiones, serie 3');
  });
});
