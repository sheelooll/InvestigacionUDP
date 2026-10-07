---
name: Academic Arcade
colors:
  surface: '#0e1323'
  surface-dim: '#0e1323'
  surface-bright: '#34394a'
  surface-container-lowest: '#080d1d'
  surface-container-low: '#161b2b'
  surface-container: '#1a1f30'
  surface-container-high: '#25293a'
  surface-container-highest: '#2f3446'
  on-surface: '#dee1f9'
  on-surface-variant: '#bbc9cd'
  inverse-surface: '#dee1f9'
  inverse-on-surface: '#2b3041'
  outline: '#859397'
  outline-variant: '#3c494c'
  surface-tint: '#2fd9f4'
  primary: '#8aebff'
  on-primary: '#00363e'
  primary-container: '#22d3ee'
  on-primary-container: '#005763'
  inverse-primary: '#006877'
  secondary: '#cebdff'
  on-secondary: '#381385'
  secondary-container: '#4f319c'
  on-secondary-container: '#bea8ff'
  tertiary: '#ffd6a2'
  on-tertiary: '#452b00'
  tertiary-container: '#fcb244'
  on-tertiary-container: '#6e4600'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a2eeff'
  primary-fixed-dim: '#2fd9f4'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#004e5a'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cebdff'
  on-secondary-fixed: '#21005e'
  on-secondary-fixed-variant: '#4f319c'
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#ffb955'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#0e1323'
  on-background: '#dee1f9'
  surface-variant: '#2f3446'
  bg-void: '#070A12'
  bg-base: '#0B1020'
  surface-1: '#111831'
  surface-2: '#18213F'
  surface-3: '#222D52'
  border: '#2A3561'
  border-strong: '#3B4A80'
  text-hi: '#EEF2FF'
  text-body: '#C7CEE8'
  text-muted: '#8C95B8'
  text-disabled: '#566089'
  cyan: '#22D3EE'
  amber: '#FFB547'
  green: '#3DDC97'
  violet: '#A78BFA'
  red: '#FF5D73'
  java: '#F89820'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
  code-body:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  margin: 1rem
  margin-md: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

# DESIGN.md — Plataforma de aprendizaje Java

> Documento de diseño obligatorio. Toda pantalla, componente y estado debe seguir estas reglas.
> Si una decisión no está cubierta aquí, elegir la opción **más legible y más sobria**, nunca la más genérica.

---

## 0. Dirección de arte: "Arcade Académico"

La plataforma es una **herramienta universitaria seria con alma de videojuego**. La referencia mental es un IDE profesional (JetBrains, VS Code) cruzado con la pantalla de mapa de un RPG — no una landing page de SaaS ni un dashboard de plantilla.

**Proporción de identidad:** 65 % formal/tecnológica · 35 % gamer.

| Lo formal aporta | Lo gamer aporta |
|---|---|
| Estructura, grillas, tipografía de lectura, tablas, numeración de secciones tipo especificación técnica | Progresión, XP, checkpoints, jefes, brillo (glow) controlado, microanimaciones de recompensa |

**Tres reglas que impiden el resultado genérico:**
1. **Nada de tarjetas idénticas en grilla** como recurso por defecto. Cada sección tiene una forma propia (ruta, tabla, editor, HUD).
2. **El color vibrante es información, no decoración.** Cian = acción/actual, ámbar = recompensa/XP, verde = superado, violeta = jefe/hito, rojo = error. Nunca se usan "porque se ven bien".
3. **Detalles de terminal:** números monoespaciados, etiquetas tipo `// 01 METADATOS`, IDs visibles (`LVL-047`, `TC-03`), esquinas cortadas (chamfer) en elementos destacados.

---

## 1. Tokens de color

Fondo oscuro azulado (no negro puro) para reducir fatiga visual en sesiones largas.

```css
:root {
  /* Superficies (de más profunda a más elevada) */
  --bg-void:      #070A12;  /* fondo de página, detrás de El Camino */
  --bg-base:      #0B1020;  /* fondo general */
  --surface-1:    #111831;  /* paneles, formularios */
  --surface-2:    #18213F;  /* inputs, filas de tabla hover */
  --surface-3:    #222D52;  /* popovers, menús */
  --border:       #2A3561;
  --border-strong:#3B4A80;

  /* Texto */
  --text-hi:      #EEF2FF;  /* títulos — contraste 16:1 sobre bg-base */
  --text-body:    #C7CEE8;  /* párrafos — 11:1 */
  --text-muted:   #8C95B8;  /* ayudas, metadatos — 5.6:1 (mínimo AA) */
  --text-disabled:#566089;  /* solo para estados deshabilitados */

  /* Semánticos vibrantes */
  --cyan:   #22D3EE;  /* acción primaria, nivel actual, foco */
  --amber:  #FFB547;  /* XP, recompensas, estrellas, advertencias suaves */
  --green:  #3DDC97;  /* completado, tests pasados, validación OK */
  --violet: #A78BFA;  /* checkpoints, jefes, hitos académicos */
  --red:    #FF5D73;  /* error, test fallido, rúbrica inválida */
  --java:   #F89820;  /* uso MUY puntual: chip de versión Java / sintaxis */

  /* Glow (solo en estados activos) */
  --glow-cyan:   0 0 0 1px #22D3EE66, 0 0 24px #22D3EE40;
  --glow-violet: 0 0 0 1px #A78BFA66, 0 0 32px #A78BFA4D;
  --glow-amber:  0 0 20px #FFB54740;
}
```

---

## 2. Tipografía

- Display: **Chakra Petch** (600, 700)
- Texto: **IBM Plex Sans** (400, 500, 600)
- Código y datos: **JetBrains Mono** (400, 600)
