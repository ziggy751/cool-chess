import { test, expect } from '@playwright/test'

test('every animated collection and board renders two distinct shader phases', async ({page})=>{
  const errors=[]
  page.on('pageerror',err=>errors.push(err.message))
  page.on('console',message=>{if(message.type()==='error') errors.push(message.text())})
  await page.route('**/materials-fixture',route=>route.fulfill({
    contentType:'text/html',body:'<!doctype html><div id="fixture" style="width:286px;height:230px"></div>',
  }))
  await page.goto('/materials-fixture')
  const result=await page.evaluate(async()=>{
    const [{Board,palettes},{premiumCollections},{Match}]=await Promise.all([
      import('/src/board.js'),import('/src/collections.js'),import('/src/rules.js'),
    ])
    const board=new Board(document.getElementById('fixture'),()=>{})
    await new Promise(requestAnimationFrame)
    board.renderer.setAnimationLoop(null)
    async function phase(time) {
      board.time.value=time
      const pixels=await (await board.photograph()).arrayBuffer()
      return [...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].join(',')
    }
    const staticItems=[]
    const materials=Object.entries(premiumCollections).filter(([,set])=>set.category==='animated')
    for (const [id,set] of materials) {
      board.setTheme('walnut',set.white,set.black,'walnut',id)
      board.inspectPiece('k','w')
      if(await phase(.2)===await phase(2.4))staticItems.push(id)
    }
    board.showBoard()
    board.reset('angled')
    board.render(new Match().chess,null,[],null,false)
    const themes=Object.keys(palettes).filter(key=>palettes[key][4])
    for(const id of themes){
      board.setTheme(id,'ivory','ebony','walnut','staunton')
      if(await phase(.2)===await phase(2.4))staticItems.push(id)
    }
    return {staticItems,materials:materials.length,boards:themes.length}
  })
  expect(result).toEqual({staticItems:[],materials:31,boards:16})
  expect(errors).toEqual([])
})
