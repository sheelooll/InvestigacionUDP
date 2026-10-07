// CodeQuest UDP — script compartido: sesión, navegación y acciones de cada pantalla.
(() => {
  const PAGE = document.body.dataset.page;
  // En GitHub Pages no hay servidor: static-api.js atiende la API y las páginas son archivos .html relativos.
  const STATIC = window.CQ_STATIC_API;
  const path = (p) => (STATIC ? `${p.replace(/^\//, '')}.html` : p);
  const go = (p) => { location.href = path(p); };

  // data-path del sidebar → ruta real
  const ROUTES = {
    dashboard: '/dashboard',
    'el-camino': '/camino',
    'practica-libre': '/practica-libre',
    'logros-y-rangos': '/logros',
    'panel-docente': '/panel-docente',
    'generador-ia': '/generador-ia',
    'banco-ejercicios': '/banco-ejercicios',
    'rubricas-analitica': '/rubricas',
    'documentacion-tecnica': '/documentacion',
  };
  const PAGE_TO_PATH = {
    dashboard: 'dashboard', camino: 'el-camino', 'practica-libre': 'practica-libre', logros: 'logros-y-rangos',
    'panel-docente': 'panel-docente', 'generador-ia': 'generador-ia', 'banco-ejercicios': 'banco-ejercicios',
    rubricas: 'rubricas-analitica', documentacion: 'documentacion-tecnica',
  };
  const TEACHER_PAGES = ['panel-docente', 'generador-ia', 'rubricas'];

  const NAV_ACTIVE = 'flex items-center justify-between px-space-md py-2 transition-all bg-surface-2 text-cyan font-bold border-l-2 border-cyan';
  const NAV_IDLE = 'flex items-center justify-between px-space-md py-2 text-on-surface-variant hover:bg-surface-1 hover:text-on-surface transition-all font-body-md text-body-md';

  // ------------------------------------------------------------ utilidades
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (n) => Number(n).toLocaleString('es-CL');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const button = (text, root = document) =>
    $$('button', root).find((b) => b.textContent.replace(/\s+/g, ' ').includes(text));

  async function api(url, opts = {}) {
    const method = opts.method || (opts.body ? 'POST' : 'GET');
    let status;
    let data;
    if (STATIC) {
      ({ status, data } = await STATIC.handle(method, url, opts.body));
    } else {
      const res = await fetch(url, {
        method,
        headers: opts.body ? { 'Content-Type': 'application/json' } : {},
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        credentials: 'same-origin',
      });
      status = res.status;
      data = await res.json().catch(() => ({}));
    }
    if (status === 401 && PAGE !== 'login') go('/login');
    if (status >= 400) throw new Error(data.error || `Error ${status}`);
    return data;
  }

  function toast(msg, tone = 'cyan') {
    let box = $('#cq-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'cq-toasts';
      box.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `px-4 py-3 rounded bg-surface-2 border border-${tone}/60 text-text-hi font-label-md text-label-md shadow-xl transition-opacity duration-300`;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3200);
  }

  function replaceText(root, from, to) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) if (n.nodeValue.includes(from)) n.nodeValue = n.nodeValue.split(from).join(to);
  }

  function download(filename, content, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ------------------------------------------------------------ shell (sidebar + header)
  function wireShell(user) {
    const aside = $('aside.fixed');
    if (!aside) return;

    const activePath = PAGE_TO_PATH[PAGE];
    $$('a[data-path]', aside).forEach((a) => {
      const p = a.dataset.path;
      a.href = ROUTES[p] ? path(ROUTES[p]) : '#';
      if (p === 'documentacion-tecnica') return;
      const active = p === activePath;
      a.className = active ? NAV_ACTIVE : NAV_IDLE;
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    // Los estudiantes no ven la sección de gestión docente
    if (user.role !== 'teacher') {
      const nav = $('nav', aside);
      let hide = false;
      [...nav.children].forEach((el) => {
        if (el.textContent.includes('02 GESTIÓN DOCENTE')) hide = true;
        if (hide && el.dataset.path !== 'banco-ejercicios') el.remove();
      });
    }

    // Selector de modo ESTUDIANTE / DOCENTE
    const [btnStudent, btnTeacher] = $$('.grid.grid-cols-2 button', aside);
    if (btnStudent && btnTeacher) {
      const teacherMode = TEACHER_PAGES.includes(PAGE);
      const on = 'py-1 px-2 rounded bg-cyan text-bg-void font-label-sm text-label-sm font-bold text-center tracking-wide';
      const off = 'py-1 px-2 rounded text-text-muted hover:text-text-hi font-label-sm text-label-sm text-center tracking-wide transition-colors';
      btnStudent.className = teacherMode ? off : on;
      btnTeacher.className = teacherMode ? on : off;
      btnStudent.onclick = () => { go('/dashboard'); };
      btnTeacher.onclick = () => {
        if (user.role !== 'teacher') return toast('Tu cuenta no tiene permisos de docente.', 'amber');
        go('/panel-docente');
      };
    }

    const header = $('header.fixed');
    if (!header) return;
    replaceText(header, 'est.diego.p', user.handle);
    replaceText(header, 'UDP INF-302', user.role === 'teacher' ? `DOCENTE ${user.section}` : `UDP ${user.section}`);
    updateXpWidgets(user);

    const bell = $$('button', header).find((b) => b.textContent.includes('notifications'));
    if (bell) bell.onclick = () => toast('Checkpoint 50 programado para este jueves.');
    const trophy = $$('button', header).find((b) => b.textContent.includes('emoji_events'));
    if (trophy) trophy.onclick = () => { go('/logros'); };

    // Botón cerrar sesión
    const userBox = $('.border-l.border-border', header);
    if (userBox && !$('#cq-logout')) {
      const out = document.createElement('button');
      out.id = 'cq-logout';
      out.title = 'Cerrar sesión';
      out.className = 'ml-1 w-8 h-8 rounded bg-surface-2 border border-border flex items-center justify-center text-on-surface-variant hover:text-red hover:border-red transition-colors';
      out.innerHTML = '<span class="material-symbols-outlined text-[18px]">logout</span>';
      out.onclick = async () => { await api('/api/logout', { method: 'POST' }); go('/login'); };
      userBox.appendChild(out);
    }
  }

  // Valores originales del diseño, para reemplazarlos por los datos reales
  const DESIGN = { xp: '2.340 / 3.000 XP', pct: '78%', lvl: 'NVL 47/150', streak: '6D' };
  function updateXpWidgets(user) {
    const xpText = `${fmt(user.xp)} / ${fmt(user.xpGoal)} XP`;
    const pct = user.xpGoal ? `${Math.min(100, Math.round((user.xp / user.xpGoal) * 100))}%` : '0%';
    replaceText(document.body, DESIGN.xp, xpText);
    replaceText(document.body, DESIGN.lvl, `NVL ${user.level}/150`);
    $$('header.fixed [title="Racha de estudio activa"] .font-bold').forEach((s) => { s.textContent = `${user.streak}D`; });
    $$(`[style*="width: ${DESIGN.pct}"]`).forEach((bar) => { bar.style.width = pct; });
    $$('span').filter((s) => s.textContent.trim() === DESIGN.pct).forEach((s) => { s.textContent = pct; });
    Object.assign(DESIGN, { xp: xpText, pct, lvl: `NVL ${user.level}/150` });
  }

  // ------------------------------------------------------------ páginas
  const pages = {};

  pages.login = () => {
    const form = $('form');
    const err = document.createElement('div');
    err.className = 'hidden px-3 py-2 rounded bg-red/15 text-red font-label-md text-label-md';
    form.appendChild(err);

    const hint = document.createElement('p');
    hint.className = 'font-label-sm text-label-sm text-text-muted';
    hint.innerHTML = 'Demo — Estudiante: <span class="text-cyan">alex.montero@mail.udp.cl</span> · Docente: <span class="text-violet">profesor@udp.cl</span> · clave <span class="text-text-hi">codequest</span>';
    form.appendChild(hint);

    async function doLogin(identity, password) {
      const role = typeof currentRole !== 'undefined' ? currentRole : 'student'; // definido en el script del diseño
      const btn = $('#submit-auth-btn');
      const label = $('#submit-btn-text');
      const original = label.textContent;
      err.classList.add('hidden');
      btn.disabled = true;
      btn.style.opacity = '0.7';
      label.textContent = 'VERIFICANDO CREDENCIALES EN UDP-IDP...';
      try {
        const { redirect } = await api('/api/login', { body: { identity, password, role } });
        label.textContent = 'AUTORIZADO // REDIRIGIENDO AL NODO...';
        btn.classList.remove('bg-cyan', 'bg-violet');
        btn.classList.add('bg-green');
        setTimeout(() => { go(redirect); }, 600);
      } catch (e) {
        err.textContent = e.message;
        err.classList.remove('hidden');
        label.textContent = original;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }

    // Reemplaza la simulación del diseño por autenticación real
    window.simulateAuth = () => doLogin($('#user-identity').value, $('#user-password').value);

    const sso = button('Ingresar con Correo UDP');
    if (sso) sso.onclick = () => {
      const role = typeof currentRole !== 'undefined' ? currentRole : 'student';
      $('#user-identity').value = role === 'faculty' ? 'profesor@udp.cl' : 'alex.montero@mail.udp.cl';
      $('#user-password').value = 'codequest';
      window.simulateAuth();
    };
    const forgot = $$('a').find((a) => a.textContent.includes('Olvidaste'));
    if (forgot) forgot.onclick = (e) => { e.preventDefault(); toast('Contacta a soporte.tics@udp.cl para restablecer tu clave.'); };

    // El panel de contexto se regenera al cambiar de rol: delegamos los clics
    $('#role-context-display').addEventListener('click', async (e) => {
      const t = e.target.closest('button, a');
      if (!t) return;
      e.preventDefault();
      if (t.textContent.includes('Invitado')) {
        const { redirect } = await api('/api/guest', { method: 'POST' });
        go(redirect);
      } else {
        toast('Inicia sesión como docente para acceder a las evaluaciones.', 'violet');
      }
    });
  };

  pages.bienvenida = (user) => {
    replaceText(document.body, 'Alex Montero', user.name);
    replaceText(document.body, 'AlexM_Dev', user.handle);
    replaceText(document.body, '(RUT: 20.884.103-K)', user.rut ? `(RUT: ${user.rut})` : `(${user.email})`);

    const collect = () => {
      const archetypeCard = $$('.archetype-card').find((c) => c.classList.contains('ring-cyan'));
      return {
        archetype: archetypeCard ? $('.font-headline-sm', archetypeCard).textContent.trim() : 'Arquitecto',
        javaLevel: $('input[name="java_level"]:checked')?.value,
        aiMode: $('input[name="ai_mode"]:checked')?.value,
        keymap: $('select')?.value,
        integrity: $('input.accent-green')?.checked,
      };
    };

    const enter = button('ENTRAR AL CAMINO');
    enter.onclick = async () => {
      const profile = collect();
      if (!profile.integrity) return toast('Debes aceptar el Protocolo de Integridad para continuar.', 'amber');
      await api('/api/onboarding', { body: profile });
      go('/camino');
    };
    const skip = button('Omitir Tutorial');
    skip.onclick = async () => {
      await api('/api/onboarding', { body: { ...collect(), skipped: true } });
      go('/dashboard');
    };
  };

  pages.dashboard = (user) => {
    const h1 = $('main h1');
    if (h1 && h1.firstChild) h1.firstChild.nodeValue = `¡Hola, ${user.name.split(' ')[0]}! `;
    replaceText(document.body, '142 ', `${user.solved} `);

    const submit = $('#btn-submit');
    const MISSION = 47;
    const markDone = () => {
      submit.innerHTML = '<span class="material-symbols-outlined text-[18px]">verified</span><span>Misión completada</span>';
      submit.classList.remove('bg-cyan');
      submit.classList.add('bg-green');
      submit.disabled = true;
    };
    if (user.completedLevels.includes(MISSION)) markDone();
    submit.addEventListener('click', async () => {
      try {
        const { user: u, firstTime } = await api('/api/submit', {
          body: { level: MISSION, xp: 120, title: 'Procesamiento de Cuadrículas con Bucles Anidados' },
        });
        updateXpWidgets(u);
        toast(firstTime ? '¡Solución aprobada! +150 XP (x1.25 racha)' : 'Solución reenviada.', 'green');
        markDone();
      } catch (e) { toast(e.message, 'red'); }
    });

    const criteria = button('Ver Criterios de Evaluación');
    if (criteria) criteria.onclick = () => { go('/camino'); };
    $$('.cursor-pointer').filter((c) => c.textContent.includes('XP')).forEach((c) => {
      c.onclick = () => { go('/practica-libre'); };
    });
    const all = $$('a').find((a) => a.textContent.includes('Ver todas'));
    if (all) all.href = path('/logros');
    const expand = $('button[title="Expandir editor"]');
    if (expand) expand.onclick = () => { go('/practica-libre'); };
  };

  pages.camino = (user) => {
    replaceText(document.body, 'Alex M.', user.name);
    const start = button('INICIAR MISIÓN AHORA');
    if (start) start.onclick = () => { go('/dashboard'); };
  };

  pages['panel-docente'] = () => {
    const create = button('CREAR EJERCICIO CON IA');
    if (create) create.onclick = () => { go('/generador-ia'); };
    const rubrics = button('CONFIGURAR RÚBRICAS');
    if (rubrics) rubrics.onclick = () => { go('/rubricas'); };

    const rows = $$('table tbody tr');
    const search = $('input[placeholder^="Buscar por Nombre"]');
    if (search) search.oninput = () => {
      const q = search.value.toLowerCase();
      rows.forEach((r) => { r.hidden = !r.textContent.toLowerCase().includes(q); });
    };
    const exportBtn = $('button[title="Exportar CSV de Cohorte"]');
    if (exportBtn) exportBtn.onclick = () => {
      const lines = $$('table tr').map((r) =>
        $$('th, td', r).map((c) => `"${c.innerText.replace(/\s+/g, ' ').trim().replace(/"/g, '""')}"`).join(','));
      download('cohorte-inf204.csv', lines.join('\n'), 'text/csv');
    };
    $$('button[title="Inspeccionar Código"], button[title="Ver Historial Telemetría"]').forEach((b) => {
      b.onclick = () => toast(`${b.title}: disponible próximamente.`);
    });
  };

  pages['generador-ia'] = () => {
    const main = $('main');
    const fieldByLabel = (label, sel) => {
      const l = $$('label', main).find((x) => x.textContent.trim().toUpperCase().startsWith(label));
      return l ? $(sel, l.parentElement) : null;
    };
    const collect = (status) => ({
      title: fieldByLabel('TÍTULO', 'input')?.value,
      course: fieldByLabel('CURSO', 'select')?.value,
      section: fieldByLabel('SECCIÓN', 'select')?.value,
      difficulty: $$('select', main)[2]?.value,
      statement: $('textarea', main)?.value,
      status,
    });
    const save = async (status) => {
      try {
        const { exercise } = await api('/api/exercises', { body: collect(status) });
        toast(`${exercise.id} ${status === 'borrador' ? 'guardado como borrador' : 'publicado'}.`, 'green');
        if (status === 'publicado') setTimeout(() => { go('/banco-ejercicios'); }, 900);
      } catch (e) { toast(e.message, 'red'); }
    };
    const publish = button('GENERAR Y PUBLICAR');
    if (publish) publish.onclick = () => save('publicado');
    const draft = button('Guardar Borrador');
    if (draft) draft.onclick = () => save('borrador');
    const sandbox = button('Probar en Sandbox');
    if (sandbox) sandbox.onclick = () => { go('/practica-libre'); };
    const exportJson = button('Exportar JSON');
    if (exportJson) exportJson.onclick = () =>
      download('ejercicio.json', JSON.stringify(collect('borrador'), null, 2), 'application/json');
  };

  // ------------------------------------------------------------ páginas sin diseño Stitch (usan el shell)
  const card = (inner, extra = '') => `<div class="p-space-lg rounded bg-surface-container shadow-md ${extra}">${inner}</div>`;
  const heading = (kicker, title, sub = '') => `
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-cyan uppercase tracking-wider">${kicker}</span>
      <h1 class="font-headline-lg text-headline-lg text-text-hi tracking-tight">${title}</h1>
      ${sub ? `<p class="font-body-md text-body-md text-text-muted max-w-3xl">${sub}</p>` : ''}
    </div>`;

  const STARTER = `public class Main {
    public static void main(String[] args) {
        int[][] matriz = {
            {1, 2, 3, 4},
            {5, 6, 7, 8},
            {9, 10, 11, 12}
        };
        int total = 0;
        for (int i = 0; i < matriz.length; i++) {
            for (int j = 0; j < matriz[0].length; j++) {
                if (i == 0 || i == matriz.length - 1 || j == 0 || j == matriz[0].length - 1) {
                    total += matriz[i][j];
                }
            }
        }
        System.out.println("Suma del borde: " + total);
    }
}
`;

  pages['practica-libre'] = () => {
    const root = $('#page-root');
    let saved = null;
    try { saved = localStorage.getItem('cq-practica'); } catch {}
    root.innerHTML = `
      ${heading('// IDE · JAVA 21 LTS', 'Práctica Libre', 'Escribe y ejecuta Java real en el servidor local (java Main.java). Tu código se guarda automáticamente en este navegador.')}
      <div class="flex flex-col rounded bg-surface-container shadow-xl overflow-hidden">
        <div class="flex items-center justify-between bg-surface-container-low px-space-md py-2">
          <span class="px-3 py-1.5 rounded bg-surface-2 text-cyan font-label-sm text-label-sm font-bold flex items-center gap-1.5">
            <span class="material-symbols-outlined text-amber text-[16px]">coffee</span>Main.java</span>
          <div class="flex items-center gap-space-sm">
            <button id="pl-reset" class="px-space-md py-1.5 rounded bg-surface-2 hover:bg-surface-3 text-text-muted font-label-sm text-label-sm">Restaurar plantilla</button>
            <button id="pl-run" class="px-space-md py-1.5 rounded bg-cyan text-bg-void font-label-sm text-label-sm font-bold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">play_arrow</span><span>Ejecutar (Ctrl+Enter)</span></button>
          </div>
        </div>
        <textarea id="pl-code" spellcheck="false" class="w-full min-h-[420px] p-space-md bg-surface-container-lowest text-text-hi font-code-body text-code-body leading-6 outline-none resize-y"></textarea>
        <div class="bg-surface-1 p-space-md flex flex-col gap-2">
          <div class="flex items-center justify-between font-label-sm text-label-sm">
            <span class="text-text-muted uppercase">// CONSOLA DE SALIDA</span>
            <span id="pl-status" class="text-text-disabled">Listo</span>
          </div>
          <pre id="pl-out" class="min-h-[120px] p-3 rounded bg-surface-container font-code-body text-code-body text-text-body whitespace-pre-wrap"></pre>
        </div>
      </div>`;
    const code = $('#pl-code');
    code.value = saved || STARTER;
    const persist = () => { try { localStorage.setItem('cq-practica', code.value); } catch {} };
    code.addEventListener('input', persist);
    code.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        code.setRangeText('    ', code.selectionStart, code.selectionEnd, 'end');
        persist();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
    });
    $('#pl-reset').onclick = () => { code.value = STARTER; persist(); };
    const out = $('#pl-out');
    const status = $('#pl-status');
    async function run() {
      status.textContent = 'Compilando y ejecutando...';
      status.className = 'text-amber';
      out.textContent = '';
      try {
        const r = await api('/api/run', { body: { code: code.value } });
        out.textContent = (r.stdout || '') + (r.stderr ? `\n${r.stderr}` : '') || '(sin salida)';
        status.textContent = `${r.ok ? '✓ OK' : '✗ Error'} · exit ${r.exitCode} · ${r.ms} ms`;
        status.className = r.ok ? 'text-green' : 'text-red';
      } catch (e) {
        out.textContent = e.message;
        status.textContent = 'Error';
        status.className = 'text-red';
      }
    }
    $('#pl-run').onclick = run;
  };

  pages.logros = (user) => {
    const badges = [
      ['all_inclusive', 'Bucles de Precisión', 'Cero bucles infinitos en 20 envíos', 'cyan', true],
      ['timer', 'Eficiencia Temporal', 'Ejecución sub-15ms en 5 matrices', 'amber', true],
      ['workspace_premium', 'Pionero UDP 2025', 'Completaste la calibración inicial', 'violet', user.onboarded],
      ['grid_4x4', 'Explorador de Matrices II', 'Completa LVL-047', 'green', user.completedLevels.includes(47)],
      ['local_fire_department', 'Racha de 7 días', 'Estudia 7 días seguidos', 'amber', user.streak >= 7],
      ['emoji_events', 'Checkpoint 50', 'Aprueba el examen de fin de Acto II', 'violet', user.level > 50],
    ];
    const pct = user.xpGoal ? Math.round((user.xp / user.xpGoal) * 100) : 0;
    $('#page-root').innerHTML = `
      ${heading('// PROGRESIÓN', 'Logros & Rangos')}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-gutter-md">
        ${[['NIVEL', `${user.level} / 150`, 'cyan'], ['EXPERIENCIA', `${fmt(user.xp)} XP`, 'amber'],
          ['RESUELTAS', user.solved, 'green'], ['RACHA', `${user.streak} días`, 'amber']]
          .map(([k, v, c]) => card(`<div class="font-label-sm text-label-sm text-text-muted">// ${k}</div><div class="font-headline-lg text-headline-lg text-${c} mt-1">${v}</div>`)).join('')}
      </div>
      ${card(`<div class="flex justify-between font-label-sm text-label-sm mb-2"><span class="text-text-muted">// PROGRESO AL SIGUIENTE RANGO</span><span class="text-amber font-bold">${pct}%</span></div>
        <div class="w-full h-2 rounded bg-surface-3 overflow-hidden"><div class="h-full bg-amber" style="width:${pct}%"></div></div>`)}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-gutter-md">
        ${badges.map(([icon, name, desc, c, got]) => card(`
          <div class="flex flex-col items-center text-center gap-2 ${got ? '' : 'opacity-40'}">
            <div class="w-14 h-14 rounded-full bg-${c}/10 flex items-center justify-center text-${c}"><span class="material-symbols-outlined text-[28px]">${got ? icon : 'lock'}</span></div>
            <span class="font-label-md text-label-md text-text-hi font-bold">${name}</span>
            <span class="font-body-sm text-body-sm text-text-muted">${desc}</span>
          </div>`)).join('')}
      </div>`;
  };

  pages['banco-ejercicios'] = async (user) => {
    const root = $('#page-root');
    const teacher = user.role === 'teacher';
    async function render() {
      const { exercises } = await api('/api/exercises');
      root.innerHTML = `
        <div class="flex flex-wrap items-end justify-between gap-space-md">
          ${heading('// BANCO JAVA', 'Banco de Ejercicios', `${exercises.length} ejercicios ${teacher ? 'en total' : 'publicados'}.`)}
          ${teacher ? `<a href="${path('/generador-ia')}" class="px-space-lg py-2.5 rounded bg-cyan text-bg-void font-label-md text-label-md font-bold flex items-center gap-2"><span class="material-symbols-outlined text-[20px]">psychology</span>+ CREAR CON IA</a>` : ''}
        </div>
        <div class="flex flex-col gap-space-sm">
          ${exercises.length ? exercises.map((e) => card(`
            <div class="flex flex-wrap items-start justify-between gap-space-md">
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-2 font-label-sm text-label-sm">
                  <span class="px-2 py-0.5 rounded bg-surface-3 text-cyan">${esc(e.id)}</span>
                  <span class="px-2 py-0.5 rounded ${e.status === 'publicado' ? 'bg-green/15 text-green' : 'bg-amber/15 text-amber'} uppercase">${esc(e.status)}</span>
                  ${e.difficulty ? `<span class="text-text-muted">${esc(e.difficulty)}</span>` : ''}
                </div>
                <h3 class="font-headline-sm text-headline-sm text-text-hi">${esc(e.title)}</h3>
                <p class="font-body-sm text-body-sm text-text-muted line-clamp-2">${esc(e.statement)}</p>
                <span class="font-label-sm text-[10px] text-text-disabled">${esc(e.course)} · ${esc(e.section)} · por ${esc(e.author)} · ${new Date(e.createdAt).toLocaleDateString('es-CL')}</span>
              </div>
              <div class="flex gap-2">
                <a href="${path('/practica-libre')}" class="px-3 py-1.5 rounded bg-surface-2 hover:bg-surface-3 text-cyan font-label-sm text-label-sm">Resolver</a>
                ${teacher ? `<button data-del="${esc(e.id)}" class="px-3 py-1.5 rounded bg-surface-2 hover:bg-surface-3 text-red font-label-sm text-label-sm">Eliminar</button>` : ''}
              </div>
            </div>`, 'p-space-md')).join('') : card('<p class="text-text-muted">Aún no hay ejercicios.</p>')}
        </div>`;
      $$('[data-del]', root).forEach((b) => {
        b.onclick = async () => {
          if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = '¿Confirmar?'; return; }
          await api(`/api/exercises/${b.dataset.del}`, { method: 'DELETE' });
          toast('Ejercicio eliminado.');
          render();
        };
      });
    }
    render();
  };

  pages.rubricas = async () => {
    const stats = await api('/api/stats');
    const criteria = [
      ['Correctitud (tests JUnit)', 50, 'green'], ['Calidad de código / POO', 20, 'violet'],
      ['Eficiencia algorítmica', 15, 'amber'], ['Documentación y estilo', 10, 'cyan'], ['Integridad (MOSS)', 5, 'red'],
    ];
    $('#page-root').innerHTML = `
      ${heading('// EVALUACIÓN', 'Rúbricas & Analítica', 'Ponderación por defecto aplicada a los ejercicios del banco INF-204.')}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-gutter-md">
        ${[['ESTUDIANTES', stats.students], ['EJERCICIOS', stats.exercises], ['PUBLICADOS', stats.published], ['ENTREGAS', stats.submissions]]
          .map(([k, v]) => card(`<div class="font-label-sm text-label-sm text-text-muted">// ${k}</div><div class="font-headline-lg text-headline-lg text-text-hi mt-1">${v}</div>`)).join('')}
      </div>
      ${card(`<div class="flex flex-col gap-3">${criteria.map(([n, w, c]) => `
        <div><div class="flex justify-between font-label-md text-label-md mb-1"><span class="text-text-hi">${n}</span><span class="text-${c}">${w}%</span></div>
        <div class="w-full h-2 rounded bg-surface-3 overflow-hidden"><div class="h-full bg-${c}" style="width:${w * 2}%"></div></div></div>`).join('')}</div>`)}`;
  };

  pages.documentacion = () => {
    $('#page-root').innerHTML = `
      ${heading('// DOCS', 'Documentación Técnica')}
      ${card(`<div class="flex flex-col gap-3 font-body-md text-body-md text-text-body">
        <p><span class="text-cyan font-code-body">Java runtime:</span> OpenJDK 21 LTS. Los programas se ejecutan con <code class="text-amber">java Main.java</code> (límite 10 s, 256 MB).</p>
        <p><span class="text-cyan font-code-body">Campaña:</span> 150 niveles en 6 actos. Cada misión aprobada otorga XP con el multiplicador de racha (x1.25).</p>
        <p><span class="text-cyan font-code-body">Integridad:</span> las entregas se analizan con árboles de sintaxis abstracta y MOSS.</p>
        <p><span class="text-cyan font-code-body">Soporte:</span> soporte.tics@udp.cl</p>
      </div>`)}`;
  };

  // ------------------------------------------------------------ arranque
  async function init() {
    if (STATIC) {
      const to = await STATIC.guard(PAGE);
      if (to) return go(to);
    }
    if (PAGE === 'login') return pages.login();
    let user;
    try {
      ({ user } = await api('/api/me'));
    } catch { return; }
    wireShell(user);
    await pages[PAGE]?.(user);
  }
  init();
})();
