let api

export function youtubePlayer(){
  if(window.YT?.Player)return Promise.resolve(window.YT)
  api ||= new Promise((resolve,reject)=>{
    const script=document.createElement('script')
    const previous=window.onYouTubeIframeAPIReady
    const clean=()=>{
      clearTimeout(timeout)
      script.onerror=null
      if(window.onYouTubeIframeAPIReady===ready)window.onYouTubeIframeAPIReady=previous
    }
    const fail=()=>{
      clean()
      script.remove()
      reject(new Error('The YouTube player could not connect.'))
    }
    const ready=()=>{
      if(!window.YT?.Player){fail();return}
      clean()
      resolve(window.YT)
      previous?.()
    }
    const timeout=setTimeout(fail,10000)
    window.onYouTubeIframeAPIReady=ready
    script.onerror=fail
    script.src='https://www.youtube.com/iframe_api'
    script.async=true
    document.head.append(script)
  }).catch(error=>{api=null;throw error})
  return api
}
