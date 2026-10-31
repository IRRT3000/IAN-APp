import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEY_MATERIAS,
  PREFIJO_SESIONES_ESTUDIO,
  claveSesionesDeMes,
  clavesDeSesiones,
  cargarMaterias,
  guardarMateria,
  actualizarMateria,
  eliminarMateria,
  cargarSesionesEstudio,
  guardarSesionEstudio,
  actualizarSesionEstudio,
  eliminarSesionEstudio,
  obtenerResumenEstudio,
  existeClaveResumenEstudio,
  guardarResumenEstudio,
  claveResumenDeFecha,
  PREFIJO_RESUMEN_ESTUDIO,
} from '../src/services/estudioStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('estudioStorage', () => {
  const fechaHoy = '2026-10-31';

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('clavesDeSesiones', () => {
    test('filtra solo claves con prefijo de sesiones excluyendo respaldos corruptos', () => {
      const keys = [
        `${PREFIJO_SESIONES_ESTUDIO}2026-10`,
        `${PREFIJO_SESIONES_ESTUDIO}2026-11`,
        `${PREFIJO_SESIONES_ESTUDIO}2026-10:corrupto:123456`,
        STORAGE_KEY_MATERIAS,
        'otra_clave',
      ];
      const filtradas = clavesDeSesiones(keys);
      expect(filtradas).toEqual([
        `${PREFIJO_SESIONES_ESTUDIO}2026-10`,
        `${PREFIJO_SESIONES_ESTUDIO}2026-11`,
      ]);
    });
  });

  describe('CRUD Materias', () => {
    test('guarda, actualiza y carga materias', async () => {
      const materiasIniciales = await cargarMaterias();
      expect(materiasIniciales).toEqual([]);

      const trasGuardar = await guardarMateria({ nombre: 'Historia', categoria: 'Escuela' });
      expect(trasGuardar).toHaveLength(1);
      expect(trasGuardar[0].nombre).toBe('Historia');
      expect(trasGuardar[0].categoria).toBe('Escuela');

      const id = trasGuardar[0].id;
      const trasActualizar = await actualizarMateria(id, {
        nombre: 'Historia Universal',
        categoria: 'Personal',
      });
      expect(trasActualizar[0].nombre).toBe('Historia Universal');
      expect(trasActualizar[0].categoria).toBe('Personal');

      const cargadas = await cargarMaterias();
      expect(cargadas).toHaveLength(1);
      expect(cargadas[0].nombre).toBe('Historia Universal');
    });

    test('eliminarMateria funciona si no hay sesiones asociadas', async () => {
      const mats = await guardarMateria({ nombre: 'Química', categoria: 'Escuela' });
      const id = mats[0].id;

      const trasEliminar = await eliminarMateria(id);
      expect(trasEliminar).toEqual([]);

      const cargadas = await cargarMaterias();
      expect(cargadas).toEqual([]);
    });

    test('eliminarMateria lanza error si la materia tiene sesiones registradas (CA-9)', async () => {
      const mats = await guardarMateria({ nombre: 'Física', categoria: 'Escuela' });
      const materiaId = mats[0].id;

      await guardarSesionEstudio(
        {
          materiaId,
          tema: 'Termodinámica',
          comprension: 'Bien',
          minutos: 45,
          apuntes: 'Conceptos de entropía y energía interna.',
          fecha: '2026-10-30',
        },
        { fechaHoy, materias: mats }
      );

      await expect(eliminarMateria(materiaId)).rejects.toThrow(
        'No puedes borrar una materia que tiene sesiones registradas.'
      );
    });
  });

  describe('CRUD Sesiones de Estudio', () => {
    test('guardar genera claves mensuales separadas (CA-14)', async () => {
      const mats = await guardarMateria({ nombre: 'Biología', categoria: 'Escuela' });
      const materiaId = mats[0].id;

      const sesionOctubre = await guardarSesionEstudio(
        {
          materiaId,
          tema: 'Célula animal',
          comprension: 'Bien',
          minutos: 30,
          apuntes: 'Estructura celular y organelos principales.',
          fecha: '2026-10-15',
        },
        { fechaHoy, materias: mats }
      );

      const sesionSeptiembre = await guardarSesionEstudio(
        {
          materiaId,
          tema: 'Mitosis y meiosis',
          comprension: 'Más o menos',
          minutos: 60,
          apuntes: 'Fases de la división celular y diferencias.',
          fecha: '2026-09-28',
        },
        { fechaHoy, materias: mats }
      );

      const claveOct = claveSesionesDeMes('2026-10-15');
      const claveSep = claveSesionesDeMes('2026-09-28');

      const rawOct = await AsyncStorage.getItem(claveOct);
      const rawSep = await AsyncStorage.getItem(claveSep);

      expect(JSON.parse(rawOct)).toHaveLength(1);
      expect(JSON.parse(rawSep)).toHaveLength(1);

      // Cargar sesiones consolida y ordena por fecha descendente
      const todas = await cargarSesionesEstudio();
      expect(todas).toHaveLength(2);
      expect(todas[0].id).toBe(sesionOctubre.id);
      expect(todas[1].id).toBe(sesionSeptiembre.id);
    });

    test('actualizarSesionEstudio conserva id, fecha y creadaEn y añade editadaEn (CA-7)', async () => {
      const mats = await guardarMateria({ nombre: 'Arte', categoria: 'Personal' });
      const materiaId = mats[0].id;

      const sesion = await guardarSesionEstudio(
        {
          materiaId,
          tema: 'Renacimiento',
          comprension: 'Bien',
          minutos: 40,
          apuntes: 'Pintores florentinos del siglo XV.',
          fecha: '2026-10-20',
        },
        { fechaHoy, materias: mats }
      );

      const actualizada = await actualizarSesionEstudio(
        sesion.id,
        sesion.fecha,
        {
          materiaId,
          tema: 'Alto Renacimiento',
          comprension: 'No tanto',
          minutos: 50,
          apuntes: 'Obras cumbre de Leonardo y Miguel Ángel.',
        },
        { materias: mats }
      );

      expect(actualizada.id).toBe(sesion.id);
      expect(actualizada.fecha).toBe(sesion.fecha);
      expect(actualizada.creadaEn).toBe(sesion.creadaEn);
      expect(actualizada.editadaEn).toBeGreaterThanOrEqual(sesion.creadaEn);
      expect(actualizada.tema).toBe('Alto Renacimiento');
      expect(actualizada.comprension).toBe('No tanto');
    });

    test('eliminarSesionEstudio retira la sesión del almacenamiento', async () => {
      const mats = await guardarMateria({ nombre: 'Música', categoria: 'Personal' });
      const materiaId = mats[0].id;

      const sesion = await guardarSesionEstudio(
        {
          materiaId,
          tema: 'Armonía tonal',
          comprension: 'Bien',
          minutos: 35,
          apuntes: 'Cadencias perfectas e imperfectas.',
          fecha: '2026-10-10',
        },
        { fechaHoy, materias: mats }
      );

      await eliminarSesionEstudio(sesion.id, sesion.fecha);

      const todas = await cargarSesionesEstudio();
      expect(todas).toHaveLength(0);
    });
  });

  describe('Defensa 3 & CA-14: Manejo de errores y respaldos de corrupción', () => {
    test('con JSON corrupto, al guardar se respalda en :corrupto: antes de escribir', async () => {
      const mats = await guardarMateria({ nombre: 'Sociología', categoria: 'Escuela' });
      const materiaId = mats[0].id;

      const claveMes = claveSesionesDeMes('2026-10-05');
      const textoCorrupto = '{ json malformado sin cerrar';
      await AsyncStorage.setItem(claveMes, textoCorrupto);

      const sesion = await guardarSesionEstudio(
        {
          materiaId,
          tema: 'Teoría de sistemas',
          comprension: 'Bien',
          minutos: 45,
          apuntes: 'Análisis de la sociedad según Luhmann.',
          fecha: '2026-10-05',
        },
        { fechaHoy, materias: mats }
      );

      expect(sesion.id).toBeDefined();

      const allKeys = await AsyncStorage.getAllKeys();
      const claveRespaldo = allKeys.find((k) => k.startsWith(`${claveMes}:corrupto:`));
      expect(claveRespaldo).toBeDefined();

      const rawRespaldo = await AsyncStorage.getItem(claveRespaldo);
      expect(rawRespaldo).toBe(textoCorrupto);

      const rawMes = await AsyncStorage.getItem(claveMes);
      expect(JSON.parse(rawMes)).toHaveLength(1);
    });

    test('con getItem mockeado para rechazar, guardarSesionEstudio lanza error y NO llama a setItem (CA-14)', async () => {
      const mats = [{ id: 'mat-1', nombre: 'Test', categoria: 'Escuela' }];

      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Fallo de disco'));
      const spySetItem = jest.spyOn(AsyncStorage, 'setItem');

      await expect(
        guardarSesionEstudio(
          {
            materiaId: 'mat-1',
            tema: 'Tema prueba',
            comprension: 'Bien',
            minutos: 30,
            apuntes: 'Apuntes para prueba de fallo de lectura.',
            fecha: '2026-10-12',
          },
          { fechaHoy, materias: mats }
        )
      ).rejects.toThrow('Fallo de disco');

      expect(spySetItem).not.toHaveBeenCalled();
    });
  });

  describe('Defensa 4 & CA-15: Concurrencia y cola serial', () => {
    test('dos guardarSesionEstudio en paralelo terminan con ambas sesiones guardadas sin pisarse', async () => {
      const mats = await guardarMateria({ nombre: 'Literatura', categoria: 'Escuela' });
      const materiaId = mats[0].id;

      const p1 = guardarSesionEstudio(
        {
          materiaId,
          tema: 'Siglo de Oro',
          comprension: 'Bien',
          minutos: 45,
          apuntes: 'Góngora y Quevedo, culteranismo y conceptismo.',
          fecha: '2026-10-22',
        },
        { fechaHoy, materias: mats }
      );

      const p2 = guardarSesionEstudio(
        {
          materiaId,
          tema: 'Generación del 98',
          comprension: 'Más o menos',
          minutos: 60,
          apuntes: 'Unamuno, Baroja y Machado en contexto histórico.',
          fecha: '2026-10-22',
        },
        { fechaHoy, materias: mats }
      );

      const [s1, s2] = await Promise.all([p1, p2]);
      expect(s1.id).toBeDefined();
      expect(s2.id).toBeDefined();

      const clave = claveSesionesDeMes('2026-10-22');
      const raw = await AsyncStorage.getItem(clave);
      const enAlmacenamiento = JSON.parse(raw);

      expect(enAlmacenamiento).toHaveLength(2);
      const ids = enAlmacenamiento.map((s) => s.id);
      expect(ids).toContain(s1.id);
      expect(ids).toContain(s2.id);
    });
  });

  describe('Resumen de Estudio (Spec 016 & CA-4)', () => {
    const fecha = '2026-10-31';
    const entradaValida = {
      resultado: {
        resumenSimple: 'Excelente día de cálculo.',
        resumenDetallado: 'Dominio claro de derivadas y límites.',
        veredicto: 9.0,
        minutosTotales: 90,
        materias: [{ materia: 'Cálculo', categoria: 'Escuela', minutos: 90 }],
        temasDominados: ['Regla de la cadena'],
        temasPorRepasar: [],
        puntosClave: ['Constancia alta'],
        recomendacionesManana: ['Repasar integrales'],
      },
      generadoEn: 1793480400000,
      hora12h: '7:30 PM',
      firmas: { 's-1': 1793479000000 },
      modeloUsado: 'gemini-3-flash-preview',
    };

    test('guardarResumenEstudio almacena en clave por fecha y obtenerResumenEstudio lo recupera', async () => {
      const guardado = await guardarResumenEstudio(fecha, entradaValida);
      expect(guardado).toEqual(entradaValida);

      const claveEsperada = `${PREFIJO_RESUMEN_ESTUDIO}${fecha}`;
      expect(claveResumenDeFecha(fecha)).toBe(claveEsperada);

      const enStorage = await AsyncStorage.getItem(claveEsperada);
      expect(JSON.parse(enStorage)).toEqual(entradaValida);

      const recuperado = await obtenerResumenEstudio(fecha);
      expect(recuperado).toEqual(entradaValida);

      const existe = await existeClaveResumenEstudio(fecha);
      expect(existe).toBe(true);
    });

    test('segundo guardarResumenEstudio para la misma fecha es rechazado con error (CA-4)', async () => {
      await guardarResumenEstudio(fecha, entradaValida);

      await expect(
        guardarResumenEstudio(fecha, { ...entradaValida, hora12h: '8:00 PM' })
      ).rejects.toThrow('Ya existe un resumen de estudio para esta fecha.');

      // El contenido original no debe haber cambiado
      const recuperado = await obtenerResumenEstudio(fecha);
      expect(recuperado.hora12h).toBe('7:30 PM');
    });

    test('si getItem rechaza, guardarResumenEstudio propaga el error y NO llama a setItem', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Fallo de I/O'));
      const spySetItem = jest.spyOn(AsyncStorage, 'setItem');

      await expect(guardarResumenEstudio('2026-11-01', entradaValida)).rejects.toThrow('Fallo de I/O');
      expect(spySetItem).not.toHaveBeenCalled();
    });

    test('obtenerResumenEstudio devuelve null si no existe o si el JSON es corrupto o inválido', async () => {
      expect(await obtenerResumenEstudio('2026-01-01')).toBeNull();

      const clave = claveResumenDeFecha('2026-10-15');
      await AsyncStorage.setItem(clave, 'json malformado {');
      expect(await obtenerResumenEstudio('2026-10-15')).toBeNull();

      await AsyncStorage.setItem(clave, JSON.stringify(['no es objeto']));
      expect(await obtenerResumenEstudio('2026-10-15')).toBeNull();
    });

    test('existeClaveResumenEstudio retorna true si la clave existe (incluso con JSON inválido)', async () => {
      const clave = claveResumenDeFecha('2026-10-20');
      await AsyncStorage.setItem(clave, 'invalido');
      expect(await existeClaveResumenEstudio('2026-10-20')).toBe(true);
      expect(await existeClaveResumenEstudio('2026-10-21')).toBe(false);
    });
  });
});
