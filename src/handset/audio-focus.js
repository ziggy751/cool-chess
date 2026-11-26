export function createAudioFocus(settings,music){
  let video=false,resume=false
  return {
    startVideo(){
      if(video)return
      video=true
      if(settings.phoneDuckMusic && music.audio && !music.audio.paused){
        resume=true
        music.audio.pause()
      }
    },
    endVideo(restore=true){
      if(!video)return
      video=false
      const shouldResume=resume && restore
      resume=false
      if(shouldResume)music.play?.()
    },
    startLab(){
      if(music.audio && !music.audio.paused)music.audio.pause()
    },
  }
}
