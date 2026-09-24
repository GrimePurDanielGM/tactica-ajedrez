import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const init = require('stockfish')
const positions = {
  kp_a: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
  kp_b: '8/8/3k4/8/3K4/8/3P4/8 w - - 0 1',
  kp_c: '8/8/8/8/2k5/8/2KP4/8 w - - 0 1',
  kp_d: '8/8/8/3k4/8/2K5/3P4/8 w - - 0 1',
  hold_c: '8/8/8/3k4/8/8/3PK3/8 b - - 0 1',
  qvp: '8/8/8/8/8/8/1p1K4/1k5Q w - - 0 1',
  qvp2: '8/8/8/8/2K5/8/1p6/1k5Q w - - 0 1',
  qvp3: '8/8/8/8/8/2K5/1p6/1k5Q w - - 0 1',
}
const sf = await init('lite-single')
let cur = null, resolve, out = {}
sf.listener = l => {
  if (l.startsWith('info') && l.includes('score')) { const m = / score (cp|mate) (-?\d+)/.exec(l); if (m) out[cur] = m[1]+' '+m[2] + ' d' + (/ depth (\d+)/.exec(l)||[])[1] }
  if (l.startsWith('bestmove')) resolve(l)
}
sf.sendCommand('uci'); sf.sendCommand('isready')
for (const [k, fen] of Object.entries(positions)) {
  cur = k
  const bm = await new Promise(r => { resolve = r; sf.sendCommand('ucinewgame'); sf.sendCommand('position fen '+fen); sf.sendCommand('go depth 24') })
  console.log(k.padEnd(10), fen.padEnd(45), '=>', out[k], bm)
}
process.exit(0)
