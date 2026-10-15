import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { normalizeUserProfileRole } from '../utils/userRole.js'
import {
  normalizeAssessment,
  publicExercise,
} from '../utils/exerciseScoring.js'

const router = express.Router()
const collection = () => admin.firestore().collection('coachExercises')
router.use(verifyToken)
router.get('/', async (req, res) => {
  try {
    const snapshot = await collection().get()
    res.json(
      snapshot.docs.map((doc) => publicExercise({ ...doc.data(), id: doc.id })),
    )
  } catch {
    res.status(503).json({ message: 'Impossible de charger les exercices.' })
  }
})
router.use(async (req, res, next) => {
  try {
    const doc = await admin
      .firestore()
      .collection('users')
      .doc(req.user.uid)
      .get()
    if (!doc.exists || normalizeUserProfileRole(doc.data()).role !== 'coach')
      return res.status(403).json({ message: 'Forbidden' })
    next()
  } catch {
    res.status(500).json({ message: 'Failed to verify coach' })
  }
})
const payload = (body) => ({
  title: typeof body?.title === 'string' ? body.title.trim().slice(0, 180) : '',
  description:
    typeof body?.description === 'string'
      ? body.description.trim().slice(0, 10000)
      : '',
  instructions:
    typeof body?.instructions === 'string'
      ? body.instructions.trim().slice(0, 20000)
      : '',
  duration:
    typeof body?.duration === 'string'
      ? body.duration.trim().slice(0, 100)
      : '',
})
router.get('/coach', async (req, res) => {
  try {
    const snapshot = await collection()
      .where('coachId', '==', req.user.uid)
      .get()
    res.json(
      snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    )
  } catch {
    res.status(500).json({ message: 'Failed to load exercises' })
  }
})
router.post('/', async (req, res) => {
  const data = payload(req.body)
  try {
    data.assessment = normalizeAssessment(req.body?.assessment)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
  if (!data.title || !data.description || !data.instructions)
    return res.status(400).json({ message: 'Missing required fields' })
  try {
    const exercise = {
      ...data,
      revision: 1,
      coachId: req.user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const doc = await collection().add(exercise)
    res.status(201).json({ id: doc.id, ...exercise })
  } catch {
    res.status(500).json({ message: 'Failed to create exercise' })
  }
})
router.patch('/:id', async (req, res) => {
  const data = payload(req.body)
  if (req.body?.assessment !== undefined) {
    try {
      data.assessment = normalizeAssessment(req.body.assessment)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }
  }
  if (!data.title || !data.description || !data.instructions)
    return res.status(400).json({ message: 'Missing required fields' })
  try {
    const ref = collection().doc(req.params.id)
    const result = await admin
      .firestore()
      .runTransaction(async (transaction) => {
        const doc = await transaction.get(ref)
        if (!doc.exists) {
          const error = new Error('Exercice introuvable.')
          error.status = 404
          throw error
        }
        if (doc.data().coachId !== req.user.uid) {
          const error = new Error('Accès interdit.')
          error.status = 403
          throw error
        }
        const updates = {
          ...data,
          revision: (doc.data().revision || 1) + 1,
          updatedAt: new Date().toISOString(),
        }
        transaction.update(ref, updates)
        return { id: doc.id, ...doc.data(), ...updates }
      })
    res.json(result)
  } catch (error) {
    res
      .status(error.status || 500)
      .json({
        message: error.status ? error.message : 'Failed to update exercise',
      })
  }
})
export default router
