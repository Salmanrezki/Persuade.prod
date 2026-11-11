import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import {
  readChatAttachment,
  downloadChatAttachment,
  MAX_ATTACHMENT_BYTES,
} from '../src/utils/chatAttachments.js'

async function setup() {
  const source = await readFile(
    new URL('../src/components/AppointmentChatPanel.vue', import.meta.url),
    'utf8',
  )
  const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1]
  const requests = [],
    disposals = [],
    subscriptions = []
  let fail = false,
    chooseFile = async () => ({
      name: 'cours.pdf',
      dataUrl: 'data:application/pdf;base64,JVBERg==',
      mime: 'application/pdf',
      size: 4,
    })
  const dependencies = {
    vue: {
      ref: (value) => ({ value }),
      computed: (getter) => ({
        get value() {
          return getter()
        },
      }),
      nextTick: async () => {},
      onUnmounted: (fn) => disposals.push(fn),
      watch() {},
    },
    'firebase/firestore': {
      collection: (...args) => args.slice(1),
      limit: (count) => ({ count }),
      orderBy: (...args) => args,
      query: (...args) => args,
      onSnapshot: (query, next, error) => {
        const subscription = { query, next, error, closed: false }
        subscriptions.push(subscription)
        return () => {
          subscription.closed = true
        }
      },
    },
    '@/services/firebase': { db: {} },
    '@/stores/auth': { useAuthStore: () => ({ user: { uid: 'coach' } }) },
    '@/router/paths': { ROUTE_PATHS: { chat: '/app/chat' } },
    '@/services/api': {
      default: {
        post: async (path, body) => {
          requests.push({ path, body })
          if (fail) throw new Error('offline')
          return { data: { id: 'coach__learner' } }
        },
      },
    },
    '@/utils/chatAttachments': {
      ATTACHMENT_ACCEPT: '.pdf',
      readChatAttachment: (file) => chooseFile(file),
      downloadChatAttachment() {},
    },
  }
  const context = vm.createContext({
    defineProps: () => ({ participantId: 'learner', participantName: 'Alice' }),
    URL,
  })
  const module = new vm.SourceTextModule(
    `${script}\nexport { connect, send, selectFile, clearFile, draft, attachment, messages, connected, sending, reading, error, parts };`,
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
    requests,
    subscriptions,
    fail: () => {
      fail = true
    },
    setReader: (fn) => {
      chooseFile = fn
    },
    dispose: () => disposals.forEach((fn) => fn()),
  }
}

test('side panel subscribes to the existing conversation and sends text with a document', async () => {
  const app = await setup()
  await app.state.connect()
  assert.equal(app.requests[0].body.participantId, 'learner')
  const sub = app.subscriptions[0]
  assert.deepEqual(Array.from(sub.query[0]), [
    'conversations',
    'coach__learner',
    'messages',
  ])
  sub.next({
    docs: [
      { id: 'latest', data: () => ({ text: 'Latest' }) },
      { id: 'old', data: () => ({ text: 'Old' }) },
    ],
  })
  assert.equal(app.state.messages.value[0].id, 'old')
  app.state.draft.value = 'Voici le support'
  await app.state.selectFile({ target: { files: [{ name: 'cours.pdf' }] } })
  await app.state.send()
  assert.equal(
    app.requests[1].path,
    '/chat/conversations/coach__learner/messages',
  )
  assert.equal(app.requests[1].body.text, 'Voici le support')
  assert.equal(app.requests[1].body.attachment.name, 'cours.pdf')
  assert.equal(app.state.draft.value, '')
  assert.equal(app.state.attachment.value, null)
  app.dispose()
  assert.equal(sub.closed, true)
  sub.next({ docs: [] })
  assert.equal(app.state.messages.value.length, 2)
})

test('message failures retain draft and attachment; subscription errors can be retried', async () => {
  const app = await setup()
  await app.state.connect()
  app.subscriptions[0].next({ docs: [] })
  app.state.draft.value = 'Ne pas perdre ce message'
  await app.state.selectFile({ target: { files: [{}] } })
  app.fail()
  await app.state.send()
  assert.equal(app.state.draft.value, 'Ne pas perdre ce message')
  assert.equal(app.state.attachment.value.name, 'cours.pdf')
  assert.equal(app.state.sending.value, false)
  app.subscriptions[0].error()
  assert.equal(app.state.connected.value, false)
  assert.ok(app.state.error.value.includes('visio continue'))
})

test('cancelling file selection prevents late FileReader results from attaching a file', async () => {
  const app = await setup()
  let finish
  app.setReader(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const selection = app.state.selectFile({ target: { files: [{}] } })
  app.state.clearFile()
  finish({ name: 'unwanted.pdf' })
  await selection
  assert.equal(app.state.attachment.value, null)
  assert.equal(app.state.reading.value, false)
  assert.equal(app.state.parts('javascript:alert(1)')[0].href, null)
  assert.equal(
    app.state.parts('https://example.com')[1].href,
    'https://example.com/',
  )
})

test('document picker rejects oversized/unsupported files and safely reads supported formats', async () => {
  await assert.rejects(
    readChatAttachment({ name: 'cours.pdf', size: MAX_ATTACHMENT_BYTES + 1 }),
    /600 Ko/,
  )
  await assert.rejects(
    readChatAttachment({ name: 'script.html', size: 10 }),
    /Choisissez/,
  )
  assert.throws(() =>
    downloadChatAttachment({
      mime: 'text/html',
      dataUrl: 'data:text/html;base64,YQ==',
    }),
  )
  const previous = globalThis.FileReader
  globalThis.FileReader = class {
    readAsDataURL() {
      this.result = 'data:application/octet-stream;base64,JVBERg=='
      this.onload()
    }
  }
  try {
    const attachment = await readChatAttachment({
      name: 'cours.PDF',
      size: 4,
      type: '',
    })
    assert.equal(attachment.mime, 'application/pdf')
    assert.equal(attachment.dataUrl, 'data:application/pdf;base64,JVBERg==')
  } finally {
    globalThis.FileReader = previous
  }
})
