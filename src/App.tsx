import { useState } from 'react'
import Home from './screens/Home'
import Skills from './screens/Skills'
import Endgames from './screens/Endgames'
import Openings from './screens/Openings'
import Stats from './screens/Stats'
import PuzzleTrainer from './components/PuzzleTrainer'
import EndgameDrillView from './components/EndgameDrill'
import OpeningTrainer from './components/OpeningTrainer'
import type { EndgameDrill } from './data/endgames'
import type { OpeningLine } from './data/openings'
import type { OpeningProgress } from './lib/db'

type Tab = 'home' | 'skills' | 'endgames' | 'openings' | 'stats'
type Modal =
  | { kind: 'puzzle'; skill: string | 'mixed' }
  | { kind: 'endgame'; drill: EndgameDrill }
  | { kind: 'opening'; line: OpeningLine; progress: OpeningProgress | undefined }
  | null

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Hoy', icon: '⌂' },
  { id: 'skills', label: 'Habilidades', icon: '▦' },
  { id: 'endgames', label: 'Finales', icon: '♔' },
  { id: 'openings', label: 'Aperturas', icon: '♘' },
  { id: 'stats', label: 'Progreso', icon: '◔' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [modal, setModal] = useState<Modal>(null)
  const [key, setKey] = useState(0)            // fuerza recarga de pantallas al volver
  const close = () => { setModal(null); setKey(k => k + 1) }

  if (modal?.kind === 'puzzle') return <PuzzleTrainer skill={modal.skill} onExit={close} />
  if (modal?.kind === 'endgame') return <EndgameDrillView drill={modal.drill} onExit={close} />
  if (modal?.kind === 'opening') return <OpeningTrainer line={modal.line} progress={modal.progress} onExit={close} />

  return (
    <div className="app">
      <main key={key}>
        {tab === 'home' && <Home onTrain={skill => setModal({ kind: 'puzzle', skill })} goTo={setTab} />}
        {tab === 'skills' && <Skills onTrain={skill => setModal({ kind: 'puzzle', skill })} />}
        {tab === 'endgames' && <Endgames onPlay={drill => setModal({ kind: 'endgame', drill })} />}
        {tab === 'openings' && <Openings onPlay={(line, progress) => setModal({ kind: 'opening', line, progress })} />}
        {tab === 'stats' && <Stats />}
      </main>
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span className="ti">{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
