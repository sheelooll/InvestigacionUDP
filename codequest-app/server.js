// CodeQuest UDP — servidor local sin dependencias (Node >= 18)
// Uso: node server.js   →   http://localhost:3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// ---------------------------------------------------------------- base de datos (JSON)
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 32);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

function seed() {
  return {
    users: [
      {
        id: 'u-alex', email: 'alex.montero@mail.udp.cl', rut: '20.884.103-K',
        name: 'Alex Montero', handle: 'AlexM_Dev', role: 'student', section: 'INF-204-2',
        password: hashPassword('codequest'), onboarded: false,
        level: 47, xp: 2340, xpGoal: 3000, streak: 6, solved: 142, completedLevels: [],
        profile: {},
      },
      {
        id: 'u-docente', email: 'profesor@udp.cl', rut: '12.345.678-9',
        name: 'Prof. Rocío Valdés', handle: 'r.valdes', role: 'teacher', section: 'INF-204',
        password: hashPassword('codequest'), onboarded: true,
        level: 0, xp: 0, xpGoal: 0, streak: 0, solved: 0, completedLevels: [], profile: {},
      },
    ],
    sessions: {},
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

function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    const db = seed();
    saveDb(db);
    return db;
  }
}
function saveDb(d) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));
}
let db = loadDb();

const publicUser = (u) => {
  const { password, ...rest } = u;
  return rest;
};

// ---------------------------------------------------------------- helpers HTTP
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}
function json(res, status, data, headers = {}) {
  send(res, status, JSON.stringify(data), { 'Content-Type': MIME['.json'], ...headers });
}
function redirect(res, to) {
  send(res, 302, '', { Location: to });
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '').split(';').filter(Boolean).map((c) => {
      const i = c.indexOf('=');
      return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
    }),
  );
}
function currentUser(req) {
  const sid = parseCookies(req).cq_sid;
  const uid = sid && db.sessions[sid];
  return uid ? db.users.find((u) => u.id === uid) : null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(24).toString('hex');
  db.sessions[sid] = user.id;
  saveDb(db);
  return { 'Set-Cookie': `cq_sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}` };
}
function homeFor(user) {
  if (user.role === 'teacher') return '/panel-docente';
  return user.onboarded ? '/dashboard' : '/bienvenida';
}

// ---------------------------------------------------------------- ejecución Java (Práctica Libre)
function runJava(code) {
  return new Promise((resolve) => {
    const match = code.match(/public\s+(?:final\s+)?class\s+([A-Za-z_]\w*)/);
    const className = match ? match[1] : 'Main';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codequest-'));
    const file = path.join(dir, `${className}.java`);
    fs.writeFileSync(file, code);
    const started = Date.now();
    const child = spawn('java', ['-Xmx256m', file], { cwd: dir });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 10000);
    child.stdout.on('data', (d) => { if (stdout.length < 50000) stdout += d; });
    child.stderr.on('data', (d) => { if (stderr.length < 50000) stderr += d; });
    const finish = (exitCode, error) => {
      clearTimeout(timer);
      fs.rmSync(dir, { recursive: true, force: true });
      resolve({
        ok: !error && exitCode === 0 && !timedOut,
        exitCode, stdout,
        stderr: error ? `No se pudo ejecutar Java: ${error.message}` : timedOut ? `${stderr}\n[Tiempo límite de 10s excedido]` : stderr,
        ms: Date.now() - started,
      });
    };
    child.on('error', (e) => finish(-1, e));
    child.on('close', (c) => finish(c));
  });
}

// ---------------------------------------------------------------- rutas de páginas
const PAGES = {
  '/login': { file: 'login.html', auth: false },
  '/bienvenida': { file: 'bienvenida.html', auth: 'student' },
  '/dashboard': { file: 'dashboard.html', auth: 'student' },
  '/camino': { file: 'camino.html', auth: 'student' },
  '/practica-libre': { file: 'practica-libre.html', auth: 'any' },
  '/logros': { file: 'logros.html', auth: 'student' },
  '/panel-docente': { file: 'panel-docente.html', auth: 'teacher' },
  '/generador-ia': { file: 'generador-ia.html', auth: 'teacher' },
  '/banco-ejercicios': { file: 'banco-ejercicios.html', auth: 'any' },
  '/rubricas': { file: 'rubricas.html', auth: 'teacher' },
  '/documentacion': { file: 'documentacion.html', auth: 'any' },
};

// Los docentes pueden previsualizar las vistas de estudiante; los estudiantes no entran a las de docente.
function canAccess(user, rule) {
  if (rule === false) return true;
  if (!user) return false;
  if (rule === 'teacher') return user.role === 'teacher';
  return true;
}

// ---------------------------------------------------------------- API
async function api(req, res, url) {
  const user = currentUser(req);
  const route = `${req.method} ${url.pathname}`;
  const needAuth = () => { json(res, 401, { error: 'No autenticado' }); };

  switch (route) {
    case 'POST /api/login': {
      const { identity = '', password = '', role = 'student' } = await readBody(req);
      const id = identity.trim().toLowerCase();
      if (!id || !password) return json(res, 400, { error: 'Ingresa tu correo/RUT y contraseña.' });
      let u = db.users.find((x) => x.email === id || x.rut.toLowerCase() === id);
      if (u) {
        if (!checkPassword(password, u.password)) return json(res, 401, { error: 'Credenciales inválidas.' });
      } else {
        // Registro automático para correos institucionales nuevos
        if (!/@(mail\.)?udp\.cl$/.test(id)) {
          return json(res, 401, { error: 'Usuario no encontrado. Usa un correo @mail.udp.cl o @udp.cl para registrarte.' });
        }
        const local = id.split('@')[0];
        const name = local.split(/[._]/).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ');
        u = {
          id: `u-${crypto.randomBytes(6).toString('hex')}`, email: id, rut: '',
          name, handle: local, role: role === 'faculty' ? 'teacher' : 'student', section: 'INF-204',
          password: hashPassword(password), onboarded: role === 'faculty',
          level: 1, xp: 0, xpGoal: 3000, streak: 0, solved: 0, completedLevels: [], profile: {},
        };
        db.users.push(u);
      }
      const headers = startSession(res, u);
      return json(res, 200, { user: publicUser(u), redirect: homeFor(u) }, headers);
    }
    case 'POST /api/guest': {
      let u = db.users.find((x) => x.id === 'u-guest');
      if (!u) {
        u = {
          id: 'u-guest', email: 'invitado@sandbox', rut: '', name: 'Invitado', handle: 'invitado',
          role: 'student', section: 'SANDBOX', password: hashPassword(crypto.randomUUID()), onboarded: true,
          level: 1, xp: 0, xpGoal: 3000, streak: 0, solved: 0, completedLevels: [], profile: {},
        };
        db.users.push(u);
      }
      const headers = startSession(res, u);
      return json(res, 200, { user: publicUser(u), redirect: '/practica-libre' }, headers);
    }
    case 'POST /api/logout': {
      const sid = parseCookies(req).cq_sid;
      if (sid) { delete db.sessions[sid]; saveDb(db); }
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'cq_sid=; Path=/; Max-Age=0' });
    }
    case 'GET /api/me':
      return user ? json(res, 200, { user: publicUser(user) }) : needAuth();

    case 'POST /api/onboarding': {
      if (!user) return needAuth();
      const body = await readBody(req);
      user.profile = { ...user.profile, ...body };
      if (!user.onboarded && body.javaLevel === 'previo') user.xp += 400;
      user.onboarded = true;
      saveDb(db);
      return json(res, 200, { user: publicUser(user) });
    }
    case 'POST /api/submit': {
      if (!user) return needAuth();
      const { level = user.level, xp = 0, title = '' } = await readBody(req);
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
      return json(res, 200, { user: publicUser(user), firstTime: first });
    }
    case 'POST /api/run': {
      if (!user) return needAuth();
      const { code = '' } = await readBody(req);
      if (!code.trim()) return json(res, 400, { error: 'No hay código para ejecutar.' });
      return json(res, 200, await runJava(code));
    }
    case 'GET /api/exercises':
      if (!user) return needAuth();
      return json(res, 200, {
        exercises: user.role === 'teacher' ? db.exercises : db.exercises.filter((e) => e.status === 'publicado'),
      });
    case 'POST /api/exercises': {
      if (!user) return needAuth();
      if (user.role !== 'teacher') return json(res, 403, { error: 'Solo docentes.' });
      const body = await readBody(req);
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
      return json(res, 201, { exercise: ex });
    }
    case 'GET /api/stats': {
      if (!user) return needAuth();
      const students = db.users.filter((u) => u.role === 'student');
      return json(res, 200, {
        students: students.length,
        exercises: db.exercises.length,
        published: db.exercises.filter((e) => e.status === 'publicado').length,
        submissions: db.submissions.length,
      });
    }
  }

  const del = url.pathname.match(/^\/api\/exercises\/([\w-]+)$/);
  if (del && req.method === 'DELETE') {
    if (!user) return needAuth();
    if (user.role !== 'teacher') return json(res, 403, { error: 'Solo docentes.' });
    db.exercises = db.exercises.filter((e) => e.id !== del[1]);
    saveDb(db);
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'Ruta no encontrada' });
}

// ---------------------------------------------------------------- servidor
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const u = currentUser(req);
      return redirect(res, u ? homeFor(u) : '/login');
    }

    const page = PAGES[url.pathname.replace(/\/$/, '')];
    if (page) {
      const u = currentUser(req);
      if (url.pathname === '/login' && u) return redirect(res, homeFor(u));
      if (!canAccess(u, page.auth)) return redirect(res, u ? homeFor(u) : '/login');
      return send(res, 200, fs.readFileSync(path.join(PUBLIC_DIR, page.file)), { 'Content-Type': MIME['.html'] });
    }

    // archivos estáticos (assets)
    const filePath = path.normalize(path.join(PUBLIC_DIR, url.pathname));
    if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return send(res, 200, fs.readFileSync(filePath), {
        'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      });
    }
    send(res, 404, 'No encontrado', { 'Content-Type': 'text/plain; charset=utf-8' });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'Error interno del servidor' });
  }
});

// Si el puerto está ocupado, prueba el siguiente
let port = PORT;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < PORT + 10) {
    console.log(`  Puerto ${port} ocupado, probando ${port + 1}...`);
    server.listen(++port, HOST);
  } else {
    console.error(err);
    process.exit(1);
  }
});
server.listen(port, HOST);
server.on('listening', () => {
  console.log(`\n  CodeQuest UDP corriendo en  http://localhost:${port}\n`);
  console.log('  Estudiante: alex.montero@mail.udp.cl / codequest');
  console.log('  Docente:    profesor@udp.cl / codequest\n');
});
