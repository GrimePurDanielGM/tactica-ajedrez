import Dexie, { type Table } from 'dexie'
import type { Variant } from './transform'

export interface Card {
  puzzleId: string
  due: number          // epoch ms
  interval: number     // días
  ease: number
  reps: number
  lapses: number
  lastVariant: Variant
  skill: string        // habilidad con la que se introdujo
}
export interface Attempt {
  id?: number
  puzzleId: string
  ts: number
  grade: 0 | 1 | 2 | 3
  timeMs: number
  skill: string
  variant: Variant
  puzzleRating: number
  ratingBefore: number
  ratingAfter: number
}
export interface SkillStat {
  key: string
  rating: number
  attempts: number
  correct: number
  streak: number
  bestStreak: number
}
export interface Profile {
  id: 'me'
  rating: number
  xp: number
  streak: number
  bestStreak: number
  lastActiveDay: string
  dailyGoal: number
  createdAt: number
  freeMode: boolean
}
export interface DayStat {
  day: string
  puzzles: number
  correct: number
  xp: number
  timeMs: number
  endgames: number
  openings: number
}
export interface OpeningProgress {
  lineId: string
  due: number
  interval: number
  ease: number
  reps: number
  lapses: number
}
export interface EndgameProgress {
  drillId: string
  attempts: number
  completed: number
  bestMoves: number | null
  lastResult: 'win' | 'fail' | null
}

class TrainerDB extends Dexie {
  cards!: Table<Card, string>
  attempts!: Table<Attempt, number>
  skills!: Table<SkillStat, string>
  profile!: Table<Profile, string>
  days!: Table<DayStat, string>
  openings!: Table<OpeningProgress, string>
  endgames!: Table<EndgameProgress, string>
  constructor() {
    super('ajedrez-trainer')
    this.version(1).stores({
      cards: 'puzzleId, due, skill',
      attempts: '++id, puzzleId, ts, skill',
      skills: 'key',
      profile: 'id',
      days: 'day',
      openings: 'lineId, due',
      endgames: 'drillId',
    })
  }
}
export const db = new TrainerDB()

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export async function getProfile(): Promise<Profile> {
  let p = await db.profile.get('me')
  if (!p) {
    p = { id: 'me', rating: 900, xp: 0, streak: 0, bestStreak: 0, lastActiveDay: '', dailyGoal: 15, createdAt: Date.now(), freeMode: false }
    await db.profile.put(p)
  }
  return p
}
export async function getSkill(key: string): Promise<SkillStat> {
  let s = await db.skills.get(key)
  if (!s) {
    const p = await getProfile()
    s = { key, rating: Math.max(600, p.rating - 100), attempts: 0, correct: 0, streak: 0, bestStreak: 0 }
    await db.skills.put(s)
  }
  return s
}
export async function getDay(day = todayKey()): Promise<DayStat> {
  return (await db.days.get(day)) ?? { day, puzzles: 0, correct: 0, xp: 0, timeMs: 0, endgames: 0, openings: 0 }
}

/** Actualiza racha diaria al registrar actividad. */
export async function touchStreak(p: Profile): Promise<Profile> {
  const today = todayKey()
  if (p.lastActiveDay === today) return p
  const y = new Date(); y.setDate(y.getDate() - 1)
  const yesterday = todayKey(y)
  p.streak = p.lastActiveDay === yesterday ? p.streak + 1 : 1
  p.bestStreak = Math.max(p.bestStreak, p.streak)
  p.lastActiveDay = today
  await db.profile.put(p)
  return p
}

export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(xp / 120)) + 1
export const xpForLevel = (lvl: number) => (lvl - 1) ** 2 * 120

export async function exportAll() {
  const dump: Record<string, unknown> = {}
  for (const t of db.tables) dump[t.name] = await t.toArray()
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: dump })
}
export async function importAll(json: string) {
  const parsed = JSON.parse(json)
  if (!parsed?.data) throw new Error('Formato no válido')
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      if (parsed.data[t.name]) { await t.clear(); await t.bulkPut(parsed.data[t.name]) }
    }
  })
}
