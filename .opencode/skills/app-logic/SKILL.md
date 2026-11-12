---
name: App Logic
description: Reglas de arquitectura, lógica offline (IndexedDB), manejo de voz y ciclo de vida de la app Voz de Campo. Úsala siempre que programes la funcionalidad.
---

# Reglas de Arquitectura y Lógica para Voz de Campo

## Ciclo de Vida de la App (Flujo de Inicio)
1. **Splash Screen:** Al cargar, mostrar logo por 2 segundos. Usar GSAP para animar la entrada.
2. **Onboarding:** Carrusel de 3 pasos (DaisyUI). Botón "Saltar" para ir directo a la selección de rol. Guardar en `localStorage` que ya vio el tutorial.
3. **Selección de Rol (Sin Login):** Pantalla con dos tarjetas. Al tocar una, guardar el rol en IndexedDB (store "perfil") y redirigir al Dashboard correspondiente.

## Almacenamiento Offline (IndexedDB)
- Base de datos: `vozdecampo`.
- Store `registros`: `id` (autoIncrement), `rol` (productor/comprador), `texto`, `fecha` (timestamp), `estado` ("pendiente" | "sincronizado"), `categoria` (null por ahora).
- Store `perfil`: `id` (1), `rol`.
- **Funciones requeridas:** `abrirDB()`, `guardarRegistro()`, `obtenerRegistros()`, `cambiarRol()`, `borrarTodo()`.

## Manejo de Voz (Web Speech API)
- **SpeechRecognition (Dictado):** Idioma `es-MX`. Obtener el constructor con `const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;`. Al tocar el micrófono, iniciar escucha. Al obtener resultado, escribir el texto en el input. Si falla, mostrar un `toast` de DaisyUI ("No se pudo escuchar, intenta de nuevo").
- **SpeechSynthesis (Lectura):** Al tocar el botón "Play" en una tarjeta del historial, leer el texto en voz alta con una voz en español. Si no hay voces disponibles, no hacer nada.

## Navegación (SPA)
- La app es una Single Page Application (SPA). Todas las pantallas son secciones ocultas en el `index.html`.
- Al navegar, ocultar la sección actual y mostrar la nueva. Usar GSAP para transición de opacidad (fade out/in).
- La barra inferior (Bottom Nav) cambia según el rol (Productor tiene 4 íconos, Comprador tiene 3).

## Modo Comprador
- Misma estructura que el Productor, pero el Dashboard muestra "Mis Compras" y el flujo de registro es para compras.
- El botón de "Plan Pro" abre un modal de DaisyUI explicando la suscripción.

## Reglas de Código (Lógica)
- Comentar las funciones principales en español.
- Manejar errores con `try/catch` y mostrar mensajes al usuario con `toast` de DaisyUI.
- No usar `alert()` nativo del navegador. Usar modales o toasts.
- La API Key de Gemini NUNCA va en el cliente (`js/`, `index.html`, `css/`, `public/`).
  - Vive en `.env.local` (variable `GEMINI_API_KEY`), ignorado por git. Plantilla: `.env.example`.
  - Solo la leen los servidores: `server/handler.mjs` (middleware de Vite) y `api/gemini.js` (función serverless).
  - El cliente llama a `/api/gemini` (ver `js/gemini.js`) y nunca conoce la clave.
  - Nunca imprimir la clave en logs, respuestas HTTP ni en la UI.
- Navegación: usar `navegar()` de `js/router.js` (no cambiar pantallas a mano) para que el botón atrás funcione.
- Conectividad: usar `estaEnLinea()` y `suscribirRed()` de `js/network.js`, no `navigator.onLine` directamente.
