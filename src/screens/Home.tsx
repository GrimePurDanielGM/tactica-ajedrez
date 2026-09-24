import { useEffect, useState } from 'react'
import { overview } from '../lib/srs'
import { db, levelFromXp, xpForLevel } from '../lib/db'
import { OPENING_LINES } from '../data/openings'
import { SKILL_BY_KEY } from '../lib/puzzles'

interface Props { onTrain: (skill: string | 'mixed') => void; goTo: (tab: 'skills' | 'endgames' | 'openings' | 'stats') => void }

export default function Home({ onTrain, goTo }: Props) {
  const [ov, setOv] = useState<Awaited<ReturnType<typeof overview>> | null>(null)
  const [openingsDue, setOpeningsDue] = useState(0)
  const [weak, setWeak] = useState<string | null>(null)
  useEffect(() => {
    void overview().then(o => {
      setOv(o)
      const worked = o.stats.filter(s => s.attempts >= 5 && o.unlocked.has(s.key)).sort((a, b) => a.rating - b.rating)
      setWeak(worked[0]?.key ?? null)
    })
    void db.openings.toArray().then(rows => {
      const map = new Map(rows.map(r => [r.lineId, r]))
      setOpeningsDue(OPENING_LINES.filter(l => { const r = map.get(l.id); return !r || r.due <= Date.now() }).length)
    })
  }, [])
  if (!ov) return <div className="screen"><p className="dim">Cargando…</p></div>
  const { profile, day, due } = ov
  const lvl = levelFromXp(profile.xp)
  const lvlPct = Math.min(1, (profile.xp - xpForLevel(lvl)) / (xpForLevel(lvl + 1) - xpForLevel(lvl)))
  const goalPct = Math.min(1, day.puzzles / profile.dailyGoal)
  const hour = new Date().getHours()
  const greet = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="screen home">
      <header className="hero">
        <div>
          <p className="dim">{greet}, Daniel</p>
          <h1>Plan de hoy</h1>
        </div>
        <div className="streak" title="Racha de días">🔥 {profile.streak}</div>
      </header>

      <div className="card ring-card" onClick={() => onTrain('mixed')}>
        <Ring pct={goalPct} label={`${day.puzzles}/${profile.dailyGoal}`} />
        <div>
          <h3>{day.puzzles >= profile.dailyGoal ? 'Objetivo diario cumplido' : 'Entrenamiento mixto'}</h3>
          <p className="dim">{due > 0 ? `${due} repasos pendientes primero, luego ejercicios nuevos.` : 'Sin repasos pendientes: hoy toca material nuevo.'}</p>
          <span className="link">Empezar ›</span>
        </div>
      </div>

      <div className="grid2">
        <div className="card mini">
          <span className="dim">Nivel táctico</span>
          <b>{profile.rating}</b>
          <span className="dim">{ov.cardsTotal} ejercicios vistos</span>
        </div>
        <div className="card mini">
          <span className="dim">Nivel {lvl}</span>
          <div className="bar"><i style={{ width: `${lvlPct * 100}%` }} /></div>
          <span className="dim">{profile.xp} XP</span>
        </div>
      </div>

      <h4 className="section">Siguientes pasos</h4>
      {due > 0 && <Row icon="↻" title={`Repasar ${due} ejercicios`} sub="Los fallos vuelven en espejo o con colores cambiados." onClick={() => onTrain('mixed')} />}
      {weak && <Row icon="◎" title={`Reforzar: ${SKILL_BY_KEY.get(weak)?.name ?? weak}`} sub="Tu habilidad más floja entre las trabajadas." onClick={() => onTrain(weak)} />}
      <Row icon="♔" title="Finales básicos" sub="Mates elementales y rey y peón contra el motor." onClick={() => goTo('endgames')} />
      <Row icon="♘" title={`Aperturas${openingsDue ? ` · ${openingsDue} líneas por repasar` : ''}`} sub="Italiana, Caro-Kann y Eslava por repetición." onClick={() => goTo('openings')} />
      <Row icon="▦" title="Árbol de habilidades" sub="Desbloquea bloques dominando los anteriores." onClick={() => goTo('skills')} />
    </div>
  )
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 30, c = 2 * Math.PI * r
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="ring">
      <circle cx="40" cy="40" r={r} stroke="var(--line)" strokeWidth="8" fill="none" />
      <circle cx="40" cy="40" r={r} stroke="var(--accent)" strokeWidth="8" fill="none" strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
      <text x="40" y="45" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--fg)">{label}</text>
    </svg>
  )
}

export function Row({ icon, title, sub, right, onClick, locked }: { icon?: string; title: string; sub?: string; right?: React.ReactNode; onClick?: () => void; locked?: boolean }) {
  return (
    <div className={`row-item ${locked ? 'locked' : ''}`} onClick={locked ? undefined : onClick}>
      {icon && <span className="icon">{icon}</span>}
      <div className="grow"><b>{title}</b>{sub && <span className="dim">{sub}</span>}</div>
      {right ?? (onClick && !locked ? <span className="chev">›</span> : null)}
    </div>
  )
}
