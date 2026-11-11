import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_ATTACHMENT_BYTES,
  normalizeChatContent,
} from '../src/utils/chatContent.js'

test('chat supports text, documents and both together within Firestore limits', () => {
  assert.deepEqual(normalizeChatContent({ text: ' Bonjour ' }), {
    text: 'Bonjour',
    attachment: null,
  })
  const attachment = {
    name: 'cours.pdf',
    mime: 'application/pdf',
    dataUrl: 'data:application/pdf;base64,JVBERg==',
  }
  const result = normalizeChatContent({ text: 'Le cours', attachment })
  assert.equal(result.attachment.size, 4)
  assert.equal(result.text, 'Le cours')
  assert.equal(normalizeChatContent({ attachment }).text, '')
  const max = normalizeChatContent({
    text: 'é'.repeat(5000),
    attachment: {
      ...attachment,
      dataUrl: `data:application/pdf;base64,${Buffer.alloc(MAX_ATTACHMENT_BYTES).toString('base64')}`,
    },
  })
  assert.ok(Buffer.byteLength(JSON.stringify(max)) < 1024 * 1024)
})

test('invalid, executable and oversized attachments and empty/long messages are rejected', () => {
  const attachment = {
    name: 'cours.pdf',
    mime: 'application/pdf',
    dataUrl: 'data:application/pdf;base64,JVBERg==',
  }
  for (const value of [
    {},
    { text: ' ' },
    { text: 'a'.repeat(5001) },
    ...[
      { mime: 'text/html', dataUrl: 'data:text/html;base64,YQ==' },
      { dataUrl: 'javascript:alert(1)' },
      { dataUrl: 'data:application/pdf;base64,@@@@' },
      { dataUrl: 'data:application/pdf;base64,' },
      {
        dataUrl: `data:application/pdf;base64,${Buffer.alloc(MAX_ATTACHMENT_BYTES + 1).toString('base64')}`,
      },
      { name: 'a'.repeat(181) },
    ].map((change) => ({ attachment: { ...attachment, ...change } })),
  ])
    assert.throws(() => normalizeChatContent(value))
})
