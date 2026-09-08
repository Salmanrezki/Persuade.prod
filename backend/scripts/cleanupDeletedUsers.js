import admin from '../src/firebaseAdmin.js'

const firestore = admin.firestore()
const auth = admin.auth()
const hasApplyFlag = process.argv.includes('--apply')
const hasConfirmationFlag = process.argv.includes('--yes')
const uidArg = process.argv.find((arg) => arg.startsWith('--uid='))
const targetUid = uidArg ? uidArg.split('=')[1]?.trim() : ''

if (hasApplyFlag && !hasConfirmationFlag) {
  console.error('Refusing to apply changes without --yes')
  process.exit(1)
}

const usersCollection = firestore.collection('users')
const conversationsCollection = firestore.collection('conversations')
const courseRequestsCollection = firestore.collection('courseRequests')
const followupCollection = firestore.collection('coachFollowupRequests')
const masterclassRegistrationsCollection = firestore.collection('masterclassRegistrations')

const userExistsInAuth = async (uid) => {
  try {
    await auth.getUser(uid)
    return true
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return false
    throw error
  }
}

const getUserDocs = async () => {
  if (targetUid) {
    const doc = await usersCollection.doc(targetUid).get()
    return doc.exists ? [doc] : []
  }

  const snapshot = await usersCollection.get()
  return snapshot.docs
}

const deleteQuerySnapshot = async (snapshot) => {
  if (snapshot.empty) return 0

  let deleted = 0
  const batch = firestore.batch()
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
    deleted += 1
  })
  await batch.commit()
  return deleted
}

const cleanupUserReferences = async (uid) => {
  const [
    conversationsSnapshot,
    studentCourseRequestsSnapshot,
    coachCourseRequestsSnapshot,
    clientFollowupsSnapshot,
    coachFollowupsSnapshot,
    studentRegistrationsSnapshot,
    coachRegistrationsSnapshot,
  ] = await Promise.all([
    conversationsCollection.where('participants', 'array-contains', uid).get(),
    courseRequestsCollection.where('studentId', '==', uid).get(),
    courseRequestsCollection.where('coachId', '==', uid).get(),
    followupCollection.where('clientId', '==', uid).get(),
    followupCollection.where('coachId', '==', uid).get(),
    masterclassRegistrationsCollection.where('studentId', '==', uid).get(),
    masterclassRegistrationsCollection.where('coachId', '==', uid).get(),
  ])

  const counts = {
    conversations: conversationsSnapshot.size,
    courseRequestsAsStudent: studentCourseRequestsSnapshot.size,
    courseRequestsAsCoach: coachCourseRequestsSnapshot.size,
    followupsAsClient: clientFollowupsSnapshot.size,
    followupsAsCoach: coachFollowupsSnapshot.size,
    masterclassRegistrationsAsStudent: studentRegistrationsSnapshot.size,
    masterclassRegistrationsAsCoach: coachRegistrationsSnapshot.size,
  }

  if (!hasApplyFlag) return counts

  let deletedConversations = 0
  for (const conversationDoc of conversationsSnapshot.docs) {
    await firestore.recursiveDelete(conversationDoc.ref)
    deletedConversations += 1
  }

  return {
    conversations: deletedConversations,
    courseRequestsAsStudent: await deleteQuerySnapshot(studentCourseRequestsSnapshot),
    courseRequestsAsCoach: await deleteQuerySnapshot(coachCourseRequestsSnapshot),
    followupsAsClient: await deleteQuerySnapshot(clientFollowupsSnapshot),
    followupsAsCoach: await deleteQuerySnapshot(coachFollowupsSnapshot),
    masterclassRegistrationsAsStudent: await deleteQuerySnapshot(studentRegistrationsSnapshot),
    masterclassRegistrationsAsCoach: await deleteQuerySnapshot(coachRegistrationsSnapshot),
  }
}

const run = async () => {
  const userDocs = await getUserDocs()
  const orphanProfiles = []

  for (const doc of userDocs) {
    const exists = await userExistsInAuth(doc.id)
    if (exists) continue

    const data = doc.data() || {}
    const references = await cleanupUserReferences(doc.id)
    orphanProfiles.push({
      uid: doc.id,
      email: data.email || '',
      firstname: data.firstname || '',
      role: data.role || null,
      references,
    })

    if (hasApplyFlag) {
      await doc.ref.delete()
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: hasApplyFlag ? 'apply' : 'dry-run',
        targetUid: targetUid || null,
        orphanProfilesCount: orphanProfiles.length,
        orphanProfiles,
        deletedProfiles: hasApplyFlag ? orphanProfiles.map((profile) => profile.uid) : [],
      },
      null,
      2
    )
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deleted user cleanup failed:', error)
    process.exit(1)
  })
