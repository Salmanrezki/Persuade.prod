import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import express from 'express'
import * as roles from '../src/utils/userRole.js'

test('email verification is read from authenticated Firebase account, never editable profile data', async () => {
  const profiles = { learner: { email: 'wrong@example.com', emailVerified: true }, coach: { email: 'old@example.com' } }
  const accounts = {
    learner: { email: 'learner@example.com', emailVerified: false, providerData: [{ providerId: 'password' }] },
    coach: { email: 'coach@example.com', emailVerified: true, providerData: [{ providerId: 'password' }] },
  }
  const admin = {
    auth: () => ({ getUser: async uid => accounts[uid] }),
    firestore: () => ({ collection: () => ({ doc: uid => ({ set: async updates => { profiles[uid] = { ...profiles[uid], ...updates } } }) }) }),
  }
  const context = vm.createContext({ console })
  const dependencies = { express: { default: express }, '../firebaseAdmin.js': { default: admin },
    '../middleware/authMiddleware.js': { verifyToken: (req, res, next) => { if (!req.headers['x-test-user']) return res.sendStatus(401); req.user = { uid: req.headers['x-test-user'] }; next() } },
    '../utils/coachDirectory.js': { listCoachDirectory: async () => [] }, '../utils/userRole.js': roles,
  }
  const module = new vm.SourceTextModule(await readFile(new URL('../src/routes/user.routes.js', import.meta.url), 'utf8'), { context })
  await module.link(name => new vm.SyntheticModule(Object.keys(dependencies[name]), function () { for (const [key, value] of Object.entries(dependencies[name])) this.setExport(key, value) }, { context }))
  await module.evaluate()
  const app = express(); app.use(module.namespace.default)
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve))
  const request = user => fetch(`http://127.0.0.1:${server.address().port}/security?uid=coach&emailVerified=true`, { headers: user ? { 'x-test-user': user } : {} })
  try {
    assert.equal((await request()).status, 401)
    const learner = await (await request('learner')).json()
    assert.equal(learner.email, 'learner@example.com')
    assert.equal(learner.emailVerified, false)
    assert.equal(profiles.learner.email, 'learner@example.com')
    assert.equal(profiles.coach.email, 'old@example.com')
    const coach = await (await request('coach')).json()
    assert.equal(coach.emailVerified, true)
    assert.equal(coach.passwordEnabled, true)
  } finally { await new Promise(resolve => server.close(resolve)) }
})
