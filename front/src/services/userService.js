import { db } from './firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

export const createUserProfile = async (uid, data) => {
  const normalizedRole = data?.role === 'coach' ? 'coach' : 'apprenant'

  await setDoc(doc(db, 'users', uid), {
    ...data,
    role: normalizedRole,
    coachApplicationStatus:
      normalizedRole === 'coach' ? data?.coachApplicationStatus || 'pending_review' : null,
    createdAt: serverTimestamp(),
  })
}

export const getUserProfile = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid))
  if (!snapshot.exists()) return null

  return {
    uid: snapshot.id,
    ...snapshot.data(),
  }
}

export const updateUserProfile = async (uid, data) => {
  await setDoc(
    doc(db, 'users', uid),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}
