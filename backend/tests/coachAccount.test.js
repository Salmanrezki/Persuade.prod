import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeCoachProfile,
  normalizeCoachPreferences,
} from '../src/utils/coachAccount.js'

test('public profile only contains public fields and deduplicates tags', () => {
  const profile = normalizeCoachProfile({
    specialties: [' B2B ', 'B2B', 'Médiation'],
    experienceYears: '12',
    email: 'private@example.com',
    maxClients: 4,
    days: ['Lundi'],
  })
  assert.deepEqual(profile.specialties, ['B2B', 'Médiation'])
  assert.equal(profile.experienceYears, 12)
  for (const key of ['email', 'maxClients', 'days'])
    assert.equal(key in profile, false)
  assert.equal(
    normalizeCoachProfile({ experienceYears: '' }).experienceYears,
    null,
  )
  assert.equal(normalizeCoachProfile({ experienceYears: 0 }).experienceYears, 0)
  assert.throws(() => normalizeCoachProfile({ experienceYears: -1 }))
  assert.throws(() => normalizeCoachProfile({ experienceYears: 2.5 }))
})
test('preferences validate working hours, capacity and time zone', () => {
  assert.equal(normalizeCoachPreferences().sessionDuration, 60)
  assert.throws(() =>
    normalizeCoachPreferences({ startTime: '18:00', endTime: '09:00' }),
  )
  assert.throws(() => normalizeCoachPreferences({ maxClients: 0 }))
  assert.throws(() => normalizeCoachPreferences({ sessionDuration: 1 }))
  assert.throws(() => normalizeCoachPreferences({ timeZone: 'invalid' }))
  assert.deepEqual(
    normalizeCoachPreferences({ days: ['Lundi', 'Lundi', 'unknown'] }).days,
    ['Lundi'],
  )
})
