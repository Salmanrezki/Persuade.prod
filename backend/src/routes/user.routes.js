import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

const MAX_PROFILE_PHOTO_BYTES = 300 * 1024

const estimateDataUrlBytes = (value) => {
  if (typeof value !== 'string') return 0

  const base64 = value.includes(',') ? value.split(',')[1] : value
  const padding = (base64.match(/=*$/)?.[0]?.length || 0)
  return Math.floor((base64.length * 3) / 4) - padding
}

router.get('/me', verifyToken, async (req, res) => {
  try {
    const doc = await admin.firestore().collection('users').doc(req.user.uid).get()
    const profile = doc.exists ? doc.data() : {}

    res.json({
      uid: req.user.uid,
      email: req.user.email,
      ...profile,
    })
  } catch (error) {
    console.error('GET /api/users/me fallback:', error)
    res.status(500).json({ message: 'Failed to load profile' })
  }
})

router.get('/', verifyToken, async (req, res) => {
  try {
    const { role } = req.query
    if (!role) {
      return res.status(400).json({ message: 'Missing role' })
    }

    const snapshot = await admin.firestore().collection('users').where('role', '==', role).get()

    const users = snapshot.docs
      .map((doc) => ({ uid: doc.id, ...doc.data() }))
      .filter((user) => user.uid !== req.user.uid)

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load users' })
  }
})

router.patch('/me', verifyToken, async (req, res) => {
  try {
    const allowedFields = [
      'profilePhoto',
      'profession',
      'professionDetail',
      'jobTitle',
      'jobTitleDetail',
      'sector',
      'sectorDetail',
      'seniority',
      'companySize',
      'revenue',
      'familyStatus',
      'discovery',
      'expectations',
      'expectationsDetail',
      'primaryGoal',
      'availability',
      'learningFormat',
      'hasOnboarded',
      'onboardingCompletedAt',
    ]

    const updates = {}
    allowedFields.forEach((key) => {
      if (req.body?.[key] !== undefined) {
        updates[key] = req.body[key]
      }
    })

    if (
      typeof updates.profilePhoto === 'string' &&
      estimateDataUrlBytes(updates.profilePhoto) > MAX_PROFILE_PHOTO_BYTES
    ) {
      return res.status(413).json({
        message: 'La photo de profil est trop lourde pour être enregistrée dans Firestore.',
      })
    }

    await admin.firestore().collection('users').doc(req.user.uid).set(updates, { merge: true })

    res.json({ uid: req.user.uid, ...updates })
  } catch (error) {
    console.error('PATCH /api/users/me failed:', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

export default router
