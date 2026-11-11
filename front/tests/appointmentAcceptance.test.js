import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

async function component(file, dependencies, globals, exports) {
  const source = await readFile(
    new URL(`../src/components/${file}.vue`, import.meta.url),
    'utf8',
  )
  const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1]
  const context = vm.createContext(globals)
  const module = new vm.SourceTextModule(`${script}\nexport { ${exports} };`, {
    context,
  })
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
  return module.namespace
}
const vue = {
  ref: (value) => ({ value }),
  computed: (getter) => ({
    get value() {
      return getter()
    },
  }),
  onMounted() {},
  onUnmounted() {},
}

test('acceptance updates the appointment only after server confirmation, and reports failure', async () => {
  const emitted = [],
    broadcast = [],
    requests = []
  const confirmed = { id: 'a', status: 'scheduled' }
  let reject = false
  const state = await component(
    'AcceptAppointmentButton',
    {
      vue,
      '@/services/api': {
        default: {
          patch: async (url) => {
            requests.push(url)
            if (reject)
              throw { response: { data: { message: 'Rendez-vous annulé' } } }
            return { data: confirmed }
          },
        },
      },
    },
    {
      defineProps: () => ({ appointment: { id: 'a', status: 'requested' } }),
      defineEmits:
        () =>
        (...args) =>
          emitted.push(args),
      window: { dispatchEvent: (event) => broadcast.push(event.type) },
      Event,
    },
    'accept, busy, error',
  )
  await state.accept()
  assert.equal(requests[0], '/follow-up/appointments/a/accept')
  assert.equal(emitted[0][0], 'accepted')
  assert.equal(emitted[0][1], confirmed)
  assert.deepEqual(broadcast, ['appointments-updated'])
  reject = true
  await state.accept()
  assert.equal(state.error.value, 'Rendez-vous annulé')
  assert.equal(state.busy.value, false)
  assert.equal(emitted.length, 1)
})

test('both dashboards keep ongoing sessions visible and refresh accepted requests', async () => {
  for (const coach of [true, false]) {
    const now = Date.now()
    const ongoing = {
      id: 'current',
      startAt: new Date(now - 15 * 60000).toISOString(),
      durationMinutes: 30,
      status: 'scheduled',
    }
    const requested = {
      id: 'requested',
      startAt: new Date(now + 60000).toISOString(),
      durationMinutes: 30,
      status: 'requested',
    }
    let data = [
      ongoing,
      requested,
      { ...ongoing, id: 'cancelled', status: 'cancelled' },
      { ...ongoing, id: 'past', startAt: '2020-01-01T10:00:00Z' },
    ]
    let refreshAutomatically
    const paths = []
    const state = await component(
      'AppointmentAccessPanel',
      {
        vue,
        '@/services/api': {
          default: {
            get: async (path) => {
              paths.push(path)
              return { data }
            },
          },
        },
        '@/components/AppointmentVideoButton.vue': { default: {} },
        '@/components/AcceptAppointmentButton.vue': { default: {} },
        '@/composables/useAppointmentRefresh': {
          useAppointmentRefresh: (callback) => {
            refreshAutomatically = callback
          },
        },
      },
      { defineProps: () => ({ coach }) },
      'refresh, visible',
    )
    await state.refresh()
    assert.equal(
      paths[0],
      `/follow-up/${coach ? 'appointments' : 'learner-appointments'}`,
    )
    assert.deepEqual(
      Array.from(state.visible.value, (item) => item.id),
      ['current', 'requested'],
    )
    data = [ongoing, { ...requested, status: 'scheduled' }]
    await refreshAutomatically()
    assert.equal(state.visible.value[1].status, 'scheduled')
  }
})
