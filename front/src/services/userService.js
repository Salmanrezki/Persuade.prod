import { db } from './firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

export const createUserProfile = async (uid, data) => {
  const safeRole = 'apprenant'

  await setDoc(doc(db, 'users', uid), {
    ...data,
    role: safeRole,
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
