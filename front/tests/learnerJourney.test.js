import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildLearnerJourney } from '../src/utils/learnerJourney.js'

test('new learner starts at zero; an objective does not require optional profile data', () => {
  assert.equal(buildLearnerJourney().percent, 0)
  assert.equal(
    buildLearnerJourney({ profile: { primaryGoal: '  ' } }).percent,
    0,
  )
  assert.equal(
    buildLearnerJourney({ profile: { primaryGoal: 'Mieux prendre la parole' } })
      .percent,
    20,
  )
})
test('viewing a course and completing an exercise are separate real actions', () => {
  const journey = buildLearnerJourney({
    profile: {
      learningProgress: {
        viewedCourses: [{ id: 'course' }],
        practicalExercises: {
          completed: { exercise: false },
          notes: { exercise: 'Brouillon' },
        },
      },
    },
  })
  assert.equal(journey.steps.course, true)
  assert.equal(journey.steps.exercise, false)
  assert.equal(
    buildLearnerJourney({
      profile: {
        learningProgress: {
          viewedCourses: [{}],
          practicalExercises: { completed: { exercise: 'false' } },
        },
      },
    }).percent,
    0,
  )
})
test('selecting a coach is complete while approval is pending; rejected and cancelled actions do not count', () => {
  assert.equal(
    buildLearnerJourney({ followups: [{ status: 'pending' }] }).awaitingCoach,
    true,
  )
  assert.equal(
    buildLearnerJourney({ followups: [{ status: 'accepted' }] }).awaitingCoach,
    false,
  )
  assert.equal(
    buildLearnerJourney({
      followups: [{ status: 'rejected' }],
      appointments: [{ status: 'cancelled' }],
    }).percent,
    0,
  )
  for (const status of ['requested', 'scheduled', 'completed']) {
    assert.equal(
      buildLearnerJourney({ appointments: [{ status }] }).steps.appointment,
      true,
    )
  }
})
test('all five steps complete without requiring a masterclass registration', () => {
  const journey = buildLearnerJourney({
    profile: {
      primaryGoal: 'Convaincre',
      learningProgress: {
        viewedCourses: [{ id: 'course' }],
        practicalExercises: { completed: { exercise: true } },
      },
    },
    followups: [{ status: 'accepted' }],
    appointments: [{ status: 'scheduled' }],
  })
  assert.equal(journey.completed, 5)
  assert.equal(journey.percent, 100)
})
