import {test,expect} from '@playwright/test'
import {Chess} from 'chess.js'

const nav=(page,label)=>page.locator('.main-nav').getByRole('button',{name:label,exact:true})
const click=(page,label)=>page.getByRole('button',{name:label,exact:true}).click()
const position=(page,square)=>page.locator('#grid [data-square='+square+']')
test.beforeEach(async({page})=>page.addInitScript(()=>{
  if(!localStorage.getItem('evolution-settings'))localStorage.setItem('evolution-settings',JSON.stringify({quality:'low',reduced:true,camera:'flat'}))
}))

test('real Stockfish scores a PGN and synchronizes the review, alternatives, replay, and saved results',async({page})=>{
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/')
  await nav(page,'Analysis').click()
  await page.getByLabel('FEN or PGN').fill('1. f3 e5 2. g4 Qh4# 0-1')
  await click(page,'Analyse PGN')
  await expect(page.locator('#analysis-progress')).toHaveText('Evaluated 4 / 4',{timeout:45000})
  await expect(page.locator('#review-white')).toHaveText(/\d+\.\d%/)
  await expect(page.locator('#analysis-rows .review-move [data-grade=Blunder]')).toHaveCount(1)
  const slider=page.getByLabel('Game position')
  await slider.fill('3')
  await expect(page.locator('#review-position')).toContainText('g4')
  await expect(position(page,'g4')).toHaveAttribute('aria-label','g4 white Pawn')
  await expect(page.locator('#review-coaching')).toContainText('forced mate')
  await page.getByRole('button',{name:/Best variation/}).click()
  await expect(page.locator('.flat-arrow.engine-arrow')).toBeVisible()
  await click(page,'Next review move')
  await expect(page.locator('#review-position')).toContainText('Variation ·')
  await click(page,'Back to played move')
  await click(page,'Retry move')
  await expect(page.locator('#review-position')).toContainText('White to move')
  await expect(position(page,'g2')).toHaveAttribute('aria-label','g2 white Pawn')
  await click(page,'Back to review')
  await click(page,'Flip review board')
  await expect(page.locator('#analysis-meter')).toHaveClass(/flipped/)
  await click(page,'Breakdown')
  await expect(page.locator('.review-count')).toHaveCount(12)
  await click(page,'Save analysis')
  await click(page,'Exit review')
  await nav(page,'Analysis').click()
  await page.locator('#review-saved button').first().click()
  await expect(page.locator('#analysis-progress')).toHaveText('Evaluated 4 / 4')
  await slider.fill('4')
  await expect(page.locator('#review-eval')).toContainText('M1')
  expect(errors).toEqual([])
})

test('known positions are classified by Stockfish and rank safety blocks review and coaching',async({page})=>{
  await page.goto('/')
  const rows=await page.evaluate(async()=>{
    const {Chess}=await import('/node_modules/chess.js/dist/esm/chess.js')
    const {AnalysisSession,presets,variation,openingBook,bookPosition}=await import('/src/analysis.js')
    const session=new AnalysisSession({...presets.standard,time:450})
    const book=await openingBook()
    const cases=[
      ['6k1/5ppp/8/8/8/8/5PP1/r5K1 w - - 0 1','Kh2'],
      ['6k1/5ppp/8/8/8/8/PPP5/4R1K1 w - - 0 1','a3'],
      ['r6k/5Qpp/7N/8/8/8/8/6K1 w - - 0 1','Qg8+'],
      ['8/8/8/8/5k2/8/8/K5R1 w - - 0 1','Rg4+'],
      [undefined,'e4'],
    ]
    try{
      const output=[]
      for(const [fen,san] of cases){
        const move=new Chess(fen).move(san)
        const row=await session.evaluate(move,Boolean(!fen && bookPosition([move],book).node))
        output.push({grade:row.grade,best:row.best,legal:row.candidates.every(item=>
          variation(move.before,item.pv).length===item.pv.length)})
      }
      return output
    }finally{session.close()}
  })
  expect(rows).toEqual([
    {grade:'Forced',best:'Kh2',legal:true},
    {grade:'Missed Opportunity',best:'Re8#',legal:true},
    {grade:'Brilliant',best:'Qg8+',legal:true},
    {grade:'Blunder',best:expect.any(String),legal:true},
    {grade:'Book',best:expect.any(String),legal:true},
  ])
  const starting=new Chess().fen()
  await nav(page,'Analysis').click()
  await page.getByLabel('FEN or PGN').fill(starting)
  await click(page,'Analyse FEN')
  await expect(page.locator('#analysis-progress')).toHaveText('Position evaluated')
  await click(page,'Exit review')
  await nav(page,'Settings').click()
  await page.getByLabel('AI coaching').selectOption('detailed')
  await click(page,'Close')
  await click(page,'Play chess')
  await click(page,'Ranked AI')
  await click(page,'Play Ranked AI')
  await nav(page,'Analysis').click()
  await expect(page.locator('#toast')).toContainText('Analysis is available after the match finishes')
  await expect(page.locator('#analysis-meter')).toBeHidden()
  await expect(page.locator('#live-coach')).toBeHidden()
})

test('optional practice coaching uses the engine and leaves the match playable',async({page})=>{
  await page.goto('/?view=match')
  await nav(page,'Settings').click()
  await page.getByLabel('AI coaching').selectOption('detailed')
  await click(page,'Close')
  await position(page,'e2').click()
  await position(page,'e4').click()
  await expect(page.locator('#live-coach')).toContainText('e4 · Book')
  await expect(page.locator('#live-coach')).toContainText('documented opening')
  await expect(page.locator('#analysis-meter')).toBeVisible()
  await expect(page.locator('#turn-banner')).toContainText('Black to move')
  await expect(page.locator('#grid [data-square=e4] [data-grade=Book]')).toBeVisible()
  await position(page,'e7').click()
  await position(page,'e5').click()
  await expect(page.locator('#live-coach')).toContainText('e5 · Book')
  await nav(page,'Settings').click()
  await page.getByLabel('AI coaching').selectOption('off')
  await click(page,'Close')
  await expect(page.locator('#live-coach')).toBeHidden()
  await expect(page.locator('#analysis-meter')).toBeHidden()
})
