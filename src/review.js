import { Chess } from 'chess.js'
import { AnalysisSession, accuracy, bookPosition, chance, chartValue, grades, notation, openingBook, presets, standardStart, uciFor, variation, whiteScore } from './analysis.js'

const element=(tag,className='',text='')=>Object.assign(document.createElement(tag),{className,textContent:text})
const names={w:'White',b:'Black'}
const notable=new Set(['Brilliant','Great','Mistake','Blunder','Missed Opportunity'])
const mix=(score)=>score?Math.max(2,Math.min(98,chance(score))):50
export function badge(grade){
  const [mark,color]=grades[grade] || ['…','#b5b6bc']
  const node=element('span','analysis-badge',mark)
  node.style.setProperty('--grade',color)
  node.dataset.grade=grade || ''
  node.title=grade || 'Waiting for analysis'
  node.setAttribute('aria-label',node.title)
  return node
}

export function updateMeter(host,score,flipped,enabled){
  host.hidden=!enabled || !score
  if(host.hidden)return
  host.style.setProperty('--white-advantage',mix(score)+'%')
  host.classList.toggle('flipped',flipped)
  host.dataset.leader=score.value>=0?'white':'black'
  host.querySelector('strong').textContent=notation(score)
  host.setAttribute('aria-label','White evaluation '+notation(score))
}

export class Review {
  constructor(host,actions){
    this.host=host
    Object.assign(this,actions)
    this.workspace=host.querySelector('#review-details')
  }

  open(snapshot,record){
    this.close()
    this.game=snapshot
    this.rows=record?.rows?.slice() || []
    this.startScore=record?.startScore || null
    this.positionCandidates=record?.positionCandidates || []
    this.done=Boolean(record)
    this.index=0
    this.line=null
    this.rehearsal=null
    this.preset=record?.preset || 'quick'
    this.options=record?.options || presets[this.preset]
    this.workspace.innerHTML=`
      <div class="review-summary"><div><span>White accuracy</span><strong id="review-white">—</strong><small id="review-white-level"></small></div>
        <div><span>Black accuracy</span><strong id="review-black">—</strong><small id="review-black-level"></small></div></div>
      <section class="review-chart"><div class="review-chart-title"><h2>Evaluation</h2><span id="review-eval"></span></div>
        <canvas id="review-graph" width="640" height="155" aria-label="Evaluation graph"></canvas>
        <label class="review-scrubber"><span>Game position</span><input type="range" id="review-scrub" min="0" value="0"><output id="review-ply"></output></label>
      <button type="button" id="review-turning" hidden></button></section>
      <div id="review-coaching" class="review-coach"></div>
      <div class="review-tabs" role="group" aria-label="Review details">
        <button data-review-tab="moves" aria-pressed="true">Moves</button><button data-review-tab="breakdown" aria-pressed="false">Breakdown</button>
        <button data-review-tab="opening" aria-pressed="false">Opening</button>
      </div><div class="review-lists" id="analysis-rows"></div>
      <details class="review-settings"><summary>Engine controls</summary><div class="review-engine-fields">
        <label>Preset<select id="review-preset">${Object.entries(presets).map(([id,preset])=>`<option value="${id}">${preset.name}</option>`).join('')}</select></label>
        <label>Target depth<input id="review-depth" type="number" min="6" max="28"></label>
        <label>Time per search (ms)<input id="review-time" type="number" min="50" max="5000"></label>
        <label>Candidate moves<input id="review-lines" type="number" min="1" max="5"></label>
      </div><button id="review-run" type="button" class="secondary">Run analysis</button></details>`
    this.tab='moves'
    const get=id=>this.workspace.querySelector('#'+id)
    this.chart=get('review-graph')
    this.scrub=get('review-scrub')
    this.scrub.max=snapshot.moves.length
    this.scrub.oninput=()=>this.go(+this.scrub.value)
    this.chart.onclick=event=>{
      const {left,width}=this.chart.getBoundingClientRect()
      this.go(Math.round((event.clientX-left)/width*this.game.moves.length))
    }
    for(const tab of this.workspace.querySelectorAll('[data-review-tab]'))tab.onclick=()=>{
      this.tab=tab.dataset.reviewTab
      for(const item of this.workspace.querySelectorAll('[data-review-tab]'))item.setAttribute('aria-pressed',String(item===tab))
      this.drawList()
    }
    get('review-preset').value=this.preset
    const populate=options=>{
      get('review-depth').value=options.depth
      get('review-time').value=options.time
      get('review-lines').value=options.lines
    }
    populate(this.options)
    get('review-preset').onchange=()=>populate(presets[get('review-preset').value])
    get('review-run').onclick=()=>{
      if(!['review-depth','review-time','review-lines'].every(id=>get(id).reportValidity()))return
      this.preset=get('review-preset').value
      this.options={depth:+get('review-depth').value,time:+get('review-time').value,lines:+get('review-lines').value}
      this.run()
    }
    for(const [id,fn] of Object.entries({'review-prev':()=>this.step(-1),'review-next':()=>this.step(1),'review-play':()=>this.togglePlay(),
      'review-flip':()=>{this.flipped=!this.flipped;this.position()},'review-export':()=>this.exportGame(this.game.pgn),
      'review-save':()=>this.save()}))this.host.querySelector('#'+id).onclick=fn
    this.flipped=false
    this.summary()
    this.go(0)
    this.setProgress()
    this.updateTitle()
    if(!record)this.run()
    openingBook().then(()=>{if(this.game===snapshot){this.updateTitle();if(this.tab==='opening')this.drawList()}}).catch(()=>{})
  }

  close(){
    this.session?.close()
    this.session=null
    this.pause()
    this.game=null
  }

  setProgress(message){
    const total=this.game.moves.length
    const successful=!total?Number(this.done):this.rows.length
    const bar=this.host.querySelector('#review-progress')
    bar.max=Math.max(1,total)
    bar.value=successful
    this.host.querySelector('#analysis-progress').textContent=message ||
      (total ? (this.done?'Evaluated ':'Evaluating ')+this.rows.length+' / '+total : this.done?'Position evaluated':'Evaluating position…')
    this.host.querySelector('#review-save').disabled=!this.done || !this.startScore
  }

  updateTitle(){
    const {opening}=bookPosition(this.game.moves)
    this.host.querySelector('#review-opening').textContent=this.game.initial===standardStart && opening?
      opening.eco+' · '+opening.name:this.game.moves.length?'Game review':'Position review'
  }

  async run(){
    this.session?.close()
    const session=this.session=new AnalysisSession(this.options)
    this.rows=[]
    this.done=false
    this.startScore=null
    this.positionCandidates=[]
    this.summary()
    this.go(0)
    this.setProgress()
    try{
      const first=await session.search(this.game.initial)
      if(this.session!==session)return
      this.startScore=whiteScore(this.game.initial,first.score)
      this.positionCandidates=first.lines.map(line=>({...line,score:whiteScore(this.game.initial,line.score)}))
      this.position()
      this.coach()
      const book=await openingBook().catch(()=>null)
      if(this.session!==session)return
      this.updateTitle()
      let node=this.game.initial===standardStart?book:null
      for(const move of this.game.moves){
        node=node?.next[move.san]
        const result=await session.evaluate(move,Boolean(node))
        if(this.session!==session)return
        this.rows.push(result)
        this.summary()
        this.setProgress()
        if(this.rows.length===this.index && !this.line && !this.rehearsal){this.position();this.coach()}
        if(this.tab==='moves'){
          const item=this.workspace.querySelectorAll('.review-move')[this.rows.length-1]
          if(item){
            item.children[2].replaceWith(badge(result.grade))
            item.children[3].textContent=notation(result.after)
          }
        }
      }
      this.done=true
      this.summary()
      this.setProgress()
      this.position()
      this.coach()
      this.drawList()
    }catch(error){
      if(this.session===session)this.setProgress(error.message)
    }finally{session.close()}
  }

  save(){
    const {game,rows,startScore,positionCandidates,preset,options}=this
    this.saveReview({game,rows,startScore,positionCandidates,preset,options,date:Date.now()})
  }

  summary(){
    const get=id=>this.workspace.querySelector('#'+id)
    for(const [side,label] of [['w','white'],['b','black']]){
      const score=accuracy(this.rows,side)
      get('review-'+label).textContent=score===null?'—':score.toFixed(1)+'%'
      const performance=get('review-'+label+'-level')
      performance.title='Heuristic based on this game’s estimated accuracy and the selected engine limits'
      performance.textContent=this.done && score!==null?
        'Estimated performance '+Math.round((500+score*score*.2)/50)*50+' Elo':''
    }
    const worst=this.rows.reduce((best,row,index)=>!best || row.loss>best.row.loss?{row,index}:best,null)
    get('review-turning').hidden=!(worst?.row.loss>=7)
    get('review-turning').textContent=worst?.row.loss>=7?
      'Turning point · '+this.moveLabel(worst.index+1)+' '+worst.row.move.san+' · '+worst.row.grade:''
    get('review-turning').onclick=()=>{if(worst?.row.loss>=7)this.go(worst.index+1)}
    this.drawGraph()
  }

  drawGraph(){
    const ctx=this.chart.getContext('2d')
    const {width,height}=this.chart
    const y=score=>height/2-Math.tanh((chartValue(score) || 0)/385)*(height/2-8)
    const dx=width/Math.max(1,this.game.moves.length)
    ctx.fillStyle='#293a32';ctx.fillRect(0,0,width,height/2)
    ctx.fillStyle='#242a39';ctx.fillRect(0,height/2,width,height/2)
    ctx.strokeStyle='#6c776d';ctx.lineWidth=1
    ctx.beginPath();ctx.moveTo(0,height/2);ctx.lineTo(width,height/2);ctx.stroke()
    if(!this.startScore)return
    ctx.strokeStyle='#c1dd9b';ctx.lineWidth=2.5
    ctx.beginPath();ctx.moveTo(0,y(this.startScore))
    this.rows.forEach((row,index)=>ctx.lineTo(dx*(index+1),y(row.after)))
    ctx.stroke()
    this.rows.forEach((row,index)=>{
      if(!notable.has(row.grade))return
      ctx.fillStyle=grades[row.grade][1];ctx.beginPath()
      ctx.arc(Math.min(width-4,dx*(index+1)),y(row.after),4,0,Math.PI*2);ctx.fill()
    })
    ctx.strokeStyle='#eee0c6';ctx.beginPath()
    ctx.moveTo(dx*this.index,0);ctx.lineTo(dx*this.index,height);ctx.stroke()
  }

  moveLabel(index){
    const fen=this.game.moves[index-1]?.before
    return fen?fen.split(' ')[5]+(fen.split(' ')[1]==='w'?'.':'…'):'Start'
  }

  go(index,{auto=false}={}){
    if(!this.game)return
    if(!auto)this.pause()
    this.index=Math.max(0,Math.min(index,this.game.moves.length))
    this.line=null
    this.rehearsal=null
    this.position()
    this.drawGraph()
    this.coach()
    this.drawList()
  }

  step(delta){
    if(!this.line){this.go(this.index+delta);return}
    this.pause()
    this.line.index=Math.max(0,Math.min(this.line.moves.length,this.line.index+delta))
    this.position()
    this.coach()
  }

  pause(){
    clearInterval(this.timer)
    this.timer=null
    const control=this.host.querySelector('#review-play')
    if(control)control.textContent='Auto replay'
  }

  togglePlay(){
    if(this.timer){this.pause();return}
    if(this.line){
      if(this.line.index>=this.line.moves.length)this.line.index=0
      this.timer=setInterval(()=>{
        if(this.line.index>=this.line.moves.length){this.pause();return}
        this.line.index++
        this.position();this.coach()
      },750)
    }else{
      if(this.index>=this.game.moves.length)this.go(0)
      if(!this.game.moves.length)return
      this.timer=setInterval(()=>{
        if(this.index>=this.game.moves.length){this.pause();return}
        this.go(this.index+1,{auto:true})
      },850)
    }
    this.host.querySelector('#review-play').textContent='Pause replay'
  }

  position(){
    if(!this.game)return
    const row=this.rows[this.index-1]
    const move=this.game.moves[this.index-1]
    let fen=move?.after || this.game.initial
    let score=row?.after || (!this.index?this.startScore:null)
    let marks=move?[[move.from,'origin'],[move.to,'destination']]:[]
    let label=move?this.moveLabel(this.index)+' '+move.san:'Starting position'
    let grade=row?.grade
    let arrow=null
    if(this.line){
      const played=this.line.moves[this.line.index-1]
      fen=played?.after || this.line.fen
      score=this.line.index<=1?this.line.score:null
      arrow=!played && this.line.moves[0]?[this.line.moves[0].from,this.line.moves[0].to]:null
      marks=played?[[played.from,'origin'],[played.to,'destination']]:arrow?[[arrow[0],'selected']]:[]
      grade=null
      label=played?'Variation · '+played.san:'Variation · starting position'
    }else if(this.rehearsal){
      fen=this.rehearsal.fen
      score=null
      const chess=new Chess(fen)
      marks=this.rehearsal.selected?[[this.rehearsal.selected,'selected'],...chess.moves({square:this.rehearsal.selected,verbose:true})
        .map(candidate=>[candidate.to,candidate.captured?'capture':'move'])]:[]
      grade=null
      label='Retry · '+names[chess.turn()]+' to move'
    }else if(!move && this.positionCandidates?.length){
      const suggestion=variation(fen,this.positionCandidates[0].pv)[0]
      if(suggestion){arrow=[suggestion.from,suggestion.to];marks=[[suggestion.from,'selected']]}
    }
    this.host.querySelector('#review-position').textContent=label
    this.workspace.querySelector('#review-eval').textContent=notation(score)
    this.workspace.querySelector('#review-ply').textContent=this.index+' / '+this.game.moves.length
    this.scrub.value=this.index
    this.host.querySelector('#review-prev').disabled=this.line?this.line.index===0:this.index===0
    this.host.querySelector('#review-next').disabled=this.line?this.line.index>=this.line.moves.length:this.index>=this.game.moves.length
    this.showPosition({chess:new Chess(fen),flipped:this.flipped,score,marks,arrow,grade,square:grade?move?.to:null,
      selected:this.rehearsal?.selected})
  }

  coach(){
    const box=this.workspace.querySelector('#review-coaching')
    box.replaceChildren()
    if(this.rehearsal){
      box.append(element('h2','','Retry the move'),element('p','',this.rehearsal.message || 'Select a piece and try to find a stronger move.'))
      const cancel=element('button','secondary','Back to review')
      cancel.onclick=()=>this.go(this.index)
      box.append(cancel)
      return
    }
    if(this.line){
      box.append(element('h2','','Engine variation'),element('p','review-line',this.line.moves.map((move,index)=>
        index===this.line.index-1?'['+move.san+']':move.san).join(' ')))
      const back=element('button','secondary','Back to played move')
      back.onclick=()=>this.go(this.index)
      box.append(back)
      return
    }
    const row=this.rows[this.index-1]
    const candidates=row?.candidates || (!this.index?this.positionCandidates:[])
    if(row){
      const heading=element('h2')
      heading.append(badge(row.grade),document.createTextNode(row.grade))
      box.append(heading,element('p','',row.explanation))
      box.append(element('p','review-comparison','Played '+row.move.san+' · Suggested '+(row.best || '—')+' · Depth '+row.depth))
    }else{
      box.append(element('h2','','Coaching'),element('p','',this.game.moves.length?
        'Select a move to see its explanation and the engine’s alternatives.':'Explore Stockfish’s candidate moves from this position.'))
    }
    for(const [index,candidate] of (candidates || []).entries()){
      const fen=row?.move.before || this.game.initial
      const moves=variation(fen,candidate.pv)
      if(!moves.length)continue
      const button=element('button','candidate-line')
      button.append(element('strong','',notation(candidate.score)),element('span','',moves.slice(0,5).map(move=>move.san).join(' ')))
      button.setAttribute('aria-label',(index===0?'Best variation':'Candidate '+(index+1))+' '+moves[0].san)
      button.onclick=()=>this.explore(fen,moves,candidate.score)
      box.append(button)
    }
    if(row){
      const retry=element('button','secondary','Retry move')
      retry.onclick=()=>{
        this.pause()
        this.rehearsal={fen:row.move.before}
        this.position();this.coach()
      }
      box.append(retry)
    }
  }

  explore(fen,moves,score=null){
    this.pause()
    this.line={fen,moves,index:0,score}
    this.position();this.coach()
  }

  select(square){
    if(!this.rehearsal)return
    const retry=this.rehearsal
    const chess=new Chess(retry.fen)
    const row=this.rows[this.index-1]
    const moves=retry.selected?chess.moves({square:retry.selected,verbose:true}).filter(candidate=>candidate.to===square):[]
    const move=moves.find(candidate=>row.candidates.some(line=>line.pv[0]===uciFor(candidate))) || moves[0]
    if(move && !retry.solved){
      const candidate=row.candidates.find(line=>line.pv[0]===uciFor(move))
      if(candidate){
        retry.solved=true
        this.rehearsal=null
        this.explore(move.before,variation(move.before,candidate.pv),candidate.score)
        this.line.index=1
        this.position();this.coach()
        return
      }
      retry.message='That move is legal. Try again to find one of Stockfish’s suggested moves.'
      retry.selected=null
    }else retry.selected=chess.get(square)?.color===chess.turn()?square:null
    this.position();this.coach()
  }

  drawList(){
    const host=this.workspace.querySelector('#analysis-rows')
    const scroll=host.scrollTop
    host.replaceChildren()
    if(this.tab==='breakdown'){
      const labels=element('div','review-count review-count-head')
      labels.append(element('strong','','White'),element('span','','Classification'),element('strong','','Black'))
      host.append(labels)
      for(const grade of Object.keys(grades)){
        const line=element('div','review-count'),label=element('span')
        label.append(badge(grade),document.createTextNode(grade))
        line.append(element('strong','',String(this.rows.filter(row=>row.grade===grade && row.move.color==='w').length)),
          label,element('strong','',String(this.rows.filter(row=>row.grade===grade && row.move.color==='b').length)))
        host.append(line)
      }
    }else if(this.tab==='opening'){
      const prefix=this.game.moves.slice(0,this.index)
      const {opening,node}=this.game.initial===standardStart?bookPosition(prefix):{}
      const fen=prefix.at(-1)?.after || this.game.initial
      const replies=Object.keys(node?.next || {})
      host.append(element('p','',opening?opening.eco+' · '+opening.name:replies.length?'Documented continuations':'No documented continuation for this move order.'))
      const chess=new Chess(fen)
      for(const san of replies){
        const move=chess.moves({verbose:true}).find(move=>move.san===san)
        if(!move)continue
        const button=element('button','secondary opening-move',san)
        button.title=node.next[san].opening?.name || 'Documented line'
        button.onclick=()=>this.explore(fen,[move])
        host.append(button)
      }
    }else{
      for(const [index,move] of this.game.moves.entries()){
        const row=this.rows[index]
        const item=element('button','review-move')
        item.setAttribute('aria-current',String(index+1===this.index))
        item.append(element('span','',this.moveLabel(index+1)),element('strong','',move.san),row?badge(row.grade):element('span'),
          element('span','',notation(row?.after)))
        item.onclick=()=>this.go(index+1)
        host.append(item)
      }
      if(!this.game.moves.length)host.append(element('p','','This import contains a single position.'))
    }
    host.scrollTop=scroll
  }
}
