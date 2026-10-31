# Tareas de Implementación — Spec 015: Ampliación de Catálogo (100 Ejercicios), Búsqueda Rápida y Ejercicios Recientes

- [x] **T1**: Crear rama y worktree `spec/015-catalogo-100-ejercicios-recientes` en `.claude/worktrees/spec-15-implementation-100-ejercicios`.
- [x] **T2**: Diseñar maquetación y tokens de UI con `subagente-ui` (fila de botones ergonómica y carrusel de recientes).
- [x] **T3**: Mapear, descargar y redimensionar 53 poses oficiales de RepDB a 192×192 WebP (calidad 80) en `assets/ejercicios/`.
- [x] **T4**: Incorporar los 53 nuevos ejercicios a `src/constants/catalogoEjercicios.js` (total: 100).
- [x] **T5**: Declarar las 53 nuevas entradas estáticas `require` en `src/constants/imagenesEjercicios.js` (total: 100).
- [x] **T6**: Actualizar `__tests__/imagenesEjercicios.test.js` para validar los 100 WebP y el mapa estático.
- [x] **T7**: Implementar la fila compartida en `src/components/EntrenamientosView.jsx` con botón principal + botón de lupa (50×50 pt) y propagar bandera de autoenfoque.
- [x] **T8**: Implementar auto-enfoque de teclado (150 ms) y carrusel horizontal de Recientes en `src/components/CatalogoEjerciciosModal.jsx`.
- [x] **T9**: Crear suite de pruebas unitarias `__tests__/catalogoRecientes.test.js` (deduplicación, orden cronológico, límite de 8, ocultamiento por búsqueda y filtro de grupo).
- [x] **T10**: Ejecución de Puerta de Calidad: `npm run gate` en verde (lint 0 errores, 7 suites, 70 tests pasando, bundle Android generado sin fallos).
