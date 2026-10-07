// Genera public/*.html a partir de las pantallas exportadas de Stitch.
// Uso: npm run build   (solo necesario si vuelves a exportar los diseños)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '..', 'stitch_codequest_learning_platform_ui');
const OUT = path.join(ROOT, 'public');

// pantalla Stitch → página
const SCREENS = {
  login: { dir: 'iniciar_sesi_n_codequest_udp', title: 'Iniciar sesión' },
  bienvenida: { dir: 'bienvenida_calibraci_n_inicial_codequest_udp', title: 'Bienvenida' },
  dashboard: { dir: 'dashboard_del_estudiante_alex_m.', title: 'Dashboard' },
  camino: { dir: 'el_camino_150_niveles_rpg_java', title: 'El Camino' },
  'panel-docente': { dir: 'panel_docente_anal_tica_acad_mica_udp', title: 'Panel Docente' },
  'generador-ia': { dir: 'generador_inteligente_de_ejercicios_con_ia', title: 'Generador IA' },
};

// páginas del menú que no tienen diseño en Stitch: reutilizan el shell (sidebar + header)
const SHELL_PAGES = {
  'practica-libre': 'Práctica Libre',
  logros: 'Logros & Rangos',
  'banco-ejercicios': 'Banco de Ejercicios',
  rubricas: 'Rúbricas & Analítica',
  documentacion: 'Documentación Técnica',
};

// Stitch exportó login y bienvenida dentro de una columna de 576px (max-w-xl).
// Aquí se reacomodan para pantallas de escritorio, manteniendo el diseño en móvil.
function sub(html, from, to) {
  if (!html.includes(from)) throw new Error(`No se encontró en el HTML: ${from.slice(0, 60)}`);
  return html.replace(from, to);
}

const LOGIN_HERO = `
<div class="hidden lg:flex flex-col gap-space-lg">
  <div class="flex items-center gap-space-sm">
    <div class="w-12 h-12 rounded bg-cyan/15 flex items-center justify-center text-cyan"><span class="material-symbols-outlined text-[28px]">terminal</span></div>
    <div class="flex flex-col">
      <span class="font-headline-md text-headline-md font-bold tracking-wide text-text-hi leading-none">CODE<span class="text-cyan">QUEST</span></span>
      <span class="font-label-sm text-label-sm text-text-muted tracking-widest mt-1">UDP // ACADEMIC IDE</span>
    </div>
  </div>
  <h2 class="font-headline-xl text-headline-xl text-text-hi tracking-tight">Aprende Java <span class="text-cyan">subiendo de nivel</span>.</h2>
  <p class="font-body-lg text-body-lg text-text-muted">Campaña RPG de 150 niveles con pruebas automáticas, IDE en la nube y tutoría socrática para la cátedra INF-204 de la Universidad Diego Portales.</p>
  <div class="grid grid-cols-3 gap-space-sm">
    <div class="p-space-sm rounded bg-surface-2"><div class="font-headline-md text-headline-md text-cyan">150</div><div class="font-label-sm text-label-sm text-text-muted uppercase">Niveles</div></div>
    <div class="p-space-sm rounded bg-surface-2"><div class="font-headline-md text-headline-md text-violet">6</div><div class="font-label-sm text-label-sm text-text-muted uppercase">Actos</div></div>
    <div class="p-space-sm rounded bg-surface-2"><div class="font-headline-md text-headline-md text-java">21</div><div class="font-label-sm text-label-sm text-text-muted uppercase">Java LTS</div></div>
  </div>
</div>`;

const LAYOUT_FIXES = {
  login(html) {
    html = sub(html, '<main class="w-full max-w-xl">', '<main class="w-full max-w-xl lg:max-w-6xl">');
    html = sub(html,
      'class="w-full bg-surface-1 rounded-xl shadow-2xl p-space-md sm:p-gutter-md flex flex-col gap-space-lg"',
      'class="w-full bg-surface-1 rounded-xl shadow-2xl p-space-md sm:p-gutter-md lg:p-10 flex flex-col gap-space-lg lg:grid lg:grid-cols-2 lg:gap-x-12"');
    html = sub(html, '<header class="flex flex-col sm:flex-row', '<header class="lg:col-span-2 flex flex-col sm:flex-row');
    html = sub(html, '<footer class="pt-space-xs', '<footer class="lg:col-span-2 pt-space-xs');
    // Columna derecha: selector de rol + formulario
    html = sub(html, '<section aria-label="Selector de Perfil de Acceso"',
      '<div class="flex flex-col gap-space-lg lg:col-start-2 lg:row-start-2"><section aria-label="Selector de Perfil de Acceso"');
    const asideStart = html.indexOf('<aside aria-label="Telemetría Académica"');
    const asideEnd = html.indexOf('</aside>', asideStart) + '</aside>'.length;
    const aside = html.slice(asideStart, asideEnd);
    html = html.slice(0, asideStart) + html.slice(asideEnd);
    // Columna izquierda: presentación + telemetría
    html = sub(html, '</form>\n</main>',
      `</form>\n</main></div><div class="flex flex-col gap-space-lg lg:col-start-1 lg:row-start-2 lg:justify-between">${LOGIN_HERO}${aside}</div>`);
    return html;
  },
  bienvenida(html) {
    return sub(html, '<main class="w-full max-w-xl">', '<main class="w-full max-w-xl lg:max-w-7xl py-space-lg">');
  },
};

function finalize(html, page, title) {
  if (LAYOUT_FIXES[page]) html = LAYOUT_FIXES[page](html);
  html = html.replace(/<title>[^<]*<\/title>/, '');
  html = html.replace('<head>', `<head><title>CodeQuest UDP · ${title}</title><link rel="icon" href="/assets/logo.svg" type="image/svg+xml"/>`);
  html = html.replace(/<body /, `<body data-page="${page}" `);
  const tag = '<script src="/assets/app.js"></script>';
  const i = html.lastIndexOf('</body>');
  return html.slice(0, i) + tag + html.slice(i);
}

fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

for (const [page, { dir, title }] of Object.entries(SCREENS)) {
  const html = fs.readFileSync(path.join(SRC, dir, 'code.html'), 'utf8');
  fs.writeFileSync(path.join(OUT, `${page}.html`), finalize(html, page, title));
  console.log(`✓ ${page}.html`);
}

const dashboard = fs.readFileSync(path.join(SRC, SCREENS.dashboard.dir, 'code.html'), 'utf8');
const mainTag = '<main class="relative pt-16 min-h-screen bg-bg-base">';
const shellStart = dashboard.slice(0, dashboard.indexOf(mainTag) + mainTag.length);
for (const [page, title] of Object.entries(SHELL_PAGES)) {
  const html = `${shellStart}<div id="page-root" class="p-margin-md flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full"></div></main></div></body></html>`;
  fs.writeFileSync(path.join(OUT, `${page}.html`), finalize(html, page, title));
  console.log(`✓ ${page}.html (shell)`);
}

const logo = fs.readFileSync(path.join(SRC, 'codequest_udp_logo', 'code.html'), 'utf8');
fs.writeFileSync(path.join(OUT, 'assets', 'logo.svg'), logo);
console.log('✓ assets/logo.svg');
