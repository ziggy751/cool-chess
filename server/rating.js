import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const file = process.env.CHESS_RATINGS_PATH || 'data/ratings.json'
const hash = token => createHash('sha256').update(token).digest('hex')
import { RatingsCore } from './ratings.js'
export { category, adjustRatings } from './ratings.js'

export class Ratings extends RatingsCore {
  constructor() {
    let players
    try { players = JSON.parse(readFileSync(file,'utf8')) }
    catch (error) { if (error.code !== 'ENOENT') throw error; players = {} }
    super(players, {
      hash,
      token: () => randomBytes(32).toString('hex'),
      changed: () => this.save(),
    })
  }

  save() {
    mkdirSync(dirname(file),{recursive:true,mode:0o700})
    writeFileSync(file+'.next',JSON.stringify(this.players),{mode:0o600})
    renameSync(file+'.next',file)
  }
}
