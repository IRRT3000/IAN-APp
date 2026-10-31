# Spec 015: Ampliación de Catálogo (100 Ejercicios Base), Búsqueda Rápida y Ejercicios Recientes

## 1. Problema y Contexto
Al planificar la sesión de entrenamiento, los usuarios con cierta experiencia no encontraban variantes populares de ejercicios esenciales en el catálogo base (limitado a 47 movimientos). Además, para iniciar ejercicios frecuentes o buscar rápidamente por implemento o nombre, el usuario debía desplazarse por toda la lista o pulsar un solo botón que no preparaba el teclado.

## 2. Alcance
- **Incluye**:
  - Ampliación del catálogo estático de 47 a exactamente 100 ejercicios base cubriendo los 6 grupos musculares.
  - 53 nuevas ilustraciones WebP oficiales de RepDB (192×192 px, calidad 80, sin recortar ni pasar por IA) en `assets/ejercicios/`.
  - Mapeo estático en `src/constants/imagenesEjercicios.js` con resolución literal para Metro.
  - Fila de acciones primarias en `EntrenamientosView.jsx`: botón "Iniciar Nuevo Ejercicio" (flex: 1) + botón de acceso rápido con lupa (50×50 pt, touch target >= 44 pt) que enfoca el teclado nativo de inmediato.
  - Carrusel horizontal de "RECIENTES" en `ListHeaderComponent` de `CatalogoEjerciciosModal.jsx`: muestra los últimos ejercicios únicos extraídos del historial con miniatura 36 pt, ocultándose ante búsquedas de texto y filtrándose ante pastillas de grupo muscular.
  - Pruebas unitarias de imágenes (`__tests__/imagenesEjercicios.test.js`) y de recientes (`__tests__/catalogoRecientes.test.js`).
- **No incluye**:
  - Modificación de esquemas en AsyncStorage.
  - Nuevas dependencias nativas en `package.json`.

## 3. Criterios de Aceptación (CA)
- **CA-1 (Assets)**: Existen exactamente 100 archivos WebP en `assets/ejercicios/` con nombres que coinciden uno a uno con los `id` de `CATALOGO_EJERCICIOS_BASE`. Cada archivo tiene cabecera RIFF/WEBP válida, mide 192×192 px y pesa ≤ 15 360 bytes (peso total conjunto ≤ 1 536 000 bytes).
- **CA-2 (Mapa estático)**: `IMAGENES_EJERCICIOS` contiene 100 entradas `require` literales.
- **CA-3 (Botón Lupa)**: En `EntrenamientosView`, un botón de 50×50 pt con icono `search` abre el catálogo y activa el cursor/teclado tras 150 ms.
- **CA-4 (Carrusel Recientes)**: La sección horizontal "RECIENTES" muestra hasta 8 ejercicios únicos deducidos cronológicamente del historial.
- **CA-5 (Filtro inteligente)**: El carrusel se oculta si `busqueda.trim().length > 0` y se filtra al seleccionar un grupo muscular.
- **CA-6 (Selección)**: Tocar un ejercicio reciente dispara `vibrarSeleccionBascula()`, cierra el catálogo y arranca Live Mode.
- **CA-7 (Tokens y A11y)**: Escala 4 pt, paleta Dark Luxury OLED, touch targets ≥ 44 pt y contraste tipográfico conforme a WCAG AA/AAA.
- **CA-8 (Puerta de Calidad)**: `npm run gate` (`lint`, `test`, `bundle:check`) termina con código 0.
