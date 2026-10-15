import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCoachJourney } from '../src/utils/coachJourney.js'
const completed = {
  profile: {
    firstname: 'Coach',
    profilePhoto: 'data:image/png;base64,cGhvdG8=',
    coachProfile: {
      headline: 'Coach en négociation',
      bio: 'Présentation',
      specialties: ['B2B'],
      languages: ['Français'],
      audiences: ['Managers'],
      formats: ['Individuel'],
      certifications: ['Formation négociation'],
      experienceYears: 0,
      experienceSummary: 'Parcours',
    },
  },
  preferences: {
    days: ['Lundi'],
    timeZone: 'Europe/Paris',
    startTime: '09:00',
    endTime: '18:00',
    sessionDuration: 60,
    maxClients: 10,
  },
  courses: [
    {
      coachingMode: 'video',
      videoUrl: 'https://example.com/video',
      title: 'Cours',
      description: 'Description',
    },
  ],
  masterclasses: [
    {
      title: 'Masterclass',
      status: 'scheduled',
      scheduleAt: '2026-10-20T12:00:00Z',
    },
  ],
  exercises: [
    {
      title: 'Exercice',
      description: 'Description',
      instructions: 'Consignes',
    },
  ],
}
test('empty account starts at zero and existing work counts in increments of twenty', () => {
  assert.equal(buildCoachJourney().percent, 0)
  const state = {}
  Object.entries(completed).forEach(([key, value], index) => {
    state[key] = value
    assert.equal(buildCoachJourney(state).percent, (index + 1) * 20)
  })
  assert.equal(
    Object.values(buildCoachJourney(completed).steps).every(Boolean),
    true,
  )
})
test('drafts, missing video and unsaved preferences do not complete steps', () => {
  assert.equal(
    buildCoachJourney({ ...completed, preferences: null }).percent,
    80,
  )
  assert.equal(
    buildCoachJourney({
      ...completed,
      preferences: { ...completed.preferences, days: [] },
    }).percent,
    80,
  )
  assert.equal(
    buildCoachJourney({
      ...completed,
      masterclasses: [{ ...completed.masterclasses[0], status: 'draft' }],
    }).percent,
    80,
  )
  assert.equal(
    buildCoachJourney({
      ...completed,
      courses: [{ ...completed.courses[0], videoUrl: '' }],
    }).percent,
    80,
  )
  assert.equal(buildCoachJourney({ ...completed, exercises: [] }).percent, 80)
  assert.equal(
    buildCoachJourney({ ...completed, profile: { firstname: 'Coach' } })
      .percent,
    80,
  )
})
test('zero years experience counts; every profile field is required', () => {
  assert.equal(buildCoachJourney(completed).steps.profile, true)
  for (const field of ['firstname', 'profilePhoto']) {
    assert.equal(buildCoachJourney({ ...completed, profile: { ...completed.profile, [field]: '' } }).steps.profile, false, field)
  }
  for (const [field, value] of Object.entries(completed.profile.coachProfile)) {
    const empty = Array.isArray(value) ? [] : typeof value === 'number' ? null : ' '
    assert.equal(buildCoachJourney({ ...completed, profile: { ...completed.profile, coachProfile: { ...completed.profile.coachProfile, [field]: empty } } }).steps.profile, false, field)
  }
  assert.equal(
    buildCoachJourney({
      profile: {
        ...completed.profile,
        coachProfile: {
          ...completed.profile.coachProfile,
          experienceYears: null,
        },
      },
    }).steps.profile,
    false,
  )
})
