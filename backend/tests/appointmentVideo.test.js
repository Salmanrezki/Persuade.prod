import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createVideoProvider,
  videoRoomName,
  videoWindow,
} from '../src/services/appointmentVideo.js'

const start = Date.now() - 10000
const appointment = {
  coachId: 'coach',
  clientId: 'learner',
  clientName: 'Alice',
  startAt: new Date(start).toISOString(),
  durationMinutes: 30,
  status: 'scheduled',
  updatedAt: 'v1',
}
const response = (data, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
})

test('video access obeys exact start/end and confirmed status', () => {
  assert.equal(videoWindow(appointment, start - 1).state, 'waiting')
  assert.equal(videoWindow(appointment, start).state, 'ready')
  assert.equal(videoWindow(appointment, start + 15 * 60000).state, 'ready')
  assert.equal(videoWindow(appointment, start + 30 * 60000 - 1).state, 'ready')
  assert.equal(videoWindow(appointment, start + 30 * 60000).state, 'ended')
  for (const status of ['requested', 'cancelled', 'completed']) {
    assert.equal(
      videoWindow({ ...appointment, status }, start).state,
      'unavailable',
    )
  }
  assert.equal(
    videoWindow({ ...appointment, startAt: 'invalid' }).state,
    'ended',
  )
})

test('rooms are stable for both participants and change when appointment is edited', () => {
  const name = videoRoomName('a', appointment)
  assert.equal(name, videoRoomName('a', { ...appointment }))
  for (const change of [
    { clientId: 'other' },
    { startAt: 'tomorrow' },
    { updatedAt: 'v2' },
  ]) {
    assert.notEqual(name, videoRoomName('a', { ...appointment, ...change }))
  }
})

test('concurrent joins share one private room and receive scoped individual tokens', async () => {
  const requests = []
  const provider = createVideoProvider({
    apiKey: () => 'secret',
    fetcher: async (url, options) => {
      const body = options.body && JSON.parse(options.body)
      requests.push({ url, ...options, body })
      if (url.includes('/rooms/')) return response({}, 404)
      if (url.endsWith('/rooms'))
        return response({
          privacy: 'private',
          url: 'https://test.daily.co/room',
        })
      return response({ token: `token-${body.properties.user_id}` })
    },
  })
  const results = await Promise.all(
    ['coach', 'learner'].map((uid) => provider.join('a', appointment, uid)),
  )
  assert.equal(results[0].url, results[1].url)
  assert.notEqual(results[0].token, results[1].token)
  const rooms = requests.filter((r) => r.url.endsWith('/rooms'))
  assert.equal(rooms.length, 1)
  assert.equal(rooms[0].body.privacy, 'private')
  assert.equal(rooms[0].body.properties.max_participants, 2)
  assert.equal(rooms[0].body.properties.enable_knocking, false)
  assert.equal(rooms[0].body.properties.eject_at_room_exp, true)
  for (const req of requests.filter((r) => r.url.endsWith('/meeting-tokens'))) {
    assert.equal(req.body.properties.room_name, results[0].sessionVersion)
    assert.equal(req.body.properties.is_owner, false)
    assert.ok(req.body.properties.exp <= Math.floor(Date.now() / 1000) + 120)
  }
})

test('cross-server creation race recovers the existing room', async () => {
  let reads = 0
  const provider = createVideoProvider({
    apiKey: () => 'secret',
    fetcher: async (url) => {
      if (url.includes('/rooms/'))
        return ++reads === 1
          ? response({}, 404)
          : response({ privacy: 'private', url: 'https://test.daily.co/room' })
      if (url.endsWith('/rooms')) return response({}, 400)
      return response({ token: 'token' })
    },
  })
  assert.equal((await provider.join('a', appointment, 'coach')).token, 'token')
  assert.equal(reads, 2)
})

test('missing configuration and public rooms fail closed', async () => {
  const disabled = createVideoProvider({ apiKey: () => '' })
  assert.equal(disabled.configured(), false)
  await assert.rejects(
    disabled.join('a', appointment, 'coach'),
    /VIDEO_NOT_CONFIGURED/,
  )
  const provider = createVideoProvider({
    apiKey: () => 'secret',
    fetcher: async () =>
      response({ privacy: 'public', url: 'https://test.daily.co/room' }),
  })
  await assert.rejects(
    provider.join('a', appointment, 'coach'),
    /VIDEO_INVALID_ROOM/,
  )
})
