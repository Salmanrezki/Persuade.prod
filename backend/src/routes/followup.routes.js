import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { findCoachProfileById } from '../utils/coachDirectory.js'
import {
  isFirestoreUnavailable,
  logFirestoreWarning,
  toFirestoreUserMessage,
} from '../utils/firestoreErrors.js'

const router = express.Router()

const usersCollection = () => admin.firestore().collection('users')
const followupCollection = () => admin.firestore().collection('coachFollowupRequests')

const getUserProfile = async (uid) => {
  const doc = await usersCollection().doc(uid).get()
  return doc.exists ? { uid: doc.id, ...doc.data() } : null
}

router.get('/me', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await followupCollection().where('clientId', '==', req.user.uid).get()
    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0
        return timeB - timeA
      })

    res.json(items)
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      logFirestoreWarning('GET /api/follow-up/me failed', error)
      return res.status(503).json({ message: toFirestoreUserMessage() })
    }

    res.status(500).json({ message: 'Failed to load follow-up requests' })
  }
})

router.get('/coach', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await followupCollection().where('coachId', '==', req.user.uid).get()
    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0
        return timeB - timeA
      })

    res.json(items)
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      logFirestoreWarning('GET /api/follow-up/coach failed', error)
      return res.status(503).json({ message: toFirestoreUserMessage() })
    }

    res.status(500).json({ message: 'Failed to load coach follow-up requests' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const coachId = typeof req.body?.coachId === 'string' ? req.body.coachId.trim() : ''
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''

    if (!coachId) {
      return res.status(400).json({ message: 'Missing coachId' })
    }

    const coachProfile = await findCoachProfileById(coachId)
    if (!coachProfile) {
      return res.status(404).json({ message: 'Coach not found' })
    }

    const existingSnapshot = await followupCollection().where('clientId', '==', req.user.uid).get()

    const existing = existingSnapshot.docs.find((doc) => {
      const data = doc.data()
      return data?.coachId === coachId && ['pending', 'accepted'].includes(data?.status)
    })
    if (existing) {
      return res.status(409).json({ message: 'Request already exists', id: existing.id })
    }

    const payload = {
      coachId,
      coachName: coachProfile.firstname || coachProfile.email || 'Coach',
      coachEmail: coachProfile.email || '',
      clientId: req.user.uid,
      clientName: profile.firstname || profile.email || 'Apprenant',
      clientEmail: req.user.email || profile.email || '',
      message,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const ref = await followupCollection().add(payload)
    res.status(201).json({
      id: ref.id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      logFirestoreWarning('POST /api/follow-up failed', error)
      return res.status(503).json({ message: toFirestoreUserMessage() })
    }

    console.error('POST /api/follow-up failed:', error)
    res.status(500).json({ message: 'Failed to create follow-up request' })
  }
})

router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const status = typeof req.body?.status === 'string' ? req.body.status.trim() : ''
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const ref = followupCollection().doc(req.params.id)
    const snapshot = await ref.get()
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Request not found' })
    }

    const current = snapshot.data()
    if (current.coachId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await ref.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.json({ id: snapshot.id, ...current, status })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update follow-up request' })
  }
})

export default router
