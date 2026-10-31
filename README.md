# Fitness Tracker & Nutritional AI 🏋️‍♂️

> Aplicación móvil *Local-First* de entrenamiento de fuerza, análisis nutricional multimodal con Gemini Vision y mapa de calor anual de consistencia.

[![Descargar APK](https://img.shields.io/badge/Descargar%20APK-Última%20Versión-00E676?style=for-the-badge&logo=android&logoColor=black)](https://github.com/IRRT3000/IAN-APp/releases/latest)
[![GitHub Release](https://img.shields.io/github/v/release/IRRT3000/IAN-APp?style=for-the-badge&color=white)](https://github.com/IRRT3000/IAN-APp/releases)

---

## 📱 Cómo Descargar e Instalar en tu Celular

1. Entra desde el navegador de tu celular a la pestaña **[Releases](https://github.com/IRRT3000/IAN-APp/releases/latest)**.
2. Toca el archivo adjunto `mi-fitness-app-vX.X.X.apk` para descargarlo.
3. Abre el archivo descargado y presiona **Instalar**.
4. Al abrir la app por primera vez, toca el **icono de engranaje** en la esquina superior derecha para conectar tu Gemini API Key gratuita.

---

## 🔑 Modelo de Seguridad: Bring Your Own Key (BYOK)

Para garantizar la máxima seguridad y privacidad:
- **Cero claves quemadas en el instalador**: El archivo APK público se compila 100% limpio sin secretos expuestos.
- **Tu propia clave gratuita**: En el panel lateral de Configuración (engranaje), ingresa tu clave gratuita generada en [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Almacenamiento Local**: La clave se guarda de forma privada en el almacenamiento local de tu teléfono (`AsyncStorage`). Jamás se envía a servidores de terceros ni se expone públicamente.

---

## ✨ Características Principales

- **Registro de Entrenamientos**: Series, repeticiones, peso y modo activo *Live Mode* con borrado sostenido de seguridad (1000ms).
- **Nutrición Multimodal con Gemini**: Fotografía tu plato de comida y desglosa calorías y macronutrientes (proteínas, carbohidratos y grasas) con IA de alta precisión.
- **Chequeo de Cambio Físico**: Báscula circular minimalista y análisis visual de progreso comparativo con veredicto integral.
- **Mapa de Calor Anual**: Visualizador tipo GitHub con 5 niveles de contraste monocromo para rastrear consistencia en entrenamientos, comidas y días de descanso.
- **Estética Matte Luxury**: Interfaz monocroma en carbón mate (`#141414`), bordes hairline (`#262626`), cero emojis y tipografía de alta jerarquía.

---

## 🛠️ Tecnologías

- **Framework**: React Native 0.88 & Expo SDK 58 (New Architecture).
- **Animaciones**: `react-native-reanimated` 4.x con físicas de resorte en UI Thread a 60fps.
- **Gestos & Hápticos**: `react-native-gesture-handler` y `expo-haptics`.
- **Persistencia**: `@react-native-async-storage/async-storage`.
- **Automatización**: GitHub Actions para compilación y firma digital automática de APKs en cada release.

---

## Créditos

- Ilustraciones de ejercicios: Exercise data by [RepDB (repdb.co)](https://repdb.co) (free tier, con atribución).
