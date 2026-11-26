import {node,read,store} from './shared.js'

export function spotifyPlaylist(input){
  try{
    const url=new URL(input)
    const match=url.pathname.match(/^\/(?:intl-[a-z]{2}(?:-[A-Z]{2})?\/)?playlist\/([A-Za-z0-9]{22})\/?$/)
    if(url.protocol==='https:' && url.hostname==='open.spotify.com' && !url.port && !url.username && !url.password && match)
      return 'https://open.spotify.com/playlist/'+match[1]
  }catch{}
  return null
}
function external(label,href,style='handset-link'){
  const link=node('a',style,label);link.href=href;link.target='_blank';link.rel='noopener noreferrer'
  return link
}
export function mount(host,{blocked}){
  const header=node('div','spotify-intro')
  header.append(node('span','','SPOTIFY'),node('h2','','Your playlists'))
  const open=external('Open Spotify','https://open.spotify.com/','spotify-launch')
  const form=node('form','spotify-form'),name=node('input'),address=node('input')
  name.required=true;name.maxLength=40;name.placeholder='Playlist name';name.setAttribute('aria-label','Playlist name')
  address.type='url';address.required=true;address.placeholder='Paste a Spotify playlist URL';address.setAttribute('aria-label','Spotify playlist URL')
  const save=node('button','handset-secondary','Save playlist');save.type='submit'
  const status=node('p','handset-note');status.setAttribute('role','status')
  const list=node('div','spotify-playlists')
  let entries=read('spotify-playlists',[])
  function render(){
    const disabled=blocked()
    list.replaceChildren()
    header.hidden=disabled;open.hidden=disabled;form.hidden=disabled
    if(disabled){status.textContent='Spotify shortcuts are available after the match.';return}
    for(const item of entries){
      const row=node('div','spotify-entry')
      const remove=node('button','handset-secondary','Remove')
      remove.setAttribute('aria-label','Remove '+item.name)
      remove.onclick=()=>{entries=entries.filter(entry=>entry.url!==item.url);store('spotify-playlists',entries);render()}
      row.append(external(item.name,item.url),remove);list.append(row)
    }
  }
  form.onsubmit=event=>{
    event.preventDefault()
    if(blocked())return
    const url=spotifyPlaylist(address.value),label=name.value.trim()
    if(!url || !label){status.textContent='Enter a name and an official Spotify playlist link.';return}
    entries=[{name:label,url},...entries.filter(item=>item.url!==url)].slice(0,30)
    store('spotify-playlists',entries);form.reset();status.textContent='Playlist saved';render()
  }
  form.append(name,address,save)
  host.append(header,open,form,status,list);render()
  return {update:render}
}
