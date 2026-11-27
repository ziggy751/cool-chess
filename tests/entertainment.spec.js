import {test,expect} from '@playwright/test'

const phone=page=>page.locator('#match-phone')
const button=(page,label)=>phone(page).getByRole('button',{name:label,exact:true})
const open=(page,id)=>phone(page).locator('.handset-app[data-app='+id+']').click()
const home=page=>button(page,'Phone Home').click()
const match=async page=>{
  await page.addInitScript(()=>localStorage.setItem('evolution-settings',JSON.stringify({quality:'low',camera:'flat',reduced:true})))
  await page.goto('/?view=match')
  await page.getByRole('button',{name:'Open Side Reel phone',exact:true}).click()
  await expect(phone(page)).toBeVisible()
}

test('real AI footage plays and pauses for chess while original music resumes on exit',async({page})=>{
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await match(page)
  await open(page,'music')
  await expect(phone(page).locator('.record-credit')).toContainText('Kevin MacLeod')
  await button(page,'Play track').click()
  await expect(button(page,'Pause track')).toBeVisible()
  await home(page)
  await expect(phone(page).locator('.handset-mini')).toBeVisible()
  await open(page,'comedy')
  await button(page,'Generated video').click()
  await expect(phone(page).getByRole('link',{name:'Source and license'})).toHaveAttribute('href',/commons.wikimedia.org/)
  await button(page,'Play film').click()
  const video=phone(page).locator('video')
  await expect.poll(()=>video.evaluate(el=>el.currentTime)).toBeGreaterThan(.1)
  await expect(phone(page).locator('.handset-mini')).toBeHidden()
  await page.locator('#grid [data-square=e2]').click()
  await page.locator('#grid [data-square=e4]').click()
  await expect.poll(()=>video.evaluate(el=>el.paused)).toBe(true)
  await button(page,'Favourite film').click()
  await expect(button(page,'Favourite film')).toHaveAttribute('aria-pressed','true')
  await home(page)
  await expect(phone(page).locator('.handset-mini')).toBeVisible()
  await open(page,'comedy')
  await button(page,'Brainrot').click()
  await phone(page).getByLabel('Brainrot format').selectOption('key')
  await expect(phone(page).locator('.comedy-title+p')).toContainText('Object duel')
  await button(page,'Play short').click()
  await expect.poll(()=>phone(page).locator('progress').evaluate(el=>el.value)).toBeGreaterThan(1.1)
  expect(errors).toEqual([])
})

test('AI Music Lab composes and plays a saved song and Spotify links open separately',async({page,context})=>{
  const failures=[]
  page.on('pageerror',error=>failures.push(error.message))
  await match(page)
  await open(page,'musiclab')
  await phone(page).getByLabel('Song genre').selectOption('opera')
  await phone(page).getByLabel('Song concept').selectOption('2')
  await button(page,'Generate Song').click()
  await expect(phone(page).getByRole('status')).toContainText('Ready to play')
  await expect(phone(page).locator('.screening-title')).toHaveText('My Fridge Is Rated 1200')
  await button(page,'Play song').click()
  await expect(button(page,'Pause song')).toBeVisible()
  await button(page,'Pause song').click()
  await phone(page).getByLabel('Seek generated song').fill('6.3')
  await expect(phone(page).locator('.lab-lyrics')).toContainText('fridge')
  await button(page,'Favourite song').click()
  await expect(button(page,'Favourite song')).toHaveAttribute('aria-pressed','true')
  await home(page)
  await open(page,'spotify')
  await phone(page).getByLabel('Playlist name').fill('Weekend')
  await phone(page).getByLabel('Spotify playlist URL').fill('https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk?si=test')
  await button(page,'Save playlist').click()
  const link=phone(page).getByRole('link',{name:'Weekend'})
  await expect(link).toHaveAttribute('href','https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk')
  await context.route('https://open.spotify.com/**',route=>route.fulfill({body:'Spotify link destination test'}))
  const popup=page.waitForEvent('popup')
  await link.click()
  const destination=await popup
  await destination.waitForURL('https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk')
  await destination.close()
  await expect(page.getByRole('region',{name:'Chess game'})).toBeVisible()
  expect(failures).toEqual([])
})

const api='https://www.youtube.com/iframe_api'
const playerFixture=`
  window.shortsCalls = []
  window.YT = {
    PlayerState:{PLAYING:1,PAUSED:2,ENDED:0},
    Player:class {
      constructor(target,options){
        this.id=options.videoId
        this.options=options
        this.frame=document.createElement('iframe')
        target.replaceWith(this.frame)
        this.log('mount')
        setTimeout(()=>{
          if(!this.frame.isConnected)return
          if(window.skipShort){
            window.skipShort=false
            options.events.onError({target:this,data:150})
          }else{
            options.events.onReady({target:this})
          }
        },30)
      }
      log(name,value){window.shortsCalls.push({name,id:this.id,value})}
      getIframe(){return this.frame}
      mute(){this.muted=true;this.log('mute')}
      unMute(){this.muted=false;this.log('unmute')}
      isMuted(){return this.muted}
      setVolume(value){this.log('volume',value)}
      getDuration(){return 90}
      getCurrentTime(){return 12}
      cueVideoById(info){this.log('cue',info.startSeconds)}
      playVideo(){this.log('play',this.muted);this.options.events.onStateChange({target:this,data:1})}
      pauseVideo(){this.log('pause');this.options.events.onStateChange({target:this,data:2})}
      destroy(){this.log('destroy');this.frame.remove()}
    }
  }
  window.onYouTubeIframeAPIReady()
`
const call=(page,name)=>page.evaluate(name=>window.shortsCalls?.filter(call=>call.name===name) || [],name)

test('Shorts pages with wheel, keyboard and drag, cleans up players and resumes the same Short',async({page,context})=>{
  await context.route(api,route=>route.fulfill({contentType:'text/javascript',body:playerFixture}))
  await match(page)
  await open(page,'youtube')
  const feed=phone(page).getByRole('region',{name:'YouTube Shorts feed'})
  const caption=feed.locator('.shorts-caption')
  const player=feed.locator('iframe')
  const source=feed.getByRole('link',{name:'Open on YouTube'})
  await feed.scrollIntoViewIfNeeded()
  await expect.poll(async()=> (await call(page,'play')).length).toBeGreaterThan(0)
  expect((await call(page,'play'))[0].value).toBe(true)
  await expect(player).toHaveCount(1)
  const first=await source.getAttribute('href')
  await caption.hover()
  await page.mouse.wheel(0,180)
  await expect(source).not.toHaveAttribute('href',first)
  await expect.poll(async()=> (await call(page,'destroy')).length).toBe(1)
  await feed.getByRole('button',{name:'Next Short'}).press('ArrowUp')
  await expect(source).toHaveAttribute('href',first)
  const rail=await feed.locator('.shorts-rail').boundingBox()
  await page.mouse.move(rail.x+rail.width/2,rail.y+85)
  await page.mouse.down()
  await page.mouse.move(rail.x+rail.width/2,rail.y+25,{steps:5})
  await page.mouse.up()
  await expect(source).not.toHaveAttribute('href',first)
  const resumed=await source.getAttribute('href')
  await expect(player).toHaveCount(1)
  await feed.getByRole('button',{name:'Unmute Short'}).click()
  expect((await call(page,'unmute')).length).toBe(1)
  await button(page,'Minimize phone').click()
  await expect(player).toHaveCount(0)
  expect((await call(page,'pause')).at(-1)?.id).toBe(resumed.split('/').at(-1))
  expect((await call(page,'destroy')).at(-1)?.id).toBe(resumed.split('/').at(-1))
  await page.getByRole('button',{name:'Open Side Reel phone',exact:true}).click()
  await expect(source).toHaveAttribute('href',resumed)
  await expect.poll(async()=> (await call(page,'cue')).at(-1)?.value).toBe(12)
  await expect(player).toHaveCount(1)
  await page.locator('#grid [data-square=e2]').click()
  await page.locator('#grid [data-square=e4]').click()
  await expect(page.locator('#grid [data-square=e4]')).toHaveAttribute('aria-label','e4 white Pawn')
})

test('Shorts skips an embedding error and shows offline retry',async({page,context})=>{
  await page.addInitScript(()=>{window.skipShort=true})
  await context.route(api,route=>route.fulfill({contentType:'text/javascript',body:playerFixture}))
  await match(page)
  await open(page,'youtube')
  const feed=phone(page).getByRole('region',{name:'YouTube Shorts feed'})
  await expect.poll(async()=> (await call(page,'mount')).length).toBe(2)
  const [first,second]=await call(page,'mount')
  expect(first.id).not.toBe(second.id)
  await expect(feed.locator('iframe')).toHaveCount(1)
  await context.setOffline(true)
  await expect(feed.getByRole('status')).toContainText('You’re offline')
  await expect(feed.locator('iframe')).toHaveCount(0)
  await context.setOffline(false)
  await feed.getByRole('button',{name:'Retry',exact:true}).click()
  await expect.poll(async()=> (await call(page,'mount')).length).toBe(3)
  await expect(feed.locator('iframe')).toHaveCount(1)
})

test('Shorts shows a retry if the IFrame API cannot load',async({page,context})=>{
  await context.route(api,route=>route.abort())
  await match(page)
  await open(page,'youtube')
  const feed=phone(page).getByRole('region',{name:'YouTube Shorts feed'})
  await expect(feed.getByRole('button',{name:'Retry',exact:true})).toBeVisible()
  await expect(feed.getByRole('link',{name:'Open on YouTube'})).toHaveAttribute('href',/^https:\/\/www.youtube.com\/shorts\//)
  await expect(feed.locator('iframe')).toHaveCount(0)
})

test('Shorts advances from a touch swipe on the mobile grip',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2})
  try{
    await context.route(api,route=>route.fulfill({contentType:'text/javascript',body:playerFixture}))
    const page=await context.newPage()
    await match(page)
    await open(page,'youtube')
    const grip=phone(page).locator('.shorts-rail')
    await grip.scrollIntoViewIfNeeded()
    const link=phone(page).getByRole('link',{name:'Open on YouTube'})
    const first=await link.getAttribute('href')
    const {x,y,width,height}=await grip.boundingBox()
    const session=await context.newCDPSession(page)
    const point={x:Math.round(x+width/2),y:Math.round(y+height/2)}
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]})
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,y:point.y-55}]})
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    await expect(link).not.toHaveAttribute('href',first)
    await expect(phone(page).locator('iframe')).toHaveCount(1)
  }finally{await context.close()}
})
