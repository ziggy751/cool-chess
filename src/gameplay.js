export const indicatorColors={green:'#90f0aa',blue:'#8acaff',gold:'#ffda79',violet:'#e0b3ff'}
export const lastMoveColors={gold:'#ffd068',blue:'#92d1ff',violet:'#e0b3ff'}
export const moveSpeeds={instant:'Instant',fast:'Fast',normal:'Normal',cinematic:'Cinematic'}
export const visibilityDefaults={
  indicatorSize:1,indicatorOpacity:.94,highlight:'green',selectedOutline:true,showLegal:true,
  overlayIndicators:true,showCaptures:true,showLastMove:true,lastMoveColor:'gold',lastMoveArrow:false,
  turnNotices:true,turnSound:false,captureSound:true,showCheck:true,highContrast:false,
}
export const visibilityPresets={
  minimal:{...visibilityDefaults,indicatorSize:.75,indicatorOpacity:.72,turnNotices:false,coach:false},
  clear:{...visibilityDefaults,highContrast:true,coach:false},
  beginner:{...visibilityDefaults,indicatorSize:1.24,highContrast:true,lastMoveArrow:true,coach:true},
}

export function annotations({chess,selection,queued,targets,last,settings}){
  const marks=[]
  if(settings.showLastMove && last){
    const destination=last.landing || last.to
    if(last.from && last.from!==destination)marks.push([last.from,'origin'])
    marks.push([destination,last.captured && settings.showCaptures?'captured':'destination'])
  }
  if(selection)marks.push([selection,'selected'])
  if(settings.showLegal)for(const [square,kind] of targets) {
    if(kind!=='capture' || settings.showCaptures)marks.push([square,kind])
  }
  if(queued){
    marks.push([queued.from,'queued-origin'],[queued.to,'queued'])
  }
  if(settings.showCheck && chess.isCheck()){
    const king=chess.board().flat().find(piece=>piece?.type==='k' && piece.color===chess.turn())
    if(king)marks.push([king.square,'check'])
  }
  return {marks,arrow:settings.showLastMove && settings.lastMoveArrow && last?.from &&
    last.from!==(last.landing || last.to)
    ? [last.from,last.landing || last.to]:null}
}
