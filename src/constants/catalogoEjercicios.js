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
  Barra: 'activity',
  Mancuerna: 'disc',
  Polea: 'sliders',
  Máquina: 'settings',
  Corporal: 'user',
  Otro: 'zap',
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
  {
    id: 'base-pecho-9',
    nombre: 'Press inclinado con barra',
    grupoMuscular: 'Pecho',
    implemento: 'Barra',
  },
  {
    id: 'base-pecho-10',
    nombre: 'Press de banca plano con mancuernas',
    grupoMuscular: 'Pecho',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pecho-11',
    nombre: 'Press declinado con mancuernas',
    grupoMuscular: 'Pecho',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pecho-12',
    nombre: 'Aperturas con mancuernas en banco plano',
    grupoMuscular: 'Pecho',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pecho-13',
    nombre: 'Aperturas inclinadas con mancuernas',
    grupoMuscular: 'Pecho',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pecho-14',
    nombre: 'Cruces en polea baja (pecho superior)',
    grupoMuscular: 'Pecho',
    implemento: 'Polea',
  },
  {
    id: 'base-pecho-15',
    nombre: 'Press en máquina Smith',
    grupoMuscular: 'Pecho',
    implemento: 'Máquina',
  },
  {
    id: 'base-pecho-16',
    nombre: 'Pullover con mancuerna para pecho',
    grupoMuscular: 'Pecho',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pecho-17',
    nombre: 'Flexiones declinadas con pies elevados',
    grupoMuscular: 'Pecho',
    implemento: 'Corporal',
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
  {
    id: 'base-espalda-9',
    nombre: 'Dominadas supinadas (Chin-ups)',
    grupoMuscular: 'Espalda',
    implemento: 'Corporal',
  },
  {
    id: 'base-espalda-10',
    nombre: 'Jalón al pecho con agarre neutro',
    grupoMuscular: 'Espalda',
    implemento: 'Polea',
  },
  {
    id: 'base-espalda-11',
    nombre: 'Remo con barra T',
    grupoMuscular: 'Espalda',
    implemento: 'Barra',
  },
  {
    id: 'base-espalda-12',
    nombre: 'Remo invertido en barra',
    grupoMuscular: 'Espalda',
    implemento: 'Corporal',
  },
  {
    id: 'base-espalda-13',
    nombre: 'Hiperextensiones lumbares',
    grupoMuscular: 'Espalda',
    implemento: 'Corporal',
  },
  {
    id: 'base-espalda-14',
    nombre: 'Remo con mancuernas en banco inclinado',
    grupoMuscular: 'Espalda',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-espalda-15',
    nombre: 'Peso muerto sumo',
    grupoMuscular: 'Espalda',
    implemento: 'Barra',
  },
  {
    id: 'base-espalda-16',
    nombre: 'Encogimientos de trapecio con mancuernas',
    grupoMuscular: 'Espalda',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-espalda-17',
    nombre: 'Remo con agarre ancho en polea baja',
    grupoMuscular: 'Espalda',
    implemento: 'Polea',
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
  {
    id: 'base-pierna-11',
    nombre: 'Sentadilla frontal con barra',
    grupoMuscular: 'Pierna',
    implemento: 'Barra',
  },
  {
    id: 'base-pierna-12',
    nombre: 'Sentadilla Hack en máquina',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },
  {
    id: 'base-pierna-13',
    nombre: 'Sentadilla Goblet con mancuerna',
    grupoMuscular: 'Pierna',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-pierna-14',
    nombre: 'Peso muerto con piernas rígidas',
    grupoMuscular: 'Pierna',
    implemento: 'Barra',
  },
  {
    id: 'base-pierna-15',
    nombre: 'Curl femoral sentado en máquina',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },
  {
    id: 'base-pierna-16',
    nombre: 'Abductores en máquina (Glúteo)',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },
  {
    id: 'base-pierna-17',
    nombre: 'Elevación de talones sentado en máquina',
    grupoMuscular: 'Pierna',
    implemento: 'Máquina',
  },
  {
    id: 'base-pierna-18',
    nombre: 'Puentes de glúteo en suelo con barra',
    grupoMuscular: 'Pierna',
    implemento: 'Barra',
  },
  {
    id: 'base-pierna-19',
    nombre: 'Buenos días con barra',
    grupoMuscular: 'Pierna',
    implemento: 'Barra',
  },
  {
    id: 'base-pierna-20',
    nombre: 'Step-ups con mancuernas sobre banco',
    grupoMuscular: 'Pierna',
    implemento: 'Mancuerna',
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
  {
    id: 'base-hombro-9',
    nombre: 'Press Arnold con mancuernas',
    grupoMuscular: 'Hombro',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-hombro-10',
    nombre: 'Press de hombros en máquina',
    grupoMuscular: 'Hombro',
    implemento: 'Máquina',
  },
  {
    id: 'base-hombro-11',
    nombre: 'Pájaros en máquina (Pec Deck inverso)',
    grupoMuscular: 'Hombro',
    implemento: 'Máquina',
  },
  {
    id: 'base-hombro-12',
    nombre: 'Elevaciones laterales en máquina',
    grupoMuscular: 'Hombro',
    implemento: 'Máquina',
  },
  {
    id: 'base-hombro-13',
    nombre: 'Elevaciones posteriores en polea',
    grupoMuscular: 'Hombro',
    implemento: 'Polea',
  },
  {
    id: 'base-hombro-14',
    nombre: 'Remo al mentón con barra',
    grupoMuscular: 'Hombro',
    implemento: 'Barra',
  },
  {
    id: 'base-hombro-15',
    nombre: 'Elevaciones frontales en polea',
    grupoMuscular: 'Hombro',
    implemento: 'Polea',
  },
  {
    id: 'base-hombro-16',
    nombre: 'Press militar en máquina Smith',
    grupoMuscular: 'Hombro',
    implemento: 'Máquina',
  },
  {
    id: 'base-hombro-17',
    nombre: 'Elevaciones laterales sentado con mancuernas',
    grupoMuscular: 'Hombro',
    implemento: 'Mancuerna',
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
  {
    id: 'base-brazo-9',
    nombre: 'Curl predicador en banco Scott con barra Z',
    grupoMuscular: 'Brazo',
    implemento: 'Barra',
  },
  {
    id: 'base-brazo-10',
    nombre: 'Extensiones de tríceps en polea con barra recta',
    grupoMuscular: 'Brazo',
    implemento: 'Polea',
  },
  {
    id: 'base-brazo-11',
    nombre: 'Curl de bíceps alterno de pie con mancuernas',
    grupoMuscular: 'Brazo',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-brazo-12',
    nombre: 'Fondos entre bancos para tríceps',
    grupoMuscular: 'Brazo',
    implemento: 'Corporal',
  },
  {
    id: 'base-brazo-13',
    nombre: 'Patada de tríceps con mancuerna',
    grupoMuscular: 'Brazo',
    implemento: 'Mancuerna',
  },
  {
    id: 'base-brazo-14',
    nombre: 'Curl de bíceps en polea baja',
    grupoMuscular: 'Brazo',
    implemento: 'Polea',
  },
  {
    id: 'base-brazo-15',
    nombre: 'Press de banca plano agarre cerrado',
    grupoMuscular: 'Brazo',
    implemento: 'Barra',
  },
  {
    id: 'base-brazo-16',
    nombre: 'Curl spider en banco inclinado',
    grupoMuscular: 'Brazo',
    implemento: 'Barra',
  },
  {
    id: 'base-brazo-17',
    nombre: 'Curl de antebrazo con barra',
    grupoMuscular: 'Brazo',
    implemento: 'Barra',
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
  {
    id: 'base-core-6',
    nombre: 'Crunches abdominales tradicionales',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-7',
    nombre: 'Plancha lateral isométrica',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-8',
    nombre: 'Elevaciones de piernas en suelo',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-9',
    nombre: 'Crunches bicicleta (Bicycle crunches)',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-10',
    nombre: 'Escaladores en suelo (Mountain climbers)',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-11',
    nombre: 'Bird Dog en colchoneta',
    grupoMuscular: 'Core',
    implemento: 'Corporal',
  },
  {
    id: 'base-core-12',
    nombre: 'Crunches en máquina sentada',
    grupoMuscular: 'Core',
    implemento: 'Máquina',
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
