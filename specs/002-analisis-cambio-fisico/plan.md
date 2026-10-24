# Plan de Implementación Técnica: 002-analisis-cambio-fisico

- **Especificación Asociada:** [specs/002-analisis-cambio-fisico/spec.md](file:///d:/MiNuevaApp/mi-fitness-app/specs/002-analisis-cambio-fisico/spec.md)
- **Estado del Plan:** aprobado
- **Fecha:** 2026-10-23

---

## 1. Arquitectura y Flujo de Datos

```mermaid
flowchart TD
    subgraph UI["Capa de Presentación (StyleSheet Nativo)"]
        Nav["BarraNavegacionInferior.jsx\n(4ta Pestaña: 💪 Físico + Insignia)"]
        Welcome["MenuBienvenida.jsx\n(Acceso Rápido a Cambio Físico)"]
        ViewFisico["CambioFisicoView.jsx\n(Selector 1-10 Fotos + Perfil O(1) + Tarjetas)"]
        ModalPre["Modal Interactivo Pre-Análisis\n(Báscula Circular Moderna + Hora 12h AM/PM + Momento)"]
        BtnComp["Botón '🔄 Comparar con registro anterior'\n(1 solo toque: Vibración + Petición Gemini)"]
        BtnDel["Botón Borrado 1s (#FF5252)\ndelayLongPress={1000} + Alert.alert"]
    end

    subgraph Services["Capa de Servicios (Local-First + Gemini REST)"]
        Storage["src/services/storage.js\n• calcularEdadExacta() O(1)\n• calcularTiempoEntrenando() O(1)\n• cargarPerfilUsuario() / actualizarObjetivoPerfil()\n• CRUD Cambios Físicos (sin Base64)\n• obtenerDiasConActividad() (3 módulos)"]
        Gemini["src/services/gemini.js\n• Filtro anti gemini-3.8-flash\n• analizarCambioFisicoConGemini(1..10 imgs)\n• compararCambioFisicoConGemini()"]
        Haptics["src/services/haptics.js\n• vibrarToqueComparacion()\n• vibrarSeleccionBascula() / vibrarAjusteBascula()\n• vibrarInicioPresionBorrado() / vibrarConfirmacionBorrado()"]
    end

    Nav --> ViewFisico
    Welcome --> ViewFisico
    ViewFisico -->|1 a 10 fotos| ModalPre
    ModalPre -->|Confirmar Peso kg + Hora 12h| Gemini
    Storage -->|Edad O(1), Antigüedad O(1), Comidas/Entrenos hoy| Gemini
    Gemini -->|JSON: resumenSimple, resumenDetallado, balanceDelDia, veredicto| Storage
    ViewFisico --> BtnComp
    BtnComp -->|onPress| Haptics
    BtnComp -->|onPress| Gemini
    ViewFisico --> BtnDel
    BtnDel --> Storage
```

---

## 2. Contratos Técnicos por Archivo

### 2.1. Servicio Multimodal Gemini ([src/services/gemini.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/gemini.js))

1. **Eliminación Total y Defensiva de `gemini-3.8-flash` *(Cumple RF-1)*:**
   - `MODELO_PRINCIPAL_DEFAULT = 'gemini-3-flash-preview'`
   - `MODELOS_RESPALDO_DEFAULT = ['gemini-3.5-flash-lite']`
   - `esModeloProhibido(nombreModelo)` filtra cualquier aparición de `/gemini-3\.8/i`.
   - `obtenerModelos()` filtra entradas vacías y modelos prohibidos desde variables de entorno; si la lista resultante quedara vacía, retorna obligatoriamente `[MODELO_PRINCIPAL_DEFAULT, ...MODELOS_RESPALDO_DEFAULT]`.
2. **Análisis Multimodal de 1 a 10 Fotografías (`analizarCambioFisicoConGemini`) *(Cumple RF-11, RF-12)*:**
   - Recibe `imagenesBase64` (`1..10` imágenes Base64 limpias) y `contextoUsuario` completo:
     - Edad exacta calculada en $O(1)$ desde `26/11/2010`.
     - Tiempo entrenando calculado en $O(1)$ desde `01/11/2025`.
     - Altura `182 cm` (`1.82 m`), peso seleccionado en báscula (`kg`), sexo `Hombre` y objetivo actual (`Mantenimiento` por defecto).
     - Hora en formato 12h (`hh:mm AM/PM`) y momento del día (`En ayunas`, `Mediodía`, `Post-entreno`, `Noche`).
     - Entrenamientos y comidas registrados hoy (`YYYY-MM-DD`) más historial de pesos previos.
   - Normaliza y devuelve `{ resumenSimple, resumenDetallado, balanceDelDia, veredicto, puntosClave, modeloUsado }` con `veredicto` acotado a `[0, 10]` (1 decimal).
3. **Comparación Bajo Demanda (`compararCambioFisicoConGemini`) *(Cumple RF-14, RF-15)*:**
   - Compara el `registroAnterior` (`fecha`, `hora12h`, `pesoKg`, `veredicto`, `resumenSimple`, `resumenDetallado`) contra el `registroActual` y opcionalmente las imágenes en memoria (`imagenesActualesBase64`).
   - Devuelve `{ evolucion, recomendacionesOptimizacion, modeloUsado }`.

---

### 2.2. Servicio de Persistencia Local ([src/services/storage.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/storage.js))

1. **Claves de `AsyncStorage`:**
   - `STORAGE_KEY_PERFIL = '@fitness_tracker_perfil_v1'`
   - `STORAGE_KEY_CAMBIOS_FISICOS = '@fitness_tracker_cambios_fisicos_v1'`
2. **Cálculos Biológicos y de Antigüedad en Complejidad $O(1)$ *(Cumple RF-2, RF-3, Caso Límite 4)*:**
   - `calcularEdadExacta(fechaReferencia = new Date())`: aritmética entera local desde `26/11/2010` (`2010-11-26`), devolviendo `{ anios, fechaNacimiento: '26/11/2010', texto }`.
   - `calcularTiempoEntrenando(fechaReferencia = new Date())`: aritmética entera local desde `01/11/2025` (`2025-11-01`), devolviendo `{ anios, meses, dias, mesesTotales, fechaInicio: '01/11/2025', texto }`.
3. **Perfil del Usuario y Objetivo Configurable *(Cumple RF-4)*:**
   - `PERFIL_USUARIO_BASE` con `alturaCm: 182`, `alturaMetros: 1.82`, `pesoKgBase: 74`, `sexo: 'Hombre'`, `fechaNacimiento: '2010-11-26'`, `fechaInicioEntreno: '2025-11-01'`, `objetivo: 'Mantenimiento'`.
   - `cargarPerfilUsuario()` y `actualizarObjetivoPerfil(nuevoObjetivo)` inmutables.
4. **CRUD Inmutable de Cambios Físicos sin Base64 *(Cumple RF-13, RF-15, RF-16, RF-17)*:**
   - Prohibido almacenar cadenas Base64 en `AsyncStorage` (evita `CursorWindow` overflow en Android); solo se persisten `urisFotos` (`string[]` de hasta 10 URIs locales) junto con `resumenSimple`, `resumenDetallado`, `balanceDelDia`, `veredicto`, `puntosClave` y `comparacionAnterior`.
   - `cargarCambiosFisicos()`, `guardarCambioFisico(nuevoRegistro)`, `actualizarComparacionCambioFisico(idRegistro, datosComparacion)` y `eliminarCambioFisico(id)` con clonación profunda inmutable.
   - `obtenerDiasConActividad()` une las fechas locales (`YYYY-MM-DD`) de entrenamientos, comidas y cambios físicos.

---

### 2.3. Servicio Háptico ([src/services/haptics.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/haptics.js))

- Conserva `vibrarInicioPresionBorrado()` y `vibrarConfirmacionBorrado()`.
- Añade `vibrarToqueComparacion()` (impacto medio en el único toque de comparación `RF-15`) y `vibrarSeleccionBascula()` / `vibrarAjusteBascula()` (pulso suave al ajustar peso u hora en la báscula circular `RF-9`).

---

### 2.4. Vista Principal de Cambio Físico ([src/components/CambioFisicoView.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/CambioFisicoView.jsx))

- **Ficha de Perfil Biológico $O(1)$:** Muestra edad exacta (`26/11/2010`), tiempo entrenando (`01/11/2025`), estatura (`182 cm`), peso actual (`kg`), sexo (`Hombre`) y selector de `objetivo` (`Mantenimiento` por defecto).
- **Captura de 1 a 10 Fotos (`RF-6`, `RF-7`):** Botones de Cámara y Galería (`allowsMultipleSelection: true` sin `allowsEditing`, `selectionLimit`, `quality: 0.7`, `base64: true`), tira horizontal de miniaturas con botón `✕` y truncado inmutable a 10 imágenes con aviso si se supera el límite.
- **Menú Interactivo Pre-Análisis (`RF-8`, `RF-9`, `RF-10`):**
  - **Báscula Moderna Circular:** Dial circular con doble anillo y arco de progreso donde el peso (`kg` con precisión `0.1 kg`, iniciando en el último peso registrado o `74.0 kg`) es protagonista dentro del círculo central, más botones `-1.0`, `-0.5`, `-0.1`, `+0.1`, `+0.5`, `+1.0 kg`.
  - **Selector de Hora 12h (`hh:mm AM/PM`) y Momento del Día:** Ajuste interactivo de hora (`01`..`12`), minutos (`00`..`59`), conmutador `AM`/`PM` y chips de momento (`En ayunas`, `Mediodía`, `Post-entreno`, `Noche`).
- **Tarjetas de Historial (`RF-13`, `RF-14`, `RF-15`, `RF-17`):**
  - Renderizan `veredicto` (`X/10`), `resumenSimple`, `balanceDelDia`, `puntosClave`, miniaturas, peso y hora 12h (manteniendo `resumenDetallado` oculto en UI pero guardado en `AsyncStorage`).
  - Botón **"🔄 Comparar con registro anterior"** cuando existe un registro previo: en un solo `onPress` ejecuta `vibrarToqueComparacion()` y llama a `compararCambioFisicoConGemini`.
  - Botón de borrado seguro `🗑 1s` (`delayLongPress={1000}`).

---

### 2.5. Navegación y Estado Global ([BarraNavegacionInferior.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/BarraNavegacionInferior.jsx), [MenuBienvenida.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/MenuBienvenida.jsx), [App.js](file:///d:/MiNuevaApp/mi-fitness-app/App.js))

- Cuarta pestaña `💪 Físico` con insignia `contadorFisicoHoy`.
- Acceso rápido desde `MenuBienvenida.jsx`.
- Sincronización integral en `App.js` pasando `entrenamientosDeHoy`, `comidasDeHoy`, `cambiosFisicos` y `perfilUsuario` a `CambioFisicoView`.
