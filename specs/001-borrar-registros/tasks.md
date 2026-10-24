# Lista de Tareas de Implementación: 001-borrar-registros

- **Especificación:** [specs/001-borrar-registros/spec.md](file:///d:/MiNuevaApp/mi-fitness-app/specs/001-borrar-registros/spec.md)
- **Plan Técnico:** [specs/001-borrar-registros/plan.md](file:///d:/MiNuevaApp/mi-fitness-app/specs/001-borrar-registros/plan.md)

## Tareas (SDD)

- [x] **T-1:** Implementar `eliminarEntrenamiento(id)` y `eliminarComida(id)` de forma inmutable en [src/services/storage.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/storage.js) *(RF-5, RF-6, RF-7, RF-12)*.
- [x] **T-2:** Actualizar `obtenerDiasConActividad()` en [src/services/storage.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/storage.js) para considerar actividad combinada (entrenamientos + comidas), de modo que `HeatmapSemanal` pase a gris (`#2A2A2A`) cuando ambos registros del día queden en `0` *(RF-10, RF-11)*.
- [x] **T-3:** Integrar botón visual de eliminación (`#FF5252`, `🗑 1s`) con `delayLongPress={1000}`, doble pulso háptico (`src/services/haptics.js` con `expo-haptics` y fallback a `Vibration`), aviso de toque corto (`< 1s`) y `Alert.alert` de confirmación en las tarjetas de entrenamiento de [App.js](file:///d:/MiNuevaApp/mi-fitness-app/App.js) *(RF-1, RF-2, RF-3, RF-4, RF-8)*.
- [x] **T-4:** Integrar botón visual de eliminación (`#FF5252`, `🗑 1s`) con `delayLongPress={1000}`, doble pulso háptico (`src/services/haptics.js`), aviso de toque corto (`< 1s`) y `Alert.alert` de confirmación en las tarjetas de comida de [src/components/NutricionView.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/NutricionView.jsx), recalculando calorías y macronutrientes al instante *(RF-1, RF-2, RF-3, RF-4, RF-9)*.
- [x] **T-5:** Ejecutar pruebas automatizadas de unidad/integración, verificar sintaxis AST/JSX y actualizar [MEMORY.md](file:///d:/MiNuevaApp/mi-fitness-app/MEMORY.md).
