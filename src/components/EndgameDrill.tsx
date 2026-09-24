import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import Board from './Board'
import { TopBar } from './PuzzleTrainer'
import { engine } from '../lib/engine'
import { db, getProfile, getDay, touchStreak } from '../lib/db'
import type { EndgameDrill } from '../data/endgames'

interface Props { drill: EndgameDrill; onExit: () => void }
type Phase = 'player' | 'engine' | 'done'
interface Outcome { win: boolean; reason: string; xp: number; moves: number }

export default function EndgameDrillView({ drill, onExit }: Props) {
  const [fen, setFen] = useState(drill.fen)
  const [phase, setPhase] = useState<Phase>(drill.fen.split(' ')[1] === drill.player ? 'player' : 'engine')
  const [lastMove, setLastMove] = useState<[string, string] | null>(null)
  const [moves, setMoves] = useState(0)
  const [status, setStatus] = useState('')
  const [hintArrow, setHintArrow] = useState<{ from: string; to: string }[]>([])
  const [helped, setHelped] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [thinking, setThinking] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; engine.warmup(); return () => { alive.current = false } }, [])

  const orientation = drill.player === 'w' ? 'white' : 'black'

  const finish = useCallback(async (win: boolean, reason: string, nMoves: number) => {
    setPhase('done')
    const xp = win ? (helped ? 15 : 30) * drill.level : 3
    const [p0, day, prog] = await Promise.all([getProfile(), getDay(), db.endgames.get(drill.id)])
    const p = await touchStreak(p0)
    p.xp += xp; day.xp += xp; day.endgames += 1
    const np = prog ?? { drillId: drill.id, attempts: 0, completed: 0, bestMoves: null, lastResult: null }
    np.attempts += 1; if (win) { np.completed += 1; np.bestMoves = np.bestMoves === null ? nMoves : Math.min(np.bestMoves, nMoves) }
    np.lastResult = win ? 'win' : 'fail'
    await db.transaction('rw', [db.profile, db.days, db.endgames], async () => { await db.profile.put(p); await db.days.put(day); await db.endgames.put(np) })
    setOutcome({ win, reason, xp, moves: nMoves })
  }, [drill, helped])

  /** Comprueba fin de partida tras una jugada. Devuelve true si terminó. */
  const checkTerminal = useCallback((c: Chess, byPlayer: boolean, nMoves: number, promoted: boolean): boolean => {
    if (c.isCheckmate()) {
      if (byPlayer) { void finish(drill.goal !== 'hold', drill.goal === 'hold' ? 'Has dado mate… pero el objetivo era aguantar. Cuenta igual: ¡bien!' : '¡Mate!', nMoves); return true }
      void finish(false, 'Te han dado mate.', nMoves); return true
    }
    if (c.isStalemate() || c.isInsufficientMaterial() || c.isThreefoldRepetition() || c.isDraw()) {
      const why = c.isStalemate() ? 'Rey ahogado: tablas.' : c.isInsufficientMaterial() ? 'Material insuficiente: tablas.' : c.isThreefoldRepetition() ? 'Triple repetición: tablas.' : 'Tablas.'
      void finish(drill.goal === 'hold', why, nMoves); return true
    }
    if (promoted) {
      if (byPlayer && drill.goal === 'promote') { void finish(true, '¡Peón coronado!', nMoves); return true }
      if (!byPlayer && drill.goal === 'hold') { void finish(false, 'El rival ha coronado.', nMoves); return true }
    }
    if (byPlayer && drill.goal !== 'hold' && nMoves >= drill.maxMoves) { void finish(false, `Se han agotado las ${drill.maxMoves} jugadas.`, nMoves); return true }
    if (byPlayer && drill.goal === 'hold' && nMoves >= drill.maxMoves) { void finish(true, `Has aguantado ${drill.maxMoves} jugadas sin ceder.`, nMoves); return true }
    return false
  }, [drill, finish])

  const engineMove = useCallback(async (currentFen: string, nMoves: number) => {
    setThinking(true)
    const r = await engine.analyse(currentFen, { movetime: drill.goal === 'hold' ? 600 : 350 })
    if (!alive.current) return
    setThinking(false)
    if (!r.bestMove) return
    const c = new Chess(currentFen)
    const mv = c.move({ from: r.bestMove.slice(0, 2), to: r.bestMove.slice(2, 4), promotion: r.bestMove[4] as 'q' | undefined })
    setFen(c.fen()); setLastMove([r.bestMove.slice(0, 2), r.bestMove.slice(2, 4)])
    if (checkTerminal(c, false, nMoves, !!mv?.promotion)) return
    // evaluación para feedback (desde el punto de vista del jugador, que ahora mueve)
    const ev = await engine.analyse(c.fen(), { depth: 14 })
    if (!alive.current) return
    if (drill.goal !== 'hold') {
      if (ev.mate !== null && ev.mate > 0) setStatus(`Mate en ${ev.mate}`)
      else if (ev.cp !== null && ev.cp < 120 && ev.mate === null) { void finish(false, 'Has dejado escapar la ventaja: la posición ya es tablas.', nMoves); return }
      else setStatus('Ventaja decisiva. Sigue.')
    } else {
      if (ev.mate !== null && ev.mate < 0) { void finish(false, `Posición perdida (mate en ${-ev.mate}).`, nMoves); return }
      setStatus(ev.cp !== null && ev.cp < -250 ? 'Cuidado: la posición se te escapa.' : 'Aguantas. Sigue.')
    }
    setPhase('player')
  }, [drill, checkTerminal, finish])

  useEffect(() => { if (phase === 'engine' && moves === 0 && fen === drill.fen) void engineMove(fen, 0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (phase !== 'player') return false
    const c = new Chess(fen)
    const mv = c.move({ from, to, promotion })
    if (!mv) return false
    const n = moves + 1
    setMoves(n); setFen(c.fen()); setLastMove([from, to]); setHintArrow([]); setStatus('')
    if (checkTerminal(c, true, n, !!mv.promotion)) return true
    setPhase('engine')
    void engineMove(c.fen(), n)
    return true
  }

  const hint = async () => {
    if (phase !== 'player') return
    setHelped(true)
    const r = await engine.analyse(fen, { depth: 18 })
    if (r.bestMove && alive.current) setHintArrow([{ from: r.bestMove.slice(0, 2), to: r.bestMove.slice(2, 4) }])
  }
  const restart = () => { setFen(drill.fen); setMoves(0); setLastMove(null); setStatus(''); setHintArrow([]); setHelped(false); setOutcome(null); setPhase(drill.fen.split(' ')[1] === drill.player ? 'player' : 'engine'); if (drill.fen.split(' ')[1] !== drill.player) void engineMove(drill.fen, 0) }

  const goalText = drill.goal === 'mate' ? `Da mate en ≤ ${drill.maxMoves} jugadas` : drill.goal === 'promote' ? `Corona el peón en ≤ ${drill.maxMoves} jugadas` : `Aguanta ${drill.maxMoves} jugadas sin perder`

  return (
    <div className="screen">
      <TopBar title={drill.title} onBack={onExit} right={<span className="pill">{moves}/{drill.maxMoves}</span>} />
      <p className="goal">{goalText}</p>
      <Board fen={fen} orientation={orientation} onMove={onMove} lastMove={lastMove} disabled={phase !== 'player'} arrows={hintArrow} />
      {phase !== 'done' ? (
        <div className="panel">
          <p className="turn"><span className={`dot ${orientation}`} />{thinking ? 'El motor piensa…' : status || 'Tu jugada.'}</p>
          <p className="dim">{drill.tip}</p>
          <div className="row">
            <button className="ghost" onClick={() => void hint()} disabled={phase !== 'player'}>Pista (motor)</button>
            <button className="ghost" onClick={restart}>Reiniciar</button>
          </div>
        </div>
      ) : outcome && (
        <div className={`panel result ${outcome.win ? 'g2' : 'g0'}`}>
          <h3>{outcome.win ? 'Objetivo conseguido' : 'No conseguido'}</h3>
          <p>{outcome.reason}</p>
          <div className="stats-row"><div><b>+{outcome.xp}</b><span>XP</span></div><div><b>{outcome.moves}</b><span>jugadas</span></div>{helped && <div><b>sí</b><span>con pista</span></div>}</div>
          <div className="row">
            <button className="primary" onClick={restart}>Repetir</button>
            <button className="ghost" onClick={onExit}>Volver</button>
          </div>
        </div>
      )}
    </div>
  )
}
