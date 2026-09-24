import { PUZZLES } from '../src/lib/puzzles'
import { availableVariants, applyVariant, validatePuzzle } from '../src/lib/transform'
import { schedule } from '../src/lib/srs'
let bad = 0, total = 0
const perVariant: Record<string, number> = {}
for (const p of PUZZLES) {
  if (!validatePuzzle(p)) { console.log('ORIGINAL INVALID', p.id); bad++ }
  for (const v of availableVariants(p)) {
    total++
    const q = applyVariant(p, v)
    if (!validatePuzzle(q)) { bad++; if (bad < 10) console.log('INVALID', p.id, v, q.fen, q.moves.join(' ')) }
    else perVariant[v] = (perVariant[v] ?? 0) + 1
  }
}
console.log({ puzzles: PUZZLES.length, variantsChecked: total, invalid: bad, perVariant })
// SRS sanity
let c = { puzzleId: 'x', due: 0, interval: 0, ease: 2.3, reps: 0, lapses: 0, lastVariant: 'orig' as const, skill: 'fork' }
const now = Date.now()
const days = (t: number) => Math.round((t - now) / 86400000 * 10) / 10
c = schedule(c, 2, now); console.log('1ª correcta →', days(c.due), 'días')
c = schedule(c, 2, now); console.log('2ª correcta →', days(c.due), 'días')
c = schedule(c, 3, now); console.log('3ª rápida →', days(c.due), 'días')
c = schedule(c, 0, now); console.log('fallo →', Math.round((c.due - now) / 60000), 'min, lapses', c.lapses)
