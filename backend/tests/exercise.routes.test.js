import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import express from 'express'
import { normalizeUserProfileRole } from '../src/utils/userRole.js'
import { normalizeAssessment, publicExercise } from '../src/utils/exerciseScoring.js'

// Run the real route handlers with an in-memory Firestore and authenticated identities.
test('exercise creation, validation, persistence and coach isolation', async () => {
  const records = new Map()
  const users = {
    coachA: { role: 'coach' },
    coachB: { role: 'coach' },
    student: { role: 'apprenant' },
  }
  const snapshot = (id, data) => ({ id, exists: !!data, data: () => data })
  const admin = {
    firestore: () => ({
      runTransaction: async (callback) => {
        const updates = []
        const result = await callback({
          get: async (ref) => ref.get(),
          update: (ref, data) => updates.push([ref, data]),
        })
        for (const [ref, data] of updates) await ref.update(data)
        return result
      },
      collection: (name) =>
        name === 'users'
          ? {
              doc: (id) => ({ get: async () => snapshot(id, users[id]) }),
            }
          : {
              add: async (data) => {
                const id = String(records.size + 1)
                records.set(id, data)
                return { id }
              },
              doc: (id) => ({
                get: async () => snapshot(id, records.get(id)),
                update: async (data) =>
                  records.set(id, { ...records.get(id), ...data }),
              }),
              where: (field, operator, uid) => ({
                get: async () => ({
                  docs: [...records]
                    .filter(([, data]) => data[field] === uid)
                    .map(([id, data]) => snapshot(id, data)),
                }),
              }),
            },
    }),
  }
  const verifyToken = (req, res, next) => {
    if (!req.headers['x-test-user']) return res.sendStatus(401)
    req.user = { uid: req.headers['x-test-user'] }
    next()
  }
  const context = vm.createContext({ console })
  const module = new vm.SourceTextModule(
    await readFile(
      new URL('../src/routes/exercise.routes.js', import.meta.url),
      'utf8',
    ),
    { context },
  )
  const dependencies = {
    express: { default: express },
    '../firebaseAdmin.js': { default: admin },
    '../middleware/authMiddleware.js': { verifyToken },
    '../utils/userRole.js': { normalizeUserProfileRole },
    '../utils/exerciseScoring.js': { normalizeAssessment, publicExercise },
  }
  await module.link((name) => {
    const exports = dependencies[name]
    return new vm.SyntheticModule(
      Object.keys(exports),
      function () {
        Object.entries(exports).forEach(([key, value]) =>
          this.setExport(key, value),
        )
      },
      { context },
    )
  })
  await module.evaluate()
  const app = express()
  app.use(express.json())
  app.use('/exercises', module.namespace.default)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const request = (method, path, user, body) =>
    fetch(`http://127.0.0.1:${server.address().port}/exercises${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(user ? { 'x-test-user': user } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  try {
    assert.equal((await request('GET', '/coach')).status, 401)
    assert.equal(
      (await request('POST', '/', 'student', { title: 'Test' })).status,
      403,
    )
    assert.equal(
      (await request('POST', '/', 'coachA', { title: 'Test' })).status,
      400,
    )
    const response = await request('POST', '/', 'coachA', {
      title: ' Exercice ',
      description: 'Description',
      instructions: 'Consignes',
      coachId: 'coachB',
    })
    assert.equal(response.status, 201)
    const created = await response.json()
    assert.equal(created.coachId, 'coachA')
    assert.equal(created.title, 'Exercice')
    assert.equal(
      (await (await request('GET', '/coach', 'coachA')).json()).length,
      1,
    )
    assert.equal(
      (await (await request('GET', '/coach', 'coachB')).json()).length,
      0,
    )
    const update = {
      title: 'Modifié',
      description: 'Description',
      instructions: 'Nouvelles consignes',
      coachId: 'coachB',
    }
    assert.equal(
      (await request('PATCH', `/${created.id}`, 'coachB', update)).status,
      403,
    )
    assert.equal(
      (await request('PATCH', '/missing', 'coachA', update)).status,
      404,
    )
    assert.equal(
      (await request('PATCH', `/${created.id}`, 'coachA', update)).status,
      200,
    )
    const stored = await (await request('GET', '/coach', 'coachA')).json()
    assert.equal(stored[0].instructions, 'Nouvelles consignes')
    assert.equal(stored[0].coachId, 'coachA')
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
