# Táctica — entrenador de ajedrez (PWA)

App personal de Daniel (usuario no programador; TODO en español: conversación, UI, docs) para mejorar en ajedrez con ejercicios estructurados. Nació en una conversación de claude.ai y se trasladó a este Mac el 25/09/2026. El README explica módulos, reglas de progreso y estructura; aquí van solo las cosas que no se deducen del código.

## Reglas del proyecto
- Stack: Vite 8 + React 19 + TypeScript 6, `chess.js` (reglas), `react-chessboard` 5 (tablero), Dexie (IndexedDB), Stockfish 19 lite **single-thread** en `public/engine/` (no necesita SharedArrayBuffer ni cabeceras COOP/COEP → funciona en GitHub Pages). No añadir dependencias sin motivo.
- `base: './'` en Vite: la app se sirve desde una subcarpeta (GitHub Pages). Cualquier ruta a recursos debe ser relativa (`import.meta.env.BASE_URL`).
- Todo el progreso vive en el iPhone (IndexedDB, base `ajedrez-trainer`). Si se cambia el esquema de Dexie, subir `version()` y migrar; nunca borrar datos del usuario.
- Los puzzles (`src/data/puzzles.json`, 6.355, Lichess CC0) se regeneran con `scripts/build_puzzles.py` desde el CSV de Lichess; no editarlos a mano.

## Comandos
- `npm run dev -- --host` → desarrollo (http://localhost:5173; la URL de red sirve para probar en el iPhone por wifi).
- `npm run build` → `tsc -b && vite build` (genera `dist/` con service worker y manifest). `npm run preview -- --host` sirve `dist/` en 4173.
- `npm run lint` → oxlint (los avisos de `public/engine/*.js` son del fichero minificado de Stockfish: ignorar).
- Verificación: `npx tsx scripts/test_transform.ts` (todas las variantes espejo/colores legales + SRS), `node scripts/verify_endgames.mjs` (posiciones de finales con Stockfish), `node scripts/e2e.mjs` (Playwright móvil contra el preview en 4173; requiere `npm i -D playwright` + `npx playwright install chromium`, NO instalado aquí por espacio en disco).
- Claude Code: `.claude/launch.json` (ignorado por git) define los servidores `dev` (5173) y `preview` (4173) para el navegador interno.

## Despliegue
- GitHub Pages por GitHub Actions (`.github/workflows/deploy.yml`): cada push a `main` compila y publica. Repo público `GrimePurDanielGM/tactica-ajedrez` → URL https://grimepurdanielgm.github.io/tactica-ajedrez/ (HTTPS = requisito de iOS para que la PWA funcione offline).
- Instalación en el iPhone: abrir la URL en Safari → Compartir → "Añadir a pantalla de inicio". Las actualizaciones llegan solas (`registerType: 'autoUpdate'`) al reabrir la app.
- gh CLI autenticado como GrimePurDanielGM. OJO: el clasificador de permisos del modo auto de Claude Code bloquea `gh repo create` (crear una superficie pública): ese paso lo ejecuta Daniel a mano.
- Pages se activó el 25/09/2026 con `gh api -X POST repos/GrimePurDanielGM/tactica-ajedrez/pages -f build_type=workflow` (el GITHUB_TOKEN del workflow NO puede crear el sitio: `configure-pages` con `enablement: true` falla con "Resource not accessible by integration"). Con el sitio ya creado, el workflow normal basta.

## Lecciones
- `scripts/e2e.mjs` traía rutas absolutas del contenedor Linux original; ahora importa `playwright` del proyecto y guarda capturas en `e2e-shots/` (ignorado).
- El tablero aparece vacío unos cientos de ms al abrir un puzzle: es el tiempo que tarda Dexie en abrir la base la primera vez, no un fallo de render.
- En pruebas con el navegador interno: los clics en casillas funcionan (clic origen + clic destino); los `data-square` de react-chessboard sirven para localizar casillas.

## Estado
- v1 completa y verificada en el navegador interno el 25/09/2026: puzzles (acierto → XP/Elo/repaso programado), finales contra Stockfish (worker + wasm cargan y responden), aperturas, progreso.
- Pendiente v2 (ver README): posiciones críticas de medio juego, sincronización entre dispositivos, más líneas y drills.
