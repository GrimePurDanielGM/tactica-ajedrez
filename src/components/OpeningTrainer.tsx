import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import Board from './Board'
import { TopBar, formatDue } from './PuzzleTrainer'
import { db, getProfile, getDay, touchStreak, type OpeningProgress } from '../lib/db'
import { schedule, type Grade } from '../lib/srs'
import type { OpeningLine } from '../data/openings'

interface Props { line: OpeningLine; progress: OpeningProgress | undefined; onExit: () => void }
type Phase = 'player' | 'auto' | 'done'

export default function OpeningTrainer({ line, progress, onExit }: Props) {
  const guided = !progress || progress.reps === 0
  const [fen, setFen] = useState(new Chess().fen())
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('auto')
  const [lastMove, setLastMove] = useState<[string, string] | null>(null)
  const [marks, setMarks] = useState<Record<string, 'ok' | 'bad' | 'hint'>>({})
  const [arrow, setArrow] = useState<{ from: string; to: string }[]>([])
  const [errors, setErrors] = useState(0)
  const [errHere, setErrHere] = useState(0)
  const [note, setNote] = useState('')
  const [result, setResult] = useState<{ grade: Grade; xp: number; due: number } | null>(null)
  const game = useRef(new Chess())
  const errorsRef = useRef(0)
  const revealedRef = useRef(false)
  const timers = useRef<number[]>([])
  const later = (f: () => void, ms: number) => { timers.current.push(window.setTimeout(f, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const orientation = line.side === 'w' ? 'white' : 'black'
  const isPlayerTurn = (i: number) => (i % 2 === 0 ? 'w' : 'b') === line.side

  const expectedMove = useCallback((i: number) => {
    const c = new Chess(game.current.fen())
    const m = c.move(line.moves[i])
    return m
  }, [line])

  const finish = useCallback(async (grade: Grade) => {
    setPhase('done')
    const xp = grade === 0 ? 2 : grade === 1 ? 8 : 15
    const [p0, day] = await Promise.all([getProfile(), getDay()])
    const p = await touchStreak(p0)
    p.xp += xp; day.xp += xp; day.openings += 1
    const base = progress ?? { lineId: line.id, due: Date.now(), interval: 0, ease: 2.3, reps: 0, lapses: 0 }
    const sch = schedule({ ...base, puzzleId: '', lastVariant: 'orig', skill: '' }, grade)
    const np: OpeningProgress = { lineId: line.id, due: sch.due, interval: sch.interval, ease: sch.ease, reps: sch.reps, lapses: sch.lapses }
    await db.transaction('rw', [db.profile, db.days, db.openings], async () => { await db.profile.put(p); await db.days.put(day); await db.openings.put(np) })
    setResult({ grade, xp, due: np.due })
  }, [line, progress])

  // avanza: juega automáticamente las jugadas del rival y prepara la del jugador
  const advance = useCallback((i: number) => {
    if (i >= line.moves.length) { later(() => void finish(revealedRef.current ? 0 : errorsRef.current === 0 ? 2 : 1), 300); return }
    if (isPlayerTurn(i)) {
      setIdx(i); setPhase('player'); setErrHere(0)
      const m = expectedMove(i)
      setArrow(guided && m ? [{ from: m.from, to: m.to }] : [])
      setNote(line.notes?.[i] ?? '')
      return
    }
    setPhase('auto')
    later(() => {
      const m = game.current.move(line.moves[i])
      setFen(game.current.fen()); setLastMove([m.from, m.to]); setMarks({})
      setNote(line.notes?.[i] ?? '')
      advance(i + 1)
    }, 500)
  }, [line, guided, expectedMove, finish]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { game.current = new Chess(); advance(0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (phase !== 'player') return false
    const exp = expectedMove(idx)
    if (!exp) return false
    if (exp.from === from && exp.to === to && (!exp.promotion || exp.promotion === promotion)) {
      game.current.move({ from, to, promotion })
      setFen(game.current.fen()); setLastMove([from, to]); setMarks({ [to]: 'ok' }); setArrow([])
      advance(idx + 1)
      return true
    }
    errorsRef.current += 1; setErrors(errorsRef.current); setErrHere(e => e + 1)
    setMarks({ [to]: 'bad' }); later(() => setMarks({}), 600)
    if (errHere + 1 >= 2) { revealedRef.current = true; setArrow([{ from: exp.from, to: exp.to }]) }
    return false
  }

  const total = line.moves.filter((_, i) => isPlayerTurn(i)).length
  const done = line.moves.slice(0, idx).filter((_, i) => isPlayerTurn(i)).length

  return (
    <div className="screen">
      <TopBar title={line.name} onBack={onExit} right={<span className="pill">{done}/{total}</span>} />
      <p className="goal">{line.opening}{guided ? ' · modo guiado: sigue la flecha' : ' · de memoria'}</p>
      <Board fen={fen} orientation={orientation} onMove={onMove} lastMove={lastMove} marks={marks} arrows={arrow} disabled={phase !== 'player'} />
      {phase !== 'done' ? (
        <div className="panel">
          <p className="turn"><span className={`dot ${orientation}`} />{phase === 'player' ? '¿Cuál es la jugada del repertorio?' : '…'}</p>
          {note && <p className="dim">{note}</p>}
          {errHere > 0 && <p className="warn">{errHere >= 2 ? 'Esta es la jugada del repertorio (flecha).' : 'No es la del repertorio. Otra vez.'}</p>}
          <p className="moves">{sanList(line.moves.slice(0, idx))}</p>
        </div>
      ) : result && (
        <div className={`panel result g${result.grade}`}>
          <h3>{result.grade === 2 ? 'Línea completada sin errores' : 'Línea completada con errores'}</h3>
          <div className="stats-row"><div><b>+{result.xp}</b><span>XP</span></div><div><b>{errors}</b><span>errores</span></div></div>
          <p className="moves">{sanList(line.moves)}</p>
          <p className="dim">Próximo repaso: {formatDue(result.due)}</p>
          <div className="row"><button className="primary" onClick={onExit}>Volver</button></div>
        </div>
      )}
    </div>
  )
}

function sanList(moves: string[]) {
  return moves.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ')
}
