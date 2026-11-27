# Propuestas de funcionalidades (después de las Specs 020–024)

> **Estado: PROPUESTA.** Ninguna está aprobada ni implementada. Cada una que el dueño elija se convierte en su propia Spec (plan → revisión → implementación → revisión de código).

Salen del análisis de la app durante las Specs 020–024. Todas respetan la esencia: local-first, sencilla, Dark Luxury, sin cuentas ni servidores propios.

## 1. Respaldo y restauración de datos (prioridad alta)
- **Problema:** todo vive en el teléfono. Si el usuario desinstala la app, cambia de teléfono o borra los datos, pierde entrenamientos, comidas, estudio y fotos. Hoy no existe ninguna forma de exportarlos.
- **Propuesta:** en Configuración, «Exportar respaldo» genera un archivo `.json` con todos los datos (sin la API key), y lo comparte con el menú del sistema. «Restaurar respaldo» lo importa tras validarlo y confirmar.
- **Riesgo:** con fotos el archivo crece. La primera versión puede excluirlas y avisarlo.

## 2. Récords personales por ejercicio
- **Problema:** se registran series, reps y peso, pero la app no destaca cuándo el usuario supera su mejor marca.
- **Propuesta:** calcular el récord (peso máximo y 1RM estimado) de cada ejercicio desde el historial. Al superarlo, mostrar una insignia discreta, con háptico de éxito y anuncio accesible.
- **Costo:** bajo; solo usa datos que ya existen.

## 3. Meta diaria de calorías y macros
- **Problema:** Nutrición suma lo comido pero no lo compara con una meta.
- **Propuesta:** calcular una meta orientativa a partir del perfil (edad, sexo, peso, altura y objetivo) con la fórmula de Mifflin-St Jeor, editable por el usuario. Mostrar una barra de progreso por día.
- **Cuidado:** texto claro de que es una estimación, no consejo médico.

## 4. Editar una comida ya analizada
- **Problema:** si Gemini se equivoca en una porción, hoy solo se puede borrar y volver a analizar (otra llamada a la API).
- **Propuesta:** permitir corregir nombre, calorías y macros a mano. Ahorra llamadas y mejora la exactitud.

## 5. Racha de constancia
- **Propuesta:** mostrar la racha actual de días con actividad, contando los días de descanso marcados como válidos. Usa `obtenerDiasConActividad` y `cargarDiasDescanso`, que ya existen.

## 6. Recordatorio opcional
- **Propuesta:** una notificación local diaria y opcional («¿Ya registraste tu entrenamiento?»). Requiere `expo-notifications` (módulo nativo nuevo, nuevo `versionCode`), así que va al final.
