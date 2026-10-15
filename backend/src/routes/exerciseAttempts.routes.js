import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { normalizeUserProfileRole } from '../utils/userRole.js'
import { scoreAttempt } from '../utils/exerciseScoring.js'
const router = express.Router()
router.use(verifyToken)
router.use(async (req, res, next) => {
  try {
    const profile = await admin
      .firestore()
      .collection('users')
      .doc(req.user.uid)
      .get()
    if (
      !profile.exists ||
      normalizeUserProfileRole(profile.data()).role !== 'apprenant'
    )
      return res.sendStatus(403)
    next()
  } catch {
    res.sendStatus(503)
  }
})
router.get('/', async (req, res) => {
  try {
    const limit = 20
    const cursor = req.query.cursor
    const attempts = admin
      .firestore()
      .collection('users')
      .doc(req.user.uid)
      .collection('exerciseAttempts')
    let query = attempts
      .orderBy('createdAt', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
    if (cursor) {
      if (typeof cursor !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(cursor))
        return res.sendStatus(400)
      const doc = await attempts.doc(cursor).get()
      if (!doc.exists) return res.sendStatus(400)
      query = query.startAfter(doc)
    }
    const snapshot = await query.limit(limit + 1).get()
    const items = snapshot.docs
      .slice(0, limit)
      .map((doc) => ({ ...doc.data(), id: doc.id }))
    res.json({
      items,
      nextCursor: snapshot.docs.length > limit ? items.at(-1).id : null,
    })
  } catch {
    res.status(503).json({ message: 'Impossible de charger l’historique.' })
  }
})
router.post('/:exerciseId', async (req, res) => {
  const body = req.body || {}
  if (
    typeof body.requestId !== 'string' ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)
  )
    return res
      .status(400)
      .json({ message: 'Identifiant de tentative invalide.' })
  try {
    const db = admin.firestore()
    const userRef = db.collection('users').doc(req.user.uid)
    const attemptRef = userRef
      .collection('exerciseAttempts')
      .doc(body.requestId)
    const result = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(attemptRef)
      if (existing.exists) {
        if (existing.data().exerciseId !== req.params.exerciseId) {
          const error = new Error('Identifiant déjà utilisé.')
          error.status = 409
          throw error
        }
        return { ...existing.data(), id: existing.id }
      }
      const exerciseDoc = await transaction.get(
        db.collection('coachExercises').doc(req.params.exerciseId),
      )
      if (!exerciseDoc.exists) {
        const error = new Error('Exercice introuvable.')
        error.status = 404
        throw error
      }
      const exercise = exerciseDoc.data()
      const user = await transaction.get(userRef)
      let result
      try {
        result = scoreAttempt(exercise, body)
      } catch (error) {
        error.status ||= 400
        throw error
      }
      const attempt = {
        ...result,
        exerciseId: exerciseDoc.id,
        exerciseTitle: exercise.title,
        revision: exercise.revision || 1,
        coachId: exercise.coachId,
        createdAt: new Date().toISOString(),
      }
      transaction.set(attemptRef, attempt)
      const completed = {
        ...user.data()?.learningProgress?.practicalExercises?.completed,
        [exerciseDoc.id]: true,
      }
      transaction.set(
        userRef,
        {
          learningProgress: {
            summary: {
              completedExercisesCount: Object.values(completed).filter(
                (value) => value === true,
              ).length,
            },
            practicalExercises: {
              completed: { [exerciseDoc.id]: true },
              notes: { [exerciseDoc.id]: result.notes },
            },
          },
        },
        { merge: true },
      )
      return { ...attempt, id: attemptRef.id }
    })
    res.status(201).json(result)
  } catch (error) {
    res
      .status(error.status || 503)
      .json({
        message: error.status
          ? error.message
          : 'Impossible d’enregistrer cette tentative.',
      })
  }
})
export default router
