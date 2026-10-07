# CodeQuest UDP — versión local

Servidor Node sin dependencias que sirve las pantallas de Stitch conectadas entre sí.

## Ejecutar
```bash
cd codequest-app
npm start          # o: node server.js
```
Abrir http://localhost:3000

| Rol        | Usuario                    | Clave      |
|------------|----------------------------|------------|
| Estudiante | alex.montero@mail.udp.cl   | codequest  |
| Docente    | profesor@udp.cl            | codequest  |

Cualquier correo nuevo `@mail.udp.cl` / `@udp.cl` se registra automáticamente con la clave que ingreses.

## Flujo
- **Login** → un estudiante nuevo va a **Bienvenida** → **El Camino** / **Dashboard**; el docente va a **Panel Docente**.
- **Dashboard**: "Enviar Solución" suma XP real (se guarda en `data/db.json`).
- **Práctica Libre**: ejecuta Java de verdad (`java Main.java`, requiere JDK 11+).
- **Generador IA** (docente): publica/guarda ejercicios → aparecen en **Banco de Ejercicios**.
- **Panel Docente**: búsqueda en la tabla y exportación CSV.

## Scripts
- `npm run dev` — reinicia el servidor al guardar cambios.
- `npm run build` — regenera `public/*.html` desde `../stitch_codequest_learning_platform_ui` (si vuelves a exportar desde Stitch).
- `npm run reset-db` — borra los datos y vuelve a los usuarios demo.
