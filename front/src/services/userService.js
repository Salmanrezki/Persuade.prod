import { db } from './firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

export const normalizeUserRole = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return normalized === 'coach' ? 'coach' : 'apprenant'
}

export const normalizeUserProfile = (data = {}, fallback = {}) => {
  const normalizedRole = normalizeUserRole(data?.role ?? fallback?.role)

  return {
    ...fallback,
    ...data,
    role: normalizedRole,
    coachApplicationStatus:
      normalizedRole === 'coach' ? data?.coachApplicationStatus || fallback?.coachApplicationStatus || 'pending_review' : null,
  }
}

export const createUserProfile = async (uid, data) => {
  const normalizedRole = normalizeUserRole(data?.role)

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

  return normalizeUserProfile({
    uid: snapshot.id,
    ...snapshot.data(),
  })
}

export const updateUserProfile = async (uid, data) => {
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  }

  if (data?.role !== undefined) {
    payload.role = normalizeUserRole(data.role)
  }

  await setDoc(
    doc(db, 'users', uid),
    payload,
    { merge: true }
  )
}
