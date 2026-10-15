import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeAssessment,
  publicExercise,
  scoreAttempt,
} from '../src/utils/exerciseScoring.js'
const assessment = normalizeAssessment({
  questions: [
    { prompt: 'Question', options: ['A', 'B'], correctIndex: 1 },
    { prompt: 'Question 2', options: ['C', 'D'], correctIndex: 0 },
  ],
})
test('scores come from stored answers, not client scores', () => {
  const exercise = { assessment, revision: 2 }
  assert.equal(
    scoreAttempt(exercise, {
      revision: 2,
      answers: [0, 0],
      notes: '',
      score: 100,
    }).score,
    50,
  )
  assert.equal(
    scoreAttempt(exercise, { revision: 2, answers: [1, 0], notes: '' }).score,
    100,
  )
  assert.equal(
    scoreAttempt(exercise, { revision: 2, answers: [0, 1], notes: '' }).score,
    0,
  )
})
test('public exercises never expose the answer key', () => {
  const exercise = publicExercise({ assessment, title: 'Test' })
  assert.equal(exercise.revision, 1)
  assert.equal(
    exercise.assessment.questions.some((q) => 'correctIndex' in q),
    false,
  )
})
test('invalid configuration, missing answers and changed revisions are rejected', () => {
  assert.throws(() => normalizeAssessment({ questions: [] }))
  assert.throws(() =>
    normalizeAssessment({
      questions: [{ prompt: 'Q', options: ['A', ''], correctIndex: 0 }],
    }),
  )
  for (const answers of [[], [0], [0, 2], ['1', 0], [0, 0, 0]])
    assert.throws(() =>
      scoreAttempt({ assessment }, { revision: 1, answers, notes: '' }),
    )
  assert.throws(
    () =>
      scoreAttempt(
        { assessment, revision: 2 },
        { revision: 1, answers: [0, 0], notes: '' },
      ),
    (error) => error.status === 409,
  )
})
test('free practice is recorded without invented scores and limits note size', () => {
  assert.equal(
    scoreAttempt({}, { revision: 1, notes: 'Mon essai', score: 100 }).score,
    null,
  )
  assert.throws(() =>
    scoreAttempt({}, { revision: 1, notes: 'a'.repeat(5001) }),
  )
})
