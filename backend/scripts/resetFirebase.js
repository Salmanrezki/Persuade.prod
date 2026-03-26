import admin from '../src/firebaseAdmin.js'

const firestore = admin.firestore()
const auth = admin.auth()
const hasConfirmationFlag = process.argv.includes('--yes')

if (!hasConfirmationFlag) {
  console.error('Refusing to run without --yes')
  process.exit(1)
}

const listAllAuthUserIds = async () => {
  const userIds = []
  let nextPageToken

  do {
    const page = await auth.listUsers(1000, nextPageToken)
    page.users.forEach((user) => userIds.push(user.uid))
    nextPageToken = page.pageToken
  } while (nextPageToken)

  return userIds
}

const deleteAuthUsers = async () => {
  const userIds = await listAllAuthUserIds()
  if (!userIds.length) {
    return { deleted: 0 }
  }

  let deleted = 0

  for (let index = 0; index < userIds.length; index += 1000) {
    const batch = userIds.slice(index, index + 1000)
    const result = await auth.deleteUsers(batch)
    deleted += result.successCount

    if (result.failureCount) {
      const failures = result.errors.map((error) => ({
        index: error.index,
        code: error.error?.code,
        message: error.error?.message,
      }))
      console.error('Some auth users could not be deleted:', failures)
    }
  }

  return { deleted }
}

const deleteAllRootCollections = async () => {
  const collections = await firestore.listCollections()

  for (const collection of collections) {
    console.log(`Deleting collection ${collection.id}...`)
    await firestore.recursiveDelete(collection)
  }

  return collections.map((collection) => collection.id)
}

const run = async () => {
  console.log('Starting Firebase reset...')

  const deletedCollections = await deleteAllRootCollections()
  const authSummary = await deleteAuthUsers()

  console.log('Firebase reset completed.')
  console.log(
    JSON.stringify(
      {
        deletedCollections,
        deletedAuthUsers: authSummary.deleted,
      },
      null,
      2
    )
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Firebase reset failed:', error)
    process.exit(1)
  })
