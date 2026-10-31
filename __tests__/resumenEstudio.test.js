import {
  restarDiasFechaLocal,
  formatearHora12h,
  obtenerNivelComprensionCanonico,
  construirContextoResumenEstudio,
  contarSesionesSinAnalizar,
  textoSesionesSinAnalizar,
  normalizarResumenEstudio,
} from '../src/utils/resumenEstudio';

describe('resumenEstudio utilidades', () => {
  describe('restarDiasFechaLocal', () => {
    test('resta días dentro del mismo mes', () => {
      expect(restarDiasFechaLocal('2026-10-31', 5)).toBe('2026-10-26');
    });

    test('cruza de mes hacia el anterior', () => {
      expect(restarDiasFechaLocal('2026-05-03', 5)).toBe('2026-04-28');
    });

    test('cruza de año', () => {
      expect(restarDiasFechaLocal('2026-01-02', 3)).toBe('2025-12-30');
    });

    test('maneja año bisiesto correctamente (2024)', () => {
      expect(restarDiasFechaLocal('2024-03-01', 1)).toBe('2024-02-29');
    });
  });

  describe('formatearHora12h', () => {
    test('formatea medianoche (0 horas)', () => {
      const fecha = new Date(2026, 9, 31, 0, 5);
      expect(formatearHora12h(fecha)).toBe('12:05 AM');
    });

    test('formatea mediodía (12 horas)', () => {
      const fecha = new Date(2026, 9, 31, 12, 0);
      expect(formatearHora12h(fecha)).toBe('12:00 PM');
    });

    test('formatea tarde (18:40)', () => {
      const fecha = new Date(2026, 9, 31, 18, 40);
      expect(formatearHora12h(fecha)).toBe('6:40 PM');
    });
  });

  describe('obtenerNivelComprensionCanonico', () => {
    test('reconoce variaciones de mayúsculas y acentos', () => {
      expect(obtenerNivelComprensionCanonico('bien')).toBe('Bien');
      expect(obtenerNivelComprensionCanonico('BIEN')).toBe('Bien');
      expect(obtenerNivelComprensionCanonico('mas o menos')).toBe('Más o menos');
      expect(obtenerNivelComprensionCanonico('Más o Menos')).toBe('Más o menos');
      expect(obtenerNivelComprensionCanonico('no tanto')).toBe('No tanto');
      expect(obtenerNivelComprensionCanonico('nada')).toBe('Nada');
    });

    test('devuelve null si no coincide con los niveles canónicos', () => {
      expect(obtenerNivelComprensionCanonico('excelente')).toBeNull();
      expect(obtenerNivelComprensionCanonico('')).toBeNull();
      expect(obtenerNivelComprensionCanonico(null)).toBeNull();
    });
  });

  describe('construirContextoResumenEstudio', () => {
    const fechaHoy = '2026-10-31';
    const materiasMock = [
      { id: 'm1', nombre: 'Cálculo', categoria: 'Escuela' },
      { id: 'm2', nombre: 'React Native', categoria: 'Personal' },
    ];

    test('separa hoy, los 7 días previos y omite lo fuera de rango', () => {
      const sesiones = [
        // Hoy
        {
          id: 's-hoy-1',
          materiaId: 'm1',
          fecha: '2026-10-31',
          tema: 'Derivadas',
          comprension: 'Bien',
          minutos: 45,
          apuntes: 'Regla de la cadena',
          creadaEn: 100,
        },
        // Previa dentro de rango (ayer)
        {
          id: 's-prev-1',
          materiaId: 'm2',
          fecha: '2026-10-30',
          tema: 'Hooks',
          comprension: 'Más o menos',
          minutos: 60,
          apuntes: 'Apuntes que deben omitirse en historial previo',
          creadaEn: 50,
        },
        // Fuera de rango (hace 10 días)
        {
          id: 's-vieja',
          materiaId: 'm1',
          fecha: '2026-10-20',
          tema: 'Límites',
          comprension: 'Bien',
          minutos: 30,
          creadaEn: 10,
        },
      ];

      const contexto = construirContextoResumenEstudio({
        sesiones,
        materias: materiasMock,
        fechaHoy,
      });

      expect(contexto.sesionesHoy).toHaveLength(1);
      expect(contexto.sesionesHoy[0].id).toBe('s-hoy-1');
      expect(contexto.sesionesHoy[0].materia).toBe('Cálculo');
      expect(contexto.sesionesHoy[0].apuntes).toBe('Regla de la cadena');

      expect(contexto.sesionesPrevias).toHaveLength(1);
      expect(contexto.sesionesPrevias[0].tema).toBe('Hooks');
      // Las sesiones previas NO deben incluir apuntes
      expect(contexto.sesionesPrevias[0].apuntes).toBeUndefined();

      expect(contexto.minutosTotales).toBe(45);
      expect(contexto.materias).toEqual([
        { materia: 'Cálculo', categoria: 'Escuela', minutos: 45 },
      ]);
      expect(contexto.firmas).toEqual({
        's-hoy-1': 100,
      });
    });

    test('resuelve materias faltantes como Sin materia y categoría Personal', () => {
      const sesiones = [
        {
          id: 's-1',
          materiaId: 'inexistente',
          fecha: '2026-10-31',
          tema: 'Filosofía',
          comprension: 'Nada',
          minutos: 20,
          apuntes: 'Notas breves',
        },
      ];

      const contexto = construirContextoResumenEstudio({
        sesiones,
        materias: [],
        fechaHoy,
      });
      expect(contexto.sesionesHoy[0].materia).toBe('Sin materia');
      expect(contexto.sesionesHoy[0].categoria).toBe('Personal');
    });

    test('aplica tope igual por sesión con [recortado] si supera 40000 caracteres (Defensa 5)', () => {
      const apunteEnorme = 'A'.repeat(25000);
      const sesiones = [
        {
          id: 's-1',
          materiaId: 'm1',
          fecha: '2026-10-31',
          tema: 'T1',
          comprension: 'Bien',
          minutos: 30,
          apuntes: apunteEnorme,
        },
        {
          id: 's-2',
          materiaId: 'm1',
          fecha: '2026-10-31',
          tema: 'T2',
          comprension: 'Bien',
          minutos: 30,
          apuntes: apunteEnorme,
        },
      ];

      const contexto = construirContextoResumenEstudio({
        sesiones,
        materias: materiasMock,
        fechaHoy,
      });
      // 50000 caracteres > 40000. Tope por sesión = 40000 / 2 = 20000.
      expect(contexto.sesionesHoy[0].apuntes).toHaveLength(20000 + ' [recortado]'.length);
      expect(contexto.sesionesHoy[0].apuntes.endsWith(' [recortado]')).toBe(true);
    });
  });

  describe('contarSesionesSinAnalizar & textoSesionesSinAnalizar', () => {
    test('detecta sesiones nuevas, editadas y eliminadas', () => {
      const firmasGuardadas = {
        's-1': 100, // no cambió
        's-2': 200, // se editará
        's-3': 300, // se eliminará
      };

      const sesionesHoy = [
        { id: 's-1', creadaEn: 100 },
        { id: 's-2', creadaEn: 200, editadaEn: 250 }, // editada
        { id: 's-4', creadaEn: 400 }, // nueva
      ];

      const total = contarSesionesSinAnalizar({
        sesionesHoy,
        firmas: firmasGuardadas,
      });

      // s-4 es nueva (+1), s-2 está editada (+1), s-3 fue eliminada (+1) -> Total 3
      expect(total).toBe(3);
      expect(textoSesionesSinAnalizar(total)).toBe(
        '3 sesiones nuevas, editadas o eliminadas sin analizar'
      );
    });

    test('genera texto singular para 1 sesión sin analizar', () => {
      expect(textoSesionesSinAnalizar(1)).toBe(
        '1 sesión nueva, editada o eliminada sin analizar'
      );
      expect(textoSesionesSinAnalizar(0)).toBeNull();
    });
  });

  describe('normalizarResumenEstudio', () => {
    const contextoMock = {
      minutosTotales: 75,
      materias: [{ materia: 'Física', categoria: 'Escuela', minutos: 75 }],
    };

    test('valida y normaliza un JSON correcto sobrescribiendo minutos y materias con los locales', () => {
      const jsonGemini = {
        resumenSimple: 'Buen día de estudio en física.',
        resumenDetallado: 'Se abarcaron las tres leyes de Newton con ejemplos claros.',
        veredicto: 8.54,
        minutosTotales: 999, // debe ser sobrescrito por el contexto
        materias: [{ materia: 'Otra', categoria: 'Personal', minutos: 999 }],
        temasDominados: ['Primera ley de Newton', 'Inercia'],
        temasPorRepasar: [
          {
            materia: 'Física',
            tema: 'Fricción',
            comprension: 'mas o menos',
            sugerencia: 'Hacer 3 ejercicios prácticos.',
          },
        ],
        puntosClave: ['Punto 1', 'Punto 2'],
        recomendacionesManana: ['Repasar fórmulas'],
      };

      const res = normalizarResumenEstudio(jsonGemini, contextoMock);
      expect(res).not.toBeNull();
      expect(res.veredicto).toBe(8.5);
      expect(res.minutosTotales).toBe(75);
      expect(res.materias).toEqual(contextoMock.materias);
      expect(res.temasPorRepasar[0].comprension).toBe('Más o menos');
    });

    test('acota el veredicto entre 0 y 10', () => {
      const jsonMenor = {
        resumenSimple: 'Simple',
        resumenDetallado: 'Detallado',
        veredicto: -5,
      };
      expect(normalizarResumenEstudio(jsonMenor, contextoMock).veredicto).toBe(0);

      const jsonMayor = {
        resumenSimple: 'Simple',
        resumenDetallado: 'Detallado',
        veredicto: 14.8,
      };
      expect(normalizarResumenEstudio(jsonMayor, contextoMock).veredicto).toBe(10);
    });

    test('devuelve null ante respuestas incompletas o tipos inválidos', () => {
      expect(normalizarResumenEstudio(null, contextoMock)).toBeNull();
      expect(normalizarResumenEstudio([], contextoMock)).toBeNull();
      expect(normalizarResumenEstudio('texto', contextoMock)).toBeNull();

      // Falta resumenSimple o vacío
      expect(
        normalizarResumenEstudio(
          { resumenSimple: '   ', resumenDetallado: 'Detalle', veredicto: 7 },
          contextoMock
        )
      ).toBeNull();

      // Veredicto vacío o inválido
      expect(
        normalizarResumenEstudio(
          { resumenSimple: 'Simple', resumenDetallado: 'Detalle', veredicto: '' },
          contextoMock
        )
      ).toBeNull();
      expect(
        normalizarResumenEstudio(
          { resumenSimple: 'Simple', resumenDetallado: 'Detalle', veredicto: 'abc' },
          contextoMock
        )
      ).toBeNull();
    });
  });
});
