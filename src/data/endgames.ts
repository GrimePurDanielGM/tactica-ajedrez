export type DrillGoal = 'mate' | 'promote' | 'hold'

export interface EndgameDrill {
  id: string
  title: string
  group: string
  fen: string
  player: 'w' | 'b'
  goal: DrillGoal
  maxMoves: number          // jugadas propias disponibles (mate/promote) o a sobrevivir (hold)
  tip: string               // idea clave, sin desvelar la jugada
  level: 1 | 2 | 3
}

/* Todas las posiciones se han comprobado con Stockfish (scripts/verify_endgames.mjs):
   las de ganar evalúan como ventaja decisiva/mate y las de "aguantar" como 0.00. */
export const ENDGAME_DRILLS: EndgameDrill[] = [
  {
    id: 'kq-mate', title: 'Mate con dama', group: 'Mates elementales', level: 1,
    fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', player: 'w', goal: 'mate', maxMoves: 12,
    tip: 'Encierra al rey con la dama a salto de caballo, acerca tu rey y remata en el borde. Cuidado con el ahogado.',
  },
  {
    id: 'kr-mate', title: 'Mate con torre', group: 'Mates elementales', level: 1,
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', player: 'w', goal: 'mate', maxMoves: 20,
    tip: 'Corta filas con la torre, usa el rey en oposición y da jaque solo cuando el rey rival retrocede.',
  },
  {
    id: 'kbb-mate', title: 'Mate con dos alfiles', group: 'Mates elementales', level: 3,
    fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', player: 'w', goal: 'mate', maxMoves: 35,
    tip: 'Los alfiles en diagonales contiguas forman una pared; empuja al rey a una esquina con ayuda de tu rey.',
  },
  {
    id: 'kpk-front', title: 'Rey delante del peón', group: 'Finales de peones', level: 1,
    fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', player: 'w', goal: 'promote', maxMoves: 10,
    tip: 'Con el rey en sexta delante del peón se gana siempre: avanza el rey en diagonal, no el peón.',
  },
  {
    id: 'kpk-tempo', title: 'Ganar la oposición con el peón', group: 'Finales de peones', level: 2,
    fen: '8/8/3k4/8/3K4/8/3P4/8 w - - 0 1', player: 'w', goal: 'promote', maxMoves: 16,
    tip: 'El rival tiene la oposición. Pierde un tiempo con el peón para arrebatársela.',
  },
  {
    id: 'kpk-side', title: 'Rey a un lado', group: 'Finales de peones', level: 2,
    fen: '8/8/8/3k4/8/2K5/3P4/8 w - - 0 1', player: 'w', goal: 'promote', maxMoves: 16,
    tip: 'Primero el rey por delante del peón; el peón se mueve lo menos posible.',
  },
  {
    id: 'kpk-hold', title: 'Aguantar tablas: rey solo', group: 'Finales de peones', level: 1,
    fen: '8/8/8/8/3k4/8/3P4/3K4 b - - 0 1', player: 'b', goal: 'hold', maxMoves: 25,
    tip: 'Mantén el rey delante del peón y toma la oposición cuando el peón avance. Retrocede en línea recta.',
  },
  {
    id: 'kpk-hold2', title: 'Aguantar tablas: rey rival al lado', group: 'Finales de peones', level: 2,
    fen: '8/8/8/3k4/8/8/3PK3/8 b - - 0 1', player: 'b', goal: 'hold', maxMoves: 25,
    tip: 'Ocupa la casilla delante del peón siempre que puedas y busca la oposición frente al rey rival.',
  },
  {
    id: 'lucena', title: 'Posición de Lucena', group: 'Finales de torres', level: 2,
    fen: '3K4/3P1k2/8/8/8/8/r7/4R3 w - - 0 1', player: 'w', goal: 'promote', maxMoves: 12,
    tip: 'Construye un puente: aleja al rey rival con jaque, lleva la torre a la cuarta fila y protege a tu rey de los jaques.',
  },
  {
    id: 'philidor', title: 'Defensa Philidor', group: 'Finales de torres', level: 2,
    fen: '4k3/R7/1r6/4K3/4P3/8/8/8 b - - 0 1', player: 'b', goal: 'hold', maxMoves: 30,
    tip: 'Torre en la tercera fila (tu sexta) hasta que el peón avance; entonces baja la torre y da jaques por detrás.',
  },
]
