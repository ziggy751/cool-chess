import {node} from './shared.js'

export function mount(host){
  const heading=node('h2','handset-page-title','Media sources')
  const entries=[
    ['Generated video','Local library available','Pre-generated footage is bundled. On-demand video uses an optional paid provider and needs operator setup.'],
    ['AI Music Lab','Local composer available','Songs render in a browser worker. Hosted vocal generation requires a separate authorized provider.'],
    ['Spotify','External links available','The official website handles all Spotify playback.'],
    ['YouTube','Official Shorts site','Opens in a separate browser tab. YouTube handles playback, recommendations and sign-in.'],
  ]
  host.append(heading)
  for(const [title,status,detail] of entries){
    const item=node('section','media-status-item')
    item.append(node('strong','',title),node('b','',status),node('p','handset-note',detail));host.append(item)
  }
  const docs=node('a','handset-link','Provider setup and licenses')
  docs.href='https://github.com/ziggy751/cool-chess/blob/main/docs/entertainment-rebuild.md'
  docs.target='_blank';docs.rel='noopener noreferrer';host.append(docs)
  return {}
}
