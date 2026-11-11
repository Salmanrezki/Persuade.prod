const projectId = process.env.FIREBASE_TEST_PROJECT_ID
const localHost = (value) => /^(localhost|127\.0\.0\.1):\d+$/.test(value || '')
if (!projectId?.startsWith('demo-') ||
    !localHost(process.env.FIRESTORE_EMULATOR_HOST) ||
    !localHost(process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  throw new Error('Ce contrôle nécessite les émulateurs Firebase locaux.')
}

const authUrl = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`
const login = async (email) => {
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPersuade2027!', returnSecureToken: true }),
  })
  const result = await response.json()
  if (!response.ok || !result.idToken) throw new Error(`Connexion de test échouée : ${email}`)
  return result.idToken
}

const check = async (token, route, expectedCount) => {
  const response = await fetch(`http://127.0.0.1:3002/api/${route}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`)
  const data = await response.json()
  if (expectedCount !== null && (!Array.isArray(data) || data.length !== expectedCount)) {
    throw new Error(`${route}: ${Array.isArray(data) ? data.length : 'réponse invalide'} éléments au lieu de ${expectedCount}`)
  }
  console.log(`${route}: OK${Array.isArray(data) ? ` (${data.length})` : ''}`)
}

process.env.PORT = '3002'
await import('../src/index.js')

try {
  const coachToken = await login('coach@test.persuade.local')
  await check(coachToken, 'coach-account/journey', null)
  await check(coachToken, 'courses/coach', 2)
  await check(coachToken, 'exercises/coach', 3)
  await check(coachToken, 'masterclasses/coach', 2)
  await check(coachToken, 'follow-up/coach', 0)
  await check(coachToken, 'follow-up/appointments', 0)
  const learnerToken = await login('apprenant@test.persuade.local')
  await check(learnerToken, 'exercises', 3)
  console.log('Contrôle fonctionnel terminé.')
} catch (error) {
  console.error(error)
  process.exit(1)
}
process.exit(0)
