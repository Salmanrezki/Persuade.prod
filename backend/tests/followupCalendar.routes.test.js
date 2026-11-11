import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import express from 'express'
import { normalizeUserProfileRole } from '../src/utils/userRole.js'

test('calendar persists appointments and enforces coach, student relationship and course ownership', async () => {
  const records = {
    users: {
      a: { role: 'coach' },
      b: { role: 'coach' },
      student: { role: 'apprenant' },
      otherStudent: { role: 'apprenant' },
    },
    coachFollowupRequests: {
      active: {
        coachId: 'a',
        clientId: 'student',
        clientName: 'Élève',
        status: 'accepted',
      },
      pending: { coachId: 'a', clientId: 'student', status: 'pending' },
      foreign: { coachId: 'b', clientId: 'student', status: 'accepted' },
    },
    courses: {
      own: { coachId: 'a', title: 'Prise de parole' },
      foreign: { coachId: 'b' },
    },
    coachAppointments: {},
  }
  let sequence = 0
  const snapshot = (id, data) => ({ id, exists: !!data, data: () => data })
  const admin = {
    firestore: () => ({
      runTransaction: async callback => callback({
        get: ref => ref.get(),
        update: (ref, data) => ref.update(data),
      }),
      collection: (name) => ({
        add: async (data) => {
          const id = `event-${++sequence}`
          records[name][id] = data
          return { id }
        },
        doc: (id = `event-${++sequence}`) => ({
          id,
          get: async () => snapshot(id, records[name][id]),
          set: async (data) => {
            records[name][id] = data
          },
          update: async (data) => {
            records[name][id] = { ...records[name][id], ...data }
          },
        }),
        where: (key, op, value) => ({
          get: async () => ({
            docs: Object.entries(records[name])
              .filter(([, data]) => data[key] === value)
              .map(([id, data]) => snapshot(id, data)),
          }),
        }),
      }),
    }),
  }
  const dependencies = {
    express: { default: express },
    '../firebaseAdmin.js': { default: admin },
    '../middleware/authMiddleware.js': {
      verifyToken: (req, res, next) => {
        if (!req.headers['x-test-user']) return res.sendStatus(401)
        req.user = { uid: req.headers['x-test-user'] }
        next()
      },
    },
    '../utils/coachDirectory.js': { findCoachProfileById: async () => null },
    '../utils/firestoreErrors.js': {
      isFirestoreUnavailable: () => false,
      logFirestoreWarning: () => {},
      toFirestoreUserMessage: () => '',
    },
    '../utils/userRole.js': { normalizeUserProfileRole },
  }
  const context = vm.createContext({ console })
  const module = new vm.SourceTextModule(
    await readFile(
      new URL('../src/routes/followup.routes.js', import.meta.url),
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
  const payload = {
    followupId: 'active',
    courseId: 'own',
    title: 'Bilan',
    startAt: '2027-02-12T09:00:00+01:00',
    durationMinutes: 45,
  }
  try {
    assert.equal((await request('GET', '/appointments')).status, 401)
    assert.equal((await request('GET', '/appointments', 'student')).status, 403)
    assert.equal(
      (await request('POST', '/appointments', 'student', payload)).status,
      403,
    )
    for (const change of [
      { startAt: 'invalid' },
      { startAt: '2027-02-12T09:00' },
      { durationMinutes: 0 },
      { durationMinutes: 481 },
      { title: '' },
      { courseId: 'foreign' },
    ]) {
      assert.equal(
        (await request('POST', '/appointments', 'a', { ...payload, ...change }))
          .status,
        400,
      )
    }
    for (const followupId of ['pending', 'foreign']) {
      assert.equal(
        (
          await request('POST', '/appointments', 'a', {
            ...payload,
            followupId,
          })
        ).status,
        403,
      )
    }
    const created = await request('POST', '/appointments', 'a', {
      ...payload,
      coachId: 'b',
      clientId: 'other',
    })
    assert.equal(created.status, 201)
    const event = await created.json()
    assert.equal(event.coachId, 'a')
    assert.equal(event.clientId, 'student')
    assert.equal(event.courseTitle, 'Prise de parole')
    assert.equal(event.startAt, '2027-02-12T08:00:00.000Z')
    assert.equal(
      (await (await request('GET', '/appointments', 'a')).json()).length,
      1,
    )
    assert.equal(
      (await (await request('GET', '/appointments', 'b')).json()).length,
      0,
    )
    assert.equal(
      (await request('PATCH', `/appointments/${event.id}`, 'b', payload))
        .status,
      403,
    )
    for (const status of ['completed', 'cancelled']) {
      assert.equal(
        (
          await request('PATCH', `/appointments/${event.id}`, 'a', {
            ...payload,
            status,
          })
        ).status,
        200,
      )
      assert.equal(
        (await (await request('GET', '/appointments', 'a')).json())[0].status,
        status,
      )
    }
    assert.equal(
      (await request('PATCH', '/appointments/missing', 'a', payload)).status,
      404,
    )
    const bookingPayload = {
      ...payload,
      courseId: '',
      startAt: new Date(Date.now() + 86400000).toISOString(),
    }
    assert.equal((await request('GET', '/learner-appointments')).status, 401)
    assert.equal(
      (await request('GET', '/learner-appointments', 'a')).status,
      403,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/learner-appointments',
          'otherStudent',
          bookingPayload,
        )
      ).status,
      403,
    )
    assert.equal(
      (
        await request('POST', '/learner-appointments', 'student', {
          ...bookingPayload,
          followupId: 'pending',
        })
      ).status,
      403,
    )
    assert.equal(
      (
        await request('POST', '/learner-appointments', 'student', {
          ...bookingPayload,
          startAt: '2020-01-01T10:00:00Z',
        })
      ).status,
      400,
    )
    const bookedResponse = await request(
      'POST',
      '/learner-appointments',
      'student',
      {
        ...bookingPayload,
        coachId: 'b',
        status: 'scheduled',
        notes: 'Injected',
      },
    )
    assert.equal(bookedResponse.status, 201)
    const booked = await bookedResponse.json()
    assert.equal(booked.status, 'requested')
    assert.equal(booked.coachId, 'a')
    const acceptancePath = `/appointments/${booked.id}/accept`
    assert.equal((await request('PATCH', acceptancePath)).status, 401)
    assert.equal((await request('PATCH', acceptancePath, 'student')).status, 403)
    assert.equal((await request('PATCH', acceptancePath, 'b')).status, 403)
    assert.equal((await request('PATCH', '/appointments/missing/accept', 'a')).status, 404)
    records.coachFollowupRequests.active.status = 'rejected'
    assert.equal((await request('PATCH', acceptancePath, 'a')).status, 403)
    records.coachFollowupRequests.active.status = 'accepted'
    const accepted = await request('PATCH', acceptancePath, 'a', { clientId: 'other', title: 'Injected' })
    assert.equal(accepted.status, 200)
    const confirmed = await accepted.json()
    assert.equal(confirmed.status, 'scheduled')
    assert.equal(confirmed.clientId, 'student')
    assert.equal(confirmed.title, booked.title)
    assert.equal(confirmed.startAt, booked.startAt)
    assert.equal(confirmed.durationMinutes, booked.durationMinutes)
    assert.equal((await (await request('PATCH', acceptancePath, 'a')).json()).updatedAt, confirmed.updatedAt)
    records.coachAppointments[booked.id].startAt = new Date(Date.now() - 10 * 60000).toISOString()
    records.coachAppointments[booked.id].status = 'requested'
    assert.equal((await request('PATCH', acceptancePath, 'a')).status, 200)
    records.coachAppointments[booked.id].startAt = '2020-01-01T10:00:00Z'
    assert.equal((await request('PATCH', acceptancePath, 'a')).status, 409)
    records.coachAppointments[booked.id].startAt = booked.startAt
    assert.equal(
      (await (await request('GET', '/appointments', 'a')).json()).some(
        (item) => item.id === booked.id,
      ),
      true,
    )
    assert.equal(
      (
        await request('PATCH', `/appointments/${booked.id}`, 'a', {
          ...bookingPayload,
          status: 'scheduled',
          notes: 'Private coach notes',
        })
      ).status,
      200,
    )
    const studentEvents = await (
      await request('GET', '/learner-appointments', 'student')
    ).json()
    assert.equal(
      studentEvents.find((item) => item.id === booked.id).status,
      'scheduled',
    )
    assert.equal(
      studentEvents.some((item) => Object.hasOwn(item, 'notes')),
      false,
    )
    assert.equal(
      (
        await (
          await request('GET', '/learner-appointments', 'otherStudent')
        ).json()
      ).length,
      0,
    )
    assert.equal(
      (
        await request(
          'PATCH',
          `/learner-appointments/${booked.id}/cancel`,
          'otherStudent',
        )
      ).status,
      403,
    )
    assert.equal(
      (
        await request(
          'PATCH',
          `/learner-appointments/${booked.id}/cancel`,
          'student',
        )
      ).status,
      200,
    )
    assert.equal(records.coachAppointments[booked.id].status, 'cancelled')
    assert.equal((await request('PATCH', acceptancePath, 'a')).status, 409)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
