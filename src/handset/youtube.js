import {icon} from '../icons.js'
import {node} from './shared.js'

const shortsUrl='https://www.youtube.com/shorts'

export function mount(host){
  const panel=node('section','shorts-launcher')
  const mark=node('span','shorts-launcher-mark')
  mark.innerHTML=icon('play')
  mark.setAttribute('aria-hidden','true')
  const heading=node('h2','','Watch on YouTube')
  const note=node('p','','Shorts opens in a separate tab. Your chess match stays here.')
  const link=node('a','handset-primary shorts-launcher-link','Open Shorts on YouTube')
  link.href=shortsUrl
  link.target='_blank'
  link.rel='noopener noreferrer'
  link.title='Opens in a new tab'
  const status=node('p','handset-note')
  status.setAttribute('role','status')
  const syncConnection=()=>{
    const offline=!navigator.onLine
    status.textContent=offline?'You’re offline. Reconnect and try again.':''
    link.textContent=offline?'Retry opening YouTube':'Open Shorts on YouTube'
  }
  link.addEventListener('click',event=>{
    if(navigator.onLine)return
    event.preventDefault()
    syncConnection()
  })
  window.addEventListener('online',syncConnection)
  window.addEventListener('offline',syncConnection)
  panel.append(mark,heading,note,link,status)
  host.append(panel)
  syncConnection()
  return {destroy(){
    window.removeEventListener('online',syncConnection)
    window.removeEventListener('offline',syncConnection)
  }}
}
