---
name: ui-design
description: Reglas de diseño UI/UX, temas, tipografía, animaciones y sonidos de la app Voz de Campo. Úsala siempre que generes componentes visuales.
---

# Reglas de Diseño UI/UX para Voz de Campo

## Temas (usar siempre uno de estos cuatro)
Los temas se definen en `css/style.css` como temas de DaisyUI. El tema por defecto es **Esmeralda Campo**. El usuario elige el tema en Ajustes > Apariencia y se guarda en `localStorage` (`vdc_tema`).

| Id | Nombre | Uso | Acento principal |
|---|---|---|---|
| `esmeralda` | Esmeralda Campo | Por defecto | `#f6c223` (botones), `#07a67d` (éxito) |
| `tierra` | Tierra y Cosecha | Productor tradicional | `#b5651d` terracota |
| `agave` | Agave y Niebla | Uso diario, sobrio | `#4f7f6f` salvia |
| `solar` | Alto Contraste Solar | Sol directo, accesibilidad | `#ffd400` amarillo sobre negro |

### Paleta oficial (Esmeralda Campo)
- Fondo principal: `#ffffff` (`base-100`)
- Fondo secundario: `#f8f5e3` (`base-200`)
- Acento 1, botones primarios: `#f6c223` (`primary`)
- Acento 2, alertas: `#ed8131` (`secondary` / `warning` / `error`)
- Acento 3, éxito: `#07a67d` (`success`)
- Texto oscuro: `#006459` (`base-content`)

### Reglas de temas
- Nunca uses colores fijos en componentes; usa tokens de DaisyUI (`bg-base-100`, `text-base-content`, `btn-primary`, etc.). La excepción son los colores de categoría y los bloques de la IA definidos en `style.css`.
- Todo texto debe cumplir contraste AA (4.5:1) en los cuatro temas.
- El tema `solar` usa bordes de 2px. Respétalos: no los sobrescribas.

## Tipografía (tres familias, vía Fontsource npm)
- **Outfit** (`font-display`): títulos y marca. Encabezados de 2 a 3 palabras como máximo.
- **DM Sans** (`font-sans`): cuerpo y lectura.
- **JetBrains Mono** (`font-mono`): números, costos, fechas, cantidades y códigos.

Los `h1`, `h2` y `h3` ya usan Outfit por CSS. Los datos numéricos deben llevar `font-mono`.

## Estilo visual
- Minimalista moderno, mucho espacio en blanco.
- Componentes de DaisyUI (`btn`, `card`, `input`, `modal`, `stats`, `dock`, etc.) como base.
- Mobile-first, optimizado para 360px de ancho.
- El vidrio (`.vidrio`) solo en dos o tres superficies: barra inferior y banners. Nunca en listas largas, por rendimiento en gama baja.

## Animaciones con GSAP
- GSAP viene de npm; nunca desde CDN.
- Micro-interacciones: hover en botones, presión con rebote elástico (`efectoPresion`), aparición de tarjetas en cascada con resorte (`animarEntrada`, `back.out(1.2)`).
- Transiciones entre pantallas con fade y leve desplazamiento vertical (`mostrarPantalla`).
- Brillo holográfico en tarjetas de certificación (`activarHolografico`).
- Pulso ámbar de respiración en el escudo legal cuando hay avisos.
- Radar de voz: ecualizador **simulado** con GSAP mientras se escucha. No procesa audio real.
- Evita animaciones exageradas. La comodidad del usuario es lo primero.
- Todas las animaciones respetan `prefers-reduced-motion` (usa `duracion()` de `js/ui.js`).

## Sonidos de interfaz
- Sintetizados con WebAudio (`js/audio.js`). No se usan archivos de audio.
- Eventos: `confirmacion` (registro guardado), `radar` (inicia el dictado), `alerta` (registro con aviso legal), `toque` (cambio de tema).
- El usuario los silencia en Ajustes > Sonidos de interfaz (`vdc_sonido`).

## Reglas de código
- Comentar el código en español.
- No usar emojis. Usar iconos de Lucide (`data-lucide`), registrados en `MAPA_ICONOS` de `js/ui.js`.
- HTML semántico y accesible: `aria-label` en botones de solo ícono y `role` en controles personalizados (radio, status, img).
