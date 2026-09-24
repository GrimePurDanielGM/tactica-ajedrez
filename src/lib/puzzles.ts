import raw from '../data/puzzles.json'

export interface Puzzle {
  id: string
  fen: string        // posición ANTES de la jugada del rival
  moves: string[]    // moves[0] la juega el rival automáticamente; luego alterna
  rating: number
  themes: string[]
}

interface RawData { themes: string[]; puzzles: [string, string, string, number, number[]][] }
const data = raw as RawData

export const PUZZLES: Puzzle[] = data.puzzles.map(([id, fen, moves, rating, t]) => ({
  id, fen, moves: moves.split(' '), rating, themes: t.map(i => data.themes[i]),
}))
export const PUZZLE_BY_ID = new Map(PUZZLES.map(p => [p.id, p]))

/** Habilidades del plan de estudio, en orden de desbloqueo. */
export interface Skill {
  key: string           // tema Lichess
  name: string
  short: string         // explicación de una línea
  tier: number          // bloque del currículo (1 = base)
  unlockAt?: number     // rating global mínimo para desbloquear (opcional)
}

export const SKILLS: Skill[] = [
  // Bloque 1 — fundamentos
  { key: 'mateIn1', name: 'Mate en 1', short: 'Ver el mate inmediato sin dudar.', tier: 1 },
  { key: 'hangingPiece', name: 'Pieza colgada', short: 'Detectar piezas sin defensa y capturarlas.', tier: 1 },
  { key: 'fork', name: 'Horquilla', short: 'Una pieza ataca dos objetivos a la vez.', tier: 1 },
  { key: 'backRankMate', name: 'Mate de pasillo', short: 'El rey encerrado por sus propios peones.', tier: 1 },
  { key: 'pin', name: 'Clavada', short: 'Inmovilizar una pieza que protege a otra más valiosa.', tier: 1 },
  // Bloque 2 — motivos tácticos
  { key: 'skewer', name: 'Enfilada', short: 'Atacar en línea: la pieza valiosa delante, la débil detrás.', tier: 2 },
  { key: 'discoveredAttack', name: 'Ataque descubierto', short: 'Mover una pieza destapa el ataque de otra.', tier: 2 },
  { key: 'mateIn2', name: 'Mate en 2', short: 'Calcular dos jugadas propias con respuesta forzada.', tier: 2 },
  { key: 'trappedPiece', name: 'Pieza atrapada', short: 'Cortar todas las casillas de escape.', tier: 2 },
  { key: 'advancedPawn', name: 'Peón avanzado', short: 'Explotar la amenaza de coronar.', tier: 2 },
  { key: 'attackingF2F7', name: 'Ataque a f2/f7', short: 'El punto débil junto al rey sin enrocar.', tier: 2 },
  // Bloque 3 — táctica combinada
  { key: 'deflection', name: 'Desviación', short: 'Obligar a un defensor a abandonar su puesto.', tier: 3 },
  { key: 'attraction', name: 'Atracción', short: 'Atraer una pieza (a menudo el rey) a una casilla fatal.', tier: 3 },
  { key: 'capturingDefender', name: 'Eliminar al defensor', short: 'Quitar la pieza que sostiene la posición.', tier: 3 },
  { key: 'sacrifice', name: 'Sacrificio', short: 'Entregar material por una ganancia mayor.', tier: 3 },
  { key: 'doubleCheck', name: 'Jaque doble', short: 'El rey debe moverse: dos atacantes a la vez.', tier: 3 },
  { key: 'promotion', name: 'Coronación', short: 'Forzar la promoción del peón.', tier: 3 },
  { key: 'exposedKing', name: 'Rey expuesto', short: 'Castigar al rey sin refugio.', tier: 3 },
  // Bloque 4 — cálculo y defensa
  { key: 'intermezzo', name: 'Jugada intermedia', short: 'Antes de recapturar, meter una amenaza mayor.', tier: 4 },
  { key: 'defensiveMove', name: 'Defensa precisa', short: 'La única jugada que aguanta la posición.', tier: 4 },
  { key: 'quietMove', name: 'Jugada tranquila', short: 'Sin jaque ni captura, pero decisiva.', tier: 4 },
  { key: 'mateIn3', name: 'Mate en 3', short: 'Cálculo profundo con respuestas forzadas.', tier: 4 },
  { key: 'xRayAttack', name: 'Rayos X', short: 'Atacar a través de una pieza.', tier: 4 },
  { key: 'clearance', name: 'Despeje', short: 'Vaciar una casilla o línea para otra pieza.', tier: 4 },
  { key: 'interference', name: 'Interferencia', short: 'Cortar la coordinación entre piezas rivales.', tier: 4 },
  { key: 'zugzwang', name: 'Zugzwang', short: 'Cualquier jugada del rival empeora su posición.', tier: 4 },
  { key: 'kingsideAttack', name: 'Ataque al enroque', short: 'Combinaciones sobre el flanco de rey.', tier: 4 },
  // Bloque 5 — finales tácticos
  { key: 'pawnEndgame', name: 'Final de peones', short: 'Oposición, cuadrado, peón pasado.', tier: 5 },
  { key: 'rookEndgame', name: 'Final de torres', short: 'Actividad de la torre y del rey.', tier: 5 },
  { key: 'queenEndgame', name: 'Final de damas', short: 'Jaques perpetuos y coronaciones.', tier: 5 },
  { key: 'bishopEndgame', name: 'Final de alfiles', short: 'Alfil bueno/malo y peones fijos.', tier: 5 },
  { key: 'knightEndgame', name: 'Final de caballos', short: 'Horquillas y peones alejados.', tier: 5 },
  // Bloque 6 — mates típicos
  { key: 'smotheredMate', name: 'Mate de la coz', short: 'Caballo contra rey ahogado por sus piezas.', tier: 6 },
  { key: 'arabianMate', name: 'Mate árabe', short: 'Torre y caballo en la esquina.', tier: 6 },
  { key: 'anastasiaMate', name: 'Mate de Anastasia', short: 'Caballo + torre en la columna h.', tier: 6 },
  { key: 'hookMate', name: 'Mate del gancho', short: 'Torre, caballo y peón coordinados.', tier: 6 },
  { key: 'bodenMate', name: 'Mate de Boden', short: 'Dos alfiles en diagonales cruzadas.', tier: 6 },
  { key: 'doubleBishopMate', name: 'Mate de dos alfiles', short: 'Alfiles en diagonales paralelas.', tier: 6 },
  { key: 'dovetailMate', name: 'Mate de cola de milano', short: 'Dama junto al rey, escapes bloqueados.', tier: 6 },
]
export const SKILL_BY_KEY = new Map(SKILLS.map(s => [s.key, s]))
export const TIER_NAMES: Record<number, string> = {
  1: 'Fundamentos', 2: 'Motivos tácticos', 3: 'Táctica combinada',
  4: 'Cálculo y defensa', 5: 'Finales tácticos', 6: 'Mates típicos',
}

const puzzlesByTheme = new Map<string, Puzzle[]>()
for (const p of PUZZLES) for (const t of p.themes) {
  if (!puzzlesByTheme.has(t)) puzzlesByTheme.set(t, [])
  puzzlesByTheme.get(t)!.push(p)
}
export const puzzlesForTheme = (t: string): Puzzle[] => puzzlesByTheme.get(t) ?? []

/** Nombres en castellano de todos los temas Lichess (para mostrar etiquetas). */
export const THEME_LABEL: Record<string, string> = {
  advancedPawn: 'peón avanzado', advantage: 'ventaja', anastasiaMate: 'mate de Anastasia', arabianMate: 'mate árabe',
  attackingF2F7: 'ataque a f2/f7', attraction: 'atracción', backRankMate: 'mate de pasillo', bishopEndgame: 'final de alfiles',
  bodenMate: 'mate de Boden', capturingDefender: 'eliminar defensor', castling: 'enroque', clearance: 'despeje',
  crushing: 'aplastante', defensiveMove: 'defensa', deflection: 'desviación', discoveredAttack: 'descubierta',
  doubleBishopMate: 'mate de dos alfiles', doubleCheck: 'jaque doble', dovetailMate: 'cola de milano', endgame: 'final',
  enPassant: 'al paso', equality: 'igualar', exposedKing: 'rey expuesto', fork: 'horquilla', hangingPiece: 'pieza colgada',
  hookMate: 'mate del gancho', interference: 'interferencia', intermezzo: 'intermedia', kingsideAttack: 'ataque flanco rey',
  knightEndgame: 'final de caballos', long: 'larga', master: 'partida de maestro', masterVsMaster: 'maestros',
  mate: 'mate', mateIn1: 'mate en 1', mateIn2: 'mate en 2', mateIn3: 'mate en 3', mateIn4: 'mate en 4', mateIn5: 'mate en 5+',
  middlegame: 'medio juego', oneMove: 'una jugada', opening: 'apertura', pawnEndgame: 'final de peones', pin: 'clavada',
  promotion: 'coronación', queenEndgame: 'final de damas', queenRookEndgame: 'final dama+torre', queensideAttack: 'ataque flanco dama',
  quietMove: 'jugada tranquila', rookEndgame: 'final de torres', sacrifice: 'sacrificio', short: 'corta', skewer: 'enfilada',
  smotheredMate: 'mate de la coz', superGM: 'súper GM', trappedPiece: 'pieza atrapada', underPromotion: 'subpromoción',
  veryLong: 'muy larga', xRayAttack: 'rayos X', zugzwang: 'zugzwang', killBoxMate: 'mate de la caja', vukovicMate: 'mate de Vukovic',
}
export const themeLabel = (t: string) => THEME_LABEL[t] ?? t
