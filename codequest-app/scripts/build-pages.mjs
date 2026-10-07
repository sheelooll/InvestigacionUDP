// Genera ../docs/ — versión estática para GitHub Pages (sin servidor; datos en localStorage).
// Uso: npm run build:pages   (vuelve a ejecutarlo después de cambiar public/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const OUT = path.join(__dirname, '..', '..', 'docs');

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(PUBLIC, 'assets'), path.join(OUT, 'assets'), { recursive: true });

for (const file of fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html'))) {
  let html = fs.readFileSync(path.join(PUBLIC, file), 'utf8');
  // Pages publica bajo /<repo>/, así que las rutas absolutas pasan a ser relativas
  html = html.replaceAll('href="/assets/', 'href="assets/');
  html = html.replace('<script src="/assets/app.js"></script>',
    '<script src="assets/static-api.js"></script><script src="assets/app.js"></script>');
  fs.writeFileSync(path.join(OUT, file), html);
  console.log(`✓ docs/${file}`);
}

// La raíz redirige al login (que a su vez envía al inicio si ya hay sesión)
fs.writeFileSync(path.join(OUT, 'index.html'), `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>CodeQuest UDP</title>
<meta http-equiv="refresh" content="0; url=login.html"/>
<link rel="icon" href="assets/logo.svg" type="image/svg+xml"/></head>
<body><a href="login.html">Ir a CodeQuest UDP</a></body></html>
`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log('✓ docs/index.html');
