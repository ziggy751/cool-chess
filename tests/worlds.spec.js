import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('a live match survives location and table changes and exports a WebGL photograph',async({page})=>{
  test.setTimeout(150000)
  await page.setViewportSize({width:820,height:610})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error' && /THREE|GL_INVALID/.test(message.text()))errors.push(message.text())})
  await page.addInitScript(()=>localStorage.setItem('evolution-settings',JSON.stringify({
    reduced:true,quality:'low',environment:'walnut',
  })))
  await page.goto('/?view=match')
  const world=page.locator('#webgl')
  const view=page.getByRole('button',{name:'Switch between 2D and 3D'})
  await expect(world).toHaveAttribute('data-world','cabin')
  await view.click()
  await page.locator('[data-square=e2]').click()
  await page.locator('[data-square=e4]').click()
  await page.locator('.main-nav').getByRole('button',{name:'Collection',exact:true}).click()
  await page.getByRole('button',{name:'Environments',exact:true}).click()
  await page.getByRole('button',{name:'Space Station',exact:true}).click()
  await expect(world).toHaveAttribute('data-world','orbit')
  await page.getByRole('button',{name:'Tables',exact:true}).dispatchEvent('click')
  await page.getByRole('button',{name:'Walnut joinery',exact:true}).dispatchEvent('click')
  await page.getByRole('button',{name:'Explore location'}).dispatchEvent('click')
  await expect(world).toHaveAttribute('data-camera','roam')
  await page.keyboard.press('KeyD',{delay:350})
  await page.getByRole('button',{name:'Photography mode'}).dispatchEvent('click')
  await page.getByLabel('Pause scene').check()
  await page.getByLabel('Background blur').fill('0.6')
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button',{name:'Capture',exact:true}).click(),
  ])
  const png=await readFile(await download.path())
  expect(png.subarray(1,4).toString()).toBe('PNG')
  expect(png.length).toBeGreaterThan(12000)
  await page.getByRole('button',{name:'Exit photography'}).dispatchEvent('click')
  await page.getByRole('button',{name:'Apply and play'}).dispatchEvent('click')
  await expect(page.locator('#match-screen')).toBeVisible()
  if (await world.isVisible())await view.click()
  await expect(page.locator('[data-square=e4]')).toHaveAttribute('aria-label','e4 white Pawn')
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('evolution-settings')).table)).toBe('timber')
  expect(errors).toEqual([])
})
