# Táctica — entrenador progresivo de ajedrez (PWA)

App personal para mejorar en ajedrez con ejercicios estructurados, no partidas sueltas.

## Qué hace

| Módulo | Cómo entrena |
|---|---|
| **Táctica** | 6.355 puzzles reales (base Lichess, CC0) organizados en 38 habilidades y 6 bloques. Cada habilidad tiene su propio nivel Elo; los ejercicios se eligen ±120 puntos alrededor de tu nivel. |
| **Repetición espaciada** | Cada puzzle es una "tarjeta" (SM-2 adaptado). Un fallo vuelve a los 8 min; un acierto a 1 → 3 → ×2,3 días. Al repetirse aparece **en espejo, con colores invertidos o ambos**, para fijar el patrón y no la posición. |
| **Finales** | 10 drills contra Stockfish (mate con dama/torre/dos alfiles, rey y peón, Lucena, Philidor). Objetivos medibles: mate en ≤ N, coronar, aguantar. El motor avisa si dejas escapar la ventaja. |
| **Aperturas** | 13 líneas (Italiana con blancas; Caro-Kann y Eslava con negras). Primera vez guiada con flecha, después de memoria, con repaso programado. |
| **Incentivos** | XP, niveles, racha diaria, objetivo diario configurable, medallas bronce/plata/oro por habilidad y desbloqueo progresivo de bloques. |

Todo se guarda **en el propio iPhone** (IndexedDB). Exporta/importa el progreso en JSON desde *Progreso → Ajustes*.

## Instalar en el iPhone

La app necesita servirse por **HTTPS** para funcionar offline (requisito de iOS para PWAs).

### A) GitHub Pages (la forma normal)
El repositorio `GrimePurDanielGM/tactica-ajedrez` publica automáticamente cada `push` a `main` mediante GitHub Actions (`.github/workflows/deploy.yml`) en:

**https://grimepurdanielgm.github.io/tactica-ajedrez/**

1. Abre esa URL en Safari del iPhone.
2. Botón Compartir → **Añadir a pantalla de inicio**.
3. A partir de ahí funciona sin conexión y a pantalla completa. Las actualizaciones se instalan solas al reabrir la app.

### B) Servida desde el Mac en la red local
```bash
npm install
npm run build
npm run preview -- --host   # muestra una URL http://192.168.x.x:4173
```
Abre esa URL en el iPhone y añádela a la pantalla de inicio. Funciona mientras el Mac esté encendido; al ser `http://`, iOS no activa el modo offline.

### C) Desarrollo
```bash
npm run dev -- --host
```

## Estructura

```
src/
  lib/puzzles.ts     catálogo de habilidades y carga de puzzles
  lib/transform.ts   variantes espejo / colores invertidos (validadas con chess.js)
  lib/srs.ts         repetición espaciada, Elo por habilidad, XP, desbloqueos, selección
  lib/db.ts          persistencia local (Dexie / IndexedDB), export/import
  lib/engine.ts      Stockfish 19 lite en Web Worker (UCI)
  data/puzzles.json  6.355 puzzles (generado por scripts/build_puzzles.py)
  data/endgames.ts   drills de finales (posiciones verificadas con scripts/verify_endgames.mjs)
  data/openings.ts   repertorio (líneas validadas con chess.js)
  components/        Board, PuzzleTrainer, EndgameDrill, OpeningTrainer
  screens/           Home, Skills, Endgames, Openings, Stats
scripts/
  build_puzzles.py       regenera el subconjunto de puzzles desde un CSV de Lichess
  verify_endgames.mjs    evalúa las posiciones de finales con Stockfish
  test_transform.ts      comprueba que todas las variantes son legales
  e2e.mjs                prueba de extremo a extremo con Playwright (móvil)
```

## Reglas de progreso

- **Nota por ejercicio**: 0 fallo (se vio la solución) · 1 con error o pista · 2 correcto · 3 correcto en < 20 s.
- **Elo de habilidad**: K = 40 los primeros 20 intentos, después 24. Nivel táctico global con K menor.
- **Medallas**: bronce 15 aciertos y nivel ≥ 850 · plata 45 y ≥ 1200 · oro 90 y ≥ 1500.
- **Bloques**: 1 y 2 abiertos; cada bloque siguiente se abre con tres bronces en el anterior. *Modo libre* en Ajustes lo desactiva.

## Pendiente (v2)

- Posiciones críticas de medio juego con explicación (requiere contenido curado a mano).
- Sincronización entre dispositivos / cuentas (el modelo de datos ya está separado por tablas para facilitarlo).
- Más líneas de repertorio y drills de finales (torre y peón, dama contra peón).

## Licencias

Puzzles: [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0). Motor: [Stockfish](https://stockfishchess.org) vía stockfish.js (GPLv3). Tablero: react-chessboard (MIT). Reglas: chess.js (BSD-2).
