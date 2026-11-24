import { test, expect } from '@playwright/test'
import { PerspectiveCamera, Vector3 } from 'three'

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    if(!localStorage.getItem('evolution-settings')) localStorage.setItem('evolution-settings',JSON.stringify({reduced:true,quality:'low'}))
  })
})

const choose2D = async page => {
  if (await page.locator('#webgl').isVisible()) await page.locator('#view-mode').click()
}
const move = async (page,from,to) => {
  await page.locator('[data-square="'+from+'"]').click()
  await page.locator('[data-square="'+to+'"]').click()
}
const nav = (page,label) => page.locator('.main-nav').getByRole('button',{name:label,exact:true})

test('3D match, 2D input, replay, and persistent customization',async ({page}) => {
  const errors = []
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/?view=match')
  const canvas = page.locator('#webgl canvas')
  await expect(canvas).toBeVisible()
  const rect = await canvas.boundingBox()
  const aspect = rect.width/rect.height
  const camera = new PerspectiveCamera(aspect<1.1?46:40,aspect,.1,100)
  camera.position.set(0,10.9,11.6)
  camera.lookAt(0,.12,0)
  camera.updateMatrixWorld()
  const project = (x,y,z) => {
    const {x:u,y:v} = new Vector3(x,y,z).project(camera)
    return [rect.x+rect.width*(u+1)/2,rect.y+rect.height*(1-v)/2]
  }
  await page.mouse.move(...project(.5,.5,2.5))
  await page.mouse.down()
  await page.mouse.move(...project(.5,.1,.5),{steps:7})
  await page.mouse.up()
  await choose2D(page)
  await expect(page.locator('#status')).toContainText('Black to move')
  await expect(page.getByRole('button',{name:'e4',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'First position'}).click()
  await expect(page.locator('[data-square="e2"]')).toHaveAttribute('aria-label','e2 white Pawn')
  await page.getByRole('button',{name:'Live position'}).click()
  await expect(page.locator('[data-square="e4"]')).toHaveAttribute('aria-label','e4 white Pawn')
  await nav(page,'Collection').click()
  await page.getByRole('button',{name:'Environments',exact:true}).click()
  await page.getByRole('searchbox',{name:'Search collection'}).fill('Zen')
  await page.getByRole('button',{name:'Zen garden',exact:true}).click()
  await page.getByRole('button',{name:'White pieces',exact:true}).click()
  await page.locator('[data-edit=material]').selectOption('gold')
  await page.getByRole('button',{name:'Saved presets',exact:true}).click()
  await page.getByLabel('Preset name').fill('Gold garden')
  await page.getByRole('button',{name:'Save preset'}).click()
  await page.reload()
  await expect(page.locator('#scene-name')).toHaveText('Zen garden')
  expect(errors).toEqual([])
})

test('Stockfish responds in a game and returns legal moves at all thirty levels',async ({page}) => {
  await page.goto('/')
  await page.getByRole('button',{name:'Play vs AI'}).click()
  await page.getByLabel('Thinking time').selectOption('150')
  await page.getByRole('button',{name:'Start game'}).click()
  await choose2D(page)
  await move(page,'e2','e4')
  await expect(page.locator('#status')).toContainText('White to move',{timeout:25000})
  const responses = await page.evaluate(async () => {
    const {Engine} = await import('/src/engine.js')
    const {Match} = await import('/src/rules.js')
    const engine = new Engine()
    const starting = new Match({minutes:0}).chess
    starting.move('e4')
    const fen = starting.fen()
    const moves = []
    for (let level = 1; level <= 30; level++) {
      const move = await engine.move(fen,level,90)
      const trial = new Match({fen,minutes:0}).chess
      trial.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]})
      moves.push(move)
    }
    engine.close()
    return moves
  })
  expect(responses).toHaveLength(30)
})

test('private rooms sync moves, survive reload, and support draw and rematch',async ({browser}) => {
  const whiteContext = await browser.newContext()
  const blackContext = await browser.newContext()
  const white = await whiteContext.newPage()
  const black = await blackContext.newPage()
  await Promise.all([white,black].map(page=>page.addInitScript(() => {
    localStorage.setItem('evolution-settings',JSON.stringify({quality:'low',reduced:true}))
  })))
  await white.goto('/')
  await nav(white,'Multiplayer').click()
  await white.getByLabel('Play as').selectOption('w')
  await white.getByRole('button',{name:'Create room'}).click()
  await expect(white.locator('#status')).toContainText('Waiting for opponent')
  const code = (await white.locator('#room-meta').innerText()).match(/[A-F0-9]{6}/)[0]
  await black.goto('/?room='+code)
  await expect(black.locator('#status')).toContainText('White to move')
  await choose2D(white)
  await choose2D(black)
  await move(white,'e2','e4')
  await expect(black.locator('[data-square="e4"]')).toHaveAttribute('aria-label','e4 white Pawn')
  await black.reload()
  await expect(black.locator('#status')).toContainText('Black to move')
  await choose2D(black)
  await move(black,'e7','e5')
  await expect(white.locator('[data-square="e5"]')).toHaveAttribute('aria-label','e5 black Pawn')
  await white.getByRole('button',{name:'Offer draw'}).click()
  await black.getByRole('button',{name:'Accept draw'}).click()
  await expect(white.locator('#status')).toContainText('Draw by agreement')
  await Promise.all([white,black].map(page=>page.getByRole('button',{name:'Close',exact:true}).click()))
  await white.getByRole('button',{name:'Rematch',exact:true}).click()
  await black.getByRole('button',{name:'Rematch',exact:true}).click()
  await expect(black.locator('#status')).toContainText('White to move')
  await whiteContext.close()
  await blackContext.close()
})

test('mobile board fits and solves a challenge',async ({page}) => {
  await page.setViewportSize({width:390,height:844})
  await page.goto('/')
  await page.getByRole('button',{name:'Puzzles',exact:true}).click()
  await page.getByRole('button',{name:/Back rank/}).click()
  await choose2D(page)
  await move(page,'e1','e8')
  await expect(page.locator('#status')).toContainText('Puzzle solved')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390)
})

test('variant controls and post-game engine review work',async ({page}) => {
  await page.goto('/?view=match')
  await choose2D(page)
  await page.getByRole('button',{name:'New game'}).click()
  await page.getByLabel('Rules').selectOption('fog')
  await page.getByRole('button',{name:'Start game'}).click()
  await expect(page.locator('#game-title')).toHaveText('Fog of War')
  await expect(page.locator('[data-square="e8"]')).toHaveAttribute('aria-label','e8')
  await move(page,'e2','e4')
  await expect(page.locator('[data-square="e8"]')).toHaveAttribute('aria-label','e8 black King')
  await expect(page.locator('#panel-content')).toContainText('available after the game')
  await page.getByRole('button',{name:'New game'}).click()
  await page.getByLabel('Rules').selectOption('standard')
  await page.getByRole('button',{name:'Start game'}).click()
  await move(page,'e2','e4')
  await move(page,'e7','e5')
  await page.getByRole('button',{name:'Resign',exact:true}).click()
  await page.getByRole('button',{name:'Confirm resignation'}).click()
  await page.getByRole('button',{name:'Review game'}).click()
  await expect(page.locator('#analysis-progress')).toContainText('Evaluated 2 / 2')
})
