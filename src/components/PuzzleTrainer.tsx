import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import Board from './Board'
import { pickExercise, recordResult, type Exercise, type Grade } from '../lib/srs'
import { SKILL_BY_KEY, themeLabel } from '../lib/puzzles'
import { VARIANT_LABEL, uciToSan } from '../lib/transform'

interface Props { skill: string | 'mixed'; onExit: () => void }
type Phase = 'loading' | 'intro' | 'playing' | 'opponent' | 'done' | 'empty'

interface Result { grade: Grade; xp: number; ratingDelta: number; rating: number; nextDue: number; solution: string[] }

const GRADE_TEXT: Record<Grade, string> = { 0: 'Fallado — lo verás de nuevo en unos minutos', 1: 'Resuelto con ayuda', 2: 'Correcto', 3: 'Correcto y rápido' }

export default function PuzzleTrainer({ skill, onExit }: Props) {
  const [ex, setEx] = useState<Exercise | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [fen, setFen] = useState('8/8/8/8/8/8/8/8 w - - 0 1')
  const [idx, setIdx] = useState(0)
  const [lastMove, setLastMove] = useState<[string, string] | null>(null)
  const [marks, setMarks] = useState<Record<string, 'ok' | 'bad' | 'hint'>>({})
  const [errors, setErrors] = useState(0)
  const [hint, setHint] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [sessionN, setSessionN] = useState(0)
  const [sessionXp, setSessionXp] = useState(0)
  const startTs = useRef(0)
  const timers = useRef<number[]>([])

  const later = (f: () => void, ms: number) => { timers.current.push(window.setTimeout(f, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const load = useCallback(async () => {
    timers.current.forEach(clearTimeout); timers.current = []
    setPhase('loading'); setResult(null); setMarks({}); setErrors(0); setHint(false); setLastMove(null)
    const e = await pickExercise(skill)
    if (!e) { setPhase('empty'); return }
    ;(window as unknown as { __ex?: Exercise }).__ex = e
    setEx(e); setFen(e.puzzle.fen); setIdx(0); setPhase('intro')
    later(() => {
      const c = new Chess(e.puzzle.fen)
      const m = e.puzzle.moves[0]
      c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] as 'q' | undefined })
      setFen(c.fen()); setLastMove([m.slice(0, 2), m.slice(2, 4)]); setIdx(1)
      setPhase('playing'); startTs.current = Date.now()
    }, 700)
  }, [skill])

  useEffect(() => { void load() }, [load])

  const playerColor: 'white' | 'black' = ex ? (ex.puzzle.fen.split(' ')[1] === 'w' ? 'black' : 'white') : 'white'

  const finish = useCallback(async (grade: Grade, e: Exercise) => {
    setPhase('done')
    const timeMs = Date.now() - startTs.current
    const r = await recordResult(e, grade, timeMs)
    const solution: string[] = []
    const c = new Chess(e.puzzle.fen)
    e.puzzle.moves.forEach((m, i) => { const san = uciToSan(c.fen(), m); c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] as 'q' | undefined }); if (i > 0) solution.push(san) })
    setResult({ grade, xp: r.xp, ratingDelta: r.ratingDelta, rating: r.skill.rating, nextDue: r.nextDue, solution })
    setSessionN(n => n + 1); setSessionXp(x => x + r.xp)
  }, [])

  const onMove = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (!ex || phase !== 'playing') return false
    const uci = from + to + (promotion ?? '')
    const expected = ex.puzzle.moves[idx]
    const c = new Chess(fen)
    const mv = c.move({ from, to, promotion })
    if (!mv) return false
    const correct = uci === expected || (uci + 'q' === expected) || c.isCheckmate()
    if (!correct) {
      setErrors(n => n + 1)
      setMarks({ [to]: 'bad' })
      later(() => setMarks({}), 650)
      return false
    }
    setFen(c.fen()); setLastMove([from, to]); setMarks({ [to]: 'ok' })
    const next = idx + 1
    if (next >= ex.puzzle.moves.length) {
      const fast = Date.now() - startTs.current < 20_000
      const grade: Grade = errors > 0 || hint ? 1 : fast ? 3 : 2
      later(() => void finish(grade, ex), 350)
      return true
    }
    setPhase('opponent'); setIdx(next)
    later(() => {
      const m = ex.puzzle.moves[next]
      c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] as 'q' | undefined })
      setFen(c.fen()); setLastMove([m.slice(0, 2), m.slice(2, 4)]); setMarks({}); setIdx(next + 1); setPhase('playing')
    }, 450)
    return true
  }

  const showHint = () => {
    if (!ex || phase !== 'playing') return
    setHint(true); setMarks({ [ex.puzzle.moves[idx].slice(0, 2)]: 'hint' })
  }
  const showSolution = () => {
    if (!ex || phase !== 'playing') return
    setPhase('opponent')
    const c = new Chess(fen)
    let i = idx, delay = 0
    for (; i < ex.puzzle.moves.length; i++) {
      const m = ex.puzzle.moves[i]
      later(() => { c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] as 'q' | undefined }); setFen(c.fen()); setLastMove([m.slice(0, 2), m.slice(2, 4)]) }, delay += 600)
    }
    later(() => void finish(0, ex), delay + 400)
  }

  const skillName = ex ? (SKILL_BY_KEY.get(ex.skill)?.name ?? ex.skill) : ''
  const turnText = phase === 'intro' ? 'Observa la jugada del rival…' : phase === 'playing' ? `Juegan ${playerColor === 'white' ? 'blancas' : 'negras'}: encuentra la mejor jugada` : phase === 'opponent' ? '…' : ''

  if (phase === 'empty') return (
    <div className="screen">
      <TopBar title="Táctica" onBack={onExit} />
      <div className="card"><p>No quedan ejercicios nuevos de esta habilidad. Vuelve cuando haya repasos pendientes o entrena otra.</p></div>
    </div>
  )

  return (
    <div className="screen">
      <TopBar title={skill === 'mixed' ? 'Entrenamiento' : skillName} onBack={onExit} right={<span className="pill">{sessionN} · +{sessionXp} XP</span>} />
      <div className="puzzle-meta">
        <span className={`tag ${ex?.isReview ? 'tag-rev' : 'tag-new'}`}>{ex?.isReview ? 'Repaso' : 'Nuevo'}</span>
        {ex && ex.variant !== 'orig' && <span className="tag tag-var">{VARIANT_LABEL[ex.variant]}</span>}
        {skill === 'mixed' && ex && <span className="tag">{skillName}</span>}
        {ex && phase === 'done' && <span className="tag tag-dim">dif. {ex.original.rating}</span>}
      </div>
      <Board fen={fen} orientation={playerColor} onMove={onMove} lastMove={lastMove} marks={marks} disabled={phase !== 'playing'} />
      {phase !== 'done' ? (
        <div className="panel">
          <p className="turn"><span className={`dot ${playerColor}`} />{turnText}</p>
          {errors > 0 && phase === 'playing' && <p className="warn">Esa no es. Inténtalo otra vez.</p>}
          <div className="row">
            <button className="ghost" onClick={showHint} disabled={phase !== 'playing' || hint}>Pista</button>
            <button className="ghost" onClick={showSolution} disabled={phase !== 'playing'}>Ver solución</button>
          </div>
        </div>
      ) : result && ex && (
        <div className={`panel result g${result.grade}`}>
          <h3>{GRADE_TEXT[result.grade]}</h3>
          <div className="stats-row">
            <div><b>+{result.xp}</b><span>XP</span></div>
            <div><b>{result.ratingDelta >= 0 ? '+' : ''}{result.ratingDelta}</b><span>{skillName}</span></div>
            <div><b>{result.rating}</b><span>nivel tema</span></div>
          </div>
          <p className="solution">Solución: {result.solution.join(' ')}</p>
          <p className="themes">{ex.original.themes.filter(t => !['short', 'long', 'veryLong', 'oneMove', 'master', 'masterVsMaster', 'superGM'].includes(t)).map(themeLabel).join(' · ')}</p>
          <p className="dim">Próximo repaso: {formatDue(result.nextDue)}</p>
          <div className="row">
            <button className="primary" onClick={() => void load()}>Siguiente</button>
            <button className="ghost" onClick={onExit}>Terminar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? <button className="back" onClick={onBack} aria-label="Volver">‹</button> : <span />}
      <h2>{title}</h2>
      <div>{right}</div>
    </header>
  )
}

export function formatDue(ts: number) {
  const diff = ts - Date.now()
  if (diff < 3_600_000) return `en ${Math.max(1, Math.round(diff / 60_000))} min`
  if (diff < 86_400_000 * 1.5) return 'mañana'
  return `en ${Math.round(diff / 86_400_000)} días`
}
