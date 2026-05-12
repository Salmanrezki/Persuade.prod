import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { listCoachDirectory } from '../utils/coachDirectory.js'

const router = express.Router()

const MAX_PROFILE_PHOTO_BYTES = 300 * 1024
const usersCollection = () => admin.firestore().collection('users')
const followupCollection = () => admin.firestore().collection('coachFollowupRequests')

const estimateDataUrlBytes = (value) => {
  if (typeof value !== 'string') return 0

  const base64 = value.includes(',') ? value.split(',')[1] : value
  const padding = (base64.match(/=*$/)?.[0]?.length || 0)
  return Math.floor((base64.length * 3) / 4) - padding
}

const getUserProfile = async (uid) => {
  const doc = await usersCollection().doc(uid).get()
  return doc.exists ? { uid: doc.id, ...doc.data() } : null
}

const canCoachAccessClientProgress = async (coachId, clientId) => {
  const snapshot = await followupCollection().where('coachId', '==', coachId).get()
  return snapshot.docs.some((doc) => {
    const data = doc.data()
    return data?.clientId === clientId && data?.status === 'accepted'
  })
}

router.get('/me', verifyToken, async (req, res) => {
  try {
    const doc = await usersCollection().doc(req.user.uid).get()
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

    let users = []

    if (role === 'coach') {
      users = await listCoachDirectory({ excludeUid: req.user.uid })
    } else {
      const snapshot = await usersCollection().where('role', '==', role).get()
      users = snapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((user) => user.uid !== req.user.uid)
    }

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load users' })
  }
})

router.patch('/me', verifyToken, async (req, res) => {
  try {
    const allowedFields = [
      'firstname',
      'birthdate',
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
      'coachApplicationStatus',
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

    await usersCollection().doc(req.user.uid).set(updates, { merge: true })

    res.json({ uid: req.user.uid, ...updates })
  } catch (error) {
    console.error('PATCH /api/users/me failed:', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

router.get('/progress/me', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    const learningProgress = profile?.learningProgress || {
      viewedCourses: [],
      practicalExercises: { completed: {}, notes: {} },
      updatedAt: null,
    }

    res.json(learningProgress)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load progress' })
  }
})

router.put('/progress/me', verifyToken, async (req, res) => {
  try {
    const viewedCourses = Array.isArray(req.body?.viewedCourses)
      ? req.body.viewedCourses.slice(0, 12).map((item) => ({
          id: typeof item?.id === 'string' ? item.id : '',
          title: typeof item?.title === 'string' ? item.title : '',
          category: typeof item?.category === 'string' ? item.category : '',
          level: typeof item?.level === 'string' ? item.level : '',
          coachingMode: typeof item?.coachingMode === 'string' ? item.coachingMode : '',
          viewedAt: Number(item?.viewedAt) || Date.now(),
        }))
      : []

    const practicalExercises = {
      completed:
        req.body?.practicalExercises?.completed &&
        typeof req.body.practicalExercises.completed === 'object'
          ? req.body.practicalExercises.completed
          : {},
      notes:
        req.body?.practicalExercises?.notes &&
        typeof req.body.practicalExercises.notes === 'object'
          ? req.body.practicalExercises.notes
          : {},
    }

    const learningProgress = {
      viewedCourses,
      practicalExercises,
      summary: {
        viewedCoursesCount: viewedCourses.length,
        completedExercisesCount: Object.values(practicalExercises.completed).filter(Boolean).length,
      },
      updatedAt: new Date().toISOString(),
    }

    await usersCollection().doc(req.user.uid).set({ learningProgress }, { merge: true })
    res.json(learningProgress)
  } catch (error) {
    res.status(500).json({ message: 'Failed to save progress' })
  }
})

router.get('/progress/:userId', verifyToken, async (req, res) => {
  try {
    const requester = await getUserProfile(req.user.uid)
    if (!requester || requester.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const clientId = req.params.userId
    const allowed = await canCoachAccessClientProgress(req.user.uid, clientId)
    if (!allowed) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const clientProfile = await getUserProfile(clientId)
    if (!clientProfile) {
      return res.status(404).json({ message: 'Client not found' })
    }

    res.json({
      client: {
        uid: clientProfile.uid,
        firstname: clientProfile.firstname || '',
        email: clientProfile.email || '',
        primaryGoal: clientProfile.primaryGoal || '',
        expectations: Array.isArray(clientProfile.expectations) ? clientProfile.expectations : [],
        learningFormat: clientProfile.learningFormat || '',
        availability: clientProfile.availability || '',
      },
      learningProgress: clientProfile.learningProgress || {
        viewedCourses: [],
        practicalExercises: { completed: {}, notes: {} },
        summary: { viewedCoursesCount: 0, completedExercisesCount: 0 },
        updatedAt: null,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to load client progress' })
  }
})

export default router
