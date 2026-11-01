const {
  parsearEnv,
  leerValoresSecretos,
  encontrarSecretos,
} = require('../scripts/escaneoSecretos');

describe('escaneoSecretos (CA-10, Spec 017)', () => {
  const CLAVE_AIZA = 'AIza' + 'B'.repeat(35);
  const CLAVE_AQ = 'AQ.' + 'Zy9Xw2'.repeat(8) + 'kL';

  describe('encontrarSecretos', () => {
    test('detecta patrones AIza y AQ en texto y en bytes (TextEncoder)', () => {
      const encoder = new TextEncoder();

      const hallazgosAizaTexto = encontrarSecretos(`prefijo ${CLAVE_AIZA} sufijo`);
      expect(hallazgosAizaTexto).toContain('patrón de API key de Google (AIza…)');

      const hallazgosAizaBytes = encontrarSecretos(
        encoder.encode(`prefijo ${CLAVE_AIZA} sufijo`)
      );
      expect(hallazgosAizaBytes).toContain('patrón de API key de Google (AIza…)');

      const hallazgosAqTexto = encontrarSecretos(`data ${CLAVE_AQ}`);
      expect(hallazgosAqTexto).toContain('patrón de API key de Google (AQ.…)');

      const hallazgosAqBytes = encontrarSecretos(
        encoder.encode(`data ${CLAVE_AQ}`)
      );
      expect(hallazgosAqBytes).toContain('patrón de API key de Google (AQ.…)');
    });

    test('detecta valor de variable de .env por nombre sin exponer el valor', () => {
      const valores = [
        { nombre: 'MI_API_KEY_SECRETA', valor: 'secreto12345678' },
      ];
      const hallazgos = encontrarSecretos(
        'codigo compilado con secreto12345678 incrustado',
        valores
      );

      expect(hallazgos).toContain('valor de MI_API_KEY_SECRETA');
      expect(hallazgos.join(', ')).not.toContain('secreto12345678');
    });

    test('contenido limpio devuelve arreglo vacío', () => {
      const hallazgos = encontrarSecretos('console.log("hola mundo sin secretos");');
      expect(hallazgos).toEqual([]);
    });
  });

  describe('parsearEnv', () => {
    test('soporta CRLF, BOM, export, comillas y comentarios de final de línea', () => {
      const envTexto =
        '\uFEFF# Comentario inicial\r\n' +
        'export EXPO_PUBLIC_GEMINI_KEY="secreto-comillas" # comentario\r\n' +
        "OTRO_TOKEN='token-simple'\r\n" +
        'SIN_COMILLAS=valor-sin-comillas # otro comentario\r\n' +
        '\r\n' +
        'LINEA_VACIA=\r\n';

      const pares = parsearEnv(envTexto);
      expect(pares).toEqual([
        { nombre: 'EXPO_PUBLIC_GEMINI_KEY', valor: 'secreto-comillas' },
        { nombre: 'OTRO_TOKEN', valor: 'token-simple' },
        { nombre: 'SIN_COMILLAS', valor: 'valor-sin-comillas' },
        { nombre: 'LINEA_VACIA', valor: '' },
      ]);
    });
  });

  describe('leerValoresSecretos', () => {
    test('extrae solo variables con nombres de secreto y valores >= 8 caracteres', () => {
      const entornoFalso = {
        EXPO_PUBLIC_GEMINI_MODEL: 'gemini-3-flash-preview',
        GEMINI_API_KEY: 'clave-real-123456',
        PASSWORD_DB: '12345678',
        API_KEY_CORTA: '123',
      };

      const secretos = leerValoresSecretos('/directorio/inexistente', entornoFalso);
      const nombres = secretos.map((s) => s.nombre);

      expect(nombres).toContain('GEMINI_API_KEY');
      expect(nombres).toContain('PASSWORD_DB');
      expect(nombres).not.toContain('EXPO_PUBLIC_GEMINI_MODEL');
      expect(nombres).not.toContain('API_KEY_CORTA');
    });
  });
});
