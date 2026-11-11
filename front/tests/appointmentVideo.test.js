import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('shared coach and learner button stays available throughout the appointment', async () => {
  const start = Date.parse('2026-10-16T14:00:00Z')
  let currentTime = start - 1000, tick, mount, unmount, cleared = false
  const props = { appointment: {
    id: 'same-appointment', status: 'scheduled',
    startAt: new Date(start).toISOString(), durationMinutes: 30,
  } }
  const source = await readFile(new URL('../src/components/AppointmentVideoButton.vue', import.meta.url), 'utf8')
  const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1]
  const vue = {
    ref: value => ({ value }),
    computed: getter => ({ get value() { return getter() } }),
    onMounted: fn => { mount = fn },
    onUnmounted: fn => { unmount = fn },
  }
  const context = vm.createContext({
    defineProps: () => props,
    Date: class extends Date { static now() { return currentTime } },
    window: {
      setInterval: fn => { tick = fn; return 42 },
      clearInterval: id => { cleared = id === 42 },
    },
  })
  const module = new vm.SourceTextModule(`${script}\nexport { visible, ready };`, { context })
  await module.link(() => new vm.SyntheticModule(Object.keys(vue), function () {
    for (const [key, value] of Object.entries(vue)) this.setExport(key, value)
  }, { context }))
  await module.evaluate()
  mount()
  assert.equal(module.namespace.visible.value, true)
  assert.equal(module.namespace.ready.value, false)
  for (const elapsed of [0, 15 * 60000, 30 * 60000 - 1]) {
    currentTime = start + elapsed
    tick()
    assert.equal(module.namespace.visible.value, true)
    assert.equal(module.namespace.ready.value, true)
  }
  props.appointment.status = 'cancelled'
  assert.equal(module.namespace.visible.value, false)
  props.appointment.status = 'scheduled'
  currentTime = start + 30 * 60000
  tick()
  assert.equal(module.namespace.visible.value, false)
  unmount()
  assert.equal(cleared, true)
})

async function setup() {
  const source = await readFile(
    new URL('../src/views/AppointmentVideoView.vue', import.meta.url),
    'utf8',
  )
  const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1]
  const disposals = [],
    frames = []
  let metadata = {
    state: 'ready',
    configured: true,
    serverNow: Date.now(),
    startAt: new Date(Date.now() - 1000).toISOString(),
    endAt: new Date(Date.now() + 600000).toISOString(),
    sessionVersion: 'v1',
  }
  let session = async () => ({
    data: {
      url: 'https://test.daily.co/room',
      token: 'private',
      sessionVersion: 'v1',
    },
  })
  let failRead = false
  const dependencies = {
    vue: {
      ref: (value) => ({ value }),
      computed: (fn) => ({
        get value() {
          return fn()
        },
      }),
      onMounted: () => {},
      onUnmounted: (fn) => disposals.push(fn),
      watch: () => {},
    },
    'vue-router': { useRoute: () => ({ params: { id: 'appointment' } }) },
    '@/router/paths': { ROUTE_PATHS: { home: '/app/home' } },
    '@/components/AppointmentChatPanel.vue': { default: {} },
    '@/services/api': {
      default: {
        get: async () => {
          if (failRead) throw new Error('offline')
          return { data: metadata }
        },
        post: (...args) => session(...args),
      },
    },
    '@/services/dailyVideo': {
      loadDailyVideo: async () => ({
        createFrame: () => {
          const handlers = {}
          const frame = {
            destroyed: false,
            handlers,
            on: (name, fn) => {
              handlers[name] = fn
              return frame
            },
            participants: () => ({
              local: { local: true },
              remote: { local: false },
            }),
            join: async () => {
              handlers['joined-meeting']()
            },
            destroy: async () => {
              frame.destroyed = true
            },
          }
          frames.push(frame)
          return frame
        },
      }),
    },
  }
  const context = vm.createContext({
    window: { isSecureContext: true, clearInterval() {} },
    console,
  })
  const module = new vm.SourceTextModule(
    `${script}\nexport { refresh, join, stopCall, active, joined, remotePresent, error, connecting };`,
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
  return {
    state: module.namespace,
    frames,
    dispose: () => disposals.forEach((fn) => fn()),
    update: (value) => {
      metadata = { ...metadata, ...value }
    },
    failRead: () => {
      failRead = true
    },
    setSession: (fn) => {
      session = fn
    },
  }
}

test('video joins, shows participant presence, and releases the call on leave', async () => {
  const app = await setup()
  await app.state.refresh()
  await app.state.join()
  assert.equal(app.state.active.value, true)
  assert.equal(app.state.joined.value, true)
  assert.equal(app.state.remotePresent.value, true)
  await app.state.join()
  assert.equal(app.frames.length, 1)
  await app.state.stopCall()
  assert.equal(app.frames[0].destroyed, true)
  assert.equal(app.state.active.value, false)
  await app.state.join()
  assert.equal(app.frames.length, 2)
  assert.equal(app.state.active.value, true)
  await app.state.stopCall()
})

test('cancelled, edited or unverifiable appointments terminate the current call', async () => {
  for (const update of [
    { state: 'unavailable' },
    { state: 'ended' },
    { sessionVersion: 'v2' },
    null,
  ]) {
    const app = await setup()
    await app.state.refresh()
    await app.state.join()
    if (update) app.update(update)
    else app.failRead()
    await app.state.refresh()
    assert.equal(app.frames[0].destroyed, true)
    assert.equal(app.state.active.value, false)
  }
})

test('leaving the page during session creation never activates the camera afterwards', async () => {
  const app = await setup()
  let resolveSession
  let requestStarted
  const started = new Promise((resolve) => {
    requestStarted = resolve
  })
  app.setSession(
    () =>
      new Promise((resolve) => {
        resolveSession = resolve
        requestStarted()
      }),
  )
  const joining = app.state.join()
  await started
  app.dispose()
  resolveSession({
    data: {
      sessionVersion: 'v1',
      url: 'https://test.daily.co/room',
      token: 'private',
    },
  })
  await joining
  assert.equal(app.frames.length, 0)
  assert.equal(app.state.connecting.value, false)
})

test('provider failure is visible and permits retry', async () => {
  const app = await setup()
  app.setSession(async () => {
    throw { response: { data: { message: 'Salle indisponible' } } }
  })
  await app.state.join()
  assert.equal(app.state.error.value, 'Salle indisponible')
  assert.equal(app.state.connecting.value, false)
  assert.equal(app.state.active.value, false)
})
