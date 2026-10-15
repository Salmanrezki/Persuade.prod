import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import express from 'express'
import { deleteOwnAccount } from '../src/utils/deleteOwnAccount.js'

test('cleanup failure preserves authentication so deletion can be retried', async () => {
  let authDeleted = false
  const db = {
    collection: () => ({ doc: () => ({}), where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }),
    recursiveDelete: async () => { throw new Error('Storage unavailable') },
  }
  await assert.rejects(deleteOwnAccount(db, { deleteUser: async () => { authDeleted = true } }, 'a'))
  assert.equal(authDeleted, false)
})

test('account cleanup is scoped to the owner and removes nested data before authentication', async () => {
  const records = new Map([
    ['users/a', {}],
    ['users/a/exerciseAttempts/attempt', {}],
    ['users/b', {}],
    ['courses/mine', { coachId: 'a' }],
    ['courses/other', { coachId: 'b' }],
    ['coachAppointments/appointment', { clientId: 'a', coachId: 'b' }],
    ['conversations/shared', { participants: ['a', 'b'] }],
    ['conversations/shared/messages/m', {}],
  ])
  const deleted = []
  const db = {
    collection: (name) => ({
      doc: (id) => ({ path: `${name}/${id}` }),
      where: (field, operator, uid) => ({
        limit: (size) => ({
          get: async () => {
            const docs = [...records]
              .filter(
                ([path, data]) =>
                  path.split('/').length === 2 &&
                  path.startsWith(name + '/') &&
                  (operator === 'array-contains'
                    ? data[field]?.includes(uid)
                    : data[field] === uid),
              )
              .slice(0, size)
              .map(([path]) => ({ ref: { path } }))
            return { docs, empty: !docs.length }
          },
        }),
      }),
    }),
    recursiveDelete: async (ref) => {
      deleted.push(ref.path)
      for (const key of records.keys())
        if (key === ref.path || key.startsWith(ref.path + '/'))
          records.delete(key)
    },
  }
  const auth = {
    deleteUser: async (uid) => {
      assert.equal(records.has('users/a'), false)
      deleted.push(`auth/${uid}`)
    },
  }
  await deleteOwnAccount(db, auth, 'a')
  assert.equal(records.has('users/b'), true)
  assert.equal(records.has('courses/other'), true)
  assert.equal(records.has('courses/mine'), false)
  assert.equal(records.has('conversations/shared/messages/m'), false)
  assert.equal(deleted.at(-1), 'auth/a')
  await deleteOwnAccount(db, auth, 'a')
  await assert.rejects(deleteOwnAccount(db, auth, '../b'))
})
test('deletion requires confirmation and recent authentication, and ignores another UID in the body', async () => {
  const calls = []
  const context = vm.createContext({ console })
  const dependencies = {
    express: { default: express },
    '../firebaseAdmin.js': {
      default: { firestore: () => ({}), auth: () => ({}) },
    },
    '../middleware/authMiddleware.js': {
      verifyToken: (req, res, next) => {
        if (!req.headers['x-test-user']) return res.sendStatus(401)
        req.user = {
          uid: req.headers['x-test-user'],
          auth_time: Number(req.headers['x-auth-time']),
        }
        next()
      },
    },
    '../utils/deleteOwnAccount.js': {
      deleteOwnAccount: async (db, auth, uid) => calls.push(uid),
    },
  }
  const module = new vm.SourceTextModule(
    await readFile(
      new URL('../src/routes/accountSettings.routes.js', import.meta.url),
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
  const request = (user, time, confirmation) =>
    fetch(`http://127.0.0.1:${server.address().port}/me`, {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        ...(user ? { 'x-test-user': user, 'x-auth-time': String(time) } : {}),
      },
      body: JSON.stringify({ confirmation, uid: 'someone-else' }),
    })
  try {
    const now = Math.floor(Date.now() / 1000)
    assert.equal((await request()).status, 401)
    assert.equal((await request('a', now, 'NON')).status, 400)
    assert.equal((await request('a', now - 301, 'SUPPRIMER')).status, 403)
    assert.equal((await request('a', undefined, 'SUPPRIMER')).status, 403)
    assert.equal(calls.length, 0)
    assert.equal((await request('a', now, 'SUPPRIMER')).status, 204)
    assert.deepEqual(calls, ['a'])
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
