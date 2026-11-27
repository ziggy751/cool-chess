import { icon } from './icons.js'

const devices={iron:'shield',bronze:'swords',silver:'layers',gold:'crown',platinum:'compass',
  diamond:'gem',master:'flame',grandmaster:'crown',champion:'trophy',legend:'star',immortal:'orbit',ultimate:'sparkles'}

export function rankEmblem(rank){
  const device=rank.index===0?'minus':devices[rank.metal]
  return `<span class="rank-emblem" data-metal="${rank.metal}" data-division="${rank.division}" aria-hidden="true">
    <span class="rank-emblem-face">${icon(device)}</span>
    ${rank.division?`<span class="rank-emblem-pips">${'<i></i>'.repeat(rank.division)}</span>`:''}
  </span>`
}
