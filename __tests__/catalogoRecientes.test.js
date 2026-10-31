import { CATALOGO_EJERCICIOS_BASE } from '../src/constants/catalogoEjercicios';

// Lógica pura replicada idéntica a la memoización de CatalogoEjerciciosModal
export const deducirEjerciciosRecientes = (entrenamientos = [], listaCompleta = CATALOGO_EJERCICIOS_BASE, limite = 8) => {
  if (!Array.isArray(entrenamientos) || entrenamientos.length === 0) return [];
  const nombresVistos = new Set();
  const recientes = [];

  const ordenados = [...entrenamientos].sort(
    (a, b) => (b.creadoEn || 0) - (a.creadoEn || 0)
  );

  for (let i = 0; i < ordenados.length; i++) {
    const ent = ordenados[i];
    const nombreNorm = String(ent.ejercicio ?? '').trim().toLowerCase();
    if (!nombreNorm || nombresVistos.has(nombreNorm)) continue;
    nombresVistos.add(nombreNorm);

    const coincidencia = listaCompleta.find(
      (item) => String(item.nombre ?? '').trim().toLowerCase() === nombreNorm
    );

    if (coincidencia) {
      recientes.push(coincidencia);
    } else {
      recientes.push({
        id: ent.idEjercicio || `reciente-${recientes.length}`,
        nombre: String(ent.ejercicio ?? '').trim(),
        grupoMuscular: ent.grupoMuscular || 'Pecho',
        implemento: ent.implemento || 'Barra',
      });
    }

    if (recientes.length >= limite) break;
  }
  return recientes;
};

export const filtrarEjerciciosRecientes = (recientes = [], busqueda = '', grupoFiltro = 'Todos') => {
  if (busqueda.trim().length > 0) return [];
  if (grupoFiltro === 'Todos') return recientes;
  return recientes.filter((item) => item.grupoMuscular === grupoFiltro);
};

describe('CatalogoEjercicios - Lógica de Ejercicios Recientes (Spec 015)', () => {
  test('devuelve arreglo vacío ante historial vacío o no definido', () => {
    expect(deducirEjerciciosRecientes([])).toEqual([]);
    expect(deducirEjerciciosRecientes(null)).toEqual([]);
    expect(deducirEjerciciosRecientes(undefined)).toEqual([]);
  });

  test('deduplica registros y preserva el orden cronológico del más reciente al más antiguo', () => {
    const historial = [
      { ejercicio: 'Press de banca plano con barra', creadoEn: 1000 },
      { ejercicio: 'Sentadilla libre con barra', creadoEn: 2000 },
      { ejercicio: 'Press de banca plano con barra', creadoEn: 3000 }, // más reciente
    ];

    const resultado = deducirEjerciciosRecientes(historial);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].nombre).toBe('Press de banca plano con barra');
    expect(resultado[1].nombre).toBe('Sentadilla libre con barra');
  });

  test('vincula los metadatos oficiales del catálogo base (id, grupo, implemento)', () => {
    const historial = [
      { ejercicio: '  Jalón al pecho en polea  ', creadoEn: 1000 },
    ];

    const resultado = deducirEjerciciosRecientes(historial);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('base-espalda-1');
    expect(resultado[0].grupoMuscular).toBe('Espalda');
    expect(resultado[0].implemento).toBe('Polea');
  });

  test('genera un fallback seguro y válido para ejercicios personalizados no catalogados', () => {
    const historial = [
      { ejercicio: 'Ejercicio Especial Casero', grupoMuscular: 'Brazo', implemento: 'Mancuerna', creadoEn: 1000 },
    ];

    const resultado = deducirEjerciciosRecientes(historial);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre).toBe('Ejercicio Especial Casero');
    expect(resultado[0].grupoMuscular).toBe('Brazo');
    expect(resultado[0].implemento).toBe('Mancuerna');
  });

  test('limita estrictamente a un máximo de 8 ejercicios recientes', () => {
    const historial = Array.from({ length: 15 }, (_, i) => ({
      ejercicio: `Ejercicio Distinto ${i + 1}`,
      creadoEn: (i + 1) * 100,
    }));

    const resultado = deducirEjerciciosRecientes(historial);
    expect(resultado).toHaveLength(8);
    // El más reciente tiene mayor creadoEn (1500)
    expect(resultado[0].nombre).toBe('Ejercicio Distinto 15');
  });

  test('oculta completamente los recientes cuando el usuario busca texto', () => {
    const recientes = [
      { nombre: 'Press de banca plano con barra', grupoMuscular: 'Pecho' },
      { nombre: 'Remo con barra pronado', grupoMuscular: 'Espalda' },
    ];

    expect(filtrarEjerciciosRecientes(recientes, 'press', 'Todos')).toEqual([]);
    expect(filtrarEjerciciosRecientes(recientes, '   p   ', 'Todos')).toEqual([]);
    expect(filtrarEjerciciosRecientes(recientes, '', 'Todos')).toHaveLength(2);
  });

  test('filtra por grupo muscular cuando se selecciona una categoría', () => {
    const recientes = [
      { nombre: 'Press de banca plano con barra', grupoMuscular: 'Pecho' },
      { nombre: 'Aperturas en polea (cruces)', grupoMuscular: 'Pecho' },
      { nombre: 'Dominadas pronadas', grupoMuscular: 'Espalda' },
      { nombre: 'Sentadilla libre con barra', grupoMuscular: 'Pierna' },
    ];

    const recientesPecho = filtrarEjerciciosRecientes(recientes, '', 'Pecho');
    expect(recientesPecho).toHaveLength(2);
    expect(recientesPecho.every((e) => e.grupoMuscular === 'Pecho')).toBe(true);

    const recientesCore = filtrarEjerciciosRecientes(recientes, '', 'Core');
    expect(recientesCore).toEqual([]);
  });
});
