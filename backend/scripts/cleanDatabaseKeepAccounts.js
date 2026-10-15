import admin from '../src/firebaseAdmin.js'
const keepEmails = ['apprenant-persuade@gmail.com', 'coach-persuade@gmail.com']
const db = admin.firestore()
const auth = admin.auth()
async function listUsers() {
  const users = []; let token
  do { const page = await auth.listUsers(1000, token); users.push(...page.users); token = page.pageToken } while (token)
  return users
}
async function run() {
  const keep = await Promise.all(keepEmails.map(email => auth.getUserByEmail(email)))
  const keepIds = new Set(keep.map(user => user.uid))
  const profiles = await Promise.all(keep.map(user => db.collection('users').doc(user.uid).get()))
  if (profiles.some(doc => !doc.exists)) throw new Error('Un profil à conserver est absent. Nettoyage interrompu.')
  const users = await listUsers()
  const collections = await db.listCollections()
  const counts = await Promise.all(collections.map(async collection => ({ name: collection.id, documents: (await collection.count().get()).data().count })))
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'audit', kept: keep.map((user, i) => ({ email: user.email, uid: user.uid, role: profiles[i].data().role })), authUsersToDelete: users.filter(user => !keepIds.has(user.uid)).length, collections: counts }, null, 2))
  if (!process.argv.includes('--apply')) return
  for (const collection of collections) {
    if (collection.id !== 'users') { await db.recursiveDelete(collection); console.log('Collection vidée :', collection.id); continue }
    const snapshot = await collection.get()
    for (const doc of snapshot.docs) {
      if (!keepIds.has(doc.id)) await db.recursiveDelete(doc.ref)
      else {
        for (const child of await doc.ref.listCollections()) await db.recursiveDelete(child)
        await doc.ref.update({ learningProgress: admin.firestore.FieldValue.delete() })
      }
    }
  }
  const remove = users.filter(user => !keepIds.has(user.uid))
  for (let i = 0; i < remove.length; i += 1000) {
    const result = await auth.deleteUsers(remove.slice(i, i + 1000).map(user => user.uid))
    if (result.failureCount) throw new Error(`Échec de suppression de ${result.failureCount} comptes.`)
  }
  const remaining = await listUsers()
  if (remaining.length !== 2 || remaining.some(user => !keepIds.has(user.uid))) throw new Error('La vérification des comptes restants a échoué.')
  const remainingProfiles = await db.collection('users').get()
  if (remainingProfiles.size !== 2 || remainingProfiles.docs.some(doc => !keepIds.has(doc.id))) throw new Error('La vérification des profils restants a échoué.')
  for (const collection of await db.listCollections()) {
    if (collection.id !== 'users' && !(await collection.limit(1).get()).empty) throw new Error(`Collection non vide : ${collection.id}`)
  }
  console.log(JSON.stringify({ verified: true, remainingAccounts: remaining.map(user => user.email), remainingProfiles: remainingProfiles.size, deletedAuthUsers: remove.length }, null, 2))
}
run().then(() => process.exit(0)).catch(error => { console.error(error.code || '', error.message); process.exit(1) })
