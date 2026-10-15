import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('password recovery, verification and email correction use Firebase account identity', async () => {
  const calls = []
  let resetError, reauthError
  const auth = {
    currentUser: {
      email: 'old@example.com',
      getIdToken: async (force) => calls.push(['token', force]),
    },
  }
  const sdk = {
    sendPasswordResetEmail: async (instance, email) => {
      calls.push(['reset', email])
      if (resetError) throw resetError
    },
    sendEmailVerification: async (user) => calls.push(['verify', user.email]),
    reload: async (user) => calls.push(['reload', user.email]),
    EmailAuthProvider: {
      credential: (email, password) => ({ email, password }),
    },
    reauthenticateWithCredential: async (user, credential) => {
      calls.push(['reauth', credential.email])
      if (reauthError) throw reauthError
    },
    verifyBeforeUpdateEmail: async (user, email) =>
      calls.push(['change', email]),
  }
  const context = vm.createContext({})
  const dependencies = { '@/services/firebase': { auth }, 'firebase/auth': sdk }
  const module = new vm.SourceTextModule(
    await readFile(
      new URL('../src/services/accountSecurityService.js', import.meta.url),
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
  const service = module.namespace
  await assert.rejects(service.resetPassword('not-an-email'))
  assert.equal(calls.length, 0)
  await service.resetPassword(' user@example.com ')
  assert.equal(calls.at(-1)[1], 'user@example.com')
  assert.equal(auth.languageCode, 'fr')
  resetError = { code: 'auth/user-not-found' }
  await service.resetPassword('unknown@example.com')
  resetError = { code: 'auth/network-request-failed' }
  await assert.rejects(service.resetPassword('user@example.com'))
  await service.verifyEmail()
  assert.deepEqual(calls.at(-1), ['verify', 'old@example.com'])
  await service.correctEmail('new@example.com', 'password')
  assert.deepEqual(calls.slice(-2), [
    ['reauth', 'old@example.com'],
    ['change', 'new@example.com'],
  ])
  reauthError = { code: 'auth/invalid-credential' }
  await assert.rejects(service.correctEmail('other@example.com', 'wrong'))
  assert.equal(calls.at(-1)[0], 'reauth')
  await service.refreshAccount()
  assert.deepEqual(calls.at(-1), ['token', true])
  auth.currentUser = null
  await assert.rejects(service.verifyEmail())
})
