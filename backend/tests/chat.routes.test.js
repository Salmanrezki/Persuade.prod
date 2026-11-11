import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import express from 'express'
import { normalizeChatContent } from '../src/utils/chatContent.js'

test('persistent chat is shared by the two participants and protects documents from third parties', async () => {
  const conversations = new Map(),
    messages = new Map()
  let seq = 0,
    commitFails = false
  const snapshot = (id, value) => ({ id, exists: !!value, data: () => value })
  function ref(id) {
    return {
      id,
      get: async () => snapshot(id, conversations.get(id)),
      create: async (value) => {
        if (conversations.has(id)) throw { code: 6 }
        conversations.set(id, value)
      },
      collection: () => ({
        doc: () => ({ id: `m${++seq}`, parent: id }),
        orderBy: (_field, direction) => ({
          limit: (count) => ({
            get: async () => ({
              docs: [...messages.entries()]
                .filter(([, item]) => item.parent === id)
                .slice(direction === 'desc' ? -count : 0)
                .reverse()
                .map(([key, value]) => snapshot(key, value.data)),
            }),
          }),
        }),
      }),
    }
  }
  const firestore = () => ({
    collection: () => ({ doc: ref }),
    batch: () => {
      const operations = []
      return {
        set: (r, data) =>
          operations.push(() => messages.set(r.id, { parent: r.parent, data })),
        update: (r, data) =>
          operations.push(() =>
            conversations.set(r.id, { ...conversations.get(r.id), ...data }),
          ),
        commit: async () => {
          if (commitFails) throw new Error('offline')
          operations.forEach((fn) => fn())
        },
      }
    },
  })
  firestore.FieldValue = { serverTimestamp: () => ({ seconds: 1000 + seq }) }
  const dependencies = {
    express: { default: express },
    '../firebaseAdmin.js': { default: { firestore } },
    '../middleware/authMiddleware.js': {
      verifyToken: (req, res, next) => {
        if (!req.headers['x-user']) return res.sendStatus(401)
        req.user = { uid: req.headers['x-user'] }
        next()
      },
    },
    '../utils/chatContent.js': { normalizeChatContent },
    '../utils/firestoreErrors.js': {
      isFirestoreUnavailable: () => false,
      logFirestoreWarning() {},
      toFirestoreUserMessage: () => '',
    },
  }
  const context = vm.createContext({ console: { info() {}, error() {} } })
  const module = new vm.SourceTextModule(
    await readFile(
      new URL('../src/routes/chat.routes.js', import.meta.url),
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
        ...(user ? { 'x-user': user } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  try {
    assert.equal(
      (
        await request('POST', '/conversations', null, {
          participantId: 'learner',
        })
      ).status,
      401,
    )
    const [a, b] = await Promise.all([
      request('POST', '/conversations', 'coach', { participantId: 'learner' }),
      request('POST', '/conversations', 'learner', { participantId: 'coach' }),
    ])
    const conversation = await a.json()
    assert.equal(conversation.id, (await b.json()).id)
    const path = `/conversations/${conversation.id}/messages`
    assert.equal(
      (await request('POST', path, 'outsider', { text: 'Intrusion' })).status,
      403,
    )
    assert.equal((await request('GET', path, 'outsider')).status, 403)
    assert.equal(
      (
        await request('POST', path, 'coach', {
          attachment: { mime: 'text/html' },
        })
      ).status,
      400,
    )
    const sent = await request('POST', path, 'coach', {
      text: 'Support du cours',
      senderId: 'learner',
      attachment: {
        name: 'cours.pdf',
        mime: 'application/pdf',
        dataUrl: 'data:application/pdf;base64,JVBERg==',
      },
    })
    assert.equal(sent.status, 201)
    const received = await (await request('GET', path, 'learner')).json()
    assert.equal(received[0].senderId, 'coach')
    assert.equal(received[0].attachment.name, 'cours.pdf')
    assert.equal(
      received[0].attachment.dataUrl,
      'data:application/pdf;base64,JVBERg==',
    )
    commitFails = true
    assert.equal(
      (await request('POST', path, 'coach', { text: 'Not committed' })).status,
      500,
    )
    assert.equal(messages.size, 1)
    assert.equal(
      conversations.get(conversation.id).lastMessage,
      'Support du cours',
    )
    // Reopening the conversation never erases its preview/history.
    await request('POST', '/conversations', 'coach', {
      participantId: 'learner',
    })
    assert.equal(
      conversations.get(conversation.id).lastMessage,
      'Support du cours',
    )
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
