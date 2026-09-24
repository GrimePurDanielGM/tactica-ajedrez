import { useEffect, useState } from 'react'
import { ENDGAME_DRILLS, type EndgameDrill } from '../data/endgames'
import { db, type EndgameProgress } from '../lib/db'
import { Row } from './Home'

interface Props { onPlay: (d: EndgameDrill) => void }

export default function Endgames({ onPlay }: Props) {
  const [prog, setProg] = useState<Map<string, EndgameProgress>>(new Map())
  useEffect(() => { void db.endgames.toArray().then(rows => setProg(new Map(rows.map(r => [r.drillId, r])))) }, [])
  const groups = [...new Set(ENDGAME_DRILLS.map(d => d.group))]
  return (
    <div className="screen">
      <header className="hero"><h1>Finales</h1></header>
      <p className="dim intro">Juegas contra Stockfish. Un final "dominado" es el que has completado tres veces sin pista. Objetivo: ejecutarlos sin pensar.</p>
      {groups.map(g => (
        <section key={g}>
          <h4 className="section">{g}</h4>
          {ENDGAME_DRILLS.filter(d => d.group === g).map(d => {
            const p = prog.get(d.id)
            const mastered = (p?.completed ?? 0) >= 3
            return (
              <Row key={d.id} title={d.title} sub={`${'●'.repeat(d.level)}${'○'.repeat(3 - d.level)} · ${d.goal === 'mate' ? 'mate' : d.goal === 'promote' ? 'coronar' : 'aguantar'} · ${d.maxMoves} jugadas`}
                onClick={() => onPlay(d)}
                right={<div className="skill-right"><span className={`medal ${mastered ? 'm3' : p?.completed ? 'm1' : 'm0'}`}>{mastered ? 'Dominado' : p ? `${p.completed}/3` : '—'}</span>{p?.bestMoves != null && <span className="dim">mejor: {p.bestMoves} jug.</span>}</div>} />
            )
          })}
        </section>
      ))}
    </div>
  )
}
