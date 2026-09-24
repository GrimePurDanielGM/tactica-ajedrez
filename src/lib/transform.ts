import { Chess } from 'chess.js'
import type { Puzzle } from './puzzles'

export type Variant = 'orig' | 'mirror' | 'flip' | 'both'
export const VARIANT_LABEL: Record<Variant, string> = {
  orig: 'original', mirror: 'espejo', flip: 'colores invertidos', both: 'espejo + colores',
}

const mirrorFile = (f: string) => String.fromCharCode(97 + 104 - f.charCodeAt(0))
const flipRank = (r: string) => String(9 - Number(r))
const swapCase = (s: string) => s.replace(/[a-zA-Z]/g, c => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()))

function mirrorSquare(sq: string) { return mirrorFile(sq[0]) + sq[1] }
function flipSquare(sq: string) { return sq[0] + flipRank(sq[1]) }
function mapMove(m: string, f: (sq: string) => string) {
  return f(m.slice(0, 2)) + f(m.slice(2, 4)) + m.slice(4)
}

export function mirrorFen(fen: string): string {
  const [board, side, castling, ep, half, full] = fen.split(' ')
  const ranks = board.split('/').map(r => r.split('').reverse().join(''))
  const ep2 = ep === '-' ? '-' : mirrorSquare(ep)
  return [ranks.join('/'), side, castling, ep2, half, full].join(' ')
}
export function flipFen(fen: string): string {
  const [board, side, castling, ep, half, full] = fen.split(' ')
  const ranks = board.split('/').reverse().map(swapCase)
  const side2 = side === 'w' ? 'b' : 'w'
  const castling2 = castling === '-' ? '-' : swapCase(castling).split('').sort((a, b) => 'KQkq'.indexOf(a) - 'KQkq'.indexOf(b)).join('')
  const ep2 = ep === '-' ? '-' : flipSquare(ep)
  return [ranks.join('/'), side2, castling2, ep2, half, full].join(' ')
}

/** Variantes válidas para un puzzle (el espejo rompe las reglas de enroque). */
export function availableVariants(p: Puzzle): Variant[] {
  const castling = p.fen.split(' ')[2]
  return castling === '-' ? ['orig', 'mirror', 'flip', 'both'] : ['orig', 'flip']
}

export function applyVariant(p: Puzzle, v: Variant): Puzzle {
  let fen = p.fen
  let moves = p.moves
  if (v === 'mirror' || v === 'both') {
    fen = mirrorFen(fen); moves = moves.map(m => mapMove(m, mirrorSquare))
  }
  if (v === 'flip' || v === 'both') {
    fen = flipFen(fen); moves = moves.map(m => mapMove(m, flipSquare))
  }
  return { ...p, fen, moves }
}

/** Comprueba que la secuencia de jugadas es legal desde el FEN. */
export function validatePuzzle(p: Puzzle): boolean {
  try {
    const c = new Chess(p.fen)
    for (const m of p.moves) {
      const r = c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] as 'q' | 'r' | 'b' | 'n' | undefined })
      if (!r) return false
    }
    return true
  } catch { return false }
}

/** Convierte una jugada UCI a SAN en un FEN dado (para mostrar la solución). */
export function uciToSan(fen: string, uci: string): string {
  try {
    const c = new Chess(fen)
    const r = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as 'q' | 'r' | 'b' | 'n' | undefined })
    return r?.san ?? uci
  } catch { return uci }
}
