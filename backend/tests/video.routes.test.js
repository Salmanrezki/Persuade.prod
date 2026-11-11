import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import express from 'express'
import * as video from '../src/services/appointmentVideo.js'

test('video API restricts participants, time, status and changed appointments', async () => {
  const context = vm.createContext({ console })
  const dependencies = {
    express: { default: express },
    '../firebaseAdmin.js': { default: {} },
    '../middleware/authMiddleware.js': {
      verifyToken: (_req, _res, next) => next(),
    },
    '../services/appointmentVideo.js': video,
  }
  const module = new vm.SourceTextModule(
    await readFile(
      new URL('../src/routes/video.routes.js', import.meta.url),
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
  const now = Date.now()
  let appointment = {
    coachId: 'coach',
    clientId: 'learner',
    title: 'Séance',
    notes: 'PRIVATE',
    startAt: new Date(now - 1000).toISOString(),
    durationMinutes: 30,
    status: 'scheduled',
  }
  let configured = true,
    calls = 0,
    mutate = false,
    fail = false
  const app = express()
  app.use(
    module.namespace.createVideoRouter({
      authenticate: (req, res, next) => {
        if (!req.headers['x-user']) return res.sendStatus(401)
        req.user = { uid: req.headers['x-user'] }
        next()
      },
      getAppointment: async () => appointment,
      now: () => now,
      provider: {
        configured: () => configured,
        join: async (id, a) => {
          calls++
          if (fail) throw new Error('provider secret')
          const sessionVersion = video.videoRoomName(id, a)
          if (mutate) appointment = { ...appointment, status: 'cancelled' }
          return {
            token: 'private-token',
            url: 'https://test.daily.co/room',
            sessionVersion,
          }
        },
      },
    }),
  )
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const request = (method, user, path = '/a') =>
    fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: user ? { 'x-user': user } : {},
    })
  try {
    assert.equal((await request('GET')).status, 401)
    assert.equal((await request('GET', 'stranger')).status, 403)
    assert.equal((await request('POST', 'stranger', '/a/join')).status, 403)
    for (const user of ['coach', 'learner']) {
      const metadata = await request('GET', user)
      assert.equal(metadata.headers.get('cache-control'), 'no-store')
      const data = await metadata.json()
      assert.equal(data.state, 'ready')
      assert.equal(data.participantId, user === 'coach' ? 'learner' : 'coach')
      assert.equal(data.notes, undefined)
      assert.equal(data.token, undefined)
      assert.equal((await request('POST', user, '/a/join')).status, 200)
    }
    const before = calls
    for (const status of ['requested', 'cancelled', 'completed']) {
      appointment.status = status
      assert.equal((await request('POST', 'coach', '/a/join')).status, 409)
    }
    appointment.status = 'scheduled'
    for (const startAt of [
      new Date(now + 1000).toISOString(),
      new Date(now - 31 * 60000).toISOString(),
    ]) {
      appointment.startAt = startAt
      assert.equal((await request('POST', 'learner', '/a/join')).status, 409)
    }
    assert.equal(calls, before)
    appointment.startAt = new Date(now - 1000).toISOString()
    configured = false
    assert.equal((await request('POST', 'coach', '/a/join')).status, 503)
    configured = true
    fail = true
    const failure = await request('POST', 'coach', '/a/join')
    assert.equal(failure.status, 503)
    assert.ok(!(await failure.text()).includes('secret'))
    fail = false
    mutate = true
    assert.equal((await request('POST', 'coach', '/a/join')).status, 409)
    appointment = null
    assert.equal((await request('GET', 'coach')).status, 404)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
