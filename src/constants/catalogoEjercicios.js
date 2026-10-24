/**
 * Catálogo estático de ejercicios y grupos musculares para Fitness Tracker.
 * Spec 003: Registro de Entrenamientos Activo (RF-5, RF-6).
 */

export const GRUPOS_MUSCULARES = [
  'Todos',
  'Pecho',
  'Espalda',
  'Pierna',
  'Hombro',
  'Brazo',
  'Core',
];

export const GRUPOS_MUSCULARES_REGISTRO = [
  'Pecho',
  'Espalda',
  'Pierna',
  'Hombro',
  'Brazo',
  'Core',
];

export const COLORES_GRUPOS = {
  Pecho: '#FF5252',
  Espalda: '#448AFF',
  Pierna: '#00E676',
  Hombro: '#FFAB00',
  Brazo: '#E040FB',
  Core: '#FF6D00',
  Otro: '#9E9E9E',
};

export const IMPLEMENTOS = [
  'Barra',
  'Mancuerna',
  'Polea',
  'Máquina',
  'Corporal',
];

export const ICONOS_IMPLEMENTOS = {
  Barra: '🏋️',
  Mancuerna: '🦾',
  Polea: '⛓️',
  Máquina: '⚙️',
  Corporal: '🤸',
  Otro: '⚡',
};

export const CATALOGO_EJERCICIOS_BASE = [
  // --- PECHO (#FF5252) ---
  {
    id: 'base-pecho-1',
    nombre: 'Press de banca plano con barra',
    grupoMuscular: 'Pecho',
    implemento: 'Barra',
  },
  {
    id: 'base-pecho-2',
    nombre: 'Press inclinado con mancuernas',
    grupoMuscular: 'Pecho',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pecho-3',
    nombre: 'Press declinado con barra',
    grupoMuscular: 'Pecho',
    implemento: 'Barra',
  },
  {
    id: 'base-pecho-4',
    nombre: 'Aperturas en polea (cruces)',
    grupoMuscular: 'Pecho',
    implemento: 'Polea',
  },
  {
    id: 'base-pecho-5',
    nombre: 'Fondos en paralelas para pecho',
    grupoMuscular: 'Pecho',
    implemento: 'Corporal',
  },
  {
    id: 'base-pecho-6',
    nombre: 'Aperturas en máquina (Pec Deck)',
    grupoMuscular: 'Pecho',
    implemento: 'Máquina',
  },
  {
    id: 'base-pecho-7',
    nombre: 'Flexiones de pecho (Push-ups)',
    grupoMuscular: 'Pecho',
    implemento: 'Corporal',
  },
  {
    id: 'base-pecho-8',
    nombre: 'Press en máquina sentado',
    grupoMuscular: 'Pecho',
    implemento: 'Máquina',
  },

  // --- ESPALDA (#448AFF) ---
  {
    id: 'base-espalda-1',
    nombre: 'Jalón al pecho en polea',
    grupoMuscular: 'Espalda',
    implemento: 'Polea',
  },
  {
    id: 'base-espalda-2',
    nombre: 'Remo con barra pronado',
    grupoMuscular: 'Espalda',
    implemento: 'Barra',
  },
  {
    id: 'base-espalda-3',
    nombre: 'Remo en polea baja (Gironde)',
    grupoMuscular: 'Espalda',
    implemento: 'Polea',
  },
  {
    id: 'base-espalda-4',
    nombre: 'Dominadas pronadas',
    grupoMuscular: 'Espalda',
    implemento: 'Corporal',
  },
  {
    id: 'base-espalda-5',
    nombre: 'Peso muerto convencional',
    grupoMuscular: 'Espalda',
    implemento: 'Barra',
  },
  {
    id: 'base-espalda-6',
    nombre: 'Remo unilateral con mancuerna',
    grupoMuscular: 'Espalda',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-espalda-7',
    nombre: 'Pullover en polea alta con cuerda',
    grupoMuscular: 'Espalda',
    implemento: 'Polea',
  },
  {
    id: 'base-espalda-8',
    nombre: 'Remo en máquina con apoyo en pecho',
    grupoMuscular: 'Espalda',
    implemento: 'Máquina',
  },

  // --- PIERNA / GLÚTEO (#00E676) ---
  {
    id: 'base-pierna-1',
    nombre: 'Sentadilla libre con barra',
    grupoMuscular: 'Pierna',
    implemento: 'Barra',
  },
  {
    id: 'base-pierna-2',
    nombre: 'Prensa de piernas 45°',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },
  {
    id: 'base-pierna-3',
    nombre: 'Peso muerto rumano',
    grupoMuscular: 'Pierna',
    implemento: 'Barra',
  },
  {
    id: 'base-pierna-4',
    nombre: 'Zancadas caminando con mancuernas',
    grupoMuscular: 'Pierna',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pierna-5',
    nombre: 'Curl femoral acostado',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },
  {
    id: 'base-pierna-6',
    nombre: 'Extensiones de cuádriceps',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },
  {
    id: 'base-pierna-7',
    nombre: 'Elevación de talones de pie (Gemelos)',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },
  {
    id: 'base-pierna-8',
    nombre: 'Hip thrust con barra',
    grupoMuscular: 'Pierna',
    implemento: 'Barra',
  },
  {
    id: 'base-pierna-9',
    nombre: 'Sentadilla búlgara con mancuernas',
    grupoMuscular: 'Pierna',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pierna-10',
    nombre: 'Aductores en máquina',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },

  // --- HOMBRO (#FFAB00) ---
  {
    id: 'base-hombro-1',
    nombre: 'Press militar sentado con mancuernas',
    grupoMuscular: 'Hombro',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-hombro-2',
    nombre: 'Press militar de pie con barra (OHP)',
    grupoMuscular: 'Hombro',
    implemento: 'Barra',
  },
  {
    id: 'base-hombro-3',
    nombre: 'Elevaciones laterales con mancuernas',
    grupoMuscular: 'Hombro',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-hombro-4',
    nombre: 'Elevaciones laterales en polea',
    grupoMuscular: 'Hombro',
    implemento: 'Polea',
  },
  {
    id: 'base-hombro-5',
    nombre: 'Pájaros posteriores con mancuernas',
    grupoMuscular: 'Hombro',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-hombro-6',
    nombre: 'Elevaciones frontales con mancuernas',
    grupoMuscular: 'Hombro',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-hombro-7',
    nombre: 'Face pull en polea alta',
    grupoMuscular: 'Hombro',
    implemento: 'Polea',
  },
  {
    id: 'base-hombro-8',
    nombre: 'Encogimientos de trapecio con barra',
    grupoMuscular: 'Hombro',
    implemento: 'Barra',
  },

  // --- BRAZO (#E040FB) ---
  {
    id: 'base-brazo-1',
    nombre: 'Curl de bíceps con barra Z',
    grupoMuscular: 'Brazo',
    implemento: 'Barra',
  },
  {
    id: 'base-brazo-2',
    nombre: 'Extensiones de tríceps en polea alta (Cuerda)',
    grupoMuscular: 'Brazo',
    implemento: 'Polea',
  },
  {
    id: 'base-brazo-3',
    nombre: 'Curl martillo con mancuernas',
    grupoMuscular: 'Brazo',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-brazo-4',
    nombre: 'Press francés en banco con barra Z',
    grupoMuscular: 'Brazo',
    implemento: 'Barra',
  },
  {
    id: 'base-brazo-5',
    nombre: 'Curl de bíceps en banco inclinado',
    grupoMuscular: 'Brazo',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-brazo-6',
    nombre: 'Fondos de tríceps en máquina',
    grupoMuscular: 'Brazo',
    implemento: 'Máquina',
  },
  {
    id: 'base-brazo-7',
    nombre: 'Curl concentrado con mancuerna',
    grupoMuscular: 'Brazo',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-brazo-8',
    nombre: 'Extensiones de tríceps sobre cabeza (Mancuerna)',
    grupoMuscular: 'Brazo',
    implemento: 'Mancuerna',
  },

  // --- CORE (#FF6D00) ---
  {
    id: 'base-core-1',
    nombre: 'Crunches en polea alta arrodillado',
    grupoMuscular: 'Core',
    implemento: 'Polea',
  },
  {
    id: 'base-core-2',
    nombre: 'Elevaciones de piernas colgado en barra',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-3',
    nombre: 'Plancha isométrica abdominal',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-4',
    nombre: 'Rueda abdominal (Ab Roller)',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-5',
    nombre: 'Giros rusos con peso (Russian Twists)',
    grupoMuscular: 'Core',
    implemento: 'Mancuerna',
  },
];

/**
 * Retorna el color asignado a un grupo muscular dado.
 * @param {string} grupo
 * @returns {string} Código de color hexadecimal
 */
export const obtenerColorGrupo = (grupo) => {
  return COLORES_GRUPOS[grupo] || COLORES_GRUPOS.Otro;
};

/**
 * Retorna el icono o emoji identificador del implemento.
 * @param {string} implemento
 * @returns {string} Emoji representativo
 */
export const obtenerIconoImplemento = (implemento) => {
  return ICONOS_IMPLEMENTOS[implemento] || ICONOS_IMPLEMENTOS.Otro;
};
