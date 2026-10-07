// CodeQuest UDP — modo estático (GitHub Pages): reemplaza la API de server.js dentro del navegador.
// Los datos (usuarios, sesión, XP, ejercicios) se guardan en localStorage de cada visitante.
(() => {
  const DB_KEY = 'cq-db';
  const SESSION_KEY = 'cq-session';

  // ---------------------------------------------------------------- almacenamiento
  const memory = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return memory[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { memory[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch { delete memory[k]; } },
  };

  const randomHex = (bytes) => [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

  async function hashPassword(password, salt = randomHex(16)) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`));
    const hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${salt}:${hash}`;
  }
  async function checkPassword(password, stored) {
    const [salt] = stored.split(':');
    return (await hashPassword(password, salt)) === stored;
  }

  async function seed() {
    const pw = await hashPassword('codequest');
    return {
      users: [
        {
          id: 'u-alex', email: 'alex.montero@mail.udp.cl', rut: '20.884.103-K',
          name: 'Alex Montero', handle: 'AlexM_Dev', role: 'student', section: 'INF-204-2',
          password: pw, onboarded: false,
          level: 47, xp: 2340, xpGoal: 3000, streak: 6, solved: 142, completedLevels: [],
          profile: {},
        },
        {
          id: 'u-docente', email: 'profesor@udp.cl', rut: '12.345.678-9',
          name: 'Prof. Rocío Valdés', handle: 'r.valdes', role: 'teacher', section: 'INF-204',
          password: pw, onboarded: true,
          level: 0, xp: 0, xpGoal: 0, streak: 0, solved: 0, completedLevels: [], profile: {},
        },
      ],
      exercises: [
        {
          id: 'EJ-POO-046', title: 'Transposición de Matrices 4x4', course: 'Programación Orientada a Objetos (INF-204)',
          section: 'Sección 2 - Campus Santiago', difficulty: 'Intermedio', status: 'publicado',
          statement: 'Transponer una matriz cuadrada in-place sin memoria auxiliar.', author: 'r.valdes',
          createdAt: '2025-04-02T14:00:00.000Z',
        },
        {
          id: 'EJ-POO-045', title: 'Filtro de Telemetría UDP', course: 'Programación Orientada a Objetos (INF-204)',
          section: 'Sección 1 - Campus Santiago', difficulty: 'Básico', status: 'publicado',
          statement: 'Parsear tramas de texto y descartar lecturas con ruido.', author: 'r.valdes',
          createdAt: '2025-03-28T14:00:00.000Z',
        },
      ],
      submissions: [],
    };
  }

  let dbPromise = null;
  function loadDb() {
    if (!dbPromise) {
      dbPromise = (async () => {
        try {
          const db = JSON.parse(store.get(DB_KEY));
          if (db && db.users) return db;
        } catch {}
        const db = await seed();
        saveDb(db);
        return db;
      })();
    }
    return dbPromise;
  }
  const saveDb = (db) => store.set(DB_KEY, JSON.stringify(db));

  const publicUser = (u) => {
    const { password, ...rest } = u;
    return rest;
  };
  const currentUser = (db) => {
    const uid = store.get(SESSION_KEY);
    return uid ? db.users.find((u) => u.id === uid) || null : null;
  };
  function homeFor(user) {
    if (user.role === 'teacher') return '/panel-docente';
    return user.onboarded ? '/dashboard' : '/bienvenida';
  }

  // ---------------------------------------------------------------- acceso a páginas (equivale a PAGES de server.js)
  const PAGE_AUTH = {
    login: false, bienvenida: 'student', dashboard: 'student', camino: 'student',
    'practica-libre': 'any', logros: 'student', 'panel-docente': 'teacher', 'generador-ia': 'teacher',
    'banco-ejercicios': 'any', rubricas: 'teacher', documentacion: 'any',
  };
  function canAccess(user, rule) {
    if (rule === false) return true;
    if (!user) return false;
    if (rule === 'teacher') return user.role === 'teacher';
    return true;
  }
  // Devuelve la ruta a la que hay que redirigir, o null si la página se puede mostrar.
  async function guard(page) {
    const user = currentUser(await loadDb());
    if (page === 'login') return user ? homeFor(user) : null;
    if (!(page in PAGE_AUTH)) return null;
    return canAccess(user, PAGE_AUTH[page]) ? null : user ? homeFor(user) : '/login';
  }

  // ---------------------------------------------------------------- API
  const ok = (data, status = 200) => ({ status, data });
  const fail = (status, error) => ({ status, data: { error } });

  async function handle(method, url, body = {}) {
    const db = await loadDb();
    const user = currentUser(db);
    const needAuth = () => fail(401, 'No autenticado');

    switch (`${method} ${url}`) {
      case 'POST /api/login': {
        const { identity = '', password = '', role = 'student' } = body;
        const id = identity.trim().toLowerCase();
        if (!id || !password) return fail(400, 'Ingresa tu correo/RUT y contraseña.');
        let u = db.users.find((x) => x.email === id || x.rut.toLowerCase() === id);
        if (u) {
          if (!(await checkPassword(password, u.password))) return fail(401, 'Credenciales inválidas.');
        } else {
          // Registro automático para correos institucionales nuevos
          if (!/@(mail\.)?udp\.cl$/.test(id)) {
            return fail(401, 'Usuario no encontrado. Usa un correo @mail.udp.cl o @udp.cl para registrarte.');
          }
          const local = id.split('@')[0];
          const name = local.split(/[._]/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ');
          u = {
            id: `u-${randomHex(6)}`, email: id, rut: '',
            name, handle: local, role: role === 'faculty' ? 'teacher' : 'student', section: 'INF-204',
            password: await hashPassword(password), onboarded: role === 'faculty',
            level: 1, xp: 0, xpGoal: 3000, streak: 0, solved: 0, completedLevels: [], profile: {},
          };
          db.users.push(u);
          saveDb(db);
        }
        store.set(SESSION_KEY, u.id);
        return ok({ user: publicUser(u), redirect: homeFor(u) });
      }
      case 'POST /api/guest': {
        let u = db.users.find((x) => x.id === 'u-guest');
        if (!u) {
          u = {
            id: 'u-guest', email: 'invitado@sandbox', rut: '', name: 'Invitado', handle: 'invitado',
            role: 'student', section: 'SANDBOX', password: await hashPassword(randomHex(16)), onboarded: true,
            level: 1, xp: 0, xpGoal: 3000, streak: 0, solved: 0, completedLevels: [], profile: {},
          };
          db.users.push(u);
          saveDb(db);
        }
        store.set(SESSION_KEY, u.id);
        return ok({ user: publicUser(u), redirect: '/practica-libre' });
      }
      case 'POST /api/logout':
        store.del(SESSION_KEY);
        return ok({ ok: true });

      case 'GET /api/me':
        return user ? ok({ user: publicUser(user) }) : needAuth();

      case 'POST /api/onboarding': {
        if (!user) return needAuth();
        user.profile = { ...user.profile, ...body };
        if (!user.onboarded && body.javaLevel === 'previo') user.xp += 400;
        user.onboarded = true;
        saveDb(db);
        return ok({ user: publicUser(user) });
      }
      case 'POST /api/submit': {
        if (!user) return needAuth();
        const { level = user.level, xp = 0, title = '' } = body;
        const first = !user.completedLevels.includes(level);
        if (first) {
          user.completedLevels.push(level);
          user.xp += Math.round(Number(xp) * 1.25); // multiplicador de racha x1.25
          user.solved += 1;
          if (level === user.level) user.level += 1;
          while (user.xpGoal && user.xp >= user.xpGoal) { user.xp -= user.xpGoal; }
        }
        db.submissions.push({ userId: user.id, level, title, at: new Date().toISOString() });
        saveDb(db);
        return ok({ user: publicUser(user), firstTime: first });
      }
      case 'POST /api/run':
        if (!user) return needAuth();
        return ok({
          ok: false, exitCode: -1, stdout: '', ms: 0,
          stderr: 'Esta es la versión de demostración publicada en GitHub Pages, que no tiene servidor.\n'
            + 'Para compilar y ejecutar Java, corre la app localmente con "npm start" (requiere JDK 11+).',
        });

      case 'GET /api/exercises':
        if (!user) return needAuth();
        return ok({
          exercises: user.role === 'teacher' ? db.exercises : db.exercises.filter((e) => e.status === 'publicado'),
        });
      case 'POST /api/exercises': {
        if (!user) return needAuth();
        if (user.role !== 'teacher') return fail(403, 'Solo docentes.');
        const ex = {
          id: `EJ-POO-${String(47 + db.exercises.length).padStart(3, '0')}`,
          title: String(body.title || 'Ejercicio sin título').slice(0, 200),
          course: body.course || '', section: body.section || '', difficulty: body.difficulty || '',
          statement: String(body.statement || '').slice(0, 5000),
          status: body.status === 'borrador' ? 'borrador' : 'publicado',
          author: user.handle, createdAt: new Date().toISOString(),
        };
        db.exercises.unshift(ex);
        saveDb(db);
        return ok({ exercise: ex }, 201);
      }
      case 'GET /api/stats': {
        if (!user) return needAuth();
        return ok({
          students: db.users.filter((u) => u.role === 'student').length,
          exercises: db.exercises.length,
          published: db.exercises.filter((e) => e.status === 'publicado').length,
          submissions: db.submissions.length,
        });
      }
    }

    const del = url.match(/^\/api\/exercises\/([\w-]+)$/);
    if (del && method === 'DELETE') {
      if (!user) return needAuth();
      if (user.role !== 'teacher') return fail(403, 'Solo docentes.');
      db.exercises = db.exercises.filter((e) => e.id !== del[1]);
      saveDb(db);
      return ok({ ok: true });
    }
    return fail(404, 'Ruta no encontrada');
  }

  window.CQ_STATIC_API = { handle, guard };
})();
