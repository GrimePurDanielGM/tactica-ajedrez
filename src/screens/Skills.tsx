import { useEffect, useState } from 'react'
import { SKILLS, TIER_NAMES, puzzlesForTheme } from '../lib/puzzles'
import { overview, masteryOf, masteryProgress, MASTERY_LABEL } from '../lib/srs'
import { db } from '../lib/db'
import { Row } from './Home'

interface Props { onTrain: (skill: string) => void }

export default function Skills({ onTrain }: Props) {
  const [ov, setOv] = useState<Awaited<ReturnType<typeof overview>> | null>(null)
  const [dueBySkill, setDueBySkill] = useState<Record<string, number>>({})
  useEffect(() => {
    void overview().then(setOv)
    void db.cards.where('due').belowOrEqual(Date.now()).toArray().then(cards => {
      const m: Record<string, number> = {}; for (const c of cards) m[c.skill] = (m[c.skill] ?? 0) + 1; setDueBySkill(m)
    })
  }, [])
  if (!ov) return <div className="screen"><p className="dim">Cargando…</p></div>
  const stats = new Map(ov.stats.map(s => [s.key, s]))
  const tiers = [...new Set(SKILLS.map(s => s.tier))]

  return (
    <div className="screen">
      <header className="hero"><h1>Habilidades</h1></header>
      <p className="dim intro">Cada bloque se desbloquea al llegar a bronce en tres habilidades del anterior. Bronce: 15 aciertos y nivel 850 · Plata: 45 y 1200 · Oro: 90 y 1500.</p>
      {tiers.map(t => {
        const list = SKILLS.filter(s => s.tier === t)
        const unlocked = list.some(s => ov.unlocked.has(s.key))
        return (
          <section key={t}>
            <h4 className="section">{unlocked ? '' : '🔒 '}Bloque {t} · {TIER_NAMES[t]}</h4>
            {list.map(s => {
              const st = stats.get(s.key)
              const m = masteryOf(st)
              const { pct } = masteryProgress(st)
              const due = dueBySkill[s.key] ?? 0
              return (
                <Row key={s.key} title={s.name} sub={s.short} locked={!unlocked} onClick={() => onTrain(s.key)}
                  right={
                    <div className="skill-right">
                      <span className={`medal m${m}`}>{MASTERY_LABEL[m]}</span>
                      <span className="dim">{st ? `${st.rating} · ${st.correct}/${st.attempts}` : `${puzzlesForTheme(s.key).length} ej.`}</span>
                      {due > 0 && <span className="due">{due} repasos</span>}
                      <div className="bar thin"><i style={{ width: `${pct * 100}%` }} /></div>
                    </div>
                  } />
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
