import admin from '../src/firebaseAdmin.js'

const firestore = admin.firestore()
const auth = admin.auth()
const hasConfirmationFlag = process.argv.includes('--yes')

if (!hasConfirmationFlag) {
  console.error('Refusing to run without --yes')
  process.exit(1)
}

const usersCollection = firestore.collection('users')
const coursesCollection = firestore.collection('courses')
const courseRequestsCollection = firestore.collection('courseRequests')
const followupCollection = firestore.collection('coachFollowupRequests')
const masterclassesCollection = firestore.collection('masterclasses')
const masterclassRegistrationsCollection = firestore.collection('masterclassRegistrations')
const conversationsCollection = firestore.collection('conversations')

const chunk = (items, size) => {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const deleteQuerySnapshot = async (snapshot) => {
  if (snapshot.empty) return 0

  let deleted = 0
  for (const docs of chunk(snapshot.docs, 400)) {
    const batch = firestore.batch()
    docs.forEach((item) => {
      batch.delete(item.ref)
      deleted += 1
    })
    await batch.commit()
  }

  return deleted
}

const deleteConversationsForCoach = async (coachId) => {
  const snapshot = await conversationsCollection.where('participants', 'array-contains', coachId).get()
  let deleted = 0

  for (const conversationDoc of snapshot.docs) {
    await firestore.recursiveDelete(conversationDoc.ref)
    deleted += 1
  }

  return deleted
}

const run = async () => {
  const coachSnapshots = await Promise.all([
    usersCollection.where('role', '==', 'coach').get(),
    usersCollection.where('coachApplicationStatus', '==', 'pending_review').get(),
  ])

  const coachDocsMap = new Map()
  coachSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((item) => {
      coachDocsMap.set(item.id, item)
    })
  })

  const coachDocs = Array.from(coachDocsMap.values())
  const coachIds = coachDocs.map((item) => item.id)

  if (!coachIds.length) {
    console.log(JSON.stringify({ deletedCoaches: 0 }, null, 2))
    return
  }

  let deletedCourses = 0
  let deletedCourseRequests = 0
  let deletedFollowups = 0
  let deletedMasterclasses = 0
  let deletedMasterclassRegistrations = 0
  let deletedConversations = 0

  for (const coachId of coachIds) {
    deletedCourses += await deleteQuerySnapshot(await coursesCollection.where('coachId', '==', coachId).get())
    deletedCourseRequests += await deleteQuerySnapshot(
      await courseRequestsCollection.where('coachId', '==', coachId).get()
    )
    deletedFollowups += await deleteQuerySnapshot(await followupCollection.where('coachId', '==', coachId).get())
    deletedMasterclasses += await deleteQuerySnapshot(
      await masterclassesCollection.where('coachId', '==', coachId).get()
    )
    deletedMasterclassRegistrations += await deleteQuerySnapshot(
      await masterclassRegistrationsCollection.where('coachId', '==', coachId).get()
    )
    deletedConversations += await deleteConversationsForCoach(coachId)
  }

  const userDeleteCount = await deleteQuerySnapshot({
    empty: coachDocs.length === 0,
    docs: coachDocs,
  })

  const authDeleteResult = await auth.deleteUsers(coachIds)

  console.log(
    JSON.stringify(
      {
        deletedCoaches: coachIds.length,
        deletedUserProfiles: userDeleteCount,
        deletedCourses,
        deletedCourseRequests,
        deletedFollowupRequests: deletedFollowups,
        deletedMasterclasses,
        deletedMasterclassRegistrations,
        deletedConversations,
        deletedAuthUsers: authDeleteResult.successCount,
        authDeletionErrors: authDeleteResult.errors.map((error) => ({
          index: error.index,
          code: error.error?.code,
          message: error.error?.message,
        })),
      },
      null,
      2
    )
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Coach deletion failed:', error)
    process.exit(1)
  })

