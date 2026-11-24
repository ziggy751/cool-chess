const ladder = ['Bronze','Silver','Gold','Platinum','Diamond','Master','Grandmaster','Legend']
const thresholds = [1000,1200,1400,1600,1850,2100,2400]
const seasons = () => {
  const date = new Date()
  return date.getUTCFullYear() + '-' + (1 + Math.floor(date.getUTCMonth()/3))
}
const fresh = () => ({rating:1200,peak:1200,games:0,wins:0,losses:0,draws:0,streak:0,history:[]})

export function category(minutes) {
  if ([1,2].includes(minutes)) return 'bullet'
  if ([3,5].includes(minutes)) return 'blitz'
  if ([10,15].includes(minutes)) return 'rapid'
  return null
}

export function adjustRatings(white,black,score,whiteGames,blackGames) {
  const expected = 1/(1+10**((black-white)/400))
  return [Math.max(100,white+Math.round((whiteGames<10?40:24)*(score-expected))),
    Math.max(100,black+Math.round((blackGames<10?40:24)*(expected-score)))]
}

export class RatingsCore {
  constructor(players, {hash, token, changed}) {
    Object.assign(this, {players,hash,token,changed})
  }

  authenticate(token) {
    if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) {
      const key = this.hash(token)
      if (this.players[key]) return {key,token}
    }
    token = this.token()
    const key = this.hash(token)
    this.players[key] = {name:'Player '+key.slice(0,7).toUpperCase(),ladders:{}}
    this.changed(key)
    return {key,token}
  }

  get(key,division) {
    const player = this.players[key]
    return player.ladders[seasons()+':'+division] || fresh()
  }

  result(division,players,winner,reason) {
    const white = this.get(players.w,division)
    const black = this.get(players.b,division)
    const score = winner === 'w' ? 1 : winner === 'b' ? 0 : .5
    const [w,b] = adjustRatings(white.rating,black.rating,score,white.games,black.games)
    for (const [color,newRating,result,side] of [['w',w,score,white],['b',b,1-score,black]]) {
      const prev = side.rating
      side.games++
      side.rating = newRating
      side.peak = Math.max(side.peak,newRating)
      side.streak = result === 1 ? side.streak+1 : 0
      side[result===1?'wins':result===0?'losses':'draws']++
      side.history.push({date:Date.now(),rating:newRating,delta:newRating-prev,reason})
      side.history = side.history.slice(-60)
      this.players[players[color]].ladders[seasons()+':'+division] = side
    }
    this.changed(players.w)
    this.changed(players.b)
  }

  summary(key,division) {
    const format = (side,id) => {
      const {rating,peak,games,wins,losses,draws,streak} = side
      const rank = games<5 ? 'Placement' : ladder[thresholds.filter(threshold=>rating>=threshold).length]
      return {name:this.players[id].name,rating,peak,games,wins,losses,draws,streak,rank}
    }
    const own = key ? this.get(key,division) : null
    const leaderboard = Object.keys(this.players).map(id=>format(this.get(id,division),id))
      .filter(player=>player.games>0).sort((a,b)=>b.rating-a.rating || b.wins-a.wins).slice(0,50)
    return {division,season:seasons(),player:own ? {...format(own,key),history:own.history} : null,leaderboard}
  }
}
