import { useMemo, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, type Square } from 'chess.js'

export interface BoardProps {
  fen: string
  orientation: 'white' | 'black'
  /** Devuelve true si la jugada se acepta (se aplica fuera). */
  onMove?: (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => boolean
  lastMove?: [string, string] | null
  marks?: Record<string, 'ok' | 'bad' | 'hint'>
  disabled?: boolean
  arrows?: { from: string; to: string; color?: string }[]
}

const COLORS = {
  light: '#e9dcc4', dark: '#8f7a5a', sel: 'rgba(255, 213, 79, 0.75)', last: 'rgba(255, 213, 79, 0.42)',
  ok: 'rgba(76, 175, 80, 0.7)', bad: 'rgba(239, 83, 80, 0.75)', hint: 'rgba(66, 165, 245, 0.7)', check: 'radial-gradient(circle, rgba(239,83,80,.9) 0%, rgba(239,83,80,.35) 55%, transparent 70%)',
}

export default function Board({ fen, orientation, onMove, lastMove, marks, disabled, arrows }: BoardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null)
  const game = useMemo(() => { try { return new Chess(fen) } catch { return null } }, [fen])

  const legalTargets = useMemo(() => {
    if (!game || !selected) return new Set<string>()
    return new Set(game.moves({ square: selected as Square, verbose: true }).map(m => m.to))
  }, [game, selected])

  const kingInCheck = useMemo(() => {
    if (!game || !game.inCheck()) return null
    const turn = game.turn()
    for (const row of game.board()) for (const sq of row) if (sq && sq.type === 'k' && sq.color === turn) return sq.square
    return null
  }, [game])

  const isPromotion = (from: string, to: string) => {
    const p = game?.get(from as Square)
    return !!p && p.type === 'p' && ((p.color === 'w' && to[1] === '8') || (p.color === 'b' && to[1] === '1'))
  }

  const tryMove = (from: string, to: string) => {
    if (!game || disabled || !onMove) return false
    if (!game.moves({ square: from as Square, verbose: true }).some(m => m.to === to)) return false
    if (isPromotion(from, to)) { setPending({ from, to }); setSelected(null); return false }
    const ok = onMove(from, to)
    setSelected(null)
    return ok
  }

  const ownPiece = (sq: string) => { const p = game?.get(sq as Square); return !!p && p.color === game?.turn() }

  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {}
    if (lastMove) { s[lastMove[0]] = { background: COLORS.last }; s[lastMove[1]] = { background: COLORS.last } }
    if (kingInCheck) s[kingInCheck] = { background: COLORS.check }
    if (selected) s[selected] = { background: COLORS.sel }
    for (const t of legalTargets) {
      const capture = !!game?.get(t as Square)
      s[t] = {
        ...s[t],
        background: capture
          ? `radial-gradient(circle, transparent 55%, rgba(0,0,0,.28) 56%, rgba(0,0,0,.28) 72%, transparent 73%)`
          : `radial-gradient(circle, rgba(0,0,0,.28) 22%, transparent 24%)`,
      }
    }
    if (marks) for (const [sq, k] of Object.entries(marks)) s[sq] = { background: COLORS[k] }
    return s
  }, [lastMove, kingInCheck, selected, legalTargets, marks, game])

  return (
    <div className="board-wrap">
      <Chessboard
        options={{
          id: 'main',
          position: fen,
          boardOrientation: orientation,
          animationDurationInMs: 180,
          allowDragging: !disabled,
          allowDrawingArrows: false,
          showNotation: true,
          darkSquareStyle: { backgroundColor: COLORS.dark },
          lightSquareStyle: { backgroundColor: COLORS.light },
          darkSquareNotationStyle: { color: COLORS.light, fontSize: 10, fontWeight: 600 },
          lightSquareNotationStyle: { color: COLORS.dark, fontSize: 10, fontWeight: 600 },
          boardStyle: { borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,.45)' },
          squareStyles,
          arrows: (arrows ?? []).map(a => ({ startSquare: a.from, endSquare: a.to, color: a.color ?? 'rgba(66,165,245,.85)' })),
          canDragPiece: ({ square }) => !disabled && !!square && ownPiece(square),
          onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare ? tryMove(sourceSquare, targetSquare) : false),
          onSquareClick: ({ square, piece }) => {
            if (disabled) return
            if (selected) {
              if (square === selected) { setSelected(null); return }
              if (legalTargets.has(square)) { tryMove(selected, square); return }
            }
            if (piece && ownPiece(square)) setSelected(square); else setSelected(null)
          },
        }}
      />
      {pending && (
        <div className="promo">
          {(['q', 'r', 'b', 'n'] as const).map(p => (
            <button key={p} onClick={() => { onMove?.(pending.from, pending.to, p); setPending(null) }}>
              {{ q: '♕ Dama', r: '♖ Torre', b: '♗ Alfil', n: '♘ Caballo' }[p]}
            </button>
          ))}
          <button className="ghost" onClick={() => setPending(null)}>Cancelar</button>
        </div>
      )}
    </div>
  )
}
