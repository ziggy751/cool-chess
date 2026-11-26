import {test,expect} from '@playwright/test'
import {arcadeCatalog} from '../src/handset/game-catalog.js'

const phone=page=>page.locator('#match-phone')
const button=(page,name)=>phone(page).getByRole('button',{name,exact:true})
const launch=(page,id)=>phone(page).locator('.handset-app[data-app='+id+']').click()
const home=page=>button(page,'Phone Home').click()
async function openPhone(page){
  await page.addInitScript(()=>{
    if(!localStorage.getItem('evolution-settings'))
      localStorage.setItem('evolution-settings',JSON.stringify({camera:'flat',quality:'low'}))
  })
  await page.goto('/?view=match')
  await page.getByRole('button',{name:'Open Side Reel phone',exact:true}).click()
  await expect(phone(page).locator('.handset-app[data-app=arcade]')).toBeVisible()
}

test('arcade launches all new games and persists favourites, shortcuts, and puzzle progress',async({page})=>{
  test.setTimeout(110000)
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await openPhone(page)
  const actions={pong:'Serve',breaker:'Launch',golf:'Putt',dodge:'Start',basket:'Shoot',skate:'Jump',
    builder:'Place floor',color:'Start',flight:'Fire',bowling:'Roll',platform:'Jump'}
  for(const {id,name} of arcadeCatalog.slice(8)){
    await launch(page,'arcade')
    await phone(page).getByLabel('Search arcade games').fill(name)
    await expect(phone(page).locator('.arcade-entry')).toHaveCount(1)
    if(id==='pong'){
      await button(page,'Favourite Neon Pong').click()
      await expect(button(page,'Favourite Neon Pong')).toHaveAttribute('aria-pressed','true')
      await button(page,'Add Neon Pong home shortcut').click()
    }
    await button(page,'Play '+name).click()
    await expect(phone(page).locator('.handset-content')).toHaveAttribute('data-view',id)
    if(id in actions){
      await button(page,actions[id]).click()
      await expect(phone(page).getByRole('status')).toHaveText('Playing')
      if(id==='builder')await expect.poll(()=>page.evaluate(()=>Number(localStorage.getItem('evolution-handset-best-builder')))).toBeGreaterThan(0)
      await button(page,'Pause').click()
      await expect(button(page,'Resume')).toBeVisible()
    }
    if(id==='merge'){
      await button(page,'Drop in column 2').click()
      await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('evolution-handset-orchard')).board[1].length)).toBe(1)
    }
    if(id==='memory'){
      await button(page,'Card 1').click()
      await expect(phone(page).locator('.memory-card[data-revealed=true]')).toHaveCount(1)
    }
    if(id==='solitaire'){
      await button(page,'Draw card').click()
      await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('evolution-handset-phone-klondike')).stock.length)).toBe(23)
    }
    if(id==='reaction'){
      await button(page,'Begin test').click()
      await button(page,'TAP NOW').click()
      await expect(phone(page).getByRole('status')).toContainText('Result')
      const best=await page.evaluate(()=>Number(localStorage.getItem('evolution-handset-reaction-best')))
      expect(best).toBeGreaterThan(0)
    }
    await home(page)
  }
  await expect(phone(page).locator('.handset-app[data-app=pong]')).toBeVisible()
  await launch(page,'arcade')
  await phone(page).getByLabel('Arcade category').selectOption('favourites')
  await expect(phone(page).locator('.arcade-entry')).toHaveCount(1)
  await expect(button(page,'Play Neon Pong')).toBeVisible()
  expect(errors).toEqual([])
})

test('phone folders, dock, playlists, seek, mini player and turn notices work',async({page})=>{
  await openPhone(page)
  await button(page,'Arrange').click()
  await phone(page).getByLabel('Folder name').fill('Games')
  await phone(page).getByLabel('Apps for folder').selectOption(['wings','blocks'])
  await button(page,'Create folder').click()
  await expect(phone(page).locator('.handset-app[data-app=wings]')).toHaveCount(0)
  await button(page,'Games').click()
  await expect(phone(page).locator('.handset-app[data-app=wings]')).toBeVisible()
  await button(page,'‹ Home').click()
  await phone(page).getByLabel('Dock slot').selectOption('0')
  await phone(page).getByLabel('Dock app').selectOption('youtube')
  await expect(button(page,'Open YouTube Shorts')).toBeVisible()
  await button(page,'Done').click()
  await launch(page,'music')
  await expect(phone(page).locator('.record-cover')).toBeVisible()
  await button(page,'Play track').click()
  await expect(button(page,'Pause track')).toBeVisible()
  await expect(phone(page).getByLabel('Seek track')).toBeEnabled()
  await phone(page).getByLabel('Seek track').fill('10')
  await expect(phone(page).locator('.record-clock')).toContainText('0:10')
  await button(page,'Shuffle').click()
  await button(page,'Repeat').click()
  await expect(button(page,'Repeat')).toHaveAttribute('aria-pressed','true')
  await button(page,'Add to playlist').click()
  await button(page,'Library').click()
  await phone(page).getByLabel('Music playlist').selectOption('playlist')
  await expect(phone(page).locator('.record-track')).toHaveCount(1)
  await home(page)
  await launch(page,'arcade')
  await expect(phone(page).locator('.handset-mini')).toBeVisible()
  await page.locator('#grid [data-square=e2]').click()
  await page.locator('#grid [data-square=e4]').click()
  await button(page,'Notifications').click()
  await expect(phone(page).locator('.handset-notice')).toContainText('Black to move')
  await button(page,'Pause music').click()
  await expect(phone(page).locator('.handset-mini')).toBeHidden()
  await page.reload()
  await page.getByRole('button',{name:'Open Side Reel phone',exact:true}).click()
  await expect(button(page,'Games')).toBeVisible()
  await expect(button(page,'Open YouTube Shorts')).toBeVisible()
})

test('meme Canvas animates distinct beats and saves its screening, then pauses on a chess move',async({page})=>{
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await openPhone(page)
  await launch(page,'comedy')
  const title=await phone(page).locator('.comedy-title').innerText()
  const canvas=phone(page).locator('canvas')
  const initial=await canvas.evaluate(surface=>surface.toDataURL())
  await button(page,'Play short').click()
  await expect.poll(()=>phone(page).locator('progress').evaluate(progress=>progress.value)).toBeGreaterThan(3)
  expect(await canvas.evaluate(surface=>surface.toDataURL())).not.toBe(initial)
  await page.locator('#grid [data-square=e2]').click()
  await page.locator('#grid [data-square=e4]').click()
  await expect(button(page,'Resume short')).toBeVisible()
  await button(page,'Bookmark short').click()
  await button(page,'Generate 3 shorts').click()
  await expect(phone(page).locator('.comedy-title')).not.toHaveText(title)
  await phone(page).getByLabel('Comedy library').selectOption('saved')
  await expect(phone(page).locator('.comedy-title')).toHaveText(title)
  expect(errors).toEqual([])
})
