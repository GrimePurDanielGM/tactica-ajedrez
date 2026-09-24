import { useEffect, useState } from 'react'
import { OPENING_LINES, OPENING_GROUPS, type OpeningLine } from '../data/openings'
import { db, type OpeningProgress } from '../lib/db'
import { Row } from './Home'
import { formatDue } from '../components/PuzzleTrainer'

interface Props { onPlay: (line: OpeningLine, progress: OpeningProgress | undefined) => void }

export default function Openings({ onPlay }: Props) {
  const [prog, setProg] = useState<Map<string, OpeningProgress>>(new Map())
  useEffect(() => { void db.openings.toArray().then(rows => setProg(new Map(rows.map(r => [r.lineId, r])))) }, [])
  const now = Date.now()
  const dueLines = OPENING_LINES.filter(l => { const p = prog.get(l.id); return p && p.due <= now })
  return (
    <div className="screen">
      <header className="hero"><h1>Aperturas</h1></header>
      <p className="dim intro">La primera vez cada línea se muestra guiada; después la juegas de memoria y se programa como repaso. Repertorio: Italiana con blancas; Caro-Kann y Eslava con negras.</p>
      {dueLines.length > 0 && <Row icon="↻" title={`${dueLines.length} líneas por repasar`} sub="Empieza por la más antigua." onClick={() => { const l = dueLines.sort((a, b) => prog.get(a.id)!.due - prog.get(b.id)!.due)[0]; onPlay(l, prog.get(l.id)) }} />}
      {OPENING_GROUPS.map(g => (
        <section key={g}>
          <h4 className="section">{g}</h4>
          {OPENING_LINES.filter(l => l.opening === g).map(l => {
            const p = prog.get(l.id)
            const state = !p ? 'nueva' : p.due <= now ? 'repasar' : `repaso ${formatDue(p.due)}`
            return <Row key={l.id} title={l.name} sub={`${Math.ceil(l.moves.length / 2)} jugadas · ${state}`} onClick={() => onPlay(l, p)}
              right={<span className={`medal ${!p ? 'm0' : p.reps >= 4 && p.lapses === 0 ? 'm3' : p.reps >= 2 ? 'm2' : 'm1'}`}>{!p ? '—' : `×${p.reps}`}</span>} />
          })}
        </section>
      ))}
    </div>
  )
}
