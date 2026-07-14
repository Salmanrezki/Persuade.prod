import { db } from './firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import api from '@/services/api'

export const normalizeUserRole = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return normalized === 'coach' ? 'coach' : 'apprenant'
}

export const normalizeReferralCode = (value) =>
  typeof value === 'string' ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : ''

export const generateReferralCode = (firstname, uid) => {
  const nameBlock = String(firstname || 'PERSUADE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
    .padEnd(6, 'X')

  const uidBlock = String(uid || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(4, '0')

  return `${nameBlock}${uidBlock}`
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
  const normalizedReferralCode = normalizeReferralCode(data?.referralCode)

  await setDoc(doc(db, 'users', uid), {
    ...data,
    role: normalizedRole,
    referralCode: normalizedReferralCode,
    referralPoints: Number(data?.referralPoints || 0),
    referralCount: Number(data?.referralCount || 0),
    referredByCode: normalizeReferralCode(data?.referredByCode) || null,
    coachApplicationStatus:
      normalizedRole === 'coach' ? data?.coachApplicationStatus || 'pending_review' : null,
    createdAt: serverTimestamp(),
  })
}

const ensureReferralCodeForLearner = async (uid, profile) => {
  if (!uid || !profile || normalizeUserRole(profile.role) !== 'apprenant' || profile.referralCode) {
    return profile
  }

  const referralCode = generateReferralCode(profile.firstname, uid)

  await setDoc(
    doc(db, 'users', uid),
    {
      referralCode,
      referralPoints: Number(profile.referralPoints || 0),
      referralCount: Number(profile.referralCount || 0),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return {
    ...profile,
    referralCode,
    referralPoints: Number(profile.referralPoints || 0),
    referralCount: Number(profile.referralCount || 0),
  }
}

export const getUserProfile = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid))
  if (!snapshot.exists()) return null

  const normalizedProfile = normalizeUserProfile({
    uid: snapshot.id,
    ...snapshot.data(),
  })

  return ensureReferralCodeForLearner(uid, normalizedProfile)
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

export const validateReferralCode = async (referralCode) => {
  const normalizedCode = normalizeReferralCode(referralCode)
  if (!normalizedCode) return { valid: false }

  const response = await api.get(`/users/referral/${normalizedCode}/validate`)
  return response.data
}

export const claimReferralCode = async (referralCode) => {
  const normalizedCode = normalizeReferralCode(referralCode)
  return api.post('/users/referral/claim', { referralCode: normalizedCode })
}
