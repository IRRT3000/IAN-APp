/**
 * Genera los sonidos de la interfaz por síntesis (Spec 024, RF-5 / plan §4b).
 * WAV PCM 16 bits, mono, 22 050 Hz. Determinista: mismos bytes en cada ejecución.
 * Uso: node scripts/generar-sonidos.js
 */
const fs = require('fs');
const path = require('path');

const FRECUENCIA_MUESTREO = 22050;
const PICO = Math.pow(10, -12 / 20); // −12 dBFS
const ATAQUE_S = 0.004;

/**
 * Cada sonido es una lista de tramos { hz, ms, caidaHz? } que se reproducen uno tras otro.
 * Envolvente: ataque lineal de 4 ms y decaimiento exponencial hasta el final del tramo.
 */
const SONIDOS = {
  toque: [{ hz: 1800, ms: 40 }],
  exito: [
    { hz: 880, ms: 70 },
    { hz: 1320, ms: 70 },
  ],
  serie: [{ hz: 1046, ms: 60 }],
  error: [
    { hz: 440, ms: 70 },
    { hz: 330, ms: 70 },
  ],
  borrado: [{ hz: 180, ms: 90, caidaHz: 110 }],
};

const sintetizar = (tramos) => {
  const muestras = [];
  for (const tramo of tramos) {
    const total = Math.round((tramo.ms / 1000) * FRECUENCIA_MUESTREO);
    let fase = 0;
    for (let i = 0; i < total; i += 1) {
      const t = i / FRECUENCIA_MUESTREO;
      const progreso = i / total;
      const hz = tramo.caidaHz ? tramo.hz + (tramo.caidaHz - tramo.hz) * progreso : tramo.hz;
      fase += (2 * Math.PI * hz) / FRECUENCIA_MUESTREO;
      const ataque = Math.min(1, t / ATAQUE_S);
      const caida = Math.exp(-4.5 * progreso);
      // Armónico suave (+2.ª, 20 %) para que no suene a tono de prueba.
      const onda = Math.sin(fase) * 0.85 + Math.sin(2 * fase) * 0.15;
      muestras.push(onda * ataque * caida * PICO);
    }
  }
  return muestras;
};

const aWav = (muestras) => {
  const datos = Buffer.alloc(muestras.length * 2);
  muestras.forEach((m, i) => {
    const v = Math.max(-1, Math.min(1, m));
    datos.writeInt16LE(Math.round(v * 32767), i * 2);
  });
  const cabecera = Buffer.alloc(44);
  cabecera.write('RIFF', 0);
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write('WAVE', 8);
  cabecera.write('fmt ', 12);
  cabecera.writeUInt32LE(16, 16); // tamaño del bloque fmt
  cabecera.writeUInt16LE(1, 20); // PCM
  cabecera.writeUInt16LE(1, 22); // mono
  cabecera.writeUInt32LE(FRECUENCIA_MUESTREO, 24);
  cabecera.writeUInt32LE(FRECUENCIA_MUESTREO * 2, 28); // bytes por segundo
  cabecera.writeUInt16LE(2, 32); // alineación de bloque
  cabecera.writeUInt16LE(16, 34); // bits por muestra
  cabecera.write('data', 36);
  cabecera.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cabecera, datos]);
};

const generarSonidos = (carpetaDestino) => {
  fs.mkdirSync(carpetaDestino, { recursive: true });
  const generados = {};
  for (const [nombre, tramos] of Object.entries(SONIDOS)) {
    const wav = aWav(sintetizar(tramos));
    fs.writeFileSync(path.join(carpetaDestino, `${nombre}.wav`), wav);
    generados[nombre] = wav;
  }
  return generados;
};

module.exports = { generarSonidos, SONIDOS, FRECUENCIA_MUESTREO };

if (require.main === module) {
  const destino = path.resolve(__dirname, '..', 'assets', 'sonidos');
  const generados = generarSonidos(destino);
  for (const [nombre, wav] of Object.entries(generados)) {
    console.log(`${nombre}.wav: ${wav.length} bytes`);
  }
}
