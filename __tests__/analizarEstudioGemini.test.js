import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  construirPromptEstudioDelDia,
  analizarEstudioDelDiaConGemini,
  GeminiError,
} from '../src/services/gemini';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Gemini Estudio (Spec 016)', () => {
  const contextoBase = {
    fechaHoy: '2026-10-31',
    sesionesHoy: [
      {
        id: 's-1',
        materia: 'Cálculo',
        categoria: 'Escuela',
        tema: 'Derivadas',
        comprension: 'Bien',
        minutos: 50,
        apuntes: 'Regla del producto y regla de la cadena explicadas a detalle.',
      },
    ],
    sesionesPrevias: [
      {
        fecha: '2026-10-30',
        materia: 'Física',
        categoria: 'Escuela',
        tema: 'Cinemática',
        comprension: 'Más o menos',
        minutos: 40,
      },
    ],
    minutosTotales: 50,
    materias: [{ materia: 'Cálculo', categoria: 'Escuela', minutos: 50 }],
    firmas: { 's-1': 1793479000000 },
  };

  const perfilTexto = {
    edadTexto: '25 años',
    fechaLegible: 'Sábado, 31 de Octubre de 2026',
    hora12h: '6:30 PM',
  };

  describe('construirPromptEstudioDelDia', () => {
    test('incluye apuntes completos en sesiones de hoy y omite apuntes en previas (CA-6)', () => {
      const prompt = construirPromptEstudioDelDia(contextoBase, perfilTexto);

      expect(prompt).toContain('Regla del producto y regla de la cadena');
      expect(prompt).toContain('HISTORIAL DE ESTUDIO DE LOS ÚLTIMOS 7 DÍAS');
      expect(prompt).toContain('2026-10-30 | [Escuela] Física | "Cinemática" | 40 min');
      expect(prompt).toContain('Relaciona lo de hoy con los últimos 7 días');
    });

    test('omite el bloque de historial si sesionesPrevias está vacío (CA-6)', () => {
      const contextoSinPrevias = {
        ...contextoBase,
        sesionesPrevias: [],
      };
      const prompt = construirPromptEstudioDelDia(contextoSinPrevias, perfilTexto);

      expect(prompt).not.toContain('HISTORIAL DE ESTUDIO DE LOS ÚLTIMOS 7 DÍAS');
      expect(prompt).toContain(
        'Es el primer registro de estudio disponible; no hagas comparaciones con días anteriores.'
      );
    });

    test('la plantilla del prompt no contiene emojis (CA-11)', () => {
      const prompt = construirPromptEstudioDelDia(contextoBase, perfilTexto);
      const regexEmojis = /\p{Extended_Pictographic}/u;
      expect(regexEmojis.test(prompt)).toBe(false);
    });
  });

  describe('analizarEstudioDelDiaConGemini', () => {
    const originalFetch = global.fetch;

    beforeEach(async () => {
      jest.clearAllMocks();
      await AsyncStorage.clear();
      // Guardar una API key válida en el storage BYOK para las pruebas
      await AsyncStorage.setItem(
        '@fitness_tracker_gemini_api_key',
        'AIzaSyPruebaValida12345'
      );
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('lanza GeminiError inmediatamente si sesionesHoy está vacío sin llamar a fetch', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      await expect(
        analizarEstudioDelDiaConGemini({ sesionesHoy: [] })
      ).rejects.toThrow('No hay sesiones de estudio hoy para analizar.');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('failover: si el primer modelo responde 503, se intenta el segundo y retorna su resultado (CA-5)', async () => {
      const jsonValidoGemini = {
        resumenSimple: 'Buen avance en cálculo.',
        resumenDetallado:
          'Se comprendió la regla de la cadena con aplicaciones claras.',
        veredicto: 8.5,
        temasDominados: ['Derivadas'],
        temasPorRepasar: [],
        puntosClave: ['Buen enfoque'],
        recomendacionesManana: ['Hacer ejercicios'],
      };

      const mockFetch = jest
        .fn()
        // 1er intento (modelo principal): 503 Service Unavailable
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        })
        // 2do intento (modelo respaldo): 200 OK con respuesta estructurada
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(jsonValidoGemini) }],
                },
              },
            ],
          }),
        });

      global.fetch = mockFetch;

      const eventosProgreso = [];
      const respuesta = await analizarEstudioDelDiaConGemini(contextoBase, {
        onProgreso: (p) => eventosProgreso.push(p),
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(respuesta.resultado.veredicto).toBe(8.5);
      expect(respuesta.resultado.minutosTotales).toBe(50);
      expect(respuesta.modeloUsado).toBe('gemini-3.5-flash-lite');
      expect(eventosProgreso.length).toBe(2);
      expect(eventosProgreso[1].falloAnterior?.status).toBe(503);
    });

    test('failover ante JSON malformado o sin veredicto numérico (Defensa 4 & CA-7)', async () => {
      const jsonInvalidoSinVeredicto = {
        resumenSimple: 'Resumen simple',
        resumenDetallado: 'Detalle',
        veredicto: 'no-es-numero', // Invalida la respuesta en normalizarResumenEstudio
      };

      const jsonValidoSegundo = {
        resumenSimple: 'Resumen válido',
        resumenDetallado: 'Detalle válido',
        veredicto: 7.5,
      };

      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(jsonInvalidoSinVeredicto) }],
                },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(jsonValidoSegundo) }],
                },
              },
            ],
          }),
        });

      global.fetch = mockFetch;

      const respuesta = await analizarEstudioDelDiaConGemini(contextoBase);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(respuesta.resultado.veredicto).toBe(7.5);
    });

    test('lanza GeminiError con fallos acumulados si todos los modelos fallan (CA-5)', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      global.fetch = mockFetch;

      await expect(
        analizarEstudioDelDiaConGemini(contextoBase)
      ).rejects.toThrow(GeminiError);
    });
  });
});
