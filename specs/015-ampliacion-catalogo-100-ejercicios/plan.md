# Plan Técnico — Spec 015: Ampliación de Catálogo (100 Ejercicios), Búsqueda Rápida y Ejercicios Recientes

## 1. Resumen de Cambios
- Ampliación de `CATALOGO_EJERCICIOS_BASE` en `src/constants/catalogoEjercicios.js` a 100 ejercicios con IDs secuenciales y metadatos limpios.
- Incorporación de 53 ilustraciones WebP de RepDB en `assets/ejercicios/` y registro estático en `src/constants/imagenesEjercicios.js`.
- Creación de la fila de acciones primarias en `EntrenamientosView.jsx`: botón "Iniciar Nuevo Ejercicio" (flex: 1) y botón cuadrado de lupa (50×50 pt).
- Implementación de autoenfoque y carrusel horizontal de "RECIENTES" en `ListHeaderComponent` de `CatalogoEjerciciosModal.jsx`.
- Cobertura de pruebas con `__tests__/imagenesEjercicios.test.js` y `__tests__/catalogoRecientes.test.js`.

## 2. Archivos Modificados
| Archivo | Acción | Detalle |
| :--- | :--- | :--- |
| `src/constants/catalogoEjercicios.js` | Modificar | 100 ejercicios en total. |
| `src/constants/imagenesEjercicios.js` | Modificar | 100 require literales. |
| `assets/ejercicios/*.webp` | Nuevos (53) | 192×192 px, calidad 80. |
| `src/components/EntrenamientosView.jsx` | Modificar | Fila con botón primario y botón lupa. |
| `src/components/CatalogoEjerciciosModal.jsx` | Modificar | Carrusel de recientes con deduplicación y autoenfoque. |
| `__tests__/imagenesEjercicios.test.js` | Modificar | TOTAL_EJERCICIOS = 100. |
| `__tests__/catalogoRecientes.test.js` | Nuevo | Pruebas de deduplicación y filtrado. |
| `MEMORY.md` | Modificar | Actualización de estado viva. |
