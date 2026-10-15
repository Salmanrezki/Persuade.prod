// Only references owned by this authenticated UID are removed. Queries are
// bounded and deletion is retryable if a storage operation fails.
export async function deleteOwnAccount(db, auth, uid) {
  if (typeof uid !== 'string' || !uid || uid.includes('/'))
    throw new Error('Invalid account ID')
  const references = [
    ['conversations', 'participants', 'array-contains'],
    ['courseRequests', 'studentId'],
    ['courseRequests', 'coachId'],
    ['coachFollowupRequests', 'clientId'],
    ['coachFollowupRequests', 'coachId'],
    ['coachAppointments', 'clientId'],
    ['coachAppointments', 'coachId'],
    ['masterclassRegistrations', 'studentId'],
    ['masterclassRegistrations', 'coachId'],
    ['courses', 'coachId'],
    ['masterclasses', 'coachId'],
    ['coachExercises', 'coachId'],
  ]
  for (const [collection, field, operator = '=='] of references) {
    const query = db
      .collection(collection)
      .where(field, operator, uid)
      .limit(100)
    while (true) {
      const snapshot = await query.get()
      if (snapshot.empty) break
      for (const doc of snapshot.docs) await db.recursiveDelete(doc.ref)
    }
  }
  await db.recursiveDelete(db.collection('users').doc(uid))
  // Keep authentication available for a retry until the data cleanup succeeds.
  try {
    await auth.deleteUser(uid)
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error
  }
}
