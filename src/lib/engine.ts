/** Envoltorio mínimo UCI sobre Stockfish (lite, un hilo) en un Web Worker. */
export interface EvalResult { bestMove: string | null; cp: number | null; mate: number | null }

class Engine {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private listeners: ((line: string) => void)[] = []

  private init() {
    if (this.ready) return this.ready
    this.worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`)
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data)
      for (const l of this.listeners) l(line)
    }
    this.ready = new Promise<void>(resolve => {
      const onLine = (l: string) => { if (l === 'uciok') { this.off(onLine); resolve() } }
      this.on(onLine)
      this.send('uci')
    }).then(() => new Promise<void>(resolve => {
      const onLine = (l: string) => { if (l === 'readyok') { this.off(onLine); resolve() } }
      this.on(onLine)
      this.send('setoption name UCI_LimitStrength value false')
      this.send('isready')
    }))
    return this.ready
  }
  private on(f: (l: string) => void) { this.listeners.push(f) }
  private off(f: (l: string) => void) { this.listeners = this.listeners.filter(x => x !== f) }
  private send(cmd: string) { this.worker?.postMessage(cmd) }

  /** Analiza y devuelve mejor jugada + evaluación (desde el punto de vista del bando que mueve). */
  analyse(fen: string, opts: { depth?: number; movetime?: number; skill?: number } = {}): Promise<EvalResult> {
    const run = async () => {
      await this.init()
      const skill = opts.skill ?? 20
      this.send(`setoption name Skill Level value ${skill}`)
      return new Promise<EvalResult>(resolve => {
        let cp: number | null = null, mate: number | null = null
        const onLine = (l: string) => {
          if (l.startsWith('info') && l.includes(' score ')) {
            const m = / score (cp|mate) (-?\d+)/.exec(l)
            if (m) { if (m[1] === 'cp') { cp = Number(m[2]); mate = null } else { mate = Number(m[2]); cp = null } }
          } else if (l.startsWith('bestmove')) {
            this.off(onLine)
            const bm = l.split(' ')[1]
            resolve({ bestMove: bm && bm !== '(none)' ? bm : null, cp, mate })
          }
        }
        this.on(onLine)
        this.send('ucinewgame')
        this.send(`position fen ${fen}`)
        if (opts.movetime) this.send(`go movetime ${opts.movetime}`)
        else this.send(`go depth ${opts.depth ?? 12}`)
      })
    }
    const p = this.queue.then(run, run)
    this.queue = p.catch(() => {})
    return p
  }
  warmup() { void this.init() }
}

export const engine = new Engine()
