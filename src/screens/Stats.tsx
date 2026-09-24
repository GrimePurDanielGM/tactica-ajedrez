import { useEffect, useState } from 'react'
import { db, getProfile, todayKey, exportAll, importAll, type Profile, type DayStat, type Attempt } from '../lib/db'
import { SKILL_BY_KEY } from '../lib/puzzles'

export default function Stats() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [days, setDays] = useState<DayStat[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [msg, setMsg] = useState('')
  const reload = async () => {
    setProfile(await getProfile()); setDays(await db.days.toArray()); setAttempts(await db.attempts.orderBy('ts').toArray())
  }
  useEffect(() => { void reload() }, [])
  if (!profile) return <div className="screen"><p className="dim">Cargando…</p></div>

  // últimos 14 días
  const last14: DayStat[] = []
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = todayKey(d); last14.push(days.find(x => x.day === k) ?? { day: k, puzzles: 0, correct: 0, xp: 0, timeMs: 0, endgames: 0, openings: 0 }) }
  const maxP = Math.max(1, ...last14.map(d => d.puzzles))
  const total = attempts.length
  const acc = total ? Math.round(100 * attempts.filter(a => a.grade >= 2).length / total) / 1 : 0
  const avgTime = total ? Math.round(attempts.reduce((s, a) => s + a.timeMs, 0) / total / 1000) : 0
  const recent = attempts.slice(-30)
  const recentAcc = recent.length ? Math.round(100 * recent.filter(a => a.grade >= 2).length / recent.length) : 0
  const variantsSeen = attempts.filter(a => a.variant !== 'orig').length
  // errores por habilidad (últimos 100)
  const errBySkill: Record<string, [number, number]> = {}
  for (const a of attempts.slice(-100)) { const e = errBySkill[a.skill] ?? [0, 0]; e[1]++; if (a.grade < 2) e[0]++; errBySkill[a.skill] = e }
  const worst = Object.entries(errBySkill).filter(([, v]) => v[1] >= 4).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]).slice(0, 3)

  const setGoal = async (g: number) => { profile.dailyGoal = g; await db.profile.put({ ...profile }); void reload() }
  const toggleFree = async () => { profile.freeMode = !profile.freeMode; await db.profile.put({ ...profile }); void reload() }
  const doExport = async () => {
    const json = await exportAll()
    const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `ajedrez-progreso-${todayKey()}.json`; a.click(); URL.revokeObjectURL(url)
  }
  const doImport = (f: File | undefined) => { if (!f) return; f.text().then(t => importAll(t)).then(() => { setMsg('Progreso importado.'); void reload() }).catch(e => setMsg(`Error: ${e.message}`)) }
  const reset = async () => { if (!confirm('¿Borrar todo el progreso? No se puede deshacer.')) return; await Promise.all(db.tables.map(t => t.clear())); setMsg('Progreso borrado.'); void reload() }

  return (
    <div className="screen">
      <header className="hero"><h1>Progreso</h1></header>
      <div className="grid2">
        <div className="card mini"><span className="dim">Ejercicios</span><b>{total}</b><span className="dim">{acc}% limpios</span></div>
        <div className="card mini"><span className="dim">Últimos 30</span><b>{recentAcc}%</b><span className="dim">{avgTime}s de media</span></div>
        <div className="card mini"><span className="dim">Mejor racha</span><b>{profile.bestStreak} días</b><span className="dim">actual {profile.streak}</span></div>
        <div className="card mini"><span className="dim">Variantes</span><b>{variantsSeen}</b><span className="dim">espejo / colores</span></div>
      </div>

      <h4 className="section">Últimas dos semanas</h4>
      <div className="card chart">
        {last14.map(d => (
          <div key={d.day} className="bar-col" title={`${d.day}: ${d.puzzles} ejercicios`}>
            <div className="bar-v" style={{ height: `${(d.puzzles / maxP) * 100}%`, opacity: d.puzzles >= profile.dailyGoal ? 1 : 0.55 }} />
            <span>{d.day.slice(8)}</span>
          </div>
        ))}
      </div>

      {worst.length > 0 && <>
        <h4 className="section">Dónde fallas más (últimos 100)</h4>
        <div className="card">
          {worst.map(([k, [e, n]]) => <p key={k}><b>{SKILL_BY_KEY.get(k)?.name ?? k}</b> <span className="dim">— {e} fallos de {n}</span></p>)}
        </div>
      </>}

      <h4 className="section">Ajustes</h4>
      <div className="card">
        <p>Objetivo diario: {[10, 15, 20, 30].map(g => <button key={g} className={`chip ${profile.dailyGoal === g ? 'on' : ''}`} onClick={() => void setGoal(g)}>{g}</button>)}</p>
        <p><label><input type="checkbox" checked={profile.freeMode} onChange={() => void toggleFree()} /> Modo libre: todas las habilidades desbloqueadas</label></p>
        <div className="row">
          <button className="ghost" onClick={() => void doExport()}>Exportar progreso</button>
          <label className="ghost btn-like">Importar<input type="file" accept="application/json" hidden onChange={e => doImport(e.target.files?.[0])} /></label>
        </div>
        <p><button className="ghost danger" onClick={() => void reset()}>Borrar progreso</button></p>
        {msg && <p className="dim">{msg}</p>}
      </div>
      <p className="dim credits">Ejercicios: base de puzzles de Lichess (CC0). Motor: Stockfish (GPLv3). Tablero: react-chessboard.</p>
    </div>
  )
}
