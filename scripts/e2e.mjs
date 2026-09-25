import { chromium, devices } from 'playwright'
const shots = new URL('../e2e-shots/', import.meta.url).pathname
import fs from 'fs'; fs.mkdirSync(shots, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()) })
await page.goto('http://localhost:4173/')
await page.waitForSelector('.ring-card')
await page.screenshot({ path: `${shots}/01-home.png` })
// Empezar entrenamiento mixto
await page.click('.ring-card')
try { await page.waitForFunction(() => window.__ex, null, { timeout: 10000 }) } catch (e) { await page.screenshot({ path: `${shots}/err.png` }); console.log(errors); throw e }
await page.waitForTimeout(1200)
await page.screenshot({ path: `${shots}/02-puzzle.png` })
const sqSel = async (sq) => { const el = await page.$(`[data-square="${sq}"]`); if (!el) throw new Error('no square ' + sq); return el }
const clickSq = async (sq) => { const el = await sqSel(sq); await el.click() }
async function solve(wrongFirst = false) {
  const ex = await page.evaluate(() => window.__ex)
  console.log('puzzle', ex.original.id, ex.variant, ex.skill, 'moves', ex.puzzle.moves.join(' '))
  const moves = ex.puzzle.moves
  for (let i = 1; i < moves.length; i += 2) {
    if (wrongFirst && i === 1) {
      // intento erróneo: mover el rey a una casilla cualquiera no funciona siempre; usamos un origen válido con destino distinto
      const legal = await page.evaluate(() => null)
    }
    await clickSq(moves[i].slice(0, 2)); await page.waitForTimeout(150); await clickSq(moves[i].slice(2, 4))
    if (moves[i].length > 4) { await page.click(`.promo button:has-text("${{q:'Dama',r:'Torre',b:'Alfil',n:'Caballo'}[moves[i][4]]}")`) }
    await page.waitForTimeout(700)
  }
  await page.waitForSelector('.result', { timeout: 5000 })
}
await solve()
await page.screenshot({ path: `${shots}/03-result.png` })
const res1 = await page.textContent('.result h3'); console.log('result1:', res1)
await page.click('button:has-text("Siguiente")')
await page.waitForTimeout(1500)
// segundo puzzle: usar "Ver solución" (fallo)
await page.click('button:has-text("Ver solución")')
await page.waitForSelector('.result', { timeout: 15000 })
console.log('result2:', await page.textContent('.result h3'))
await page.click('button:has-text("Siguiente")')
await page.waitForTimeout(1500)
await solve()
console.log('result3:', await page.textContent('.result h3'))
await page.click('button:has-text("Terminar")')
await page.waitForSelector('.ring-card')
await page.screenshot({ path: `${shots}/04-home-after.png` })
// Habilidades
await page.click('.tabs button:has-text("Habilidades")'); await page.waitForTimeout(500)
await page.screenshot({ path: `${shots}/05-skills.png` })
// Finales: mate con dama
await page.click('.tabs button:has-text("Finales")'); await page.waitForTimeout(500)
await page.screenshot({ path: `${shots}/06-endgames.png` })
await page.click('.row-item:has-text("Mate con dama")')
await page.waitForSelector('.goal'); await page.waitForTimeout(1500)
// jugar una jugada Qh1-c6? (h1->c6 es legal en 8/8/8/4k3/8/8/8/4K2Q)
await clickSq('h1'); await page.waitForTimeout(150); await clickSq('c6')
await page.waitForTimeout(4000)
await page.screenshot({ path: `${shots}/07-endgame.png` })
console.log('endgame status:', await page.textContent('.turn'))
await page.click('.topbar .back')
// Aperturas
await page.click('.tabs button:has-text("Aperturas")'); await page.waitForTimeout(500)
await page.screenshot({ path: `${shots}/08-openings.png` })
await page.click('.row-item:has-text("Giuoco Pianissimo")')
await page.waitForSelector('.goal'); await page.waitForTimeout(1000)
const line = ['e2e4','g1f3','f1c4','c2c3','d2d3','e1g1','f1e1','a2a4']
for (const m of line) { await clickSq(m.slice(0,2)); await page.waitForTimeout(150); await clickSq(m.slice(2,4)); await page.waitForTimeout(900) }
await page.waitForSelector('.result', { timeout: 8000 })
console.log('opening:', await page.textContent('.result h3'))
await page.screenshot({ path: `${shots}/09-opening-done.png` })
await page.click('button:has-text("Volver")')
await page.click('.tabs button:has-text("Progreso")'); await page.waitForTimeout(600)
await page.screenshot({ path: `${shots}/10-stats.png` })
console.log('errors:', errors)
await browser.close()
