import admin from '../src/firebaseAdmin.js'

const firestore = admin.firestore()
const hasApplyFlag = process.argv.includes('--apply')
const hasConfirmationFlag = process.argv.includes('--yes')
const conversationsCollection = firestore.collection('conversations')

if (hasApplyFlag && !hasConfirmationFlag) {
  console.error('Refusing to apply changes without --yes')
  process.exit(1)
}

const run = async () => {
  const snapshot = await conversationsCollection.get()
  const conversationIds = snapshot.docs.map((doc) => doc.id)

  if (hasApplyFlag) {
    for (const doc of snapshot.docs) {
      await firestore.recursiveDelete(doc.ref)
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: hasApplyFlag ? 'apply' : 'dry-run',
        conversationsCount: conversationIds.length,
        conversations: conversationIds,
        deletedConversations: hasApplyFlag ? conversationIds : [],
      },
      null,
      2
    )
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Chat cleanup failed:', error)
    process.exit(1)
  })
