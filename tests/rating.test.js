import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adjustRatings, category } from '../server/rating.js'

test('classifies ranked time controls and applies server Elo', () => {
  assert.equal(category(1),'bullet')
  assert.equal(category(5),'blitz')
  assert.equal(category(15),'rapid')
  assert.equal(category(30),null)
  assert.deepEqual(adjustRatings(1200,1200,1,0,0),[1220,1180])
  assert.deepEqual(adjustRatings(1200,1200,.5,0,0),[1200,1200])
  assert.deepEqual(adjustRatings(1800,1200,0,10,10),[1777,1223])
})
