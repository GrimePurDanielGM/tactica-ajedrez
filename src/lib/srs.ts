import { db, getProfile, getSkill, getDay, touchStreak, type Card, type Attempt } from './db'
import { PUZZLES, PUZZLE_BY_ID, SKILLS, SKILL_BY_KEY, puzzlesForTheme, type Puzzle } from './puzzles'
import { availableVariants, applyVariant, validatePuzzle, type Variant } from './transform'

export type Grade = 0 | 1 | 2 | 3   // 0 fallo · 1 con error/pista · 2 limpio · 3 limpio y rápido

const DAY = 86_400_000
const MIN = 60_000

/* ---------- Elo ---------- */
const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400))
function eloUpdate(rating: number, puzzleRating: number, score: number, k: number) {
  return Math.round(rating + k * (score - expected(rating, puzzleRating)))
}
const gradeScore = (g: Grade) => (g === 0 ? 0 : g === 1 ? 0.5 : 1)

/* ---------- Programación SM-2 adaptada ---------- */
export function schedule(card: Card, grade: Grade, now = Date.now()): Card {
  const c = { ...card }
  if (grade === 0) {
    c.lapses += 1
    c.reps = 0
    c.interval = 0
    c.ease = Math.max(1.3, c.ease - 0.2)
    c.due = now + 8 * MIN          // vuelve en la misma sesión, con otra variante
  } else {
    if (c.reps === 0) c.interval = grade === 1 ? 0.5 : 1
    else if (c.reps === 1) c.interval = grade === 1 ? 1 : 3
    else c.interval = Math.round(c.interval * (grade === 1 ? 1.2 : c.ease) * 10) / 10
    if (grade === 3) c.ease = Math.min(3.0, c.ease + 0.1)
    if (grade === 1) c.ease = Math.max(1.3, c.ease - 0.1)
    c.reps += 1
    c.due = now + c.interval * DAY
  }
  return c
}

/** Elige la variante para la próxima vista: distinta de la última cuando sea posible. */
export function nextVariant(p: Puzzle, last: Variant | null): Variant {
  const opts = availableVariants(p).filter(v => v !== last)
  const order: Variant[] = last === null ? ['orig'] : ['mirror', 'flip', 'both', 'orig']
  for (const v of order) if (opts.includes(v)) return v
  return 'orig'
}

/* ---------- XP ---------- */
export function xpFor(grade: Grade, puzzleRating: number, isReview: boolean) {
  const base = 8 + Math.max(0, Math.round((puzzleRating - 500) / 60))
  const mult = grade === 3 ? 1.25 : grade === 2 ? 1 : grade === 1 ? 0.5 : 0.15
  return Math.max(1, Math.round(base * mult * (isReview ? 1.1 : 1)))
}

/* ---------- Selección de ejercicios ---------- */
export interface Exercise {
  puzzle: Puzzle          // ya transformado
  original: Puzzle
  variant: Variant
  skill: string
  isReview: boolean
  card: Card | null
}

const recentIds: string[] = []
const remember = (id: string) => { recentIds.push(id); if (recentIds.length > 60) recentIds.shift() }

export async function unlockedSkills(): Promise<Set<string>> {
  const p = await getProfile()
  const stats = new Map((await db.skills.toArray()).map(s => [s.key, s]))
  const unlocked = new Set<string>()
  if (p.freeMode) { SKILLS.forEach(s => unlocked.add(s.key)); return unlocked }
  const tiers = [...new Set(SKILLS.map(s => s.tier))].sort()
  for (const tier of tiers) {
    if (tier <= 2) { SKILLS.filter(s => s.tier === tier).forEach(s => unlocked.add(s.key)); continue }
    const prev = SKILLS.filter(s => s.tier === tier - 1)
    const bronze = prev.filter(s => masteryOf(stats.get(s.key)) >= 1).length
    if (bronze >= Math.min(3, prev.length)) SKILLS.filter(s => s.tier === tier).forEach(s => unlocked.add(s.key))
    else break
  }
  return unlocked
}

/** 0 nada · 1 bronce · 2 plata · 3 oro */
export function masteryOf(s?: { correct: number; rating: number } | null): 0 | 1 | 2 | 3 {
  if (!s) return 0
  if (s.correct >= 90 && s.rating >= 1500) return 3
  if (s.correct >= 45 && s.rating >= 1200) return 2
  if (s.correct >= 15 && s.rating >= 850) return 1
  return 0
}
export const MASTERY_LABEL = ['—', 'Bronce', 'Plata', 'Oro']
export function masteryProgress(s?: { correct: number; rating: number } | null) {
  const m = masteryOf(s)
  const next = [[15, 850], [45, 1200], [90, 1500]][m]
  if (!next || !s) return { next: next ? { correct: next[0], rating: next[1] } : null, pct: m === 3 ? 1 : 0 }
  const pc = Math.min(1, s.correct / next[0]); const pr = Math.min(1, Math.max(0, (s.rating - 500) / (next[1] - 500)))
  return { next: { correct: next[0], rating: next[1] }, pct: Math.min(pc, pr) }
}

/** Repasos vencidos (opcionalmente de una habilidad). */
export async function dueCards(skill?: string, now = Date.now()) {
  let q = db.cards.where('due').belowOrEqual(now)
  const all = await q.toArray()
  return skill ? all.filter(c => c.skill === skill) : all
}

export async function pickExercise(skill: string | 'mixed'): Promise<Exercise | null> {
  const now = Date.now()
  // 1) repasos vencidos primero
  const due = (await dueCards(skill === 'mixed' ? undefined : skill, now)).sort((a, b) => a.due - b.due)
  for (const card of due) {
    const orig = PUZZLE_BY_ID.get(card.puzzleId)
    if (!orig || recentIds.slice(-5).includes(orig.id)) continue
    const variant = nextVariant(orig, card.lastVariant)
    let puzzle = applyVariant(orig, variant)
    if (!validatePuzzle(puzzle)) puzzle = orig
    remember(orig.id)
    return { puzzle, original: orig, variant: validatePuzzle(puzzle) && puzzle !== orig ? variant : 'orig', skill: card.skill, isReview: true, card }
  }
  // 2) puzzle nuevo cercano al rating de la habilidad
  let chosenSkill = skill
  if (skill === 'mixed') {
    const unlocked = [...(await unlockedSkills())]
    // prioriza habilidades con menos intentos
    const stats = new Map((await db.skills.toArray()).map(s => [s.key, s]))
    unlocked.sort((a, b) => (stats.get(a)?.attempts ?? 0) - (stats.get(b)?.attempts ?? 0) + (Math.random() - 0.5) * 6)
    chosenSkill = unlocked[Math.floor(Math.random() * Math.min(4, unlocked.length))]
  }
  const s = await getSkill(chosenSkill)
  const seen = new Set((await db.cards.toArray()).map(c => c.puzzleId))
  const pool = puzzlesForTheme(chosenSkill).filter(p => !seen.has(p.id) && !recentIds.includes(p.id))
  if (pool.length === 0) return null
  // ventana ±120 alrededor del rating; se amplía si hace falta
  let window = 120
  let cands: Puzzle[] = []
  while (cands.length < 8 && window < 1200) {
    cands = pool.filter(p => Math.abs(p.rating - s.rating) <= window)
    window += 100
  }
  if (cands.length === 0) cands = pool
  const orig = cands[Math.floor(Math.random() * cands.length)]
  remember(orig.id)
  return { puzzle: orig, original: orig, variant: 'orig', skill: chosenSkill, isReview: false, card: null }
}

/* ---------- Registro de resultado ---------- */
export async function recordResult(ex: Exercise, grade: Grade, timeMs: number) {
  const now = Date.now()
  const [profile0, skill, day] = await Promise.all([getProfile(), getSkill(ex.skill), getDay()])
  const profile = await touchStreak(profile0)
  const score = gradeScore(grade)
  const k = skill.attempts < 20 ? 40 : 24
  const before = skill.rating
  skill.rating = Math.max(400, eloUpdate(skill.rating, ex.original.rating, score, k))
  skill.attempts += 1
  if (grade >= 2) { skill.correct += 1; skill.streak += 1; skill.bestStreak = Math.max(skill.bestStreak, skill.streak) }
  else if (grade === 1) { skill.correct += 1; skill.streak = 0 }
  else skill.streak = 0
  // rating global: media móvil hacia la media de habilidades trabajadas
  const kg = ex.isReview ? 10 : 18
  profile.rating = Math.max(400, eloUpdate(profile.rating, ex.original.rating, score, kg))
  const xp = xpFor(grade, ex.original.rating, ex.isReview)
  profile.xp += xp

  const card: Card = ex.card ?? { puzzleId: ex.original.id, due: now, interval: 0, ease: 2.3, reps: 0, lapses: 0, lastVariant: 'orig', skill: ex.skill }
  const scheduled = schedule({ ...card, lastVariant: ex.variant }, grade, now)

  day.puzzles += 1; if (grade >= 1) day.correct += 1; day.xp += xp; day.timeMs += timeMs
  const attempt: Attempt = { puzzleId: ex.original.id, ts: now, grade, timeMs, skill: ex.skill, variant: ex.variant, puzzleRating: ex.original.rating, ratingBefore: before, ratingAfter: skill.rating }

  await db.transaction('rw', [db.cards, db.attempts, db.skills, db.profile, db.days], async () => {
    await db.cards.put(scheduled); await db.attempts.add(attempt); await db.skills.put(skill)
    await db.profile.put(profile); await db.days.put(day)
  })
  return { xp, ratingDelta: skill.rating - before, skill, profile, nextDue: scheduled.due }
}

export async function overview() {
  const [profile, day, stats, cards] = await Promise.all([getProfile(), getDay(), db.skills.toArray(), db.cards.toArray()])
  const now = Date.now()
  const due = cards.filter(c => c.due <= now).length
  const unlocked = await unlockedSkills()
  return { profile, day, stats, cardsTotal: cards.length, due, unlocked, totalPuzzles: PUZZLES.length }
}

export { SKILL_BY_KEY }
