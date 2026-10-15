import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import express from 'express'
import { normalizeUserProfileRole } from '../src/utils/userRole.js'
import * as normalization from '../src/utils/coachAccount.js'
import * as journey from '../src/utils/coachJourney.js'

test('coach preferences stay in a private document and are isolated by authenticated account', async () => {
  const users = {
    a: { role: 'coach', firstname: 'A' },
    b: { role: 'coach', firstname: 'B' },
    student: { role: 'apprenant' },
  }
  const privateDocs = new Map()
  const admin = {
    firestore: () => ({
      collection: () => ({
        doc: (uid) => ({
          get: async () => ({ exists: !!users[uid], data: () => users[uid] }),
          update: async (data) => {
            users[uid] = { ...users[uid], ...data }
          },
          collection: (name) => ({
            doc: (id) => ({
              get: async () => ({
                exists: privateDocs.has(`${uid}/${name}/${id}`),
                data: () => privateDocs.get(`${uid}/${name}/${id}`),
              }),
              set: async (data) => {
                privateDocs.set(`${uid}/${name}/${id}`, data)
              },
            }),
          }),
        }),
      }),
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
      new URL('../src/routes/coachAccount.routes.js', import.meta.url),
      'utf8',
    ),
    { context },
  )
  const dependencies = {
    express: { default: express },
    '../firebaseAdmin.js': { default: admin },
    '../middleware/authMiddleware.js': { verifyToken },
    '../utils/userRole.js': { normalizeUserProfileRole },
    '../utils/coachAccount.js': normalization,
    '../utils/coachJourney.js': journey,
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
  try {
    assert.equal((await request('GET', '/preferences')).status, 401)
    assert.equal((await request('GET', '/preferences', 'student')).status, 403)
    assert.equal(
      (await request('PATCH', '/preferences', 'a', { maxClients: 3, uid: 'b' }))
        .status,
      200,
    )
    assert.equal(
      (await (await request('GET', '/preferences', 'a')).json()).maxClients,
      3,
    )
    assert.equal(
      (await (await request('GET', '/preferences', 'b')).json()).maxClients,
      10,
    )
    assert.equal(users.a.maxClients, undefined)
    assert.equal(privateDocs.size, 1)
    assert.equal(
      (
        await request('PATCH', '/profile', 'a', {
          firstname: 'Coach A',
          coachProfile: {
            specialties: ['B2B'],
            experienceYears: 7,
            maxClients: 3,
          },
        })
      ).status,
      200,
    )
    assert.equal(users.a.coachProfile.maxClients, undefined)
    assert.equal(users.a.coachProfile.experienceYears, 7)
    assert.equal(
      (
        await request('PATCH', '/profile', 'a', {
          firstname: 'Coach A',
          coachProfile: { experienceYears: -4 },
        })
      ).status,
      400,
    )
    assert.equal(users.a.coachProfile.experienceYears, 7)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
