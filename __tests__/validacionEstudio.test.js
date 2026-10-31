import {
  validarMateria,
  validarSesionEstudio,
  sanitizarTextoLinea,
  esFechaLocalValida,
  CATEGORIAS_MATERIA,
  NIVELES_COMPRENSION,
  MINUTOS_MAX,
  APUNTES_MIN,
  APUNTES_MAX,
  TEMA_MAX,
  MATERIA_MAX,
} from '../src/utils/validacionEstudio';

describe('validacionEstudio', () => {
  describe('sanitizarTextoLinea', () => {
    test('recorta espacios y convierte saltos de linea en espacios', () => {
      expect(sanitizarTextoLinea('  Hola\n\rMundo \n  ')).toBe('Hola Mundo');
      expect(sanitizarTextoLinea('   ')).toBe('');
      expect(sanitizarTextoLinea(null)).toBe('');
      expect(sanitizarTextoLinea(123)).toBe('');
    });
  });

  describe('esFechaLocalValida', () => {
    test('acepta fechas válidas en formato YYYY-MM-DD', () => {
      expect(esFechaLocalValida('2026-05-15')).toBe(true);
      expect(esFechaLocalValida('2024-02-29')).toBe(true); // bisiesto
    });

    test('rechaza fechas con formato incorrecto o días imposibles', () => {
      expect(esFechaLocalValida('2026-02-30')).toBe(false);
      expect(esFechaLocalValida('2026-13-01')).toBe(false);
      expect(esFechaLocalValida('2026-00-10')).toBe(false);
      expect(esFechaLocalValida('15/05/2026')).toBe(false);
      expect(esFechaLocalValida('invalido')).toBe(false);
      expect(esFechaLocalValida(null)).toBe(false);
    });
  });

  describe('validarMateria', () => {
    const materiasMock = [
      { id: 'mat-1', nombre: 'Matemáticas', categoria: 'Escuela' },
      { id: 'mat-2', nombre: 'Programación', categoria: 'Personal' },
    ];

    test('las constantes exportan las categorías permitidas', () => {
      expect(CATEGORIAS_MATERIA).toEqual(['Escuela', 'Personal']);
    });

    test('acepta una materia válida', () => {
      const res = validarMateria({ nombre: 'Física', categoria: 'Escuela' }, materiasMock);
      expect(res.valido).toBe(true);
      expect(res.datos.nombre).toBe('Física');
      expect(res.datos.categoria).toBe('Escuela');
    });

    test('rechaza nombre vacío o con solo espacios', () => {
      const res = validarMateria({ nombre: '   ', categoria: 'Escuela' }, materiasMock);
      expect(res.valido).toBe(false);
      expect(res.errores.nombre).toBeDefined();
    });

    test(`rechaza nombre que exceda ${MATERIA_MAX} caracteres`, () => {
      const largo = 'A'.repeat(MATERIA_MAX + 1);
      const res = validarMateria({ nombre: largo, categoria: 'Escuela' }, materiasMock);
      expect(res.valido).toBe(false);
      expect(res.errores.nombre).toBeDefined();
    });

    test('rechaza nombres duplicados sin distinguir mayúsculas ni espacios', () => {
      const res = validarMateria({ nombre: '  matemáticas  ', categoria: 'Escuela' }, materiasMock);
      expect(res.valido).toBe(false);
      expect(res.errores.nombre).toBe('Ya existe una materia con este nombre.');
    });

    test('permite el mismo nombre si coincide con idExcluir (edición)', () => {
      const res = validarMateria(
        { nombre: 'Matemáticas', categoria: 'Personal' },
        materiasMock,
        'mat-1'
      );
      expect(res.valido).toBe(true);
      expect(res.datos.categoria).toBe('Personal');
    });

    test('rechaza categoría inválida', () => {
      const res = validarMateria({ nombre: 'Química', categoria: 'Otra' }, materiasMock);
      expect(res.valido).toBe(false);
      expect(res.errores.categoria).toBeDefined();
    });
  });

  describe('validarSesionEstudio', () => {
    const materiasMock = [{ id: 'mat-1', nombre: 'Cálculo', categoria: 'Escuela' }];
    const fechaHoy = '2026-10-31';

    const sesionValida = {
      materiaId: 'mat-1',
      tema: 'Integrales triples',
      comprension: 'Bien',
      minutos: 60,
      apuntes: 'Resolución de ejercicios prácticos en coordenadas cilíndricas.',
      fecha: '2026-10-31',
    };

    test('acepta una sesión completa y válida', () => {
      const res = validarSesionEstudio(sesionValida, {
        fechaHoy,
        materiasExistentes: materiasMock,
      });
      expect(res.valido).toBe(true);
      expect(res.errores).toEqual({});
      expect(res.datos.minutos).toBe(60);
      expect(res.datos.tema).toBe('Integrales triples');
    });

    test('rechaza si la materiaId no existe en materiasExistentes', () => {
      const res = validarSesionEstudio(
        { ...sesionValida, materiaId: 'no-existe' },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res.valido).toBe(false);
      expect(res.errores.materiaId).toBeDefined();
    });

    test('valida tema vacío y límite de caracteres (1 a 120)', () => {
      const resVacio = validarSesionEstudio(
        { ...sesionValida, tema: '   ' },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(resVacio.valido).toBe(false);
      expect(resVacio.errores.tema).toBeDefined();

      const resLargo = validarSesionEstudio(
        { ...sesionValida, tema: 'T'.repeat(TEMA_MAX + 1) },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(resLargo.valido).toBe(false);
      expect(resLargo.errores.tema).toBeDefined();
    });

    test('valida niveles de comprensión válidos', () => {
      NIVELES_COMPRENSION.forEach((nivel) => {
        const res = validarSesionEstudio(
          { ...sesionValida, comprension: nivel },
          { fechaHoy, materiasExistentes: materiasMock }
        );
        expect(res.valido).toBe(true);
      });

      const resInvalido = validarSesionEstudio(
        { ...sesionValida, comprension: 'Excelente' },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(resInvalido.valido).toBe(false);
      expect(resInvalido.errores.comprension).toBeDefined();
    });

    test('valida minutos: 0, 1, 720, 721, decimales y NaN', () => {
      const res0 = validarSesionEstudio(
        { ...sesionValida, minutos: 0 },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res0.valido).toBe(false);
      expect(res0.errores.minutos).toBeDefined();

      const res1 = validarSesionEstudio(
        { ...sesionValida, minutos: 1 },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res1.valido).toBe(true);

      const res720 = validarSesionEstudio(
        { ...sesionValida, minutos: MINUTOS_MAX },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res720.valido).toBe(true);

      const res721 = validarSesionEstudio(
        { ...sesionValida, minutos: MINUTOS_MAX + 1 },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res721.valido).toBe(false);

      const resDecimal = validarSesionEstudio(
        { ...sesionValida, minutos: 1.5 },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(resDecimal.valido).toBe(false);

      const resNaN = validarSesionEstudio(
        { ...sesionValida, minutos: 'abc' },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(resNaN.valido).toBe(false);
    });

    test('valida apuntes: 9, 10, 5000 y 5001 caracteres', () => {
      const res9 = validarSesionEstudio(
        { ...sesionValida, apuntes: 'A'.repeat(APUNTES_MIN - 1) },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res9.valido).toBe(false);
      expect(res9.errores.apuntes).toBeDefined();

      const res10 = validarSesionEstudio(
        { ...sesionValida, apuntes: 'A'.repeat(APUNTES_MIN) },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res10.valido).toBe(true);

      const res5000 = validarSesionEstudio(
        { ...sesionValida, apuntes: 'A'.repeat(APUNTES_MAX) },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res5000.valido).toBe(true);

      const res5001 = validarSesionEstudio(
        { ...sesionValida, apuntes: 'A'.repeat(APUNTES_MAX + 1) },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(res5001.valido).toBe(false);
      expect(res5001.errores.apuntes).toBeDefined();
    });

    test('valida fechas: fecha futura rechazada en alta y aceptada en días pasados', () => {
      const resPasado = validarSesionEstudio(
        { ...sesionValida, fecha: '2026-10-25' },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(resPasado.valido).toBe(true);

      const resFuturo = validarSesionEstudio(
        { ...sesionValida, fecha: '2026-11-01' },
        { fechaHoy, materiasExistentes: materiasMock }
      );
      expect(resFuturo.valido).toBe(false);
      expect(resFuturo.errores.fecha).toBe('No se pueden registrar sesiones en fechas futuras.');
    });

    test('en modo esEdicion: fecha futura o cualquier fecha no se vuelve a validar (Defensa 11)', () => {
      const resEdicion = validarSesionEstudio(
        { ...sesionValida, fecha: '2099-12-31' },
        { fechaHoy, materiasExistentes: materiasMock, esEdicion: true }
      );
      expect(resEdicion.valido).toBe(true);
      expect(resEdicion.errores.fecha).toBeUndefined();
    });
  });
});
