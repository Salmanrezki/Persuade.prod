import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { initializeApp, deleteApp } from 'firebase/app'

test('real Firebase SDK sends all three email actions with French locale and the expected payload', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  const email = 'test@example.com'
  const jwtPart = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${jwtPart({ alg: 'none' })}.${jwtPart({ sub: 'test-user', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.test`
  // Every request is intercepted; no email or credential leaves this test process.
  globalThis.fetch = async (url, options) => {
    const request = { url: String(url), body: JSON.parse(options.body || '{}'), headers: new Headers(options.headers) }
    requests.push(request)
    let body
    if (request.url.includes('/accounts:signInWithPassword')) body = { localId: 'test-user', email, idToken: token, refreshToken: 'test-refresh', expiresIn: '3600' }
    else if (request.url.includes('/accounts:lookup')) body = { users: [{ localId: 'test-user', email, emailVerified: false, providerUserInfo: [{ providerId: 'password', email, rawId: email }] }] }
    else if (request.url.includes('/accounts:sendOobCode')) body = { email }
    else throw new Error('Unexpected Firebase request intercepted')
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const sdk = await import('firebase/auth')
  const app = initializeApp({ apiKey: 'test-api-key', authDomain: 'test.firebaseapp.com', projectId: 'test' }, 'email-transport-test')
  const auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence })
  try {
    const context = vm.createContext({})
    const dependencies = { '@/services/firebase': { auth }, 'firebase/auth': sdk }
    const module = new vm.SourceTextModule(await readFile(new URL('../src/services/accountSecurityService.js', import.meta.url), 'utf8'), { context })
    await module.link(name => new vm.SyntheticModule(Object.keys(dependencies[name]), function () { for (const [key, value] of Object.entries(dependencies[name])) this.setExport(key, value) }, { context }))
    await module.evaluate()
    await module.namespace.resetPassword(' test@example.com ')
    await sdk.signInWithEmailAndPassword(auth, email, 'not-a-real-password')
    await module.namespace.verifyEmail()
    await module.namespace.correctEmail('new@example.com', 'not-a-real-password')
    const emails = requests.filter(request => request.url.includes('/accounts:sendOobCode'))
    assert.deepEqual(emails.map(request => request.body.requestType), ['PASSWORD_RESET', 'VERIFY_EMAIL', 'VERIFY_AND_CHANGE_EMAIL'])
    assert.equal(emails[0].body.email, email)
    assert.equal(emails[1].body.idToken, token)
    assert.equal(emails[2].body.newEmail, 'new@example.com')
    for (const request of emails) {
      assert.equal(request.headers.get('X-Firebase-Locale'), 'fr')
      assert.equal(request.body.returnOobLink, undefined)
    }
  } finally {
    await deleteApp(app)
    globalThis.fetch = originalFetch
  }
})
