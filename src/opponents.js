const names = ['Scout','Brook','Wren','Hazel','Milo','Iris','Aster','Rune','Sable','Quill',
  'Ada','Soren','Cleo','Elio','Lyra','Cassia','Orion','Talon','Sofia','Vega',
  'Atlas','Dante','Kira','Nox','Artemis','Selene','Argent','Nyx','Aurelius','The Architect']
const styles = [
  ['Unpredictable beginner','Explores unfamiliar positions and accepts complications.'],
  ['Defensive strategist','Values king safety and quiet moves.'],
  ['Tactical specialist','Looks for forcing checks and captures.'],
  ['Positional player','Contests the central files and diagonals.'],
  ['Gambit specialist','Favours early initiative and active exchanges.'],
  ['Endgame expert','Tries to simplify into positions with fewer pieces.'],
  ['Aggressive attacker','Prioritizes checks and forward momentum.'],
  ['Balanced professional','Lets the engine choose the strongest line.'],
  ['Blitz specialist','Favours immediate threats at short thinking times.'],
  ['Grandmaster','Uses engine evaluation to choose among close alternatives.'],
]
export const opponentAt = level => {
  const style = level===30 ? 9 : (level-1)%styles.length
  const [title,description] = styles[style]
  return {name:names[level-1],style,title,description}
}
export const bosses = [
  {level:19,environment:'castle',theme:'castle',label:'The Keep'},
  {level:24,environment:'neon',theme:'neon',label:'Midnight Circuit'},
  {level:30,environment:'championship',theme:'championship',label:'The Final Table'},
]
