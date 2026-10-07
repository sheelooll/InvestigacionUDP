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

**Reglas de uso**
- Máximo **un color vibrante dominante por vista** + los semánticos de estado.
- Texto vibrante solo en tamaños ≥ 14 px semibold. Párrafos siempre en `--text-body`.
- El glow se reserva para: nivel actual, foco de teclado, botón primario en hover, recompensa obtenida. **Nunca** en todos los elementos a la vez.
- Gradientes permitidos solo en: el trazo recorrido de El Camino (cyan → violeta) y la barra de XP (amber → #FF8A3D). Prohibidos en fondos de tarjetas y textos.

---

## 2. Tipografía

| Rol | Fuente | Uso | Peso |
|---|---|---|---|
| Display | **Chakra Petch** | Títulos H1/H2, números de nivel, nombres de acto, HUD | 600–700 |
| Texto | **IBM Plex Sans** | Párrafos, labels, formularios, tablas | 400 / 500 / 600 |
| Código y datos | **JetBrains Mono** | Código Java, IDs, XP, porcentajes, casos de prueba, etiquetas `// 01` | 400 / 600 |

Chakra Petch da el tono gamer-técnico; Plex Sans aporta la formalidad universitaria. **Nunca** usar Chakra Petch para párrafos ni labels de formulario.

**Escala** (base 16 px, ratio 1.25):
`12 · 14 · 16 · 20 · 25 · 31 · 39 · 49`
- H1 49/1.1 Chakra Petch 700, `letter-spacing: -0.01em`
- H2 31/1.2 Chakra Petch 600
- H3 20/1.3 Plex Sans 600
- Cuerpo 16/1.6 Plex Sans 400, ancho máximo de línea 72ch
- Overline de sección: JetBrains Mono 12, `letter-spacing: 0.12em`, mayúsculas, color `--text-muted` → `// 03 RÚBRICA`
- Números (XP, %, niveles): `font-variant-numeric: tabular-nums`

---

## 3. Espaciado, forma y elevación

- Escala de espaciado (px): `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`
- Grilla: 12 columnas, gutter 24 px, contenedor máx. 1280 px (El Camino puede usar ancho completo).
- Radios: `4px` inputs/chips · `8px` paneles · `999px` solo para la barra de XP y nodos circulares.
- **Chamfer** (esquina cortada 8–12 px vía `clip-path`) en: botón primario, banners de acto, nodos de checkpoint y paneles del HUD. Es la firma visual; no aplicarlo a todo.
- Elevación por **borde + luminosidad de superficie**, no por sombras difusas grandes. Sombras solo `0 8px 24px #00000066` en popovers.
- Textura de fondo opcional: grilla de puntos `--border` al 30 % de opacidad, 24 px, solo en `--bg-void`.

---

## 4. Sección "El Camino" (prioridad 1)

### 4.1 Concepto
Un **mapa de campaña vertical**: una sola ruta continua que desciende por la página, uniendo los 150 niveles. El estudiante "baja" por la ruta como en un dungeon. **Está prohibido representarlo como grilla de tarjetas, lista o tabla.**

### 4.2 Estructura narrativa — 6 Actos × 25 niveles

| Acto | Niveles | Región (nombre temático) | Contenido Java | Tono de color de la región |
|---|---|---|---|---|
| I | 1–25 | **La Consola Inicial** | Sintaxis, variables, tipos primitivos, operadores, `Scanner`, `System.out` | cian |
| II | 26–50 | **Bosque de Bifurcaciones** | `if/else`, `switch`, `while`, `for`, `do-while`, lógica booleana | verde |
| III | 51–75 | **Forja de Métodos** | Métodos, parámetros, retorno, sobrecarga, recursión, arreglos 1D/2D, `String` | ámbar |
| IV | 76–100 | **Ciudadela de Objetos** | Clases, objetos, encapsulamiento, constructores, herencia, polimorfismo, interfaces, abstractas | violeta |
| V | 101–125 | **Archivo de Colecciones** | Excepciones, `ArrayList`, `HashMap`, `Set`, genéricos, archivos I/O | cian→violeta |
| VI | 126–150 | **Núcleo Avanzado** | Lambdas, Streams, `Optional`, records, concurrencia básica, JUnit, patrones de diseño | violeta→ámbar |

Cada región tiñe sutilmente el fondo (`--bg-void` + radial del color de la región al 6 % de opacidad) para que el recorrido se sienta como un viaje.

### 4.3 Tipos de nodo

| Tipo | Frecuencia | Forma | Tamaño | Notas |
|---|---|---|---|---|
| Nivel normal | resto | círculo | 48 px | número en Chakra Petch dentro |
| **Checkpoint** | cada 5 niveles (5, 10, 15…) | hexágono con chamfer | 64 px | punto de guardado + mini-evaluación; icono de bandera; banderín lateral con nombre |
| **Jefe de acto** | cada 25 (25, 50, 75, 100, 125) | octógono grande con anillo | 88 px | examen integrador del acto; color `--violet`, glow permanente tenue |
| **Jefe final** | 150 | emblema doble anillo | 112 px | "Proyecto Final"; animación de pulso lento |

### 4.4 Estados de nodo

| Estado | Relleno | Borde | Extras |
|---|---|---|---|
| Bloqueado | `--surface-1` | `--border` | candado 16 px, número `--text-disabled` |
| Disponible | `--surface-2` | `--cyan` 1 px | — |
| **Actual** | `--cyan` | — | `--glow-cyan`, anillo pulsante (2 s), avatar/marcador "ESTÁS AQUÍ" a un costado |
| Completado | `--surface-2` | `--green` 2 px | check verde; 1–3 estrellas `--amber` bajo el nodo |
| Perfecto (3★) | gradiente sutil verde | `--amber` 2 px | brillo `--glow-amber` muy leve |

Cada estado se distingue **también por forma/icono**, no solo por color (daltonismo).

### 4.5 La ruta
- **Un único `<path>` SVG** continuo que serpentea: `x = centro + A · sin(i · 0.55)`, con `A = 180 px` en desktop, `90 px` en tablet, `56 px` en móvil. Separación vertical entre nodos: `112 px` (checkpoints y jefes reciben +48 px de aire extra).
- Tramo **recorrido**: trazo 6 px con gradiente `--cyan → --violet`, glow suave.
- Tramo **por recorrer**: trazo 4 px `--border-strong`, `stroke-dasharray: 2 10`, extremos redondeados (se ve como un camino de puntos).
- Entre actos, la ruta atraviesa un **banner de región** a ancho completo: chamfer, overline `ACTO IV`, título de región en Chakra Petch 39, línea de conceptos en Plex Sans, progreso del acto `17/25` en mono. La ruta pasa *por detrás* del banner y continúa debajo (sensación de "entrar a otra zona").
- **Etiquetas laterales**: cada nodo muestra a su lado (alternando según la curva) el nombre corto del concepto (`Bucle for`, `Herencia`). Los checkpoints muestran banderín con nombre de evaluación.

### 4.6 HUD fijo (sticky, parte superior de la sección)
Panel horizontal con chamfer, `--surface-1` al 85 % + `backdrop-filter: blur(12px)`:
`[Avatar + rango académico] · [Nivel 47 / 150] · [Barra XP 2.340 / 3.000] · [Racha 🔥 6 días] · [Acto II · 21/25] · [Botón "Continuar" → nivel actual]`

### 4.7 Minimapa
Riel vertical a la derecha (desktop ≥ 1200 px): 150 marcas finas, coloreadas por estado; las de checkpoint/jefe más largas; un indicador muestra la posición del viewport. Clic = scroll a esa zona. En móvil se reemplaza por un botón flotante "Ir a mi nivel".

### 4.8 Interacción
- Al entrar, **scroll automático** suave hasta el nivel actual (centrado).
- Hover/foco en nodo → **popover** (`--surface-3`): ID `LVL-047`, título, conceptos (chips), dificultad (5 segmentos), XP otorgada, mejor puntaje, tiempo estimado, botón primario "Iniciar nivel" / "Repetir".
- Nodo bloqueado → popover indica requisito: "Supera el Checkpoint 45 para desbloquear".
- Completar nivel → el tramo de ruta se "dibuja" (`stroke-dashoffset`, 800 ms), el siguiente nodo se enciende, +XP flota en ámbar.
- Teclado: nodos navegables con `Tab` y flechas ↑↓; `Enter` abre popover.

### 4.9 Rendimiento
150 nodos en SVG es manejable; renderizar la ruta como un solo path y los nodos como elementos HTML posicionados absolutamente. Animaciones solo en el viewport visible (`IntersectionObserver`).

---

## 5. Generador de ejercicios (prioridad 2)

### 5.1 Concepto
Debe sentirse como una **herramienta de ingeniería educativa**: un editor de especificaciones con secciones numeradas, validación en vivo y previsualización. El tono gamer aquí es mínimo (solo en el bloque de recompensas). **No eliminar ni fusionar campos existentes**; los listados abajo son el mínimo requerido.

### 5.2 Layout
- Desktop: **formulario 7/12 a la izquierda + previsualización 5/12 a la derecha (sticky)**.
- Arriba: barra de pasos/índice con las secciones `01–07`, cada una con estado (vacío ○, incompleto ◐, válido ●, error ✕). Clic = scroll a la sección.
- Abajo: **barra de acciones fija**: `Guardar borrador` (secundario) · `Validar` (secundario) · `Exportar` (menú: JSON, Markdown, PDF) · `Publicar ejercicio` (primario, chamfer, deshabilitado hasta que todo sea válido). A la izquierda de la barra: "Último guardado 09:42 · 2 advertencias".
- Tablet/móvil: previsualización pasa a una pestaña "Vista previa" o drawer inferior.

### 5.3 Secciones del formulario

Cada sección es un panel `--surface-1` con overline mono `// 0N NOMBRE`, título H3 y descripción breve en `--text-muted`.

**// 01 METADATOS**
- Título del ejercicio (texto, máx. 80)
- Código/ID (autogenerado, editable: `EJ-POO-012`)
- Asignatura / curso · Sección · Unidad temática (selects)
- Nivel vinculado en El Camino (selector con búsqueda `LVL-001…150`)
- Tipo de ejercicio (segmented control): Implementación · Completar código · Depuración · Predicción de salida · Refactorización
- Dificultad (1–5, control segmentado con etiquetas Básico → Experto)
- Tiempo estimado (min) · Autor · Fecha de publicación / cierre

**// 02 CONCEPTOS JAVA**
- Buscador + chips agrupados por categoría (Fundamentos, Control de flujo, Métodos y arreglos, POO, Colecciones y excepciones, Avanzado).
- Cada chip seleccionado se puede marcar **Principal** (borde cian sólido) o **Secundario** (borde punteado).
- Panel lateral de **prerrequisitos detectados** (p. ej., elegir "Polimorfismo" sugiere "Herencia").
- Versión de Java objetivo: 11 · 17 · 21 (chip `--java`).

**// 03 ENUNCIADO**
- Contexto / historia (editor de texto enriquecido)
- Objetivo de aprendizaje (uno o más, lista)
- Instrucciones paso a paso
- Restricciones (lista: "No usar `ArrayList`", "Complejidad O(n)")
- Formato de entrada · Formato de salida
- Código base / plantilla (**editor de código** con resaltado Java, numeración de líneas, tema oscuro consistente)
- Solución de referencia (editor, oculta al estudiante, con candado)
- Pistas (lista ordenada, cada una con costo en XP opcional)

**// 04 RÚBRICA CONFIGURABLE**
- Tabla editable: `Criterio` · `Descripción` · `Peso %` · niveles de desempeño **Excelente / Bueno / Suficiente / Insuficiente** (descriptor + puntaje por nivel).
- Acciones por fila: reordenar (drag handle), duplicar, eliminar. Botón "+ Agregar criterio". Plantillas: "Correctitud / Calidad de código / Buenas prácticas / Documentación".
- **Medidor de pesos**: barra segmentada por criterio + total en mono. `100 %` → verde; distinto → rojo con mensaje "La suma de pesos es 85 %. Debe ser 100 %."
- Toggle: evaluación automática (vinculada a tests) vs. manual por criterio.

**// 05 CASOS DE PRUEBA**
- Tabla: `ID (TC-01)` · `Nombre` · `Visibilidad` (Pública / Oculta) · `Entrada` · `Salida esperada` · `Timeout (ms)` · `Puntaje` · `Criterio de rúbrica asociado` · acciones.
- Entrada y salida en celdas mono expandibles (editor multilínea al hacer clic).
- Modo alternativo: **pruebas JUnit 5** (editor de código con plantilla `@Test`).
- Acciones: `+ Agregar caso`, duplicar, importar (CSV/JSON), `Ejecutar contra solución de referencia` → cada fila muestra resultado ✓ verde / ✕ rojo con tiempo de ejecución.
- Resumen: "8 casos · 3 públicos · 5 ocultos · 100 pts".

**// 06 CONFIGURACIÓN DE EVALUACIÓN**
- Intentos máximos · Penalización por intento (%) · Entrega tardía (permitida / penalización)
- Tipo de retroalimentación: Inmediata · Al cierre · Solo puntaje
- Detección de similitud de código (toggle + umbral %)
- Límites: memoria (MB), tiempo total (s)

**// 07 RECOMPENSAS** (único bloque con estética gamer marcada)
- XP otorgada (base + bonus por 3★)
- Umbrales de estrellas (p. ej., ★ 60 %, ★★ 80 %, ★★★ 100 %)
- Insignia desbloqueable (selector con vista previa)
- ¿Cuenta como checkpoint? (toggle)

### 5.4 Panel de previsualización
Pestañas: **Vista estudiante** · **Rúbrica** · **Tests** · **Exportación (JSON)**.
- *Vista estudiante*: render fiel del ejercicio como lo verá el alumno (encabezado con ID, dificultad, conceptos, XP; enunciado; código base; tests públicos).
- *Rúbrica*: tabla final formateada lista para imprimir.
- *Tests*: lista con estado de la última ejecución.
- *JSON*: bloque mono con resaltado, botón copiar.
- Se actualiza en vivo (debounce 300 ms). Encabezado del panel: "Vista previa · actualizada hace 2 s".

### 5.5 Formularios — reglas de componentes
- Label siempre visible arriba del campo (Plex Sans 14/600, `--text-hi`); nunca solo placeholder.
- Campo obligatorio: asterisco `--cyan`. Texto de ayuda debajo en `--text-muted` 13 px.
- Input: `--surface-2`, borde `--border`, alto 40 px; foco = borde `--cyan` + `--glow-cyan`.
- Error: borde `--red`, icono + mensaje en `--red` debajo; la sección marca ✕ en el índice.
- Contador de caracteres en mono a la derecha cuando hay límite.

---

## 6. Componentes base

- **Botón primario**: fondo `--cyan`, texto `#04121A` (contraste 12:1), Plex Sans 600, chamfer 8 px, hover = glow. Uno por vista.
- **Secundario**: transparente, borde `--border-strong`, texto `--text-hi`; hover `--surface-2`.
- **Fantasma/terciario**: solo texto `--cyan`, subrayado en hover.
- **Chip de concepto**: mono 13 px, `--surface-2`, borde 1 px; seleccionado = borde `--cyan`, fondo `#22D3EE14`.
- **Badges de estado**: mono 11 px mayúsculas, fondo del color semántico al 14 %, texto del color al 100 %.
- **Barra de XP**: 8 px, fondo `--surface-2`, relleno gradiente ámbar, valor en mono al lado.
- **Tablas**: encabezado mono 12 mayúsculas `--text-muted`, filas 48 px, separadores `--border`, hover `--surface-2`, sin bordes verticales.

**Iconos:** línea 1.5 px (Lucide o Phosphor), 20 px. Iconos temáticos (bandera, escudo, cofre, espada) solo en El Camino y Recompensas.

---

## 7. Movimiento

- Duraciones: 150 ms (hover), 250 ms (popovers, tabs), 800 ms (dibujo de ruta), 2 s (pulso del nivel actual).
- Curva: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Celebraciones (nivel completado, checkpoint superado) breves: ≤ 1.2 s, sin confeti a pantalla completa en el generador.
- `@media (prefers-reduced-motion: reduce)`: sin pulso, sin dibujo animado (la ruta aparece directamente), sin partículas.

---

## 8. Accesibilidad y legibilidad (no negociable)

- Contraste mínimo WCAG AA: 4.5:1 en texto, 3:1 en bordes de controles y nodos.
- Estados nunca comunicados solo por color (icono, forma o texto adicional).
- Foco de teclado siempre visible (`--glow-cyan` + outline 2 px).
- Ruta de El Camino con alternativa accesible: lista ordenada oculta visualmente (`aria-label` por nivel: "Nivel 47, Herencia, completado, 2 estrellas").
- Áreas táctiles ≥ 44 px en móvil.
- Idioma de la interfaz: español formal (tú/usted consistente; recomendado "tú" con tono académico).

---

## 9. Prohibido (anti-genérico)

- ❌ Grilla de tarjetas para El Camino, o tarjetas idénticas como solución por defecto en cualquier sección.
- ❌ Gradientes morado-azul de "startup" en fondos o hero.
- ❌ Fuentes por defecto (Inter/Roboto/Arial) como única tipografía.
- ❌ Glow, neón o animación en todos los elementos.
- ❌ Emojis como iconografía principal (solo 🔥 de racha está permitido).
- ❌ Texto vibrante en párrafos largos; texto gris de bajo contraste.
- ❌ Simplificar el generador a un formulario de 3 campos o esconder secciones tras un "modo avanzado".
- ❌ Ilustraciones genéricas de "persona con laptop".

---

## 10. Checklist antes de entregar

- [ ] El Camino muestra 150 nodos unidos por **una ruta continua** que se recorre hacia abajo.
- [ ] Checkpoints cada 5 niveles y jefes cada 25 son visualmente distintos.
- [ ] 6 actos con banner de región y tinte de fondo propio.
- [ ] HUD sticky y minimapa (o botón "Ir a mi nivel" en móvil).
- [ ] El generador tiene las 7 secciones numeradas, índice de pasos, previsualización en vivo y barra de acciones fija.
- [ ] La rúbrica valida que los pesos sumen 100 %.
- [ ] Los casos de prueba distinguen públicos/ocultos y pueden ejecutarse contra la solución.
- [ ] Contrastes AA verificados; foco visible; `prefers-reduced-motion` respetado.
- [ ] Solo un botón primario por vista; el color vibrante siempre significa algo.

---

## Prompt integrado (para pegar junto a este archivo)

> Refina el diseño anterior siguiendo estrictamente **DESIGN.md** (adjunto). Prioriza dos elementos:
>
> 1. **"El Camino"** debe ser una experiencia visual memorable: 150 niveles conectados por una ruta vertical continua que se recorre hacia abajo, organizada en 6 actos, con checkpoints cada 5 niveles, jefes cada 25, HUD de progreso y minimapa (ver sección 4). No la conviertas en una cuadrícula de tarjetas.
> 2. **El generador de ejercicios** debe parecer una herramienta profesional de ingeniería educativa: formulario estructurado en 7 secciones numeradas, selección de conceptos Java, rúbrica configurable con validación de pesos, casos de prueba y previsualización en vivo (ver sección 5).
>
> Mantén el equilibrio entre estética gamer, identidad tecnológica y formalidad universitaria. Usa los tokens de color, tipografía y componentes definidos en DESIGN.md: colores vibrantes sobre fondos oscuros, con excelente legibilidad y jerarquía visual. No elimines campos ni simplifiques la estructura del generador. Antes de entregar, verifica la checklist de la sección 10.
