import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import express from 'express'
import { normalizeUserProfileRole } from '../src/utils/userRole.js'
import { scoreAttempt } from '../src/utils/exerciseScoring.js'

test('attempts are isolated, scored on the server, idempotent and paginated', async () => {
  const records = new Map([
    ['users/a', { role: 'apprenant' }],
    ['users/b', { role: 'apprenant' }],
    ['users/coach', { role: 'coach' }],
    [
      'coachExercises/quiz',
      {
        title: 'Quiz',
        coachId: 'coach',
        revision: 1,
        assessment: {
          questions: [
            { id: 'q1', prompt: 'Q?', options: ['A', 'B'], correctIndex: 1 },
          ],
        },
      },
    ],
  ])
  const snapshot = (path) => ({
    id: path.split('/').at(-1),
    exists: records.has(path),
    data: () => records.get(path),
  })
  const doc = (path) => ({
    path,
    id: path.split('/').at(-1),
    get: async () => snapshot(path),
    collection: (name) => collection(`${path}/${name}`),
  })
  function collection(path) {
    let max = 21,
      after = null
    const query = {
      doc: (id) => doc(`${path}/${id}`),
      orderBy: () => query,
      startAfter: (value) => {
        after = value.id
        return query
      },
      limit: (value) => {
        max = value
        return query
      },
      get: async () => {
        let docs = [...records.keys()]
          .filter(
            (key) =>
              key.startsWith(path + '/') &&
              key.split('/').length === path.split('/').length + 1,
          )
          .map(snapshot)
          .sort(
            (a, b) =>
              b.data().createdAt.localeCompare(a.data().createdAt) ||
              b.id.localeCompare(a.id),
          )
        if (after)
          docs = docs.slice(docs.findIndex((item) => item.id === after) + 1)
        return { docs: docs.slice(0, max) }
      },
    }
    return query
  }
  const db = {
    collection,
    runTransaction: async (callback) =>
      callback({
        get: (ref) => ref.get(),
        set: (ref, data, options) =>
          records.set(
            ref.path,
            options?.merge ? { ...records.get(ref.path), ...data } : data,
          ),
      }),
  }
  const firestore = () => db
  firestore.FieldPath = { documentId: () => '__name__' }
  const context = vm.createContext({ console })
  const dependencies = {
    express: { default: express },
    '../firebaseAdmin.js': { default: { firestore } },
    '../middleware/authMiddleware.js': {
      verifyToken: (req, res, next) => {
        if (!req.headers['x-test-user']) return res.sendStatus(401)
        req.user = { uid: req.headers['x-test-user'] }
        next()
      },
    },
    '../utils/userRole.js': { normalizeUserProfileRole },
    '../utils/exerciseScoring.js': { scoreAttempt },
  }
  const module = new vm.SourceTextModule(
    await readFile(
      new URL('../src/routes/exerciseAttempts.routes.js', import.meta.url),
      'utf8',
    ),
    { context },
  )
  await module.link(
    (name) =>
      new vm.SyntheticModule(
        Object.keys(dependencies[name]),
        function () {
          for (const [key, value] of Object.entries(dependencies[name]))
            this.setExport(key, value)
        },
        { context },
      ),
  )
  await module.evaluate()
  const app = express()
  app.use(express.json())
  app.use(module.namespace.default)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const request = (method, path, user, body) =>
    fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(user ? { 'x-test-user': user } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  const body = {
    requestId: 'attempt-request-0001',
    revision: 1,
    answers: [0],
    notes: '',
    score: 100,
    clientId: 'b',
  }
  try {
    assert.equal((await request('GET', '/')).status, 401)
    assert.equal((await request('POST', '/quiz', 'coach', body)).status, 403)
    const response = await request('POST', '/quiz', 'a', body)
    assert.equal(response.status, 201)
    assert.equal((await response.json()).score, 0)
    const retry = await (
      await request('POST', '/quiz', 'a', { ...body, answers: [1] })
    ).json()
    assert.equal(retry.score, 0)
    assert.equal(
      (await (await request('GET', '/', 'a')).json()).items.length,
      1,
    )
    assert.equal(
      (await (await request('GET', '/', 'b')).json()).items.length,
      0,
    )
    assert.equal(
      (
        await request('POST', '/quiz', 'a', {
          ...body,
          requestId: 'attempt-request-0002',
          revision: 0,
        })
      ).status,
      409,
    )
    assert.equal(
      (
        await request('POST', '/missing', 'a', {
          ...body,
          requestId: 'attempt-request-0002',
        })
      ).status,
      404,
    )
    assert.equal(
      records.get('users/a').learningProgress.practicalExercises.completed.quiz,
      true,
    )
    for (let index = 0; index < 22; index++)
      records.set(
        `users/a/exerciseAttempts/history-request-${String(index).padStart(4, '0')}`,
        { createdAt: new Date(2025, 0, index + 1).toISOString(), score: null },
      )
    const first = await (await request('GET', '/', 'a')).json()
    assert.equal(first.items.length, 20)
    const second = await (
      await request('GET', `/?cursor=${first.nextCursor}`, 'a')
    ).json()
    assert.equal(second.items.length, 3)
    assert.equal(second.nextCursor, null)
    assert.equal(
      (await request('GET', `/?cursor=${first.nextCursor}`, 'b')).status,
      400,
    )
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
