/**
 * Progreso por ejercicio (Spec 030, CA-1 a CA-4).
 */
import {
  estimar1RM,
  formatearKg,
  historialEjercicio,
  indexarHistoriales,
  normalizarNombre,
  recordsEjercicio,
  registroEsRecord,
  seriesDeRegistro,
} from '../src/utils/progresoEjercicio';

const reg = (id, ejercicio, fecha, series) => ({
  id,
  ejercicio,
  fecha,
  seriesDetalle: series.map(([peso, repeticiones], i) => ({ serie: i + 1, peso, repeticiones })),
});

describe('estimar1RM (CA-1)', () => {
  it.each([
    [100, 5, 116.5],
    [100, 1, 100],
    [0, 5, 0],
    [100, 0, 0],
    [100, 13, 0],
    [90, 3, 99],
    [61.5, 3, 67.5],
    ['100,5', '1', 100.5],
    [-20, 5, 0],
    [101.2, 1, 101.2],
  ])('(%p, %p) → %p', (peso, reps, esperado) => {
    expect(estimar1RM(peso, reps)).toBe(esperado);
  });
});

describe('normalizarNombre y seriesDeRegistro', () => {
  it('ignora acentos, mayúsculas y espacios', () => {
    expect(normalizarNombre('  Sentadilla   Búlgara ')).toBe('sentadilla bulgara');
  });

  it('expande el legado a series idénticas', () => {
    expect(seriesDeRegistro({ series: 3, repeticiones: 10, peso: 50 })).toHaveLength(3);
    expect(seriesDeRegistro({ series: 0, repeticiones: 10, peso: 50 })).toHaveLength(1);
  });

  it('convierte textos y valores inválidos', () => {
    expect(seriesDeRegistro({ seriesDetalle: [{ peso: '60,5', repeticiones: 'x' }] })).toEqual([
      { peso: 60.5, repeticiones: 0 },
    ]);
  });
});

describe('historialEjercicio (CA-2)', () => {
  const lista = [
    reg('a', 'Press Banca', '2026-11-20', [[80, 5]]),
    reg('b', ' press banca ', '2026-11-20', [[82.5, 3]]),
    reg('c', 'Press banca', '2026-11-10', [[75, 8]]),
    reg('d', 'Remo', '2026-11-20', [[60, 10]]),
    { id: 'e', ejercicio: 'Press banca', fecha: 'mal', seriesDetalle: [{ peso: 200, repeticiones: 1 }] },
  ];

  it('une el mismo día, ordena y calcula métricas', () => {
    const h = historialEjercicio(lista, 'press banca');
    expect(h.map((d) => d.fecha)).toEqual(['2026-11-10', '2026-11-20']);
    expect(h[1]).toMatchObject({ pesoMaximo: 82.5, volumen: 80 * 5 + 82.5 * 3, series: 2 });
    expect(h[1].mejor1RM).toBe(estimar1RM(80, 5));
    expect(h[1].mejorSerie).toEqual({ peso: 80, repeticiones: 5 });
  });

  it('acepta legado con volumen igual a series × reps × peso', () => {
    const h = historialEjercicio(
      [{ ejercicio: 'Curl', fecha: '2026-11-01', series: 3, repeticiones: 10, peso: 50, volumenTotal: 1500 }],
      'curl'
    );
    expect(h[0].volumen).toBe(1500);
  });

  it('une nombres con y sin acentos', () => {
    const h = historialEjercicio(
      [reg('x', 'Sentadilla búlgara', '2026-11-01', [[20, 8]]), reg('y', 'sentadilla  bulgara', '2026-11-02', [[22, 8]])],
      'Sentadilla Búlgara'
    );
    expect(h).toHaveLength(2);
  });

  it('con más de 12 reps el 1RM es 0 y la mejor serie es la de más peso', () => {
    const h = historialEjercicio([reg('z', 'Prensa', '2026-11-01', [[100, 15], [120, 14], [120, 13]])], 'Prensa');
    expect(h[0].mejor1RM).toBe(0);
    expect(h[0].mejorSerie).toEqual({ peso: 120, repeticiones: 14 });
  });

  it('vacío con lista o nombre vacíos', () => {
    expect(historialEjercicio([], 'Remo')).toEqual([]);
    expect(historialEjercicio(lista, '  ')).toEqual([]);
    expect(historialEjercicio(undefined, null)).toEqual([]);
  });
});

describe('recordsEjercicio (CA-3)', () => {
  it('devuelve los tres récords y en empate la fecha más antigua', () => {
    const h = historialEjercicio(
      [
        reg('1', 'Peso muerto', '2026-11-01', [[140, 3]]),
        reg('2', 'Peso muerto', '2026-11-08', [[140, 3]]),
        reg('3', 'Peso muerto', '2026-11-15', [[120, 8]]),
      ],
      'Peso muerto'
    );
    const r = recordsEjercicio(h);
    expect(r.pesoMaximo).toEqual({ valor: 140, fecha: '2026-11-01' });
    expect(r.mejor1RM).toEqual({ valor: 154, fecha: '2026-11-01' });
    expect(r.mejorVolumen).toEqual({ valor: 960, fecha: '2026-11-15' });
  });

  it('null con historial vacío', () => {
    expect(recordsEjercicio([])).toBeNull();
    expect(recordsEjercicio(undefined)).toBeNull();
  });
});

describe('registroEsRecord (CA-4)', () => {
  const base = reg('1', 'Press banca', '2026-11-01', [[80, 5]]);

  it('false el primer día', () => {
    expect(registroEsRecord([base], base)).toBe(false);
  });

  it('true si supera el peso máximo', () => {
    const hoy = reg('2', 'Press banca', '2026-11-08', [[82.5, 2]]);
    expect(registroEsRecord([hoy, base], hoy)).toBe(true);
  });

  it('true si solo supera el 1RM', () => {
    const hoy = reg('2', 'Press banca', '2026-11-08', [[80, 8]]);
    expect(registroEsRecord([hoy, base], hoy)).toBe(true);
  });

  it('false si iguala', () => {
    const hoy = reg('2', 'press banca', '2026-11-08', [[80, 5]]);
    expect(registroEsRecord([hoy, base], hoy)).toBe(false);
  });

  it('false si el mejor es del mismo día', () => {
    const fuerte = reg('2', 'Press banca', '2026-11-01', [[100, 5]]);
    expect(registroEsRecord([fuerte, base], fuerte)).toBe(false);
  });

  it('false con peso 0', () => {
    const hoy = reg('2', 'Press banca', '2026-11-08', [[0, 30]]);
    expect(registroEsRecord([hoy, base], hoy)).toBe(false);
  });

  it('con índice da lo mismo que sin él', () => {
    const hoy = reg('2', 'Press banca', '2026-11-08', [[85, 5]]);
    const lista = [hoy, base];
    expect(registroEsRecord(lista, hoy, indexarHistoriales(lista))).toBe(registroEsRecord(lista, hoy));
    expect(registroEsRecord(null, hoy, indexarHistoriales(lista))).toBe(true);
  });
});

describe('formatearKg', () => {
  it('usa coma y quita ceros', () => {
    expect(formatearKg(116.5)).toBe('116,5');
    expect(formatearKg(100)).toBe('100');
    expect(formatearKg(0)).toBe('0');
    expect(formatearKg(1500)).toBe('1500');
    expect(formatearKg(12345.5)).toBe('12\u00A0345,5');
  });
});
